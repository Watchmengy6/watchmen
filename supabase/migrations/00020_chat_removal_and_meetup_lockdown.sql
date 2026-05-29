-- ===========================================================
-- 00020 — Remove Master Chat tab, lock meetups to admin-only
-- ===========================================================
-- Per Dustin: the master chat tab disappears from the bottom nav and
-- all broadcast / community conversation moves to the feed wall. Also
-- meetups become admin-only — members invite via feed posts instead.
--
-- IMPORTANT: we DO NOT drop the chats / messages / polls tables.
-- Those are still used by event-room chats (the room you get when you
-- RSVP "going" to an event). We just delete the singleton 'main' row
-- and update the unique index so future inserts can't recreate it.

-- ===========================================================
-- 1. Delete the singleton master chat + its message history
-- ===========================================================
-- ON DELETE CASCADE on messages.chat_id handles message cleanup.
delete from public.chats where type = 'main';

-- ===========================================================
-- 2. Forbid recreating a 'main' chat
-- ===========================================================
-- We could drop the chat_type enum value but enum removal is painful in
-- Postgres and the events flow still uses the same enum. Easier: add a
-- check constraint that blocks type='main' inserts. The existing unique
-- index on (true) where type='main' becomes redundant but harmless.
alter table public.chats
  drop constraint if exists chats_no_main_chk;
alter table public.chats
  add constraint chats_no_main_chk check (type <> 'main');

-- ===========================================================
-- 3. Lock meetups to admin-only insert
-- ===========================================================
-- Per Dustin: members coordinate informal meetups via feed posts so
-- "official" meetups stay a curated leadership thing.
drop policy if exists "meetups approved insert" on public.meetups;
drop policy if exists "meetups admin insert" on public.meetups;
create policy "meetups admin insert" on public.meetups
  for insert with check (
    host_user_id = public.current_profile_id()
    and public.is_admin()
  );

-- ===========================================================
-- 4. Helper: is today this profile's birthday?
-- ===========================================================
-- America/New_York anchor — the Watchmen are Tampa-based, so we want
-- "today" to mean "today in Florida" regardless of where the server is.
create or replace function public.is_birthday_today(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id
      and p.birthday is not null
      and extract(month from p.birthday) = extract(month from (now() at time zone 'America/New_York'))
      and extract(day from p.birthday) = extract(day from (now() at time zone 'America/New_York'))
  );
$$;

-- ===========================================================
-- 5. Birthday auto-post idempotency tracker
-- ===========================================================
-- Lazy birthday post insertion runs the first time anyone loads the
-- feed on someone's birthday. This unique index prevents duplicate
-- posts across concurrent renders.
create table if not exists public.birthday_auto_posts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  posted_for_date date not null,
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (member_id, posted_for_date)
);

alter table public.birthday_auto_posts enable row level security;
drop policy if exists "birthday_auto_posts approved read" on public.birthday_auto_posts;
create policy "birthday_auto_posts approved read" on public.birthday_auto_posts
  for select using (public.is_approved());
-- Inserts go through server actions with service-role, so no policy needed.

-- ===========================================================
-- 6. SECURITY DEFINER fn that books an auto-post (race-safe)
-- ===========================================================
-- Called from the home page render. If today's birthday post already
-- exists for this member, returns its id; otherwise inserts a feed
-- post + tracker row in one transaction.
create or replace function public.book_birthday_auto_post(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date;
  v_existing uuid;
  v_post_id uuid;
  v_full_name text;
  v_birthday date;
begin
  v_today := (now() at time zone 'America/New_York')::date;

  -- Already booked?
  select post_id into v_existing
    from public.birthday_auto_posts
    where member_id = p_member_id and posted_for_date = v_today;
  if v_existing is not null then return v_existing; end if;

  -- Confirm it's actually their birthday today + member is approved.
  select full_name, birthday into v_full_name, v_birthday
    from public.profiles
    where id = p_member_id and status = 'approved' and deleted_at is null;
  if v_birthday is null
     or extract(month from v_birthday) <> extract(month from v_today)
     or extract(day from v_birthday) <> extract(day from v_today) then
    return null;
  end if;

  -- Insert the feed post.
  insert into public.posts (author_id, kind, body)
  values (
    p_member_id,
    'announcement',
    '🎂 Today is ' || coalesce(v_full_name, 'a brother') ||
    '''s birthday — drop a comment to wish them well.'
  )
  returning id into v_post_id;

  -- Lock in the idempotency record. unique constraint catches the race.
  insert into public.birthday_auto_posts (member_id, posted_for_date, post_id)
  values (p_member_id, v_today, v_post_id)
  on conflict (member_id, posted_for_date) do update set post_id = excluded.post_id;

  return v_post_id;
end;
$$;
grant execute on function public.book_birthday_auto_post(uuid) to authenticated;
