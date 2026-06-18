/**
 * Shared FeedPostShape construction for /app/home, createPostAction's
 * optimistic-prepend payload, and the upcoming getFeedSliceAction.
 *
 * Before this module existed, the mapping logic lived inline in
 * /app/app/home/page.tsx (~75 lines). When we wanted createPostAction
 * to return the newly-inserted post in the SAME shape the page expects
 * (so the client could prepend without a full router.refresh()), we
 * would have had to duplicate that mapping in three places and risk
 * drift the next time we added a FeedPostShape field. Centralizing
 * here is purely DRY — no behavior change for /app/home callers.
 *
 * The POSTS_QUERY_SELECT constant is the canonical posts-with-joins
 * select used by every code path that needs to render feed posts. If
 * a new joined column is added to a post (e.g. tagged_event added in
 * 00031), update it HERE only.
 */

import type { FeedPostShape } from "@/components/feed/FeedPost";

/**
 * The full SELECT string for posts with all joined relations that
 * FeedPost needs to render. Keep in sync with FeedPostShape. Used by:
 *   - /app/app/home/page.tsx (initial server render)
 *   - createPostAction (post-insert reselect for optimistic prepend)
 *   - getFeedSliceAction (pull-to-refresh + post-submit reconciliation)
 */
export const POSTS_QUERY_SELECT = `id, kind, body, created_at, media_url, media_type, meetup_when_at, meetup_location,
         poll_question, poll_options, pinned,
         author:profiles!posts_author_id_fkey(id, full_name, username, profile_photo_url, occupation, company, birthday),
         tagged_group:groups!posts_tagged_group_id_fkey(id, name, category),
         tagged_event:events!posts_tagged_event_id_fkey(id, title, event_date, start_time, location_name),
         tagged_meetup:meetups!posts_tagged_meetup_id_fkey(
           id, title, when_at, location_name,
           host:profiles!meetups_host_user_id_fkey(id, full_name, profile_photo_url)
         )` as const;

/** Stats row shape returned by the home_feed_stats RPC. */
export type FeedPostStats = {
  like_count: number;
  comment_count: number;
  my_liked: boolean;
  my_poll_vote: number | null;
  poll_vote_counts: Record<string, number> | null;
};

/**
 * Convert a raw posts-with-joins row + optional stats row into the
 * FeedPostShape the FeedPost component expects.
 *
 * Pass `stats = null` (or omit) for a freshly-inserted post where the
 * caller knows likes/comments/votes are all zero — saves a stats RPC
 * round-trip on the create path.
 */
export function mapToFeedPostShape(p: any, stats: FeedPostStats | null = null): FeedPostShape {
  const author = Array.isArray(p.author) ? p.author[0] : p.author;
  const tg = Array.isArray(p.tagged_group) ? p.tagged_group[0] : p.tagged_group;
  const te = Array.isArray(p.tagged_event) ? p.tagged_event[0] : p.tagged_event;
  const tm = Array.isArray(p.tagged_meetup) ? p.tagged_meetup[0] : p.tagged_meetup;

  const pollOpts = (p.poll_options as string[] | null) ?? null;
  const voteCountsObj = stats?.poll_vote_counts ?? null;
  const pollVotes = pollOpts
    ? pollOpts.map((_: string, idx: number) => voteCountsObj?.[String(idx)] ?? 0)
    : null;
  const pollMyVote = stats?.my_poll_vote ?? null;

  return {
    id: p.id,
    type: (p.kind as any) ?? "post",
    body: p.body,
    created_at: p.created_at,
    image_url: p.media_url ?? null,
    media_type: (p.media_type as "image" | "video" | "none" | null) ?? null,
    pinned: !!p.pinned,
    meetup_when_at: p.meetup_when_at ?? null,
    meetup_location: p.meetup_location ?? null,
    poll_question: p.poll_question ?? null,
    poll_options: pollOpts,
    poll_votes: pollVotes,
    poll_my_vote: pollMyVote,
    author: {
      id: author?.id ?? "",
      full_name: author?.full_name ?? "Brother",
      username: author?.username ?? undefined,
      profile_photo_url: author?.profile_photo_url ?? null,
      birthday: author?.birthday ?? null,
      role_text:
        author?.occupation && author?.company
          ? `${author.occupation} · ${author.company}`
          : author?.occupation ?? null,
    },
    tagged_group: tg
      ? { id: tg.id, name: tg.name, category: tg.category, emoji: null }
      : null,
    activity: te
      ? {
          kind: "event" as const,
          data: te,
          hostName: null,
          hostPhoto: null,
        }
      : tm
        ? (() => {
            const host = Array.isArray(tm.host) ? tm.host[0] : tm.host;
            return {
              kind: "meetup" as const,
              data: tm,
              hostName: host?.full_name ?? null,
              hostPhoto: host?.profile_photo_url ?? null,
            };
          })()
        : null,
    likes: stats?.like_count ?? 0,
    liked_by_me: stats?.my_liked ?? false,
    // Comments load on-demand by FeedPost when expanded. For a fresh
    // post, both arrays are empty AND the count is 0. For stats-backed
    // rows, the count comes from the RPC.
    comments: [],
    comment_count: stats?.comment_count ?? 0,
    preview: false,
  };
}
