"use client";

import { FeedPost, type FeedPostShape } from "@/components/feed/FeedPost";
import { toggleLikeAction, addCommentAction } from "@/lib/feed/actions";

interface Props {
  post: FeedPostShape;
  meName: string;
  meAvatar?: string | null;
}

/**
 * Thin client wrapper that binds the server actions to FeedPost's
 * onToggleLike / onAddComment props. Lives next to /app/home so we
 * don't accidentally import server actions from the preview tree.
 */
export function FeedPostClient({ post, meName, meAvatar }: Props) {
  return (
    <FeedPost
      post={post}
      meName={meName}
      meAvatar={meAvatar}
      onToggleLike={async (postId, nextLiked) => {
        return await toggleLikeAction(postId, nextLiked);
      }}
      onAddComment={async (postId, body) => {
        return await addCommentAction(postId, body);
      }}
    />
  );
}
