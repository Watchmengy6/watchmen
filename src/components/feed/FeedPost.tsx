"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { listMentionableMembers, loadPostCommentsAction } from "@/lib/feed/actions";
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
  /** Add a comment. Returns the inserted comment if successful. */
  onAddComment?: (
    postId: string,
    body: string,
  ) => Promise<{ comment?: FeedPostComment; error?: string } | void>;
  meName?: string;
  meAvatar?: string | null;
  /** Members the user can @mention in a comment. */
  mentionablePeople?: { id: string; full_name: string; username: string }[];
  /** When true, render the admin trash icon on the action bar. */
  isAdmin?: boolean;
}

export function FeedPost({
  post,
  onToggleLike,
  onAddComment,
  meName,
  meAvatar,
  mentionablePeople = [],
  isAdmin = false,
}: FeedPostProps) {
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
  const [pending, startTransition] = useTransition();
  const [, startLoadComments] = useTransition();

  function toggleComments() {
    setShowComments((s) => {
      const next = !s;
      // Lazy-load comments the first time the user expands.
      if (next && !commentsLoaded) {
        startLoadComments(async () => {
          const r = await loadPostCommentsAction(post.id);
          if (!r.error) setComments(r.comments);
          setCommentsLoaded(true);
        });
      }
      return next;
    });
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
        const r = await onToggleLike(post.id, next);
        if (r && "error" in r && r.error) {
          // revert
          setLiked(!next);
          setLikes((c) => (next ? c - 1 : c + 1));
        }
      });
    }
  }

  function submitComment() {
    const body = draft.trim();
    if (!body) return;
    if (!onAddComment) {
      setComments((cs) => [
        ...cs,
        {
          id: `local-${Date.now()}`,
          body,
          created_at: new Date().toISOString(),
          user_name: meName ?? "You",
          user_photo: meAvatar ?? null,
        },
      ]);
      setDraft("");
      return;
    }
    startTransition(async () => {
      const r = await onAddComment(post.id, body);
      if (r && "comment" in r && r.comment) {
        setComments((cs) => [...cs, r.comment!]);
        setDraft("");
      } else if (r && "error" in r && r.error) {
        // surface? for now keep draft so user can retry
      }
    });
  }

  return (
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

        {/* Content with parsed @mentions */}
        {post.body ? (
          <div className="px-4 pt-3 text-[15px] text-ink-100 leading-relaxed whitespace-pre-wrap">
            <RichText text={post.body} />
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="mt-3 w-full max-h-[420px] object-cover"
          />
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
          {isAdmin ? <AdminDeletePostButton postId={post.id} /> : null}
        </div>

        {/* Comments */}
        {showComments ? (
          <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-3">
            {comments.length === 0 ? (
              <div className="text-ink-400 text-sm">Be the first to comment.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Link
                    href={post.preview ? "/preview/member" : `/app/members/${c.user_id ?? ""}`}
                    className="shrink-0"
                  >
                    <Avatar src={c.user_photo ?? undefined} name={c.user_name} size={28} />
                  </Link>
                  <div className="flex-1 min-w-0 rounded-2xl bg-ink-800 hairline px-3 py-2">
                    <div className="flex items-start gap-2">
                      <div className="text-[12.5px] font-semibold text-white flex-1 truncate">
                        {c.user_name}
                      </div>
                      {/* Per-comment Report — Apple-required for any
                          user-generated content. Hidden when it's your
                          own comment. */}
                      {c.user_id && c.user_id !== post.author.id ? null : null}
                      <ReportButton
                        target={{ kind: "comment", id: c.id }}
                        className="text-ink-400 text-[10.5px] hover:text-white shrink-0"
                        label="Report"
                      />
                    </div>
                    <div className="text-[14px] text-ink-100 leading-snug mt-0.5">
                      <RichText text={c.body} />
                    </div>
                    <div className="text-[10.5px] text-ink-400 mt-1">
                      {relativeTime(c.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <Avatar src={meAvatar ?? undefined} name={meName ?? "You"} size={28} />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                    placeholder="Add a comment…"
                    className="flex-1 h-9 rounded-full bg-ink-800 hairline px-3 text-[14px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
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
    </Card>
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
