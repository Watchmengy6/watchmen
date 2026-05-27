import Link from "next/link";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedPost } from "@/components/feed/FeedPost";
import { AdminPill } from "@/components/admin/AdminPill";
import { Logo } from "@/components/brand/Logo";
import { PreviewBottomNav } from "../PreviewBottomNav";
import {
  mockMe,
  mockFeed,
  mockPending,
  mockUpcomingEvent,
  mockMembers,
  mockGroups,
  adaptMockFeedPost,
} from "@/lib/preview/mock";
import { fmtTime } from "@/lib/utils/date";

export default function PreviewFeed() {
  const isAdmin = mockMe.role === "super_admin" || mockMe.role === "admin";
  const pendingCount = mockPending.length;
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      {/* sticky top bar */}
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 text-gold-400 shrink-0" />
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
                The Watchmen
              </div>
              <div className="text-white text-[18px] font-semibold leading-tight">
                The Feed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? <AdminPill pendingCount={pendingCount} href="/preview/admin" /> : null}
            <Link
              href="/preview/members"
              aria-label="Search members"
              className="h-9 w-9 rounded-full bg-ink-800 hairline flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-ink-100">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <Link
              href="/preview/notifications"
              aria-label="Notifications"
              className="relative h-9 w-9 rounded-full bg-ink-800 hairline flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                   strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-ink-100">
                <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-gold-400 text-black text-[9px] font-bold flex items-center justify-center">
                2
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {/* Compact next-event banner */}
        <Link href="/preview/event" className="block">
          <div className="rounded-2xl bg-gradient-to-r from-gold-500/10 to-gold-700/0 ring-1 ring-gold-500/20 px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold-500/20 ring-1 ring-gold-500/30 flex flex-col items-center justify-center shrink-0">
              <div className="text-[9px] uppercase tracking-wider text-gold-200 leading-none">
                Jun
              </div>
              <div className="text-[15px] font-bold text-white leading-none mt-0.5">12</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-gold-300/80">
                Next Event
              </div>
              <div className="text-white text-[14px] font-semibold truncate">
                {mockUpcomingEvent.title}
              </div>
              <div className="text-ink-300 text-[12px] truncate">
                {fmtTime(mockUpcomingEvent.start_time)} · {mockUpcomingEvent.location_name}
              </div>
            </div>
            <div className="text-ink-300 text-sm">›</div>
          </div>
        </Link>

        {/* Composer */}
        <FeedComposer
          meName={mockMe.full_name}
          mentionablePeople={mockMembers.map((m) => ({
            id: m.id,
            full_name: m.full_name,
            username: m.username,
          }))}
          taggableGroups={mockGroups
            .filter((g) => g.joined)
            .map((g) => ({ id: g.id, name: g.name, emoji: g.emoji }))}
        />

        {/* Filter pills */}
        <div className="flex gap-2 -mx-1 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All" },
            { id: "post", label: "Posts" },
            { id: "meetup", label: "Meetups" },
            { id: "event", label: "Events" },
            { id: "job", label: "Hiring" },
            { id: "need", label: "Needs" },
          ].map((p, i) => (
            <button
              key={p.id}
              className={
                i === 0
                  ? "shrink-0 h-8 px-3.5 rounded-full text-[12px] bg-white text-black font-semibold"
                  : "shrink-0 h-8 px-3.5 rounded-full text-[12px] bg-ink-800 text-ink-200 hairline"
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="space-y-3">
          {mockFeed.map((post) => (
            <FeedPost key={post.id} post={adaptMockFeedPost(post)} meName={mockMe.full_name} />
          ))}
        </div>

        <p className="text-center text-[11px] text-ink-400 py-4">
          You&apos;re all caught up.
        </p>
      </div>

      <PreviewBottomNav />
    </div>
  );
}
