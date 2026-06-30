-- ===========================================================
-- 00044 — home_feed_stats() viewer-security fix (regression repair)
-- ===========================================================
--
-- SECURITY REGRESSION:
-- Migration 00033 hardened home_feed_stats() so the viewer is derived
-- SERVER-SIDE from current_profile_id() and the p_viewer_id parameter is
-- IGNORED (kept only for call-compatibility / overload resolution). That
-- closed an info-disclosure hole: a crafted client could otherwise pass
-- ANOTHER member's profile id as p_viewer_id and read that member's
-- per-viewer state (my_liked, my_poll_vote) plus block-filtered counts
-- for arbitrary post ids.
--
-- Migration 00040 (the comment-count consistency fix) recreated the whole
-- function and accidentally REVERTED to trusting p_viewer_id for my_liked,
-- the comment block filter, and my_poll_vote. This migration repairs that.
--
-- This version combines BOTH prior intents:
--   * Viewer is derived from current_profile_id() (00033 security model).
--     p_viewer_id stays in the signature but is never used.
--   * comment_count is filtered to comments whose AUTHOR is visible to the
--     viewer — not blocked either-way and still an approved/visible author
--     (00040's accuracy fix), so the "X comments" pill matches the list the
--     viewer actually sees on expand.
--   * Only posts the caller may read are aggregated (approved viewer,
--     author not blocked either-way, author still visible).
--
-- Signature is UNCHANGED: (uuid[], uuid) -> table(...). No call sites change.
-- Helper functions used (all defined in earlier migrations, e.g. 00033):
--   public.is_approved(), public.is_blocked_either_way(uuid),
--   public.is_author_visible(uuid), public.current_profile_id()

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
  -- Only posts the CALLER may read. Viewer comes from the session, never
  -- the parameter, so callers cannot probe another member's state.
  with visible as (
    select p.id, p.author_id
    from public.posts p
    where p.id = any(p_post_ids)
      and public.is_approved()
      and p.deleted_at is null
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
  -- Comment count matches the rendered list: exclude comments whose author
  -- the viewer has blocked either-way or who is no longer visible.
  comments as (
    select pc.post_id, count(*)::integer as cnt
    from public.post_comments pc
    join visible v on v.id = pc.post_id
    where pc.deleted_at is null
      and not public.is_blocked_either_way(pc.author_id)
      and public.is_author_visible(pc.author_id)
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

-- Re-assert grant (idempotent).
grant execute on function public.home_feed_stats(uuid[], uuid) to authenticated;
