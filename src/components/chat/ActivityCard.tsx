"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { MeetupCategoryTag } from "@/components/meetups/MeetupCategoryTag";
import { CategoryTag } from "@/components/events/CategoryTag";
import { cn } from "@/lib/utils/cn";
import type { MockMeetup, EventCategory } from "@/lib/preview/mock";

/**
 * Card-style chat bubble. Used when a meetup or event is auto-posted into a
 * chat (Master chat or DMs) or rendered inline in the Feed.
 */
export type ActivityCardKind = "meetup" | "event";

interface MeetupCardProps {
  kind: "meetup";
  data: MockMeetup;
  hostName: string;
  hostPhoto: string | null;
  mine?: boolean;
  going?: boolean;
}

interface EventCardProps {
  kind: "event";
  data: {
    id: string;
    title: string;
    event_date: string;
    start_time: string | null;
    location_name: string | null;
    image_url: string | null;
    rsvp_count: number;
    capacity: number;
    user_going: boolean;
    category: EventCategory;
    gradient?: string;
    emoji?: string;
    description?: string | null;
  };
  hostName: string;
  hostPhoto: string | null;
  mine?: boolean;
  going?: boolean;
}

export type ActivityCardProps = MeetupCardProps | EventCardProps;

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const same =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  const day = same
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function ActivityCard(props: ActivityCardProps) {
  const { kind, data, hostName, hostPhoto, mine, going } = props;
  const meetup = kind === "meetup" ? data : null;
  const event = kind === "event" ? data : null;

  // Meetups: preview mock uses `when_iso`, real DB uses `when_at`. Accept either.
  const meetupWhen = (meetup as any)?.when_iso ?? (meetup as any)?.when_at;
  const whenLabel = meetup
    ? meetupWhen
      ? fmtWhen(meetupWhen)
      : ""
    : event && event.event_date
      ? `${new Date(event.event_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${event.start_time ? " · " + new Date("2020-01-01T" + event.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""}`
      : "";

  const title = meetup?.title ?? event?.title ?? "";
  // Preview mock uses `location`, real DB uses `location_name`. Accept either.
  const location =
    (meetup as any)?.location ??
    (meetup as any)?.location_name ??
    event?.location_name ??
    "";
  const gradient = (meetup as any)?.gradient ?? (event as any)?.gradient ?? "from-ink-700 to-ink-900";
  const emoji = (meetup as any)?.emoji ?? (event as any)?.emoji ?? "📅";
  // For real /app data, link to /app/meetups/[id] or /app/events/[id].
  // For preview pages, fall back to the demo routes.
  const realId = (data as any)?.id;
  const href = (props as any).href
    ? (props as any).href
    : realId
      ? kind === "meetup"
        ? `/app/meetups/${realId}`
        : `/app/events/${realId}`
      : kind === "meetup"
        ? "/preview/meetup"
        : "/preview/event";

  return (
    <Link href={href}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl ring-1 ring-white/[0.06] shadow-sm",
          "bg-gradient-to-br",
          gradient,
          mine ? "ml-auto" : "mr-auto",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />

        <div className="relative p-3.5">
          {/* Type label */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] tracking-[0.25em] uppercase text-gold-300/90 font-semibold">
              {kind === "meetup" ? "New Meetup" : "New Watchman Event"}
            </span>
            {meetup ? (
              <MeetupCategoryTag category={meetup.category} />
            ) : event ? (
              <CategoryTag category={event.category} />
            ) : null}
          </div>

          {/* Title + emoji */}
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-black/40 ring-1 ring-white/10 flex items-center justify-center text-2xl shrink-0">
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                {title}
              </div>
              <div className="text-ink-200 text-[12px] mt-0.5">{whenLabel}</div>
              {location ? (
                <div className="text-ink-300 text-[11.5px] truncate">{location}</div>
              ) : null}
            </div>
          </div>

          {/* Host */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
            <Avatar name={hostName} src={hostPhoto} size={20} />
            <div className="text-[11px] text-ink-300 flex-1">
              Hosted by <span className="text-ink-100 font-medium">{hostName}</span>
            </div>
            <div
              className={cn(
                "h-7 px-3 rounded-full text-[11.5px] font-semibold inline-flex items-center",
                going
                  ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                  : "bg-gradient-to-b from-gold-300 to-gold-500 text-black",
              )}
            >
              {going ? "Going ✓" : meetup ? "I'm in" : "RSVP"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
