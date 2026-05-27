"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { GroupCategoryTag } from "@/components/groups/GroupCategoryTag";
import { ActivityCard } from "@/components/chat/ActivityCard";
import { RichText } from "@/components/feed/RichText";
import { relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { MockFeedPost } from "@/lib/preview/mock";
import { mockMeetups, mockEvents } from "@/lib/preview/mock";

export function FeedPost({ post }: { post: MockFeedPost }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");

  const toggleLike = () => {
    setLiked((prev) => {
      setLikes((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardBody className="!px-0 !py-0">
        {/* Header — name + avatar tap to profile */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <Link href="/preview/member" className="shrink-0">
            <Avatar src={post.user_photo} name={post.user_name} size={40} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/preview/member"
                className="text-white text-[14px] font-semibold truncate hover:text-gold-200"
              >
                {post.user_name}
              </Link>
              {post.type === "job" ? (
                <Badge variant="gold">Hiring</Badge>
              ) : post.type === "need" ? (
                <Badge variant="muted">Need</Badge>
              ) : post.type === "meetup" ? (
                <Badge variant="muted">Meetup</Badge>
              ) : post.type === "event" ? (
                <Badge variant="gold">Event</Badge>
              ) : null}
            </div>
            {post.user_role ? (
              <div className="text-ink-400 text-[11.5px] truncate">{post.user_role}</div>
            ) : null}
          </div>
          <div className="text-[11px] text-ink-400 shrink-0">{relativeTime(post.created_at)}</div>
        </div>

        {/* Tagged group chip */}
        {post.tagged_group ? (
          <div className="px-4 pt-3">
            <Link
              href="/preview/group"
              className="inline-flex items-center gap-2 h-7 pr-2.5 pl-1 rounded-full bg-ink-800 hairline text-[11.5px] text-ink-100 active:bg-ink-700 transition-colors"
            >
              <span className="h-6 w-6 rounded-full bg-ink-700 flex items-center justify-center text-[13px]">
                {post.tagged_group.emoji}
              </span>
              <span className="font-medium">{post.tagged_group.name}</span>
              <GroupCategoryTag category={post.tagged_group.category} />
            </Link>
          </div>
        ) : null}

        {/* Content with parsed @mentions */}
        {post.content ? (
          <div className="px-4 pt-3 text-[15px] text-ink-100 leading-relaxed whitespace-pre-wrap">
            <RichText text={post.content} />
          </div>
        ) : null}

        {/* Activity card (meetup or event) — inline RSVP */}
        {post.activity_ref ? (
          <div className="px-4 pt-3">
            {post.activity_ref.kind === "meetup" ? (
              (() => {
                const m = mockMeetups.find((x) => x.id === (post.activity_ref as any).meetup_id);
                if (!m) return null;
                return (
                  <ActivityCard
                    kind="meetup"
                    data={m}
                    hostName={m.host_name}
                    hostPhoto={m.host_photo}
                    going={m.user_going}
                  />
                );
              })()
            ) : null}
            {post.activity_ref.kind === "event" ? (
              (() => {
                const e = mockEvents.find((x) => x.id === (post.activity_ref as any).event_id);
                if (!e) return null;
                return (
                  <ActivityCard
                    kind="event"
                    data={e as any}
                    hostName="Dustin Hardy"
                    hostPhoto={null}
                    going={e.user_going}
                  />
                );
              })()
            ) : null}
          </div>
        ) : null}

        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            className="mt-3 w-full max-h-[420px] object-cover"
          />
        ) : !post.activity_ref ? (
          <div className="mt-3 h-px" />
        ) : (
          <div className="mt-3 h-px" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 py-2 border-t border-white/[0.04]">
          <button
            onClick={toggleLike}
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
            onClick={() => setShowComments((s) => !s)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-full text-[13px] text-ink-200 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M21 12c0 4.2-4 7.5-9 7.5-1.4 0-2.7-.25-3.85-.7L3 21l1.55-4.4C3.6 15.4 3 13.75 3 12 3 7.85 7 4.5 12 4.5s9 3.35 9 7.5Z" />
            </svg>
            <span className="tabular-nums">{post.comments.length}</span>
          </button>

          <div className="flex-1" />

          <button className="px-3 h-9 rounded-full text-[13px] text-ink-200 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v14" />
            </svg>
          </button>
        </div>

        {/* Comments */}
        {showComments ? (
          <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-3">
            {post.comments.length === 0 ? (
              <div className="text-ink-400 text-sm">Be the first to comment.</div>
            ) : (
              post.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Link href="/preview/member" className="shrink-0">
                    <Avatar src={c.user_photo} name={c.user_name} size={28} />
                  </Link>
                  <div className="flex-1 min-w-0 rounded-2xl bg-ink-800 hairline px-3 py-2">
                    <Link
                      href="/preview/member"
                      className="text-[12.5px] font-semibold text-white hover:text-gold-200"
                    >
                      {c.user_name}
                    </Link>
                    <div className="text-[14px] text-ink-100 leading-snug mt-0.5">
                      <RichText text={c.content} />
                    </div>
                    <div className="text-[10.5px] text-ink-400 mt-1">
                      {relativeTime(c.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 pt-1">
              <Avatar name="You" size={28} />
              <div className="flex-1">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment…"
                  className="w-full h-9 rounded-full bg-ink-800 hairline px-3 text-[14px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </div>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
