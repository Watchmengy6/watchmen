import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/gates";
import { CreateEventForm, type EventInitial } from "../../CreateEventForm";

export const dynamic = "force-dynamic";


export default async function EditEventPage({
  params,
}: {
  params: { eventId: string };
}) {
  await requireAdmin();
  const supabase = supabaseAdmin();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, kind, description, event_date, start_time, end_time, location_name, address, latitude, longitude, image_url",
    )
    .eq("id", params.eventId)
    .maybeSingle();
  if (!event) notFound();

  return (
    <div className="px-5 space-y-4 pb-8 pt-4">
      <Link href="/admin/events" className="text-ink-300 text-sm">
        ‹ Back to events
      </Link>
      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
            Edit event
          </div>
          <CreateEventForm mode="edit" initial={event as EventInitial} />
        </CardBody>
      </Card>
    </div>
  );
}
