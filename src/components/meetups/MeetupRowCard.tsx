import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { MeetupCategoryTag } from "./MeetupCategoryTag";
import { cn } from "@/lib/utils/cn";
import type { MockMeetup } from "@/lib/preview/mock";

function fmtRow(iso: string) {
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
      : d.toLocaleDateString(undefined, { weekday: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { day, time };
}

export function MeetupRowCard({ meetup }: { meetup: MockMeetup }) {
  const { day, time } = fmtRow(meetup.when_iso);
  return (
    <Link href="/preview/meetup" className="block">
      <Card className="overflow-hidden">
        <div className="flex">
          {/* Colored side strip with emoji + day */}
          <div
            className={cn(
              "relative shrink-0 w-[88px] bg-gradient-to-br flex flex-col items-center justify-center gap-1",
              meetup.gradient,
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="text-3xl drop-shadow-lg">{meetup.emoji}</div>
            <div className="text-[9.5px] uppercase tracking-wider text-gold-200 font-semibold">
              {day}
            </div>
          </div>

          <div className="flex-1 min-w-0 p-3 pl-3.5">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="text-white text-[14.5px] font-semibold leading-tight truncate">
                {meetup.title}
              </div>
              <MeetupCategoryTag category={meetup.category} />
            </div>
            <div className="text-ink-300 text-[12px] truncate">
              {time} · {meetup.location}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {meetup.attendees_preview.slice(0, 3).map((a, i) => (
                    <Avatar
                      key={i}
                      name={a.name}
                      src={a.photo}
                      size={18}
                      className="ring-2 ring-ink-800"
                    />
                  ))}
                </div>
                <span className="text-[10.5px] text-ink-400">
                  {meetup.attendees_going} going
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className="text-ink-400">by {meetup.host_name.split(" ")[0]}</span>
                {meetup.user_going ? (
                  <span className="text-emerald-300 font-semibold">Going ✓</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
