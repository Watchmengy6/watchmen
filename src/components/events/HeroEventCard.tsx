import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Countdown } from "./Countdown";
import { CapacityBar } from "./CapacityBar";
import { CategoryTag } from "./CategoryTag";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";
import type { EventCategory } from "@/lib/preview/mock";

interface Props {
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
  attendees?: { name: string; photo: string | null }[];
}

/** Full-bleed hero card for the next/featured event. */
export function HeroEventCard(p: Props) {
  const isoTarget = `${p.event_date}T${p.start_time ?? "19:00:00"}`;
  return (
    <Link href="/preview/event">
      <div className="relative overflow-hidden rounded-3xl shadow-card hairline">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={p.title}
            className="w-full h-[300px] object-cover"
          />
        ) : (
          <div className="w-full h-[300px] bg-gradient-to-br from-gold-700/40 via-ink-700 to-black" />
        )}
        {/* dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/90" />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="px-2.5 h-7 rounded-full bg-black/50 backdrop-blur text-[10.5px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center font-semibold">
            Next Watchman Event
          </div>
          <CategoryTag category={p.category} />
        </div>

        <div className="absolute left-0 right-0 bottom-0 p-4">
          <div className="text-[12px] text-gold-200 font-semibold mb-1">
            <Countdown target={isoTarget} />
            <span className="text-ink-300 mx-1">·</span>
            <span className="text-ink-200">
              {fmtEventDate(p.event_date)} · {fmtTime(p.start_time)}
            </span>
          </div>
          <h2 className="text-white text-[26px] font-semibold tracking-tight leading-tight">
            {p.title}
          </h2>
          {p.location_name ? (
            <div className="text-ink-200 text-[13px] mt-0.5">{p.location_name}</div>
          ) : null}

          <div className="mt-3">
            <CapacityBar filled={p.rsvp_count} capacity={p.capacity} showLabel={false} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {p.attendees && p.attendees.length > 0 ? (
                <div className="flex -space-x-2">
                  {p.attendees.slice(0, 4).map((a, i) => (
                    <Avatar
                      key={i}
                      name={a.name}
                      src={a.photo}
                      size={24}
                      className="ring-2 ring-black"
                    />
                  ))}
                </div>
              ) : null}
              <span className="text-[12px] text-ink-200">
                {p.rsvp_count} going · {p.capacity - p.rsvp_count} spots
              </span>
            </div>
            <div className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold">
              {p.user_going ? "You're going ✓" : "Register"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
