"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GroupCategoryTag } from "@/components/groups/GroupCategoryTag";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TimeDivider } from "@/components/chat/TimeDivider";
import { groupMessages } from "@/components/chat/groupMessages";
import { FeedPost } from "@/components/feed/FeedPost";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { cn } from "@/lib/utils/cn";
import { mockGroups, mockMembers, mockFeed } from "@/lib/preview/mock";

// The same messages used in /preview/group-chat, trimmed to last 3 for preview.
const recentMessages = [
  {
    id: "gm3",
    chat_id: "g_mastermind",
    user_id: "p_aaron",
    content: "Plus where I think we're going to land Q3 if nothing changes.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:50:30Z",
    updated_at: "2026-05-25T11:50:30Z",
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "gm4",
    chat_id: "g_mastermind",
    user_id: "p_dustin",
    content: "Good. I want to talk about the deal flow problem too.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T12:08:00Z",
    updated_at: "2026-05-25T12:08:00Z",
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [
      { reaction_type: "like", user_id: "p_aaron" },
      { reaction_type: "like", user_id: "p_devon" },
    ],
  },
];

export default function PreviewGroupDetail() {
  const group = mockGroups.find((g) => g.id === "g_mastermind") ?? mockGroups[0];
  const members = mockMembers.slice(0, 6);
  const taggedPosts = mockFeed.filter((p) => p.tagged_group?.id === group.id);
  const items = groupMessages(recentMessages as any, "p_aaron");
  const [muted, setMuted] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      {/* Cover header — colored gradient with emoji */}
      <div className="relative">
        <div className={cn("h-44 bg-gradient-to-br", group.gradient)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
        <Link
          href="/preview/groups"
          className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
        >
          ‹
        </Link>
        <button
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
          aria-label="Settings"
        >
          ⋯
        </button>
        <div className="absolute -bottom-8 left-5 h-20 w-20 rounded-3xl bg-black/40 ring-4 ring-ink-900 flex items-center justify-center text-4xl">
          {group.emoji}
        </div>
      </div>

      <div className="px-5 pt-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
            <div className="text-ink-300 text-sm mt-1">{group.description}</div>
          </div>
          <GroupCategoryTag category={group.category} size="md" />
        </div>

        <div className="flex items-center gap-2 mt-4 text-[12.5px] text-ink-300">
          <div className="flex items-center -space-x-1.5">
            {members.slice(0, 4).map((m, i) => (
              <Avatar key={i} name={m.full_name} size={22} className="ring-2 ring-ink-900" />
            ))}
          </div>
          <span>{group.member_count} members</span>
          {group.unread > 0 ? (
            <>
              <span className="text-ink-500 mx-1">·</span>
              <span className="text-gold-300 font-semibold">{group.unread} new</span>
            </>
          ) : null}
        </div>

        {/* PRIMARY CTA — chat is the main thing */}
        <Link href="/preview/group-chat" className="block mt-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-gold-300 to-gold-500 text-black px-4 py-3.5 active:scale-[0.99] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10.5px] tracking-[0.25em] uppercase font-bold opacity-80">
                  Open Chat
                </div>
                <div className="text-[16px] font-bold leading-tight mt-0.5">
                  {group.unread > 0
                    ? `${group.unread} new message${group.unread === 1 ? "" : "s"}`
                    : "Catch up with the room"}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-black/15 flex items-center justify-center text-xl font-bold">
                →
              </div>
            </div>
          </div>
        </Link>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button variant="outline" size="md" fullWidth>Invite</Button>
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? (
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold-300">
                  <path d="M3 3l18 18" />
                  <path d="M6 8a6 6 0 0 1 11.7-1" />
                  <path d="M18 14v-4" />
                  <path d="M4 18h16" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
                Muted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
                Mute
              </span>
            )}
          </Button>
        </div>

        {muted ? (
          <div className="mt-3 rounded-xl bg-ink-800/60 hairline px-3 py-2.5 flex items-start gap-2.5">
            <div className="h-6 w-6 rounded-full bg-gold-500/15 ring-1 ring-gold-500/30 flex items-center justify-center text-gold-300 shrink-0 mt-0.5 text-[11px]">
              ⓘ
            </div>
            <div className="text-[12px] text-ink-200 leading-relaxed">
              Notifications are off for this group. You&apos;ll still see new messages
              when you open the chat.
            </div>
          </div>
        ) : null}
      </div>

      {/* Recent chat preview — appetizer for the room */}
      <div className="mt-6 px-1">
        <div className="flex items-center justify-between mb-2 px-5">
          <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">
            Recent in chat
          </div>
          <Link href="/preview/group-chat" className="text-[12px] text-gold-300">
            View all →
          </Link>
        </div>
        <div className="bg-black/40 rounded-2xl mx-4 hairline py-2 pb-3 overflow-hidden">
          {items.map((it, i) =>
            it.kind === "divider" ? (
              <TimeDivider key={`d-${i}`} iso={it.divider!} />
            ) : (
              <MessageBubble
                key={it.message!.id}
                message={it.message as any}
                mine={it.message!.user_id === "p_aaron"}
                groupPosition={it.groupPosition}
                showName={it.showName}
              />
            ),
          )}
        </div>
      </div>

      {/* Members */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">
            Members · {group.member_count}
          </div>
          <button className="text-[12px] text-gold-300">See all →</button>
        </div>
        <Card>
          <CardBody className="!py-2">
            {members.slice(0, 4).map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 py-2",
                  i < 3 ? "border-b border-white/[0.04]" : "",
                )}
              >
                <Avatar name={m.full_name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[13.5px] font-medium truncate">
                    {m.full_name}
                  </div>
                  <div className="text-ink-300 text-[11.5px] truncate">
                    {m.occupation} · {m.company}
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Tagged posts on the feed */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">
            On the feed
          </div>
          {taggedPosts.length > 0 ? (
            <Link href="/preview/home" className="text-[12px] text-gold-300">
              View feed →
            </Link>
          ) : null}
        </div>
        {taggedPosts.length > 0 ? (
          <div className="space-y-3">
            {taggedPosts.map((p) => (
              <FeedPost key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-6">
              <p className="text-ink-300 text-[13px] leading-relaxed max-w-[280px] mx-auto">
                When members tag this group on the Feed, those posts show up here.
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      <PreviewBottomNav />
    </div>
  );
}
