import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const today = new Date().toISOString().slice(0, 10);

  const [upcomingRes, pastRes] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .gte("event_date", today)
      .neq("status", "cancelled")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .lt("event_date", today)
      .order("event_date", { ascending: false })
      .limit(20),
  ]);

  const allEvents = [...(upcomingRes.data ?? []), ...(pastRes.data ?? [])];
  const eventIds = allEvents.map((e) => e.id);

  const [rsvpCounts, myRsvps] = eventIds.length
    ? await Promise.all([
        supabase
          .from("event_rsvps")
          .select("event_id")
          .in("event_id", eventIds)
          .eq("status", "going"),
        supabase
          .from("event_rsvps")
          .select("event_id, status")
          .in("event_id", eventIds)
          .eq("user_id", profile.id),
      ])
    : [{ data: [] }, { data: [] }];

  const countMap: Record<string, number> = {};
  for (const r of rsvpCounts.data ?? []) countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1;
  const mineMap: Record<string, string> = {};
  for (const r of myRsvps.data ?? []) mineMap[r.event_id] = r.status;

  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  return (
    <div
      className="px-5 pb-2 space-y-4"
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">Events</div>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight leading-tight">
            Upcoming Watchmen Events
          </h1>
        </div>
        {isAdmin ? (
          <a
            href="/admin/events"
            className="shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </a>
        ) : null}
      </div>

      <section className="space-y-3">
        {(upcomingRes.data ?? []).length === 0 ? (
          <EmptyState title="No upcoming events" body="An admin will post the next one soon." />
        ) : (
          (upcomingRes.data ?? []).map((e) => (
            <EventCard
              key={e.id}
              {...(e as any)}
              rsvp_count={countMap[e.id] ?? 0}
              user_going={mineMap[e.id] === "going"}
            />
          ))
        )}
      </section>

      {(pastRes.data ?? []).length > 0 ? (
        <section className="space-y-3 pt-4">
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">Past</div>
          {(pastRes.data ?? []).map((e) => (
            <EventCard
              key={e.id}
              {...(e as any)}
              rsvp_count={countMap[e.id] ?? 0}
              user_going={mineMap[e.id] === "going"}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
