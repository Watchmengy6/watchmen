"use client";

import { FeedPost, type FeedPostShape } from "@/components/feed/FeedPost";
import { toggleLikeAction, addCommentAction } from "@/lib/feed/actions";

interface Props {
  post: FeedPostShape;
  meName: string;
  meAvatar?: string | null;
  mentionablePeople?: { id: string; full_name: string; username: string }[];
  /** Lowercased usernames the viewer has bidirectionally blocked —
      forwarded to FeedPost → RichText so historic @-mentions of
      blocked users render as inert plain text. */
  blockedUsernames?: string[];
  isAdmin?: boolean;
  /** Signed-in viewer's profile id, so FeedPost can render the author
      self-delete button on posts the viewer wrote. */
  viewerProfileId?: string;
}

/**
 * Thin client wrapper that binds the server actions to FeedPost's
 * onToggleLike / onAddComment props. Lives next to /app/home so we
 * don't accidentally import server actions from the preview tree.
 */
export function FeedPostClient({
  post,
  meName,
  meAvatar,
  mentionablePeople = [],
  blockedUsernames,
  isAdmin = false,
  viewerProfileId,
}: Props) {
  return (
    <FeedPost
      post={post}
      meName={meName}
      meAvatar={meAvatar}
      mentionablePeople={mentionablePeople}
      blockedUsernames={blockedUsernames}
      isAdmin={isAdmin}
      viewerProfileId={viewerProfileId}
      onToggleLike={async (postId, nextLiked) => {
        return await toggleLikeAction(postId, nextLiked);
      }}
      onAddComment={async (postId, body) => {
        return await addCommentAction(postId, body);
      }}
    />
  );
}
