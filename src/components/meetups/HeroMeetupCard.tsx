import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { MeetupCategoryTag } from "./MeetupCategoryTag";
import { Countdown } from "@/components/events/Countdown";
import { cn } from "@/lib/utils/cn";
import type { MockMeetup } from "@/lib/preview/mock";

function fmtSoon(iso: string) {
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
      : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function HeroMeetupCard({ meetup }: { meetup: MockMeetup }) {
  return (
    <Link href="/preview/meetup">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl shadow-card hairline",
          "bg-gradient-to-br",
          meetup.gradient,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />

        <div className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="px-2.5 h-7 rounded-full bg-black/45 backdrop-blur text-[10.5px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center font-semibold">
              Up Next · {fmtSoon(meetup.when_iso).split(" ·")[0]}
            </div>
            <MeetupCategoryTag category={meetup.category} size="md" />
          </div>

          <div className="mt-4 flex items-end gap-4">
            <div className="h-20 w-20 rounded-3xl bg-black/40 ring-1 ring-white/10 flex items-center justify-center text-5xl">
              {meetup.emoji}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-white text-[24px] font-semibold tracking-tight leading-tight">
                {meetup.title}
              </h2>
              <div className="text-ink-200 text-[12.5px] mt-0.5">
                {fmtSoon(meetup.when_iso)}
              </div>
              <div className="text-ink-300 text-[11.5px] mt-0.5 truncate">
                {meetup.location}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-black/30 ring-1 ring-white/[0.08] px-3 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2 mb-1">
              <Avatar name={meetup.host_name} size={20} />
              <div className="text-[11px] text-ink-300">
                Hosted by <span className="text-ink-100 font-semibold">{meetup.host_name}</span>
              </div>
              <div className="ml-auto text-[11px] text-gold-300 font-semibold">
                <Countdown target={meetup.when_iso} />
              </div>
            </div>
            <div className="text-[13px] text-ink-100 leading-snug">{meetup.notes}</div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {meetup.attendees_preview.slice(0, 4).map((m, i) => (
                  <Avatar
                    key={i}
                    name={m.name}
                    src={m.photo}
                    size={24}
                    className="ring-2 ring-black/60"
                  />
                ))}
              </div>
              <span className="text-[12px] text-ink-200">{meetup.attendees_going} going</span>
            </div>
            <div className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold">
              {meetup.user_going ? "You're going ✓" : "I'm in"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
