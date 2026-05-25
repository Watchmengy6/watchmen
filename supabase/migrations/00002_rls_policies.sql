-- ============================================================
-- The Watchman — Row Level Security
-- ============================================================
-- Approved members can see app content. Pending users see only
-- their own profile. Admins can see/manage everything.
-- ============================================================

-- ---------- helper functions (security definer, used by policies) ----------
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.current_profile_status()
returns text language sql stable security definer set search_path = public, auth as $$
  select status::text from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public, auth as $$
  select role::text from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(public.current_profile_status() = 'approved', false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(public.current_profile_role() in ('admin', 'super_admin'), false);
$$;

-- ============================================================
-- enable RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.points_ledger enable row level security;
alter table public.notifications enable row level security;
alter table public.shops enable row level security;

-- ============================================================
-- profiles
-- ============================================================
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth_user_id = auth.uid());

drop policy if exists "profiles approved see approved" on public.profiles;
create policy "profiles approved see approved" on public.profiles
  for select using (public.is_approved() and status = 'approved');

drop policy if exists "profiles admin select all" on public.profiles;
create policy "profiles admin select all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    -- self update may not change role/status/points_total
    and role = (select role from public.profiles where auth_user_id = auth.uid())
    and status = (select status from public.profiles where auth_user_id = auth.uid())
    and points_total = (select points_total from public.profiles where auth_user_id = auth.uid())
  );

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Inserts are handled by the auth trigger, not by clients. No insert policy.

-- ============================================================
-- invites
-- ============================================================
drop policy if exists "invites self select" on public.invites;
create policy "invites self select" on public.invites
  for select using (created_by_user_id = public.current_profile_id());

drop policy if exists "invites admin select all" on public.invites;
create policy "invites admin select all" on public.invites
  for select using (public.is_admin());

drop policy if exists "invites self insert" on public.invites;
create policy "invites self insert" on public.invites
  for insert with check (created_by_user_id = public.current_profile_id() and public.is_approved());

-- ============================================================
-- events
-- ============================================================
drop policy if exists "events approved select" on public.events;
create policy "events approved select" on public.events
  for select using (public.is_approved());

drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- event_rsvps
-- ============================================================
drop policy if exists "rsvps approved select" on public.event_rsvps;
create policy "rsvps approved select" on public.event_rsvps
  for select using (public.is_approved());

drop policy if exists "rsvps self upsert" on public.event_rsvps;
create policy "rsvps self upsert" on public.event_rsvps
  for insert with check (user_id = public.current_profile_id() and public.is_approved());

drop policy if exists "rsvps self update" on public.event_rsvps;
create policy "rsvps self update" on public.event_rsvps
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists "rsvps self delete" on public.event_rsvps;
create policy "rsvps self delete" on public.event_rsvps
  for delete using (user_id = public.current_profile_id());

drop policy if exists "rsvps admin all" on public.event_rsvps;
create policy "rsvps admin all" on public.event_rsvps
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- chats
-- ============================================================
drop policy if exists "chats main visible to approved" on public.chats;
create policy "chats main visible to approved" on public.chats
  for select using (
    public.is_approved() and (
      type = 'main'
      or (
        type = 'event'
        and exists (
          select 1 from public.event_rsvps r
          where r.event_id = chats.event_id
            and r.user_id = public.current_profile_id()
            and r.status = 'going'
        )
      )
    )
  );

drop policy if exists "chats admin all" on public.chats;
create policy "chats admin all" on public.chats
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- messages
-- ============================================================
drop policy if exists "messages select if can see chat" on public.messages;
create policy "messages select if can see chat" on public.messages
  for select using (
    public.is_approved()
    and exists (
      select 1 from public.chats c
      where c.id = messages.chat_id
        and (
          c.type = 'main'
          or (
            c.type = 'event'
            and exists (
              select 1 from public.event_rsvps r
              where r.event_id = c.event_id
                and r.user_id = public.current_profile_id()
                and r.status = 'going'
            )
          )
        )
    )
  );

