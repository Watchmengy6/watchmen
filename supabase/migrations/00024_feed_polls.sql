-- ===========================================================
-- 00024 — Feed polls
-- ===========================================================
-- Polls used to live on chats (dropped in migration 00020 when the
-- master chat tab went away). Per Dustin, polls come back — but as
-- feed posts. Way simpler model: poll data lives on the post row
-- itself, and votes are a single thin table keyed by (post_id, user).

-- Question + 2–4 option strings on the post itself.
alter table public.posts
  add column if not exists poll_question text,
  add column if not exists poll_options text[];

-- One vote per member per poll. option_index points into poll_options.
create table if not exists public.post_poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index smallint not null check (option_index >= 0 and option_index < 10),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_poll_votes_post_idx
  on public.post_poll_votes(post_id);

alter table public.post_poll_votes enable row level security;

-- Read: any approved member can see votes on posts they can see.
-- (The posts RLS already filters blocked-author posts out, so vote
-- visibility piggybacks on that.)
drop policy if exists "post_poll_votes approved read" on public.post_poll_votes;
create policy "post_poll_votes approved read" on public.post_poll_votes
  for select using (
    public.is_approved()
    and exists (
      select 1 from public.posts p
      where p.id = post_poll_votes.post_id and p.deleted_at is null
    )
  );

-- Insert/update: only the voter themselves.
drop policy if exists "post_poll_votes self insert" on public.post_poll_votes;
create policy "post_poll_votes self insert" on public.post_poll_votes
  for insert with check (
    user_id = public.current_profile_id()
    and public.is_approved()
    and exists (
      select 1 from public.posts p
      where p.id = post_poll_votes.post_id and p.deleted_at is null
    )
  );

drop policy if exists "post_poll_votes self update" on public.post_poll_votes;
create policy "post_poll_votes self update" on public.post_poll_votes
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists "post_poll_votes self delete" on public.post_poll_votes;
create policy "post_poll_votes self delete" on public.post_poll_votes
  for delete using (user_id = public.current_profile_id());
