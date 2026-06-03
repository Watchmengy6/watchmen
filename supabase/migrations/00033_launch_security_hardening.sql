-- ===========================================================
-- 00033 — Launch security hardening (Codex round 7 P1 fixes)
-- ===========================================================
-- Five fixes in one migration so the database state moves forward in
-- a single atomic deploy:
--   1. home_feed_stats() derives the viewer internally (was caller-
--      supplied, letting any authenticated user learn whether another
--      member liked/voted on arbitrary posts).
--   2. find_or_create_dm() rejects blocked / non-approved / deleted
--      targets (was happy to open a DM with anyone given a UUID).
--   3. Profile select policy is block-aware (member directory + DM
--      picker + profile pages all hid blocked members at once).
--   4. New block trigger: writing a user_blocks row evicts both users
--      from any DM thread they share, so inbox preview rows stop
--      leaking last_message text for blocked conversations.
--   5. Posts / comments / thread_messages read policies now require
--      the author to still be approved (suspending a member via
--      /admin/reports actually removes their content from live
--      surfaces; before this they were only "frozen forward" — old
--      content kept showing).

-- ===========================================================
-- 1. home_feed_stats — drop p_viewer_id, derive internally
-- ===========================================================
-- The new signature is one parameter (p_post_ids). The viewer comes
-- from public.current_profile_id() — which reads auth.uid() from the
-- JWT — so callers can no longer impersonate someone else's view.
-- We also filter the post id list down to posts the caller can
-- actually read (mirror of the posts RLS gate) so engagement counts
-- don't leak for blocked or hidden posts.

drop function if exists public.home_feed_stats(uuid[], uuid);

