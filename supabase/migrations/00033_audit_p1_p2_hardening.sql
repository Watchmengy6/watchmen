-- ===========================================================
-- 00033 — Codex audit P1/P2 hardening
-- ===========================================================
-- Closes the remaining trust/safety gaps from the audit:
--   1. Profile discovery is now block-aware (directory, profile
--      routes, new-DM picker all read `profiles` under RLS).
--   2. find_or_create_dm() validates the target before opening a thread.
--   3. Inbox thread summaries hide DMs with a blocked counterpart.
--   4. home_feed_stats() derives the viewer server-side and only
--      aggregates posts the caller may read.
--   5. Suspending a member (status -> rejected, NOT deleted) now pulls
--      their posts/comments/messages from every read surface. Deleted
--      tombstones (status rejected + deleted_at set) stay visible.
--   6. group_member_counts() only answers for caller-visible groups.

-- ===========================================================
-- Helper: is this author's content allowed to remain visible?
-- ===========================================================
-- True for approved authors and for deleted tombstones (privacy policy
-- keeps deleted-member content attached to a "Deleted member" profile).
-- False for suspended members (rejected with deleted_at IS NULL), which
-- is what makes "Suspend" act as a content takedown.
create or replace function public.is_author_visible(p_author uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_author
      and (status = 'approved' or deleted_at is not null)
  );
$$;

-- ===========================================================
-- 1. Profiles discovery — block-aware
-- ===========================================================
-- The admin-select-all and self-select policies are separate permissive
-- policies, so admins still moderate everyone and you still see yourself.
-- This only narrows the member-to-member directory view.
drop policy if exists "profiles approved see approved" on public.profiles;
create policy "profiles approved see approved" on public.profiles
  for select using (
    public.is_approved()
    and status = 'approved'
    and not public.is_blocked_either_way(id)
  );

