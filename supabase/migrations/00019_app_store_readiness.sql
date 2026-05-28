-- ===========================================================
-- 00019 — App Store readiness: reports, blocks, disclaimer, delete
-- ===========================================================
-- Apple requires every social app with user-generated content to ship:
--   1. A report flow for users and content
--   2. A user-block flow (blocked users' content disappears)
--   3. A self-serve account delete (hard delete, not deactivate)
--   4. An EULA / code-of-conduct acknowledgment at first use
-- This migration lays the schema. Server actions in the app handle
-- the auth.users delete via service-role (can't be done from SQL alone).

-- ===========================================================
-- 1. profiles additions
-- ===========================================================
alter table public.profiles
  add column if not exists disclaimer_accepted_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- ===========================================================
-- 2. reports — user-flagged content / behaviour
-- ===========================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  -- Exactly one target_* column should be set per row. We don't enforce
  -- mutual exclusion in DB because it complicates the index — admin UI
  -- and server action both enforce.
  target_user_id uuid references public.profiles(id) on delete cascade,
  target_post_id uuid references public.posts(id) on delete cascade,
  target_comment_id uuid references public.post_comments(id) on delete cascade,
  target_thread_message_id uuid references public.thread_messages(id) on delete cascade,
  target_message_id uuid references public.messages(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists reports_reporter_idx on public.reports(reporter_id);

alter table public.reports enable row level security;

-- Reporters can read their own reports (so we can show "your report
-- was reviewed" eventually).
drop policy if exists "reports self select" on public.reports;
create policy "reports self select" on public.reports
  for select using (reporter_id = public.current_profile_id());

-- Admins see all reports.
drop policy if exists "reports admin select" on public.reports;
create policy "reports admin select" on public.reports
  for select using (public.is_admin());

-- Anyone approved can file a report. The reporter must be themselves.
drop policy if exists "reports self insert" on public.reports;
create policy "reports self insert" on public.reports
  for insert with check (
    reporter_id = public.current_profile_id() and public.is_approved()
  );

-- Only admins can update (triage) reports.
drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ===========================================================
-- 3. user_blocks — per-user mute/hide list
-- ===========================================================
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks self select" on public.user_blocks;
create policy "user_blocks self select" on public.user_blocks
  for select using (blocker_id = public.current_profile_id());

drop policy if exists "user_blocks self insert" on public.user_blocks;
create policy "user_blocks self insert" on public.user_blocks
  for insert with check (
    blocker_id = public.current_profile_id() and public.is_approved()
  );

drop policy if exists "user_blocks self delete" on public.user_blocks;
create policy "user_blocks self delete" on public.user_blocks
  for delete using (blocker_id = public.current_profile_id());

-- ===========================================================
-- 4. Helper: is the caller blocked-by or has-blocked a given profile?
-- ===========================================================
-- Used by RLS on posts/comments/messages so blocked users disappear in
-- both directions (mutual hide — neither sees the other).
create or replace function public.is_blocked_either_way(p_other_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_blocks ub
    where (
      (ub.blocker_id = public.current_profile_id() and ub.blocked_id = p_other_profile_id)
      or
      (ub.blocker_id = p_other_profile_id and ub.blocked_id = public.current_profile_id())
    )
  );
$$;

-- ===========================================================
-- 5. Apply block filtering to feed surfaces
-- ===========================================================
-- We keep the existing "approved" gate but add an extra "and the
-- author isn't blocked-either-way" clause. Authors still see their
-- own content (they aren't blocked from themselves).

drop policy if exists "posts approved read" on public.posts;
drop policy if exists "posts select if approved and not blocked" on public.posts;
create policy "posts select if approved and not blocked" on public.posts
  for select using (
    public.is_approved()
    and not public.is_blocked_either_way(author_id)
  );

drop policy if exists "post_comments approved read" on public.post_comments;
drop policy if exists "post_comments select if approved and not blocked" on public.post_comments;
create policy "post_comments select if approved and not blocked" on public.post_comments
  for select using (
    public.is_approved()
    and not public.is_blocked_either_way(author_id)
  );

-- Thread messages: we filter the author too. (DMs between two members
-- where one has blocked the other will simply stop showing the other
-- side's new messages.)
drop policy if exists "thread_messages member read" on public.thread_messages;
drop policy if exists "thread_messages select if member and not blocked" on public.thread_messages;
create policy "thread_messages select if member and not blocked" on public.thread_messages
  for select using (
    public.is_approved()
    and exists (
      select 1 from public.thread_members tm
      where tm.thread_id = thread_messages.thread_id
        and tm.user_id = public.current_profile_id()
    )
    and not public.is_blocked_either_way(author_id)
  );

-- ===========================================================
-- 6. Account-deletion helper
-- ===========================================================
-- Marks profile.deleted_at and scrubs PII. Server action then deletes
-- the auth.users row via service-role (can't be done from a function
-- with security definer alone because of auth schema permissions).
-- We *don't* hard-delete the profile row here because FKs cascade to
-- posts/comments/messages — losing the row would orphan group history.
-- App Store rule is met because the user is removed and cannot sign
-- back in (auth row is deleted by the server action). The scrubbed
-- profile is a tombstone.
create or replace function public.soft_delete_self_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Not signed in';
  end if;
  update public.profiles
    set
      deleted_at = now(),
      status = 'rejected',
      full_name = 'Deleted member',
      bio = null,
      profile_photo_url = null,
      birthday = null,
      phone = null,
      occupation = null,
      company = null,
      spouse = null,
      kids = null,
      venmo_username = null,
      cashapp_username = null,
      instagram_url = null
    where id = v_profile_id;
  -- Drop their push subscriptions so they stop getting pushes.
  delete from public.push_subscriptions where user_id = v_profile_id;
end;
$$;
