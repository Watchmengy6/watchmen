import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";

interface Props {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location_name: string | null;
  image_url: string | null;
  rsvp_count?: number;
  user_going?: boolean;
}

export function EventCard(p: Props) {
  return (
    <Link href={`/app/events/${p.id}`} className="block">
      <Card className="overflow-hidden">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt={p.title} className="w-full h-auto block" />
        ) : (
          <div className="h-36 bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center">
            <span className="text-gradient-gold font-semibold tracking-tight">{p.title}</span>
          </div>
        )}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="muted">{fmtEventDate(p.event_date)}</Badge>
            {p.user_going ? <Badge variant="success">Going</Badge> : null}
          </div>
          <h3 className="text-white text-[15px] font-semibold leading-snug">{p.title}</h3>
          <div className="text-ink-300 text-xs mt-1">
            {p.start_time ? fmtTime(p.start_time) : ""}
            {p.location_name ? ` · ${p.location_name}` : ""}
          </div>
          {typeof p.rsvp_count === "number" ? (
            <div className="text-[11px] text-ink-400 mt-1.5">{p.rsvp_count} going</div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
