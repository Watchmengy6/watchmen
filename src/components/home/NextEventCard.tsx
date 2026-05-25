import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";
import type { Event } from "@/types/database";

interface Props {
  event: (Event & { rsvp_count?: number; user_going?: boolean }) | null;
}

export function NextEventCard({ event }: Props) {
  if (!event) {
    return (
      <Card className="mx-5">
        <div className="px-5 py-6 text-center">
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">Next Event</div>
          <div className="mt-2 text-ink-200">No events scheduled yet.</div>
        </div>
      </Card>
    );
  }
  return (
    <Link href={`/app/events/${event.id}`} className="block mx-5">
      <Card className="overflow-hidden">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-44 object-cover"
          />
        ) : (
          <div className="h-44 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 flex items-center justify-center">
            <span className="text-gradient-gold text-2xl font-semibold tracking-tight">
              {event.title}
            </span>
          </div>
        )}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="gold">Upcoming Watchman Event</Badge>
            {event.user_going ? <Badge variant="success">You&apos;re going</Badge> : null}
          </div>
          <h3 className="text-white text-lg font-semibold">{event.title}</h3>
          <div className="mt-1 text-ink-300 text-sm">
            {fmtEventDate(event.event_date)}
            {event.start_time ? ` · ${fmtTime(event.start_time)}` : ""}
            {event.location_name ? ` · ${event.location_name}` : ""}
          </div>
          {typeof event.rsvp_count === "number" ? (
            <div className="mt-3 text-[12px] text-ink-400">
              {event.rsvp_count} {event.rsvp_count === 1 ? "going" : "going"}
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
