import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { localTodayISO } from "@/lib/utils/localDate";
import { CalendarView, type CalendarEntry, type BirthdayMember } from "./CalendarView";

export const dynamic = "force-dynamic";

// Per Dustin's reshuffle: replace the Sponsored sub-tab with a
// Calendar — chronological list of upcoming events + meetups +
// birthdays. Sponsored events still exist (kind='sponsored' on
// events) and roll into the Events tab alongside Watchmen events.
type Tab = "events" | "calendar";

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const tab: Tab = searchParams?.tab === "calendar" ? "calendar" : "events";

  const today = localTodayISO();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  // Pull what each tab needs. Events tab fetches the list. Calendar
  // pulls upcoming events + meetups + birthday profiles, then merges.
  // Only the columns EventCard renders — dropping description/address/
  // lat-lon/timestamps trims the JSON payload (and the bytes over the
  // wire to the phone) without changing what's shown.
  const EVENT_CARD_COLS = "id, title, event_date, start_time, location_name, image_url";
  const upRes = await supabase
    .from("events")
    .select(EVENT_CARD_COLS)
    .gte("event_date", today)
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });
  const pastRes = await supabase
    .from("events")
    .select(EVENT_CARD_COLS)
    .lt("event_date", today)
    .in("status", ["published", "completed"])
    .order("event_date", { ascending: false })
    .limit(20);
  const upcomingEvents: any[] = upRes.data ?? [];
  const pastEvents: any[] = pastRes.data ?? [];

  // Calendar data — events + meetups go into entries (datestamped),
  // birthdays go separately because they repeat annually and the
  // calendar grid projects them onto every displayed month.
  let calendarEntries: CalendarEntry[] = [];
  let calendarBirthdays: BirthdayMember[] = [];
  if (tab === "calendar") {
    // Pull a wider window for the calendar so users can navigate
    // forward a few months. Past month visible too so members can
    // glance back at last week.
    const calendarStart = new Date();
    calendarStart.setMonth(calendarStart.getMonth() - 1);
    const calendarEnd = new Date();
    calendarEnd.setMonth(calendarEnd.getMonth() + 6);

    const [{ data: allEvents }, { data: meetups }, { data: bdayPool }] =
      await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_date, start_time, location_name")
          .eq("status", "published")
          .gte("event_date", calendarStart.toISOString().slice(0, 10))
          .lte("event_date", calendarEnd.toISOString().slice(0, 10))
          .order("event_date", { ascending: true }),
        supabase
          .from("meetups")
          .select(
            "id, title, when_at, location_name, host:profiles!meetups_host_user_id_fkey(full_name)",
          )
          .gte("when_at", calendarStart.toISOString())
          .lte("when_at", calendarEnd.toISOString())
          .order("when_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, birthday")
          .eq("status", "approved")
          .not("birthday", "is", null),
      ]);

    const eventEntries: CalendarEntry[] = (allEvents ?? []).map((e: any) => ({
      kind: "event" as const,
      id: e.id,
      at: `${e.event_date}T${e.start_time ?? "00:00:00"}`,
      title: e.title,
      subtitle: e.location_name ?? "",
      href: `/app/events/${e.id}`,
    }));

    const meetupEntries: CalendarEntry[] = (meetups ?? []).map((m: any) => {
      const host = Array.isArray(m.host) ? m.host[0] : m.host;
      return {
        kind: "meetup" as const,
        id: m.id,
        at: m.when_at,
        title: m.title,
        subtitle:
          [host?.full_name ? `Hosted by ${host.full_name}` : null, m.location_name]
            .filter(Boolean)
            .join(" · "),
        href: `/app/meetups/${m.id}`,
      };
    });

    calendarEntries = [...eventEntries, ...meetupEntries];
    calendarBirthdays = (bdayPool ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      birthday: p.birthday,
    }));
  }

  // RSVP counts + my-RSVP for events being shown.
  const eventIds = [...upcomingEvents, ...pastEvents].map((e) => e.id);
  const rsvpCount: Record<string, number> = {};
  const mineMap: Record<string, string> = {};
  if (eventIds.length > 0) {
    // Going counts come from a grouped-count RPC (event_going_counts,
    // migration 00045) instead of pulling every "going" row to the phone
    // and counting in JS — keeps the payload flat as events fill up.
    const [{ data: counts }, { data: mine }] = await Promise.all([
      supabase.rpc("event_going_counts", { p_event_ids: eventIds }),
      supabase
        .from("event_rsvps")
        .select("event_id, status")
        .in("event_id", eventIds)
        .eq("user_id", profile.id),
    ]);
    (counts ?? []).forEach((r: any) => {
      rsvpCount[r.event_id] = Number(r.going_count) || 0;
    });
    (mine ?? []).forEach((r: any) => {
      mineMap[r.event_id] = r.status;
    });
  }

  // Count for the Events pill. This is exactly the set we already
  // fetched into `upcomingEvents` above (same status + date filter), so
  // derive it from that instead of paying for a third identical round
  // trip to Postgres on every page load.
  const eventsCount = upcomingEvents.length;

  return (
    <div
      className="px-5 pb-2 space-y-4"
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
            Brotherhood
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight leading-tight">
            Events
          </h1>
        </div>
        {isAdmin ? (
          <Link
            href="/admin/events"
            className="shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        ) : null}
      </div>

      <div className="flex gap-1.5">
        <TabPill href="/app/events?tab=events" label="Events" count={eventsCount ?? 0} active={tab === "events"} />
        <TabPill href="/app/events?tab=calendar" label="Calendar" count={0} active={tab === "calendar"} />
      </div>

      {tab === "calendar" ? (
        <CalendarView entries={calendarEntries} birthdays={calendarBirthdays} />
      ) : (
        <section className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <EmptyState
              title="No upcoming events"
              body="An admin will post the next one soon."
            />
          ) : (
            upcomingEvents.map((e) => (
              <EventCard
                key={e.id}
                {...(e as any)}
                rsvp_count={rsvpCount[e.id] ?? 0}
                user_going={mineMap[e.id] === "going"}
              />
            ))
          )}

          {pastEvents.length > 0 ? (
            <div className="pt-4 space-y-3">
              <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">Past</div>
              {pastEvents.map((e) => (
                <EventCard
                  key={e.id}
                  {...(e as any)}
                  rsvp_count={rsvpCount[e.id] ?? 0}
                  user_going={mineMap[e.id] === "going"}
                />
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function TabPill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex-1 h-9 rounded-full bg-white text-black font-semibold text-[13px] inline-flex items-center justify-center gap-2"
          : "flex-1 h-9 rounded-full bg-ink-800 hairline text-ink-200 text-[13px] inline-flex items-center justify-center gap-2"
      }
    >
      {label}
      {count > 0 ? (
        <span
          className={
            active
              ? "h-5 min-w-5 px-1.5 rounded-full bg-black/15 text-black text-[10.5px] font-bold inline-flex items-center justify-center"
              : "h-5 min-w-5 px-1.5 rounded-full bg-gold-400 text-black text-[10.5px] font-bold inline-flex items-center justify-center"
          }
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
