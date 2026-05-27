import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { CapacityBar } from "./CapacityBar";
import { CategoryTag } from "./CategoryTag";
import { fmtTime } from "@/lib/utils/date";
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

function dayBadge(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    month: d.toLocaleString(undefined, { month: "short" }).toUpperCase(),
    day: d.getDate(),
  };
}

export function EventRowCard(p: Props) {
  const b = dayBadge(p.event_date);
  const full = p.rsvp_count >= p.capacity;
  return (
    <Link href="/preview/event" className="block">
      <Card className="overflow-hidden">
        <div className="flex">
          {/* Image strip with date overlay */}
          <div className="relative shrink-0 w-[100px]">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-[9.5px] uppercase tracking-wider text-gold-300 leading-none">
                {b.month}
              </div>
              <div className="text-white text-[24px] font-bold leading-none mt-0.5">{b.day}</div>
            </div>
          </div>

          <div className="flex-1 min-w-0 p-3 pl-3.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="text-white text-[14.5px] font-semibold leading-tight truncate">
                {p.title}
              </div>
              <CategoryTag category={p.category} />
            </div>
            <div className="text-ink-300 text-[12px] truncate">
              {p.start_time ? fmtTime(p.start_time) : ""}
              {p.location_name ? ` · ${p.location_name}` : ""}
            </div>

            <div className="mt-2.5">
              <CapacityBar filled={p.rsvp_count} capacity={p.capacity} showLabel={false} />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {p.attendees && p.attendees.length > 0 ? (
                  <div className="flex -space-x-1.5">
                    {p.attendees.slice(0, 3).map((a, i) => (
                      <Avatar
                        key={i}
                        name={a.name}
                        src={a.photo}
                        size={18}
                        className="ring-2 ring-ink-800"
                      />
                    ))}
                  </div>
                ) : null}
                <span className="text-[10.5px] text-ink-400">
                  {full ? "Full" : `${p.capacity - p.rsvp_count} spots left`}
                </span>
              </div>
              {p.user_going ? (
                <span className="text-[10.5px] text-emerald-300 font-semibold">Going ✓</span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
