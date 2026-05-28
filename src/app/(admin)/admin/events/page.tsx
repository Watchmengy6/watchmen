import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";
import { CreateEventForm } from "./CreateEventForm";
import { DeleteEventButton } from "./DeleteEventButton";
import { requireAdmin } from "@/lib/auth/gates";

export const dynamic = "force-dynamic";

// Service-role client so we can read checked_in (revoked from authenticated
// in migration 00011). Page is admin-gated.
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function AdminEventsPage() {
  await requireAdmin();
  const supabase = supabaseAdmin();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(50);

  // counts
  const ids = (events ?? []).map((e) => e.id);
  const { data: rsvps } = ids.length
    ? await supabase.from("event_rsvps").select("event_id, status, checked_in").in("event_id", ids)
    : { data: [] };
  const goingMap: Record<string, number> = {};
  const checkedMap: Record<string, number> = {};
  for (const r of rsvps ?? []) {
    if (r.status === "going") goingMap[r.event_id] = (goingMap[r.event_id] ?? 0) + 1;
    if (r.checked_in) checkedMap[r.event_id] = (checkedMap[r.event_id] ?? 0) + 1;
  }

  return (
    <div className="px-5 space-y-4 pb-8">
      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
            Create event
          </div>
          <CreateEventForm />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {(events ?? []).map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{fmtEventDate(e.event_date)}</Badge>
                  <Badge variant={e.status === "published" ? "success" : "default"}>
                    {e.status}
                  </Badge>
                </div>
                <Link href={`/app/events/${e.id}`} className="block mt-1.5 font-semibold">
                  {e.title}
                </Link>
                <div className="text-ink-300 text-xs mt-0.5">
                  {e.start_time ? fmtTime(e.start_time) : ""}
                  {e.location_name ? ` · ${e.location_name}` : ""}
                </div>
                <div className="text-ink-400 text-[11px] mt-1">
                  {goingMap[e.id] ?? 0} going · {checkedMap[e.id] ?? 0} checked in
                </div>
              </div>
              <DeleteEventButton id={e.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
