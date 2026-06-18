"use client";

/**
 * Client-side feed-state plumbing for /app/home (Option D, Phase 2).
 *
 * Why this exists:
 *   The home page server component fetches the initial feed slice
 *   (posts + stats) and hands it down here. Once mounted, the posts
 *   live in this client component's React state — so a new post can
 *   be prepended INSTANTLY when the user submits, without forcing
 *   Next.js to re-render the entire /app/home route (which would
 *   refetch the next-event banner, birthdays, joined groups, AND the
 *   stats RPC just to learn one new post exists).
 *
 *   FeedComposer (above the list) and PullToRefresh (around the
 *   whole thing) both need to talk to this state in Phase 3 — they
 *   consume it via the `useFeedState()` hook below.
 *
 * Three pieces in this file:
 *   - <FeedStateProvider> — wraps the post-list + composer area in a
 *     Context provider. Initialized from `initialPosts` (the server
 *     render). Phase 2 just renders the list from this state; Phase
 *     3 hooks composer/PullToRefresh callbacks into prependPost /
 *     replacePosts.
 *   - useFeedState() — typed hook for consumers (throws if used
 *     outside a provider so misuse is loud).
 *   - <FeedList> — the actual post-list renderer. Reads `posts` from
 *     context and maps them to <FeedPostClient> (same renderer the
 *     page used inline before). Accepts the per-post props (viewer
 *     identity, mentionable members, blocked usernames, etc) as a
 *     single `postProps` bundle so the page only threads them once.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { FeedPostShape } from "@/components/feed/FeedPost";
import { FeedPostClient } from "./FeedPostClient";
import { FeedComposer, type FeedComposerProps } from "@/components/feed/FeedComposer";
import { PullToRefresh } from "@/components/feed/PullToRefresh";
import { createPostAction, getFeedSliceAction } from "@/lib/feed/actions";

// ---- Context ---------------------------------------------------------------

type FeedStateContextValue = {
  /** Current ordered list of posts visible to the viewer. */
  posts: FeedPostShape[];
  /**
   * Optimistically prepend a new post to the top of the feed. Called
   * by FeedComposer in Phase 3 after createPostAction succeeds and
   * returns the inserted post (in FeedPostShape) — so it appears
   * instantly without a server round-trip.
   */
  prependPost: (post: FeedPostShape) => void;
  /**
   * Replace the entire post list. Called by PullToRefresh in Phase 3
   * after getFeedSliceAction returns the fresh slice. Also used as a
   * post-submit reconciliation step if we want to sync any optimistic
   * prepend with whatever the server actually wrote.
   */
  replacePosts: (posts: FeedPostShape[]) => void;
  /**
   * Optimistically remove a post by id. Called by DeleteOwnPostButton
   * and AdminDeletePostButton after the server delete action returns
   * success — so the deleted post disappears from the feed
   * immediately instead of lingering until the next pull-to-refresh.
   * Idempotent: removing an id that isn't in the list is a no-op.
   */
  removePost: (postId: string) => void;
};

const FeedStateContext = createContext<FeedStateContextValue | null>(null);

/**
 * Hook consumers use to read posts / call mutators. Throws when used
 * outside <FeedStateProvider> so a misplaced consumer surfaces loudly
 * in development instead of silently rendering an empty list.
 */
export function useFeedState(): FeedStateContextValue {
  const ctx = useContext(FeedStateContext);
  if (!ctx) {
    throw new Error(
      "useFeedState must be used inside <FeedStateProvider> — check that the consumer is rendered within the home page's feed surface.",
    );
  }
  return ctx;
}

/**
 * Same as useFeedState, but returns null instead of throwing when
 * rendered outside the provider. Use this from components that MAY
 * render outside the home feed surface (e.g. delete buttons that
 * appear in feed posts AND on a future post-detail route). When the
 * caller gets null, it should fall back to relying on the server
 * action's revalidatePath for state updates.
 */
export function useFeedStateOptional(): FeedStateContextValue | null {
  return useContext(FeedStateContext);
}

// ---- Provider --------------------------------------------------------------

