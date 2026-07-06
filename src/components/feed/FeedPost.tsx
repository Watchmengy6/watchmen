"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  listMentionableMembers,
  loadPostCommentsAction,
  toggleCommentLikeAction,
} from "@/lib/feed/actions";
import { isBirthdayToday } from "@/lib/utils/birthday";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { GroupCategoryTag } from "@/components/groups/GroupCategoryTag";
import { ActivityCard, type ActivityCardKind } from "@/components/chat/ActivityCard";
import { RichText } from "@/components/feed/RichText";
import { SharePostButton } from "@/components/feed/SharePostButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import { AdminDeletePostButton } from "@/components/feed/AdminDeletePostButton";
import { AdminPinPostButton } from "@/components/feed/AdminPinPostButton";
import { DeleteOwnPostButton } from "@/components/feed/DeleteOwnPostButton";
import { ImageLightbox } from "@/components/feed/ImageLightbox";
import { FeedPollWidget } from "@/components/feed/FeedPollWidget";
import { relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export interface FeedPostAuthor {
  id: string;
  full_name: string;
  username?: string;
  profile_photo_url?: string | null;
  /** Headline shown below name. e.g. "Founder · Skyway Media" */
  role_text?: string | null;
  /** YYYY-MM-DD birthday — used to render 🎂 next to name on their day. */
  birthday?: string | null;
}

export interface FeedPostComment {
  id: string;
  body: string;
  created_at: string;
  user_name: string;
  user_photo?: string | null;
  user_id?: string;
  /** Top-level parent when this comment is a reply (single-level threading). */
  parent_id?: string | null;
  like_count?: number;
  my_liked?: boolean;
}

export interface FeedPostTaggedGroup {
  id: string;
  name: string;
  category?: string | null;
  emoji?: string | null;
}

export interface FeedPostActivity {
  kind: ActivityCardKind;
  /** Already-resolved object from server. Shape depends on `kind`. */
  data: any;
  hostName?: string | null;
  hostPhoto?: string | null;
  going?: boolean;
}

export interface FeedPostShape {
  id: string;
  type: "post" | "job" | "need" | "meetup" | "event" | "announcement";
  body: string;
  created_at: string;
  image_url?: string | null;
  /** Discriminator that tells the renderer whether image_url points at a
   *  still image or a video. Older rows may lack this and fall back to
   *  "image" — that was the pre-video behaviour. */
  media_type?: "image" | "video" | "none" | null;
  author: FeedPostAuthor;
  tagged_group?: FeedPostTaggedGroup | null;
  activity?: FeedPostActivity | null;
  /** Member-meetup post: when + where the brother wants to meet up. */
  meetup_when_at?: string | null;
  meetup_location?: string | null;
  /** Poll post: question + ordered option list + per-option vote totals + my vote (if any). */
  poll_question?: string | null;
  poll_options?: string[] | null;
  poll_votes?: number[] | null;
  poll_my_vote?: number | null;
  likes: number;
  liked_by_me: boolean;
  comments: FeedPostComment[];
  /** Real comment count (separate from comments.length, which is the
   * loaded-into-state preview count when comments lazy-load). */
  comment_count?: number;
  /** Whether the viewer is allowed to see "preview"-style profile links instead of real ones. */
  preview?: boolean;
  /** Pinned posts float to the top of the feed regardless of created_at. */
  pinned?: boolean;
}

export interface FeedPostProps {
  post: FeedPostShape;
  /** Toggle like. Should optimistically update. */
  onToggleLike?: (postId: string, nextLiked: boolean) => Promise<{ error?: string } | void>;
  /** Add a comment (optionally as a reply to another comment).
   *  Returns the inserted comment if successful. */
  onAddComment?: (
    postId: string,
    body: string,
    parentCommentId?: string | null,
  ) => Promise<{ comment?: FeedPostComment; error?: string } | void>;
  /** Delete a comment by id. Author-or-admin is enforced server-side. */
  onDeleteComment?: (commentId: string) => Promise<{ error?: string } | void>;
  /** Edit a post body (author only, enforced server-side). Returns saved body. */
  onEditPost?: (
    postId: string,
    body: string,
  ) => Promise<{ body?: string; error?: string } | void>;
  meName?: string;
  meAvatar?: string | null;
  /** Members the user can @mention in a comment. */
  mentionablePeople?: { id: string; full_name: string; username: string }[];
  /**
   * Lowercased usernames the viewer has bidirectionally blocked.
   * Passed down to <RichText> so historic @-mentions of blocked users
   * render as inert plain text instead of a clickable chip that would
   * deep-link to an empty member-search route. Fetched once per page
   * via `get_my_blocked_usernames()` RPC (migration 00041).
   */
  blockedUsernames?: string[];
  /** When true, render the admin trash icon on the action bar. */
  isAdmin?: boolean;
  /** Signed-in viewer's profile id — used to render the author self-delete button. */
  viewerProfileId?: string;
}

export function FeedPost({
  post,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  onEditPost,
  meName,
  meAvatar,
  mentionablePeople = [],
  blockedUsernames,
  isAdmin = false,
  viewerProfileId,
}: FeedPostProps) {
  const isAuthor = !!viewerProfileId && post.author?.id === viewerProfileId;
  // Local copy of the body so an inline edit updates instantly without a
  // full feed refetch. editing toggles the inline editor; lightboxSrc
  // drives the full-screen image viewer.
  const [body, setBody] = useState(post.body);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.body ?? "");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState<FeedPostComment[]>(
    Array.isArray(post.comments) ? post.comments : [],
  );
  // Comments now load on-demand. comment_count is the truth source for
  // the count badge; comments state is only populated after the user
  // expands the post (or after they add a comment themselves).
  const [commentsLoaded, setCommentsLoaded] = useState(
    Array.isArray(post.comments) && post.comments.length > 0,
  );
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  // Reply target — set when the user taps "Reply" on a comment. The
  // composer shows a "Replying to <name>" chip; submit sends parent id.
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  // Deep-link support: when a push notification (or share link) lands
  // on /app/home#post-<this post>, auto-expand the comment thread so a
  // "X commented / replied" tap drops the member straight into the
  // conversation, not just near the post (July 2026).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#post-${post.id}`) return;
    setShowComments(true);
    if (!commentsLoaded) {
      startLoadComments(async () => {
        try {
          const r = await loadPostCommentsAction(post.id);
          if (!r.error) setComments(r.comments);
        } catch {
          // Non-fatal — member can tap the comment icon to retry.
        } finally {
          setCommentsLoaded(true);
        }
      });
    }
    // Mount-only: the hash is consumed once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pending, startTransition] = useTransition();
  const [, startLoadComments] = useTransition();

  function toggleComments() {
    // CRITICAL: the comment fetch must be OUTSIDE the setState updater.
    // The old code called startLoadComments() INSIDE the setShowComments
    // updater fn. React replays updater functions when it rebases state
    // across lanes — which happens exactly when ANOTHER transition is
    // already in flight (e.g. the like action fired a second earlier).
    // Every replay fired loadPostCommentsAction again; every response
    // re-rendered and replayed again → INFINITE server-action POST loop
    // (confirmed live: 28+ POSTs to /app/home in seconds, Vercel 503s,
    // feed collapsed to the loading skeleton until app restart). This
    // was Dustin's "like then immediately comment → blank feed" bug.
    // Updater functions must be PURE — no side effects, ever.
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      startLoadComments(async () => {
        try {
          const r = await loadPostCommentsAction(post.id);
          if (!r.error) setComments(r.comments);
        } catch {
          // Leave comments as-is; the user can tap again to retry.
        } finally {
          setCommentsLoaded(true);
        }
      });
    }
  }

  // @ mention picker for comment input. Mirrors the composer's
  // load-once pattern: the first time the user types `@` we fetch all
  // approved members in one round-trip and filter locally on either
  // username or full name. The previous per-keystroke search action
  // only matched username.startsWith — useless when typing first
  // names — and added 120ms+ network latency per character.
  const mentionQuery = (() => {
    const m = draft.match(/@([\w-]*)$/);
    return m ? m[1] : null;
  })();

  const [loadedPeople, setLoadedPeople] = useState<
    { id: string; full_name: string; username: string }[]
  >([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  useEffect(() => {
    // Only load when the picker is actually being asked for (user
    // typed @), no static list was passed (preview/static contexts),
    // and we haven't already loaded this mount.
    if (mentionQuery === null) return;
    if (mentionablePeople.length > 0) return;
    if (peopleLoaded) return;
    let cancelled = false;
    (async () => {
      const rows = await listMentionableMembers();
      if (!cancelled) {
        setLoadedPeople(rows);
        setPeopleLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mentionQuery, mentionablePeople.length, peopleLoaded]);

  const allCommentMentionable =
    mentionablePeople.length > 0 ? mentionablePeople : loadedPeople;

  const mentionMatches =
    mentionQuery === null
      ? []
      : (() => {
          const q = mentionQuery.toLowerCase();
          return allCommentMentionable
            .filter((u) => {
              if (q === "") return true; // bare "@" — show suggestions
              return (
                u.username?.toLowerCase().includes(q) ||
                u.full_name?.toLowerCase().includes(q)
              );
            })
            .slice(0, 5);
        })();

  function insertCommentMention(username: string) {
    const next = draft.replace(/@([\w-]*)$/, `@${username} `);
    setDraft(next);
  }

  const memberHref = post.preview
    ? "/preview/member"
    : `/app/members/${post.author.id}`;
  const groupHref = post.preview
    ? "/preview/group"
    : post.tagged_group?.id
      ? `/app/groups/${post.tagged_group.id}`
      : "#";

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((c) => (next ? c + 1 : c - 1));
    if (onToggleLike) {
      startTransition(async () => {
        try {
          const r = await onToggleLike(post.id, next);
          if (r && "error" in r && r.error) throw new Error(r.error);
        } catch {
          // Revert the optimistic flip on ANY failure — including a
          // rejected action (network drop / deploy skew), which
          // previously escaped the transition unhandled.
          setLiked(!next);
          setLikes((c) => (next ? c - 1 : c + 1));
        }
      });
    }
  }

  function submitComment() {
    const body = draft.trim();
    if (!body) return;
    const parentId = replyTo?.id ?? null;
    if (!onAddComment) {
      setComments((cs) => [
        ...cs,
        {
          id: `local-${Date.now()}`,
          body,
          created_at: new Date().toISOString(),
          user_name: meName ?? "You",
          user_photo: meAvatar ?? null,
          parent_id: parentId,
          like_count: 0,
          my_liked: false,
        },
      ]);
      setDraft("");
      setReplyTo(null);
      return;
    }
    startTransition(async () => {
      try {
        const r = await onAddComment(post.id, body, parentId);
        if (r && "comment" in r && r.comment) {
          setComments((cs) => [...cs, r.comment!]);
          setDraft("");
          setReplyTo(null);
        }
        // On {error}: keep the draft so the user can retry.
      } catch {
        // Rejected action (network drop / deploy skew) — keep the
        // draft; user retries. Never let this bubble out of the
        // transition and take down the feed.
      }
    });
  }

  /** Optimistic heart toggle on a single comment row. */
  function toggleCommentLike(comment: FeedPostComment) {
    const next = !comment.my_liked;
    const apply = (cs: FeedPostComment[], liked: boolean) =>
      cs.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              my_liked: liked,
              like_count: Math.max(0, (c.like_count ?? 0) + (liked ? 1 : -1)),
            }
          : c,
      );
    setComments((cs) => apply(cs, next));
    if (post.preview) return; // demo tree — local flip only
    startTransition(async () => {
      try {
        const r = await toggleCommentLikeAction(comment.id, next);
        if (r?.error) throw new Error(r.error);
      } catch {
        setComments((cs) => apply(cs, !next)); // revert on any failure
      }
    });
  }

  function saveEdit() {
    if (!onEditPost) return;
    const next = editDraft.trim();
    if (!next) return;
    startTransition(async () => {
      try {
        const r = await onEditPost(post.id, next);
        if (r && "error" in r && r.error) {
          return; // keep the editor open so they can retry
        }
        const saved = r && "body" in r && r.body ? r.body : next;
        setBody(saved);
        setEditing(false);
      } catch {
        // Rejected action — keep the editor open for retry.
      }
    });
  }

  function handleDeleteComment(commentId: string) {
    if (!onDeleteComment) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this comment?")) {
      return;
    }
    const prev = comments;
    // Optimistic remove — the comment AND its replies (the DB cascade
    // deletes children server-side; mirror it locally).
    setComments((cs) =>
      cs.filter((c) => c.id !== commentId && c.parent_id !== commentId),
    );
    startTransition(async () => {
      try {
        const r = await onDeleteComment(commentId);
        if (r && "error" in r && r.error) setComments(prev);
      } catch {
        setComments(prev);
      }
    });
  }

  // Single-level threading: split loaded comments into top-level rows
  // and replies grouped under their parent. A reply whose parent isn't
  // in the set (edge case) falls back to rendering top-level rather
  // than silently disappearing.
  const commentIds = new Set(comments.map((c) => c.id));
  const topLevelComments = comments.filter(
    (c) => !c.parent_id || !commentIds.has(c.parent_id),
  );
  const repliesByParent = new Map<string, FeedPostComment[]>();
  comments.forEach((c) => {
    if (c.parent_id && commentIds.has(c.parent_id)) {
      const arr = repliesByParent.get(c.parent_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_id, arr);
    }
  });

  /** One comment row — used for both top-level comments and replies. */
  const renderCommentRow = (c: FeedPostComment) => (
    <div className="flex items-start gap-2.5">
      <Link
        href={post.preview ? "/preview/member" : `/app/members/${c.user_id ?? ""}`}
        className="shrink-0"
      >
        <Avatar src={c.user_photo ?? undefined} name={c.user_name} size={28} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-ink-800 hairline px-3 py-2">
          <div className="flex items-start gap-2">
            <div className="text-[12.5px] font-semibold text-white flex-1 truncate">
              {c.user_name}
            </div>
            {/* Report — only on others' comments (you can't report your
                own). Apple-required for any UGC. */}
            {!(viewerProfileId && c.user_id === viewerProfileId) ? (
              <ReportButton
                target={{ kind: "comment", id: c.id }}
                className="text-ink-400 text-[10.5px] hover:text-white shrink-0"
                label="Report"
              />
            ) : null}
            {/* Delete — your own comment, or any comment if admin. */}
            {onDeleteComment &&
            ((viewerProfileId && c.user_id === viewerProfileId) || isAdmin) ? (
              <button
                type="button"
                onClick={() => handleDeleteComment(c.id)}
                className="text-ink-400 text-[10.5px] hover:text-red-300 shrink-0"
              >
                Delete
              </button>
            ) : null}
          </div>
          <div
            className="text-[14px] text-ink-100 leading-snug mt-0.5 whitespace-pre-wrap break-words"
            style={{ overflowWrap: "anywhere" }}
          >
            <RichText text={c.body} blockedUsernames={blockedUsernames} />
          </div>
        </div>
        {/* Footer: time · Like · Reply. Like is optimistic; Reply arms
            the composer with this comment's THREAD (replies to a reply
            land under the original top-level parent). */}
        <div className="flex items-center gap-4 mt-1 px-1.5">
          <span className="text-[10.5px] text-ink-400">
            {relativeTime(c.created_at)}
          </span>
          <button
            type="button"
            onClick={() => toggleCommentLike(c)}
            className={cn(
              "flex items-center gap-1 text-[10.5px] font-medium transition-colors",
              c.my_liked ? "text-pink-300" : "text-ink-400 hover:text-white",
            )}
            aria-pressed={!!c.my_liked}
            aria-label={c.my_liked ? "Unlike comment" : "Like comment"}
          >
            {c.my_liked ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M12 21s-7-4.5-9.3-9.3C1 8.5 3.2 5 6.6 5c1.8 0 3.4 1 4.4 2.3C12 6 13.6 5 15.4 5 18.8 5 21 8.5 19.3 11.7 17 16.5 12 21 12 21Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <path d="M12 21s-7-4.5-9.3-9.3C1 8.5 3.2 5 6.6 5c1.8 0 3.4 1 4.4 2.3C12 6 13.6 5 15.4 5 18.8 5 21 8.5 19.3 11.7 17 16.5 12 21 12 21Z" />
              </svg>
            )}
            {(c.like_count ?? 0) > 0 ? (
              <span className="tabular-nums">{c.like_count}</span>
            ) : (
              <span>Like</span>
            )}
          </button>
          <button
            type="button"
            // Pass the TAPPED comment's id (not the pre-flattened
            // parent): the server flattens threading onto the top-level
            // parent anyway, but uses the tapped comment's AUTHOR for
            // the "replied to your comment" push — so replying to a
            // reply notifies the brother you actually answered
            // (audit 2026-07-05).
            onClick={() => setReplyTo({ id: c.id, name: c.user_name })}
            className="text-[10.5px] font-medium text-ink-400 hover:text-white transition-colors"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // id anchor: push notifications and share links deep-link to
    // /app/home#post-<id>; ScrollToPostFromHash scrolls here and the
    // scroll-mt clears the sticky feed header (July 2026).
    <div id={`post-${post.id}`} className="scroll-mt-24">
    <Card className="overflow-hidden">
      <CardBody className="!px-0 !py-0">
        {/* Header — name + avatar tap to profile */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <Link href={memberHref} className="shrink-0">
            <Avatar src={post.author.profile_photo_url ?? undefined} name={post.author.full_name} size={40} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={memberHref}
                className="text-white text-[14px] font-semibold truncate hover:text-gold-200"
              >
                {post.author.full_name}
                {isBirthdayToday(post.author.birthday) ? (
                  <span className="ml-1" title="Birthday today" aria-label="Birthday today">
                    🎂
                  </span>
                ) : null}
              </Link>
              {post.pinned ? (
                <span
                  className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-gold-500/20 ring-1 ring-gold-500/40 text-gold-200 text-[10px] tracking-[0.18em] uppercase font-semibold"
                  title="Pinned by admin"
                >
                  📌 Pinned
                </span>
              ) : null}
              {post.type === "job" ? (
                <Badge variant="gold">Hiring</Badge>
              ) : post.type === "need" ? (
                <Badge variant="muted">Need</Badge>
              ) : post.type === "meetup" ? (
                <Badge variant="muted">Meetup</Badge>
              ) : post.type === "event" ? (
                <Badge variant="gold">Event</Badge>
              ) : post.type === "announcement" ? (
                <Badge variant="gold">Announcement</Badge>
              ) : null}
            </div>
            {post.author.role_text ? (
              <div className="text-ink-400 text-[11.5px] truncate">{post.author.role_text}</div>
            ) : null}
          </div>
          <div className="text-[11px] text-ink-400 shrink-0">{relativeTime(post.created_at)}</div>
        </div>

        {/* Tagged group chip */}
        {post.tagged_group ? (
          <div className="px-4 pt-3">
            <Link
              href={groupHref}
              className="inline-flex items-center gap-2 h-7 pr-2.5 pl-1 rounded-full bg-ink-800 hairline text-[11.5px] text-ink-100 active:bg-ink-700 transition-colors"
            >
              <span className="h-6 w-6 rounded-full bg-ink-700 flex items-center justify-center text-[13px]">
                {post.tagged_group.emoji ?? post.tagged_group.name[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="font-medium">{post.tagged_group.name}</span>
              {post.tagged_group.category ? (
                <GroupCategoryTag category={post.tagged_group.category as any} />
              ) : null}
            </Link>
          </div>
        ) : null}

        {/* Content with parsed @mentions. break-words + overflow-wrap:anywhere
            force long unbroken URLs / handles to wrap inside the card —
            without this they push the card width past the viewport and
            iOS lets the whole page rubber-band sideways. */}
        {editing ? (
          <div className="px-4 pt-3">
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={4}
              spellCheck
              autoCapitalize="sentences"
              autoCorrect="on"
              className="w-full rounded-xl bg-ink-900/60 hairline px-3 py-2.5 text-[15px] text-white outline-none focus:ring-2 focus:ring-gold-400/30 resize-none break-words"
              style={{ overflowWrap: "anywhere" }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={pending || !editDraft.trim()}
                className="h-8 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditDraft(body ?? "");
                }}
                className="h-8 px-3 rounded-full text-[13px] text-ink-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : body ? (
          <div
            className="px-4 pt-3 text-[15px] text-ink-100 leading-relaxed whitespace-pre-wrap break-words"
            style={{ overflowWrap: "anywhere" }}
          >
            <RichText text={body} blockedUsernames={blockedUsernames} />
          </div>
        ) : null}

        {/* Activity card (meetup or event) — inline RSVP */}
        {post.activity ? (
          <div className="px-4 pt-3">
            <ActivityCard
              kind={post.activity.kind}
              data={post.activity.data}
              hostName={post.activity.hostName ?? ""}
              hostPhoto={post.activity.hostPhoto ?? null}
              going={post.activity.going}
            />
          </div>
        ) : null}

        {/* Inline poll — votes upsert per-member, optimistic UI flips
            bar percentages instantly. */}
        {post.poll_options && post.poll_options.length > 0 ? (
          <FeedPollWidget
            postId={post.id}
            options={post.poll_options}
            initialVotes={post.poll_votes ?? post.poll_options.map(() => 0)}
            initialMyVote={post.poll_my_vote ?? null}
          />
        ) : null}

        {/* Member-meetup card — structured when/where data attached to a
            regular feed post. Brothers signal interest via the like
            button below; comments coordinate the details. */}
        {post.meetup_when_at ? (
          <div className="px-4 pt-3">
            <MemberMeetupCard
              whenAt={post.meetup_when_at}
              location={post.meetup_location ?? ""}
              hostName={post.author.full_name}
              hostPhoto={post.author.profile_photo_url ?? null}
            />
          </div>
        ) : null}

        {post.image_url ? (
          post.media_type === "video" ? (
            // Video render. `controls` exposes play/scrub/volume,
            // `playsInline` keeps it inside the feed card on iOS,
            // `preload="metadata"` pulls down the first frame so the
            // card isn't a black box before play.
            // The poster sibling was uploaded at `${mediaUrl}.poster.jpg`
            // — see lib/uploads/client.ts. Derive it here instead of
            // round-tripping through a new schema column.
            // object-contain + bg-black gives portrait clips a clean
            // letterbox without breaking the feed card width — the old
            // unconstrained render pushed past max-w-screen-sm on
            // portrait sources and let the whole page scroll sideways.
            <video
              src={post.image_url}
              poster={`${post.image_url}.poster.jpg`}
              controls
              playsInline
              preload="metadata"
              className="mt-3 block w-full max-w-full max-h-[420px] object-contain bg-black"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              onClick={() => setLightboxSrc(post.image_url!)}
              className="mt-3 block w-full max-w-full h-auto cursor-zoom-in"
            />
          )
        ) : (
          <div className="mt-3 h-px" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 py-2 border-t border-white/[0.04]">
          <button
            onClick={toggleLike}
            disabled={pending}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 rounded-full text-[13px] transition-colors",
              liked ? "text-pink-300" : "text-ink-200 hover:text-white",
            )}
            aria-pressed={liked}
          >
            {liked ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
                <path d="M12 21s-7-4.5-9.3-9.3C1 8.5 3.2 5 6.6 5c1.8 0 3.4 1 4.4 2.3C12 6 13.6 5 15.4 5 18.8 5 21 8.5 19.3 11.7 17 16.5 12 21 12 21Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
                <path d="M12 21s-7-4.5-9.3-9.3C1 8.5 3.2 5 6.6 5c1.8 0 3.4 1 4.4 2.3C12 6 13.6 5 15.4 5 18.8 5 21 8.5 19.3 11.7 17 16.5 12 21 12 21Z" />
              </svg>
            )}
            <span className="tabular-nums">{likes}</span>
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 px-3 h-9 rounded-full text-[13px] text-ink-200 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M21 12c0 4.2-4 7.5-9 7.5-1.4 0-2.7-.25-3.85-.7L3 21l1.55-4.4C3.6 15.4 3 13.75 3 12 3 7.85 7 4.5 12 4.5s9 3.35 9 7.5Z" />
            </svg>
            <span className="tabular-nums">
              {commentsLoaded ? comments.length : (post.comment_count ?? 0)}
            </span>
          </button>

          <div className="flex-1" />

          <SharePostButton postId={post.id} authorName={post.author.full_name} />
          <ReportButton
            target={{ kind: "post", id: post.id }}
            className="px-3 h-9 text-ink-400 text-[12px] hover:text-white"
            label="Report"
          />
          {isAdmin ? (
            <AdminPinPostButton postId={post.id} initialPinned={!!post.pinned} />
          ) : null}
          {/* Author can delete their own post. Admin delete is the heavier
              hammer (red icon, service-role bypass) used for moderation; the
              author button is shown to non-admin authors only so the action
              row doesn't double up for an admin viewing their own post. */}
          {isAuthor && onEditPost && !editing ? (
            <button
              type="button"
              onClick={() => {
                setEditDraft(body ?? "");
                setEditing(true);
              }}
              className="px-3 h-9 text-ink-400 text-[12px] hover:text-white"
            >
              Edit
            </button>
          ) : null}
          {isAuthor && !isAdmin ? <DeleteOwnPostButton postId={post.id} /> : null}
          {isAdmin ? <AdminDeletePostButton postId={post.id} /> : null}
        </div>

        {/* Comments */}
        {showComments ? (
          <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-3">
            {comments.length === 0 ? (
              <div className="text-ink-400 text-sm">Be the first to comment.</div>
            ) : (
              topLevelComments.map((c) => (
                <div key={c.id}>
                  {renderCommentRow(c)}
                  {/* Replies — indented one level under the parent. */}
                  {(repliesByParent.get(c.id) ?? []).map((r) => (
                    <div key={r.id} className="ml-9 mt-2">
                      {renderCommentRow(r)}
                    </div>
                  ))}
                </div>
              ))
            )}
            <div className="pt-1">
              {/* Reply-mode chip — shows who the comment will land under. */}
              {replyTo ? (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[12px] text-ink-300">
                    Replying to{" "}
                    <span className="text-gold-300 font-medium">{replyTo.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Cancel reply"
                    className="h-5 w-5 rounded-full bg-ink-800 hairline text-ink-300 text-[11px] leading-none flex items-center justify-center hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <Avatar src={meAvatar ?? undefined} name={meName ?? "You"} size={28} />
                <div className="flex-1 min-w-0 flex items-end gap-2">
                  {/* A <textarea>, not <input>: an <input> is single-line and
                      scrolls a long comment / URL sideways off the field
                      instead of wrapping. The textarea wraps as you type,
                      grows up to ~5 lines (max-h-32) then scrolls. min-w-0 +
                      break-words keep an unbroken URL inside the bubble. */}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                    placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Add a comment…"}
                    rows={1}
                    spellCheck
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    className="flex-1 min-w-0 resize-none max-h-32 rounded-2xl bg-ink-800 hairline px-3 py-2 text-[14px] leading-snug text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 break-words"
                    style={{ overflowWrap: "anywhere" }}
                  />
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={!draft.trim() || pending}
                    className="h-9 w-9 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black flex items-center justify-center disabled:opacity-40 shrink-0"
                    aria-label="Send comment"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M2 21 23 12 2 3l5 9-5 9Z" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* @ mention live picker for comments */}
              {mentionMatches.length > 0 ? (
                <div className="mt-2 rounded-xl bg-ink-900/80 hairline overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] tracking-[0.25em] uppercase text-ink-400">
                    Tag a brother
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {mentionMatches.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => insertCommentMention(u.username)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] text-left"
                      >
                        <Avatar name={u.full_name} size={24} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-white truncate">{u.full_name}</div>
                          <div className="text-[11px] text-gold-300/80">@{u.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardBody>
      {lightboxSrc ? (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      ) : null}
    </Card>
    </div>
  );
}

/**
 * Inline card rendered when a feed post has structured meetup_when_at +
 * meetup_location fields. Looks like the official meetup activity card
 * but doesn't link out — the post body + comments ARE the meetup.
 */
function MemberMeetupCard({
  whenAt,
  location,
  hostName,
  hostPhoto,
}: {
  whenAt: string;
  location: string;
  hostName: string;
  hostPhoto: string | null;
}) {
  const when = new Date(whenAt);
  const month = when.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = when.getDate();
  const dateLabel = when.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="rounded-2xl bg-ink-800/80 ring-1 ring-white/[0.06] p-3 flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-gold-500/15 ring-1 ring-gold-500/25 flex flex-col items-center justify-center shrink-0">
        <div className="text-[9px] uppercase tracking-wider text-gold-200 leading-none">
          {month}
        </div>
        <div className="text-[17px] font-bold text-white leading-none mt-0.5">
          {day}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-gold-300/80">
          Meetup · {hostName}
        </div>
        <div className="text-white text-[14px] font-semibold mt-0.5 truncate">
          {location}
        </div>
        <div className="text-ink-300 text-[12px] truncate">{dateLabel}</div>
      </div>
    </div>
  );
}
