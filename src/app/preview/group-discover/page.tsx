"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GroupCategoryTag } from "@/components/groups/GroupCategoryTag";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockGroups, mockMembers } from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

export default function PreviewGroupDiscover() {
  // Demo with Pickleball — an unjoined group
  const group = mockGroups.find((g) => g.id === "g_pickle") ?? mockGroups[0];
  const members = mockMembers.slice(0, 5);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      {/* Cover header */}
      <div className="relative">
        <div className={cn("h-44 bg-gradient-to-br", group.gradient)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
        <Link
          href="/preview/groups"
          className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
        >
          ‹
        </Link>
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
        </div>

        {/* Join + post-join actions */}
        <div className="mt-5 space-y-2">
          {joined ? (
            <>
              <Link href="/preview/group-chat">
                <Button variant="gold" size="lg" fullWidth>
                  Open Chat
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? "Unmute" : "Mute notifications"}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setJoined(false);
                    setMuted(false);
                  }}
                >
                  Leave group
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="gold"
              size="lg"
              fullWidth
              onClick={() => setJoined(true)}
            >
              Join Group
            </Button>
          )}
        </div>

        {joined ? (
          <div className="mt-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 px-3 py-2.5 flex items-start gap-2.5">
            <div className="h-6 w-6 rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5 text-[12px]">
              ✓
            </div>
            <div className="text-[12px] text-emerald-100 leading-relaxed">
              <span className="text-white font-semibold">You&apos;re in.</span>{" "}
              {muted
                ? "Notifications muted. You'll still see new messages when you open the chat."
                : "You'll get a push notification for every message. Tap Mute if it gets noisy."}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-ink-800/60 hairline px-3 py-2.5 flex items-start gap-2.5">
            <div className="h-6 w-6 rounded-full bg-gold-500/15 ring-1 ring-gold-500/30 flex items-center justify-center text-gold-300 shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            </div>
            <div className="text-[12px] text-ink-200 leading-relaxed">
              <span className="text-white font-semibold">Members only.</span>{" "}
              {group.name}&apos;s chat, posts, and events are private. Join to see what&apos;s happening
              inside.
            </div>
          </div>
        )}
      </div>

      {/* What you'll get */}
      <div className="px-5 mt-6">
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300 mb-2 px-1">
          What you get
        </div>
        <Card>
          <CardBody className="!py-2">
            <Perk
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M21 12c0 4.2-4 7.5-9 7.5-1.4 0-2.7-.25-3.85-.7L3 21l1.55-4.4C3.6 15.4 3 13.75 3 12 3 7.85 7 4.5 12 4.5s9 3.35 9 7.5Z" />
                </svg>
              }
              title="Group chat"
              body="Private iMessage-style thread for everyone in the group."
            />
            <Perk
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
              }
              title="Group meetups"
              body="See when members plan something — first dibs on RSVPs."
            />
            <Perk
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 4v16M4 12h16" />
                </svg>
              }
              title="Tag posts to the group"
              body="Share something only this group needs to see, right from the Feed."
              last
            />
          </CardBody>
        </Card>
      </div>

      {/* Members preview */}
      <div className="px-5 mt-6">
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300 mb-2 px-1">
          Members · {group.member_count}
        </div>
        <Card>
          <CardBody className="!py-2">
            {members.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 py-2",
                  i < members.length - 1 ? "border-b border-white/[0.04]" : "",
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

      <PreviewBottomNav />
    </div>
  );
}

function Perk({
  icon,
  title,
  body,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3",
        !last ? "border-b border-white/[0.04]" : "",
      )}
    >
      <div className="h-8 w-8 rounded-xl bg-ink-700 flex items-center justify-center text-gold-300 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-[14px] font-semibold">{title}</div>
        <div className="text-ink-300 text-[12px] mt-0.5 leading-snug">{body}</div>
      </div>
    </div>
  );
}
