import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { RsvpButton } from "@/components/events/RsvpButton";
import { CheckInButton } from "@/components/events/CheckInButton";
import { MapPreview } from "@/components/events/MapPreview";
import { Button } from "@/components/ui/Button";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";
import { ShareEventButton } from "@/components/events/ShareEventButton";
import { ZoomableImage } from "@/components/ui/ZoomableImage";

export const dynamic = "force-dynamic";

export default async function EventDetail({ params }: { params: { eventId: string } }) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .maybeSingle();
  if (!event) notFound();

  // The self-RSVP read and the attendee list both depend only on event.id,
  // not on each other — run them in parallel to save a round-trip.
  // checked_in was revoked from `authenticated` in migration 00011, so
  // self-RSVP reads go through the my_event_rsvp() SECURITY DEFINER RPC.
  const [{ data: myRsvpRows }, { data: attendees }] = await Promise.all([
    supabase.rpc("my_event_rsvp", { p_event_id: event.id }),
    supabase
      .from("event_rsvps")
      .select("user_id, status, profiles(id, full_name, profile_photo_url)")
      .eq("event_id", event.id)
      .eq("status", "going"),
  ]);
  const myRsvp = Array.isArray(myRsvpRows) && myRsvpRows.length > 0 ? myRsvpRows[0] : null;

  const going = myRsvp?.status === "going";

  return (
    <div className="pt-2 pb-10">
      {event.image_url ? (
        <ZoomableImage
          src={event.image_url}
          alt={event.title}
          className="w-full h-auto block cursor-zoom-in"
        />
      ) : (
        <div className="h-52 bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center">
          <span className="text-gradient-gold text-2xl font-semibold">{event.title}</span>
        </div>
      )}

      <div className="px-5 mt-5 space-y-4">
        <div>
          <Badge variant="muted">{fmtEventDate(event.event_date)}</Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{event.title}</h1>
          <div className="mt-1 text-ink-300 text-sm">
            {event.start_time ? fmtTime(event.start_time) : ""}
            {event.end_time ? ` – ${fmtTime(event.end_time)}` : ""}
            {event.location_name ? ` · ${event.location_name}` : ""}
          </div>
          {event.address ? (
            <div className="text-ink-400 text-xs mt-0.5">{event.address}</div>
          ) : null}
        </div>

        <MapPreview
          lat={event.latitude}
          lng={event.longitude}
          label={event.location_name}
          address={event.address}
        />

        {event.description ? (
          <Card>
            <CardBody>
              <p className="text-ink-200 text-sm whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </CardBody>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <RsvpButton eventId={event.id} going={going} />
          {going ? (
            <CheckInButton eventId={event.id} alreadyCheckedIn={!!myRsvp?.checked_in} />
          ) : (
            <Button variant="outline" size="lg" fullWidth disabled>
              Check In
            </Button>
          )}
        </div>

        <ShareEventButton eventId={event.id} title={event.title} />

        {going ? (
          <Link href={`/app/events/${event.id}/chat`}>
            <Button variant="outline" fullWidth size="lg">
              View Event Room →
            </Button>
          </Link>
        ) : (
          <div className="text-center text-[12px] text-ink-400">
            RSVP &quot;Going&quot; to access the event room.
          </div>
        )}

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
                Going · {attendees?.length ?? 0}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(attendees ?? []).map((a: any) => (
                <Link
                  key={a.user_id}
                  href={`/app/members/${a.profiles?.id}`}
                  className="flex items-center gap-2 bg-ink-800 hairline rounded-full pr-3 pl-1 py-1"
                >
                  <Avatar
                    src={a.profiles?.profile_photo_url}
                    name={a.profiles?.full_name}
                    size={24}
                  />
                  <span className="text-[12px] text-ink-100">
                    {a.profiles?.full_name?.split(" ")[0]}
                  </span>
                </Link>
              ))}
              {(attendees ?? []).length === 0 ? (
                <div className="text-ink-400 text-sm">No one yet. Be first.</div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
