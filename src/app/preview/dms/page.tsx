"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { relativeTime } from "@/lib/utils/date";
import {
  mockDmThreads,
  mockGroups,
  mockEvents,
  mockMeetups,
  mockUpcomingEvent,
} from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

type Tab = "private" | "groups" | "events";

// Wrap the part that calls useSearchParams() in a Suspense boundary so
// Next.js can statically prerender this page (avoids CSR bailout warning).
export default function PreviewDmsPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-ink-900" />}>
      <PreviewDms />
    </Suspense>
  );
}

function PreviewDms() {
  const search = useSearchParams();
  const router = useRouter();
  const initial = ((): Tab => {
    const t = search.get("tab");
    if (t === "groups") return "groups";
    if (t === "events") return "events";
    return "private";
  })();
  const [tab, setTab] = useState<Tab>(initial);

  // Sync URL so back-button preserves the selected segment
  useEffect(() => {
    const current = search.get("tab");
    if (tab === "private" && current) router.replace("/preview/dms", { scroll: false });
    else if (tab !== "private" && current !== tab)
      router.replace(`/preview/dms?tab=${tab}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const joinedGroups = mockGroups.filter((g) => g.joined);
  const goingEvents = [
    ...mockEvents.filter((e) => e.user_going),
    ...mockMeetups.filter((m) => m.user_going),
  ];

  const privateUnread = mockDmThreads.reduce((s, t) => s + t.unread, 0);
  const groupUnread = joinedGroups.reduce((s, g) => s + g.unread, 0);
  const eventUnread = 3; // mock — number of unread event chat messages

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">Inbox</div>
            <div className="text-white text-[18px] font-semibold leading-tight">Messages</div>
          </div>
          <button
            aria-label="New message"
            className="h-9 px-3 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold inline-flex items-center gap-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            New
          </button>
        </div>

        {/* 3-way segmented control */}
        <div className="px-4 pb-2.5">
          <div className="rounded-full bg-ink-800 p-1 grid grid-cols-3 gap-1">
            <Seg active={tab === "private"} onClick={() => setTab("private")} badge={privateUnread}>
              Private
            </Seg>
            <Seg active={tab === "groups"} onClick={() => setTab("groups")} badge={groupUnread}>
              Groups
            </Seg>
            <Seg active={tab === "events"} onClick={() => setTab("events")} badge={eventUnread}>
              Events
            </Seg>
          </div>
        </div>

        <div className="px-4 pb-2.5">
          <div className="h-9 rounded-full bg-ink-800 hairline px-3.5 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" className="h-4 w-4 text-ink-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder={
                tab === "private"
                  ? "Search members"
                  : tab === "groups"
                    ? "Search groups"
                    : "Search events"
              }
              className="flex-1 bg-transparent text-[14px] text-white placeholder:text-ink-400 outline-none"
            />
          </div>
        </div>
      </div>

      {tab === "private" ? <PrivateList /> : null}
      {tab === "groups" ? <GroupsList groups={joinedGroups} /> : null}
      {tab === "events" ? <EventsList events={goingEvents} /> : null}

      <p className="text-center text-[11px] text-ink-500 py-6">
        Only members of The Watchman can DM you. Swipe a row to mute or leave.
      </p>

      <PreviewBottomNav />
    </div>
  );
}

function Seg({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-full text-[12.5px] font-semibold transition-all relative",
        active ? "bg-ink-600 text-white shadow-sm" : "text-ink-300",
      )}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-gold-400 text-black text-[10px] font-bold">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function PrivateList() {
  return (
    <div className="pt-1">
      {mockDmThreads.map((t, i) => (
        <SwipeableRow
          key={t.id}
          className={i < mockDmThreads.length - 1 ? "border-b border-white/[0.04]" : ""}
          actions={[
            { label: "Mute", color: "bg-ink-500", onClick: () => {} },
            { label: "Delete", color: "bg-red-500", onClick: () => {} },
          ]}
        >
          <Link
            href="/preview/dm"
            className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.04] transition-colors"
          >
            <div className="relative shrink-0">
              <Avatar src={t.other_user_photo} name={t.other_user_name} size={52} />
              {t.online ? (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-ink-900" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    "text-[14.5px] truncate",
                    t.unread > 0 ? "text-white font-semibold" : "text-ink-100 font-medium",
                  )}
                >
                  {t.other_user_name}
                </div>
                <div
                  className={cn(
                    "text-[11px] shrink-0 tabular-nums",
                    t.unread > 0 ? "text-gold-300 font-semibold" : "text-ink-400",
                  )}
                >
                  {relativeTime(t.last_message.created_at)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div
                  className={cn(
                    "text-[13px] truncate",
                    t.unread > 0 ? "text-ink-100" : "text-ink-300",
                  )}
                >
                  {t.last_message.author_is_me ? (
                    <span className="text-ink-400">You: </span>
                  ) : null}
                  {t.last_message.content}
                </div>
                {t.unread > 0 ? (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gold-400 text-black text-[11px] font-bold flex items-center justify-center">
                    {t.unread}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        </SwipeableRow>
      ))}
    </div>
  );
}

function GroupsList({ groups }: { groups: typeof mockGroups }) {
  return (
    <div className="pt-1">
      {groups.map((g, i) => (
        <SwipeableRow
          key={g.id}
          className={i < groups.length - 1 ? "border-b border-white/[0.04]" : ""}
          actions={[
            { label: "Mute", color: "bg-ink-500", onClick: () => {} },
            { label: "Leave", color: "bg-red-500", onClick: () => {} },
          ]}
        >
          <Link
            href="/preview/group-chat"
            className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.04] transition-colors"
          >
            <div
              className={cn(
                "relative shrink-0 h-[52px] w-[52px] rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl",
                g.gradient,
              )}
            >
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
              <span className="relative drop-shadow-md">{g.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    "text-[14.5px] truncate",
                    g.unread > 0 ? "text-white font-semibold" : "text-ink-100 font-medium",
                  )}
                >
                  {g.name}
                </div>
                {g.last_message ? (
                  <div
                    className={cn(
                      "text-[11px] shrink-0 tabular-nums",
                      g.unread > 0 ? "text-gold-300 font-semibold" : "text-ink-400",
                    )}
                  >
                    {relativeTime(g.last_message.created_at)}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div
                  className={cn(
                    "text-[13px] truncate",
                    g.unread > 0 ? "text-ink-100" : "text-ink-300",
                  )}
                >
                  {g.last_message ? (
                    <>
                      <span className="text-ink-200 font-medium">{g.last_message.author}:</span>{" "}
                      {g.last_message.content}
                    </>
                  ) : (
                    g.description
                  )}
                </div>
                {g.unread > 0 ? (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gold-400 text-black text-[11px] font-bold flex items-center justify-center">
                    {g.unread}
                  </span>
                ) : null}
              </div>
              <div className="text-[10.5px] text-ink-500 mt-0.5">{g.member_count} members</div>
            </div>
          </Link>
        </SwipeableRow>
      ))}
    </div>
  );
}

function EventsList({ events }: { events: any[] }) {
  // Split between upcoming and past based on event_date (or end of day)
  const now = Date.now();
  const isFuture = (e: any) => {
    if (e.event_date) {
      return new Date(`${e.event_date}T${e.end_time ?? "23:59:00"}`).getTime() > now;
    }
    if (e.when_iso) {
      const end = new Date(e.when_iso).getTime() + (e.duration_min ?? 60) * 60 * 1000;
      return end > now;
    }
    return true;
  };
  const upcoming = events.filter(isFuture);
  const past = events.filter((e) => !isFuture(e));

  return (
    <div className="pt-1">
      {upcoming.length > 0 ? (
        <SectionLabel>Upcoming</SectionLabel>
      ) : null}
      {upcoming.map((e, i) => (
        <EventChatRow key={e.id} event={e} isLast={i === upcoming.length - 1 && past.length === 0} />
      ))}
      {past.length > 0 ? <SectionLabel>Past</SectionLabel> : null}
      {past.map((e, i) => (
        <EventChatRow
          key={e.id}
          event={e}
          isLast={i === past.length - 1}
          archived
        />
      ))}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-ink-300 text-sm">
            RSVP &quot;going&quot; to any event or meetup and its chat will show up here.
          </p>
          <Link
            href="/preview/events"
            className="mt-3 inline-flex h-9 px-4 rounded-full bg-ink-800 hairline text-ink-100 text-[13px] font-medium items-center"
          >
            Browse events →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1 text-[10.5px] tracking-[0.25em] uppercase text-ink-300">
      {children}
    </div>
  );
}

function EventChatRow({
  event,
  isLast,
  archived,
}: {
  event: any;
  isLast: boolean;
  archived?: boolean;
}) {
  // Normalize so meetups and events render the same way
  const title = event.title;
  const emoji = event.emoji ?? "📅";
  const gradient =
    event.gradient ?? "from-gold-500/25 via-gold-700/15 to-ink-900";
  const dateLabel = event.event_date
    ? new Date(event.event_date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : event.when_iso
      ? new Date(event.when_iso).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "";
  const isMeetup = !!event.when_iso;
  const href = isMeetup ? "/preview/meetup" : "/preview/event-chat";

  return (
    <SwipeableRow
      className={!isLast ? "border-b border-white/[0.04]" : ""}
      actions={[
        { label: "Mute", color: "bg-ink-500", onClick: () => {} },
        { label: "Drop", color: "bg-red-500", onClick: () => {} },
      ]}
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-4 py-3 active:bg-white/[0.04] transition-colors",
          archived && "opacity-60",
        )}
      >
        <div
          className={cn(
            "relative shrink-0 h-[52px] w-[52px] rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl",
            gradient,
          )}
        >
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
          <span className="relative drop-shadow-md">{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] text-white font-medium truncate">{title}</div>
            <div className="text-[11px] shrink-0 text-ink-400">{dateLabel}</div>
          </div>
          <div className="text-[13px] text-ink-300 truncate mt-0.5">
            {archived
              ? "Archived after event ended"
              : isMeetup
                ? `Hosted by ${event.host_name}`
                : "Event Room · Open chat with attendees"}
          </div>
          <div className="text-[10.5px] text-ink-500 mt-0.5">
            {isMeetup
              ? `${event.attendees_going} going`
              : `${event.rsvp_count} going`}
          </div>
        </div>
      </Link>
    </SwipeableRow>
  );
}
