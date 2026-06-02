-- ===========================================================
-- 00027 — home_feed_stats RPC
-- ===========================================================
-- Replaces the 4-query phase-2 fan-out on /app/home (like rows,
-- my-like rows, comment rows, poll-vote rows) with a single RPC that
-- returns aggregated counts + viewer flags per post.
--
-- The viewer id is passed explicitly because Vercel's edge runtime
-- doesn't always have an auth context wired the way regular SD funcs
-- expect. We trust the caller (the server component is already gated
-- by requireApproved()) to pass their own profile id.
--
-- Poll vote counts are returned as a jsonb object keyed by stringified
-- option_index so options with zero votes don't collapse out of order.
-- The home page reads counts[String(i)] when rendering each option.

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
  comments as (
    select pc.post_id, count(*)::integer as cnt
    from public.post_comments pc
    where pc.post_id = any(p_post_ids)
      and pc.deleted_at is null
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

grant execute on function public.home_feed_stats(uuid[], uuid) to authenticated;