create or replace function public.home_feed_stats(
  p_post_ids uuid[]
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
  with viewer as (
    select public.current_profile_id() as id
  ),
  visible_posts as (
    -- Mirror of the posts RLS gate so we only aggregate over posts
    -- the caller could read directly. Belt-and-suspenders since the
    -- function is SECURITY DEFINER.
    select p.id
    from public.posts p, viewer v
    where p.id = any(p_post_ids)
      and p.deleted_at is null
      and public.is_approved()
      and not public.is_blocked_either_way(p.author_id)
  ),
  likes as (
    select pl.post_id,
           count(*)::integer as cnt,
           bool_or(pl.user_id = (select id from viewer)) as mine
    from public.post_likes pl
    where pl.post_id in (select id from visible_posts)
    group by pl.post_id
  ),
  comments as (
    select pc.post_id, count(*)::integer as cnt
    from public.post_comments pc
    where pc.post_id in (select id from visible_posts)
      and pc.deleted_at is null
    group by pc.post_id
  ),
  votes_by_opt as (
    select v.post_id, v.option_index, count(*)::integer as cnt
    from public.post_poll_votes v
    where v.post_id in (select id from visible_posts)
    group by v.post_id, v.option_index
  ),
  votes_agg as (
    select post_id,
           jsonb_object_agg(option_index::text, cnt) as votes_by_index
    from votes_by_opt
    group by post_id
  ),
  my_vote as (
    select v.post_id, v.option_index as my_idx
    from public.post_poll_votes v, viewer
    where v.post_id in (select id from visible_posts)
      and v.user_id = viewer.id
  )
  select
    vp.id as post_id,
    coalesce(l.cnt, 0) as like_count,
    coalesce(c.cnt, 0) as comment_count,
    coalesce(l.mine, false) as my_liked,
    mv.my_idx as my_poll_vote,
    va.votes_by_index as poll_vote_counts
  from visible_posts vp
  left join likes l on l.post_id = vp.id
  left join comments c on c.post_id = vp.id
  left join votes_agg va on va.post_id = vp.id
  left join my_vote mv on mv.post_id = vp.id;
$$;

grant execute on function public.home_feed_stats(uuid[]) to authenticated;

-- ===========================================================
-- 2. find_or_create_dm — validate target before opening thread
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

  -- Verify the target is a real, approved, non-deleted member that
  -- the caller hasn't blocked (and that hasn't blocked the caller).
  select status, deleted_at
    into v_target_status, v_target_deleted
    from public.profiles
    where id = p_other_profile_id;
  if v_target_status is null or v_target_status <> 'approved'
     or v_target_deleted is not null then
    raise exception 'Member not available';
  end if;
  if public.is_blocked_either_way(p_other_profile_id) then
    raise exception 'Member not available';
  end if;

  -- Deterministic, order-independent pair key.
  v_pair_key := least(v_me::text, p_other_profile_id::text)
                || ':' ||
                greatest(v_me::text, p_other_profile_id::text);

  select id into v_thread_id
  from public.threads
  where kind = 'dm' and dm_pair_key = v_pair_key
  limit 1;
  if v_thread_id is not null then
    return v_thread_id;
  end if;

  insert into public.threads (kind, dm_pair_key)
  values ('dm', v_pair_key)
  on conflict (dm_pair_key) where (kind = 'dm' and dm_pair_key is not null)
  do nothing
  returning id into v_thread_id;

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
-- 3. Profile select policy is block-aware
-- ===========================================================
-- One change cuts blocked members from the directory, the new-DM
-- picker, member profile pages, and any other place that reads
-- profiles. Self-view still works (you aren't blocked from yourself).
-- Admins still see everyone via the existing "profiles admin select
-- all" policy.

drop policy if exists "profiles approved see approved" on public.profiles;
create policy "profiles approved see approved" on public.profiles
  for select using (
    public.is_approved()
    and status = 'approved'
    and (
      id = public.current_profile_id()
      or not public.is_blocked_either_way(id)
    )
  );

-- ===========================================================
-- 4. Block trigger — evict both users from shared DM threads
-- ===========================================================
-- Without this, an old DM you've had with someone you later block
-- stays visible as an inbox row with the cached preview text. After
-- this trigger, creating a user_blocks row removes both users from
-- any kind='dm' thread they share, so the thread disappears from
-- both inboxes. (Group and event threads stay — block only mutes
-- 1:1.)

create or replace function public.user_blocks_evict_dm_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Find every dm thread that contains BOTH users.
  delete from public.thread_members tm
  where tm.user_id in (new.blocker_id, new.blocked_id)
    and tm.thread_id in (
      select tm1.thread_id
      from public.thread_members tm1
      join public.thread_members tm2
        on tm2.thread_id = tm1.thread_id
       and tm2.user_id <> tm1.user_id
      join public.threads t on t.id = tm1.thread_id
      where t.kind = 'dm'
        and tm1.user_id = new.blocker_id
        and tm2.user_id = new.blocked_id
    );
  return new;
end;
$$;

drop trigger if exists trg_user_blocks_evict_dm_members on public.user_blocks;
create trigger trg_user_blocks_evict_dm_members
  after insert on public.user_blocks
  for each row execute function public.user_blocks_evict_dm_members();

-- ===========================================================
-- 5. Read policies require the author to still be approved
-- ===========================================================
-- Suspending a member (admin sets status='rejected') used to leave
-- all their old posts/comments/messages visible. These updated
-- policies pull suspended/deleted authors' content out of live
-- surfaces immediately. Self-view still works for the user looking
-- at their own content (won't matter for a suspended user since
-- they're logged out anyway).

drop policy if exists "posts select if approved and not blocked" on public.posts;
create policy "posts select if approved and not blocked" on public.posts
  for select using (
    public.is_approved()
    and not public.is_blocked_either_way(author_id)
    and exists (
      select 1 from public.profiles ap
      where ap.id = author_id
        and ap.status = 'approved'
        and ap.deleted_at is null
    )
  );

drop policy if exists "post_comments select if approved and not blocked" on public.post_comments;
create policy "post_comments select if approved and not blocked" on public.post_comments
  for select using (
    public.is_approved()
    and not public.is_blocked_either_way(author_id)
    and exists (
      select 1 from public.profiles ap
      where ap.id = author_id
        and ap.status = 'approved'
        and ap.deleted_at is null
    )
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
    and exists (
      select 1 from public.profiles ap
      where ap.id = author_id
        and ap.status = 'approved'
        and ap.deleted_at is null
    )
  );
