-- ===========================================================
-- 00040 — home_feed_stats() comment-count consistency fix
-- ===========================================================
--
-- Background: `home_feed_stats()` (migration 00027) returns the
-- aggregated like/comment/poll counts for the home feed in one trip.
-- The original `comments` CTE counted ALL non-deleted rows per post,
-- but the live comment list rendered on the post detail surface
-- HIDES comments from:
--   1. Authors the viewer has blocked-either-way (RLS on
--      post_comments via is_blocked_either_way()).
--   2. Authors whose profile status is no longer 'approved'
--      (suspended / rejected / soft-deleted — same RLS surface).
--
-- Cosmetic but obvious: the "X comments" pill above each post
-- would say e.g. "12 comments" while the comment list expanded to
-- only 9 visible items. Members who blocked someone immediately
-- noticed the mismatch.
--
-- This migration replaces ONLY the `comments` CTE — the rest of
-- home_feed_stats stays byte-for-byte identical so any other CTE
-- consumers aren't disrupted. The new CTE joins to profiles to
-- check author.status and uses a not-exists subquery against
-- user_blocks to exclude bidirectional blocks.
--
-- We use p_viewer_id (the explicit parameter) rather than
-- current_profile_id() so the block check works the same way as
-- the call site expects, matching the original RPC's pattern of
-- trusting the caller's viewer id (the calling server component
-- is already gated by requireApproved()).
--
-- Note: like_count is intentionally NOT filtered here — a single
-- like is a low-information signal and filtering it adds query
-- cost without a visible payoff. If the like count mismatch ever
-- shows up as a real complaint we revisit.

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
  with likes as (
    select pl.post_id,
           count(*)::integer as cnt,
           bool_or(pl.user_id = p_viewer_id) as mine
    from public.post_likes pl
    where pl.post_id = any(p_post_ids)
    group by pl.post_id
  ),
  -- Comments CTE — replaced in 00040 to apply the same visibility
  -- filters the live comment list enforces via RLS, so the count
  -- shown above the post matches the count the user actually sees
  -- when they expand the comments.
  comments as (
    select pc.post_id, count(*)::integer as cnt
    from public.post_comments pc
    join public.profiles author on author.id = pc.author_id
    where pc.post_id = any(p_post_ids)
      and pc.deleted_at is null
      and author.status = 'approved'
      and not exists (
        select 1
        from public.user_blocks ub
        where (ub.blocker_id = p_viewer_id and ub.blocked_id = pc.author_id)
           or (ub.blocker_id = pc.author_id and ub.blocked_id = p_viewer_id)
      )
    group by pc.post_id
  ),
  votes_by_opt as (
    select v.post_id, v.option_index, count(*)::integer as cnt
    from public.post_poll_votes v
    where v.post_id = any(p_post_ids)
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
    from public.post_poll_votes v
    where v.post_id = any(p_post_ids)
      and v.user_id = p_viewer_id
  )
  select
    p.id as post_id,
    coalesce(l.cnt, 0) as like_count,
    coalesce(c.cnt, 0) as comment_count,
    coalesce(l.mine, false) as my_liked,
    mv.my_idx as my_poll_vote,
    va.votes_by_index as poll_vote_counts
  from unnest(p_post_ids) as p(id)
  left join likes l on l.post_id = p.id
  left join comments c on c.post_id = p.id
  left join votes_agg va on va.post_id = p.id
  left join my_vote mv on mv.post_id = p.id;
$$;

-- Grant is idempotent — re-asserting in case the function was dropped
-- and recreated in a manual fix between 00027 and now.
grant execute on function public.home_feed_stats(uuid[], uuid) to authenticated;