export function FeedStateProvider({
  initialPosts,
  children,
}: {
  initialPosts: FeedPostShape[];
  children: ReactNode;
}) {
  const [posts, setPosts] = useState<FeedPostShape[]>(initialPosts);

  // Stable identity for both callbacks so consumers that pass them
  // into useEffect deps don't re-fire on every render.
  const prependPost = useCallback((post: FeedPostShape) => {
    setPosts((prev) => {
      // De-dupe defensively — if the same post id is already at the
      // top (e.g. submit fired twice somehow, or PullToRefresh raced
      // a prepend), skip the second insert.
      if (prev.length > 0 && prev[0].id === post.id) return prev;
      return [post, ...prev];
    });
  }, []);

  const replacePosts = useCallback((next: FeedPostShape[]) => {
    setPosts(next);
  }, []);

  const removePost = useCallback((postId: string) => {
    // Filter out the row. Identity comparison on `id` — we never
    // place two different post objects with the same id in this list
    // (prependPost de-dupes), so a simple .filter is safe.
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <FeedStateContext.Provider value={{ posts, prependPost, replacePosts, removePost }}>
      {children}
    </FeedStateContext.Provider>
  );
}

// ---- List renderer ---------------------------------------------------------

/**
 * Per-post props the list needs but that are constant across every
 * row (viewer identity, what they can @mention, who they've blocked,
 * admin flag). Bundled together so the page only threads them once
 * into <FeedList postProps={...} />.
 */
export type FeedListPostProps = {
  meName: string;
  meAvatar?: string | null;
  mentionablePeople?: { id: string; full_name: string; username: string }[];
  blockedUsernames?: string[];
  isAdmin?: boolean;
  viewerProfileId?: string;
};

/**
 * Consumer that renders the actual list of FeedPostClient cards.
 * Reads `posts` from FeedStateContext so it re-renders when posts
 * are prepended or replaced. Falls back to a friendly empty state
 * when the brotherhood hasn't shared anything yet.
 */
export function FeedList({ postProps }: { postProps: FeedListPostProps }) {
  const { posts } = useFeedState();

  if (posts.length === 0) {
    return (
      <div className="text-center text-ink-300 text-sm py-10">
        No posts yet. Be the first to share something with the room.
      </div>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <FeedPostClient
          key={post.id}
          post={post}
          meName={postProps.meName}
          meAvatar={postProps.meAvatar}
          mentionablePeople={postProps.mentionablePeople}
          blockedUsernames={postProps.blockedUsernames}
          isAdmin={postProps.isAdmin}
          viewerProfileId={postProps.viewerProfileId}
        />
      ))}
    </>
  );
}

// ---- Phase 3 consumers -----------------------------------------------------

/**
 * Home-page wrapper around <FeedComposer> that intercepts the submit
 * to (1) call createPostAction directly, (2) optimistically prepend
 * the returned post to the feed via FeedStateContext. Result: a new
 * post appears at the top of the list instantly — no router.refresh()
 * round-trip, no full /app/home re-render.
 *
 * Accepts the same props as FeedComposer EXCEPT `onSubmit` (we own
 * that now). The composer's own state (text, type, media, polls)
 * still resets via FeedComposer's internal logic; we just hand the
 * server result into FeedStateContext.
 */
export function HomeFeedComposer(props: Omit<FeedComposerProps, "onSubmit">) {
  const { prependPost } = useFeedState();

  return (
    <FeedComposer
      {...props}
      onSubmit={async (formData) => {
        const r = await createPostAction(formData);
        if (r?.error) {
          return { error: r.error };
        }
        if (r?.post) {
          prependPost(r.post);
        }
        // FeedComposer treats absence of `error` as success — return
        // nothing so it resets its own state. The prepend above
        // already placed the new post in the visible feed.
        return undefined;
      }}
    />
  );
}

/**
 * Home-page wrapper around <PullToRefresh> that swaps the default
 * router.refresh() for a targeted feed-slice refetch:
 *   1. Call getFeedSliceAction() — returns just { posts } (no
 *      next-event banner, no birthdays, no joined groups refetch)
 *   2. Replace the post list in FeedStateContext with the fresh slice
 *
 * Net effect: pull-to-refresh syncs the feed without forcing the
 * server component to re-fetch its other six parallel queries. Same
 * UX as before; an order of magnitude less data over the wire.
 *
 * If getFeedSliceAction errors, we silently swallow it — the
 * existing feed stays on screen. Better than flashing an empty list
 * on a transient network hiccup; a hard refresh from the user is
 * always available as the recovery path.
 */
export function HomePullToRefresh({ children }: { children: ReactNode }) {
  const { replacePosts } = useFeedState();

  return (
    <PullToRefresh
      onRefresh={async () => {
        const r = await getFeedSliceAction();
        if (r?.posts) {
          replacePosts(r.posts);
        }
      }}
    >
      {children}
    </PullToRefresh>
  );
}