drop policy if exists "messages insert self" on public.messages;
create policy "messages insert self" on public.messages
  for insert with check (
    user_id = public.current_profile_id()
    and public.is_approved()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (
          c.type = 'main'
          or (
            c.type = 'event'
            and exists (
              select 1 from public.event_rsvps r
              where r.event_id = c.event_id
                and r.user_id = public.current_profile_id()
                and r.status = 'going'
            )
          )
        )
    )
  );

drop policy if exists "messages update own" on public.messages;
create policy "messages update own" on public.messages
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists "messages delete own" on public.messages;
create policy "messages delete own" on public.messages
  for delete using (user_id = public.current_profile_id());

drop policy if exists "messages admin all" on public.messages;
create policy "messages admin all" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- message_reactions
-- ============================================================
drop policy if exists "reactions select approved" on public.message_reactions;
create policy "reactions select approved" on public.message_reactions
  for select using (public.is_approved());

drop policy if exists "reactions insert self" on public.message_reactions;
create policy "reactions insert self" on public.message_reactions
  for insert with check (user_id = public.current_profile_id() and public.is_approved());

drop policy if exists "reactions delete self" on public.message_reactions;
create policy "reactions delete self" on public.message_reactions
  for delete using (user_id = public.current_profile_id());

-- ============================================================
-- polls
-- ============================================================
drop policy if exists "polls select approved" on public.polls;
create policy "polls select approved" on public.polls
  for select using (public.is_approved());

drop policy if exists "polls insert self" on public.polls;
create policy "polls insert self" on public.polls
  for insert with check (created_by_user_id = public.current_profile_id() and public.is_approved());

drop policy if exists "polls update own" on public.polls;
create policy "polls update own" on public.polls
  for update using (created_by_user_id = public.current_profile_id());

drop policy if exists "polls admin all" on public.polls;
create policy "polls admin all" on public.polls
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "poll_options select approved" on public.poll_options;
create policy "poll_options select approved" on public.poll_options
  for select using (public.is_approved());

drop policy if exists "poll_options insert if poll owner" on public.poll_options;
create policy "poll_options insert if poll owner" on public.poll_options
  for insert with check (
    public.is_approved() and exists (
      select 1 from public.polls p where p.id = poll_id and p.created_by_user_id = public.current_profile_id()
    )
  );

drop policy if exists "poll_votes select approved" on public.poll_votes;
create policy "poll_votes select approved" on public.poll_votes
  for select using (public.is_approved());

drop policy if exists "poll_votes insert self" on public.poll_votes;
create policy "poll_votes insert self" on public.poll_votes
  for insert with check (user_id = public.current_profile_id() and public.is_approved());

drop policy if exists "poll_votes delete self" on public.poll_votes;
create policy "poll_votes delete self" on public.poll_votes
  for delete using (user_id = public.current_profile_id());

-- ============================================================
-- points_ledger
-- ============================================================
drop policy if exists "points select self" on public.points_ledger;
create policy "points select self" on public.points_ledger
  for select using (user_id = public.current_profile_id());

drop policy if exists "points select admin" on public.points_ledger;
create policy "points select admin" on public.points_ledger
  for select using (public.is_admin());

-- Writes only via SECURITY DEFINER functions (no insert policy needed).

-- ============================================================
-- notifications
-- ============================================================
drop policy if exists "notifications select self" on public.notifications;
create policy "notifications select self" on public.notifications
  for select using (user_id = public.current_profile_id());

drop policy if exists "notifications update self" on public.notifications;
create policy "notifications update self" on public.notifications
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin all" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- shops
-- ============================================================
drop policy if exists "shops select approved" on public.shops;
create policy "shops select approved" on public.shops
  for select using (public.is_approved() and active = true);

drop policy if exists "shops admin all" on public.shops;
create policy "shops admin all" on public.shops
  for all using (public.is_admin()) with check (public.is_admin());