-- ===========================================================
-- 2. find_or_create_dm — validate the target
-- ===========================================================
create or replace function public.find_or_create_dm(p_other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_pair_key text;
  v_thread_id uuid;
  v_target_status text;
  v_target_deleted timestamptz;
begin
  v_me := public.current_profile_id();
  if v_me is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;
  if v_me = p_other_profile_id then
    raise exception 'Cannot DM yourself';
  end if;

  -- The target must be a real, approved, non-deleted member that the
  -- caller has not blocked and is not blocked by. Without this a crafted
  -- client could open or reopen a DM with anyone whose UUID it knows.
  select status::text, deleted_at
    into v_target_status, v_target_deleted
  from public.profiles
  where id = p_other_profile_id;

  if v_target_status is null
     or v_target_status <> 'approved'
     or v_target_deleted is not null
     or public.is_blocked_either_way(p_other_profile_id) then
    raise exception 'Recipient unavailable';
  end if;

  -- Deterministic, order-independent pair key.
  v_pair_key := least(v_me::text, p_other_profile_id::text)
                || ':' ||
                greatest(v_me::text, p_other_profile_id::text);

  -- Try to find an existing thread with this pair key first.
  select id into v_thread_id
  from public.threads
  where kind = 'dm' and dm_pair_key = v_pair_key
  limit 1;
  if v_thread_id is not null then
    return v_thread_id;
  end if;

  -- Insert with ON CONFLICT so concurrent callers converge on the
  -- same row. Whoever wins the unique index gets the id we return.
  insert into public.threads (kind, dm_pair_key)
  values ('dm', v_pair_key)
  on conflict (dm_pair_key) where (kind = 'dm' and dm_pair_key is not null)
  do nothing
  returning id into v_thread_id;

  -- If we lost the race, look up the winning row.
  if v_thread_id is null then
    select id into v_thread_id
    from public.threads
    where kind = 'dm' and dm_pair_key = v_pair_key
    limit 1;
  end if;

  insert into public.thread_members (thread_id, user_id)
  values (v_thread_id, v_me)
  on conflict do nothing;
  insert into public.thread_members (thread_id, user_id)
  values (v_thread_id, p_other_profile_id)
  on conflict do nothing;

  return v_thread_id;
end;
$$;
grant execute on function public.find_or_create_dm(uuid) to authenticated;

-- ===========================================================
-- 3. Inbox thread summaries — block-aware
-- ===========================================================
-- thread_messages were already block-filtered, but the inbox reads
-- threads.last_message_at / last_message_preview directly. Hide any DM
-- thread whose other member is blocked either way so the row (and its
-- preview text) disappears in both directions. Group/event threads are
-- unaffected — blocking one member must not hide a whole group.
drop policy if exists "threads member read" on public.threads;
create policy "threads member read" on public.threads
  for select using (
    public.is_approved()
    and public.is_thread_member(id)
    and not (
      kind = 'dm'
      and exists (
        select 1 from public.thread_members tm
        where tm.thread_id = threads.id
          and tm.user_id <> public.current_profile_id()
          and public.is_blocked_either_way(tm.user_id)
      )
    )
  );

-- ===========================================================
-- 4. home_feed_stats — derive viewer + gate visibility
-- ===========================================================
-- Signature unchanged (p_viewer_id retained for call-compatibility) but
-- the parameter is now IGNORED. The viewer is derived from
-- current_profile_id(), and we only aggregate posts the caller may read:
-- approved viewer, author not blocked either way, author still visible.
create or replace function public.home_feed_stats(
  p_post_ids uuid[],
  p_viewer_id uuid
) returns table(
  post_id uuid,
  like_count integer,
  comment_count integer,
  my_liked boolean,
  my_poll_vote integer,
  poll_vote_counts jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with visible as (
    select p.id, p.author_id
    from public.posts p
    where p.id = any(p_post_ids)
      and public.is_approved()
      and not public.is_blocked_either_way(p.author_id)
      and public.is_author_visible(p.author_id)
  ),
  likes as (
    select pl.post_id,
           count(*)::integer as cnt,
           bool_or(pl.user_id = public.current_profile_id()) as mine
    from public.post_likes pl
    join visible v on v.id = pl.post_id
    group by pl.post_id
  ),
  comments as (
    select pc.post_id, count(*)::integer as cnt
    from public.post_comments pc
    join visible v on v.id = pc.post_id
    where pc.deleted_at is null
    group by pc.post_id
  ),
  votes_by_opt as (
    select vt.post_id, vt.option_index, count(*)::integer as cnt
    from public.post_poll_votes vt
    join visible v on v.id = vt.post_id
    group by vt.post_id, vt.option_index
  ),
  votes_agg as (
    select post_id,
           jsonb_object_agg(option_index::text, cnt) as votes_by_index
    from votes_by_opt
    group by post_id
  ),
  my_vote as (
    select vt.post_id, vt.option_index as my_idx
    from public.post_poll_votes vt
    join visible v on v.id = vt.post_id
    where vt.user_id = public.current_profile_id()
  )
  select
    vis.id as post_id,
    coalesce(l.cnt, 0) as like_count,
    coalesce(c.cnt, 0) as comment_count,
    coalesce(l.mine, false) as my_liked,
    mv.my_idx as my_poll_vote,
    va.votes_by_index as poll_vote_counts
  from visible vis
  left join likes l on l.post_id = vis.id
  left join comments c on c.post_id = vis.id
  left join votes_agg va on va.post_id = vis.id
  left join my_vote mv on mv.post_id = vis.id;
$$;
grant execute on function public.home_feed_stats(uuid[], uuid) to authenticated;

-- ===========================================================
-- 5. Suspend = content takedown
-- ===========================================================
-- Add the author-visibility gate to every member-facing read surface so
-- a suspended author's existing posts/comments/messages drop out of the
-- live app immediately, without a separate delete pass.
drop policy if exists "posts select if approved and not blocked" on public.posts;
create policy "posts select if approved and not blocked" on public.posts
  for select using (
    public.is_approved()
    and not public.is_blocked_either_way(author_id)
    and public.is_author_visible(author_id)
  );

drop policy if exists "post_comments select if approved and not blocked" on public.post_comments;
create policy "post_comments select if approved and not blocked" on public.post_comments
  for select using (
    public.is_approved()
    and not public.is_blocked_either_way(author_id)
    and public.is_author_visible(author_id)
  );

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
    and public.is_author_visible(author_id)
  );

-- ===========================================================
-- 6. group_member_counts — caller-visible groups only
-- ===========================================================
-- Mirror the groups read policy so a private group's size can't be probed
-- by anyone who happens to know its UUID.
create or replace function public.group_member_counts(p_group_ids uuid[])
returns table(group_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select gm.group_id, count(*)::bigint as member_count
  from public.group_members gm
  where gm.group_id = any(p_group_ids)
    and public.is_approved()
    and exists (
      select 1 from public.groups g
      where g.id = gm.group_id
        and (
          g.is_private = false
          or public.is_admin()
          or public.is_group_member(g.id)
        )
    )
  group by gm.group_id;
$$;
grant execute on function public.group_member_counts(uuid[]) to authenticated;
