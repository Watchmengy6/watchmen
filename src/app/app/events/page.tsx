import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { localTodayISO } from "@/lib/utils/localDate";
import { CalendarView, type CalendarEntry } from "./CalendarView";

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
  const nowIso = new Date().toISOString();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  // Pull what each tab needs. Events tab fetches the list. Calendar
  // pulls upcoming events + meetups + birthday profiles, then merges.
  const upRes = await supabase
    .from("events")
    .select("*")
    .gte("event_date", today)
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });
  const pastRes = await supabase
    .from("events")
    .select("*")
    .lt("event_date", today)
    .in("status", ["published", "completed"])
    .order("event_date", { ascending: false })
    .limit(20);
  const upcomingEvents: any[] = upRes.data ?? [];
  const pastEvents: any[] = pastRes.data ?? [];

  let calendarEntries: CalendarEntry[] = [];
  if (tab === "calendar") {
    const [{ data: meetups }, { data: bdayPool }] = await Promise.all([
      supabase
        .from("meetups")
        .select(
          "id, title, when_at, location_name, host:profiles!meetups_host_user_id_fkey(full_name)",
        )
        .gte("when_at", nowIso)
        .order("when_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, birthday")
        .eq("status", "approved")
        .not("birthday", "is", null),
    ]);

    const eventEntries: CalendarEntry[] = upcomingEvents.map((e: any) => ({
      kind: "event" as const,
      id: e.id,
      sortAt: `${e.event_date}T${e.start_time ?? "00:00:00"}`,
      title: e.title,
      subtitle: [
        e.start_time ? formatTime(e.start_time) : null,
        e.location_name,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/app/events/${e.id}`,
    }));

    const meetupEntries: CalendarEntry[] = (meetups ?? []).map((m: any) => {
      const host = Array.isArray(m.host) ? m.host[0] : m.host;
      return {
        kind: "meetup" as const,
        id: m.id,
        sortAt: m.when_at,
        title: m.title,
        subtitle: [host?.full_name ? `Hosted by ${host.full_name}` : null, m.location_name]
          .filter(Boolean)
          .join(" · "),
        href: `/app/meetups/${m.id}`,
      };
    });

    // Birthdays — compute the next occurrence (this year if still
    // upcoming, else next year) so they sort correctly into the list.
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const thisYear = todayLocal.getFullYear();
    const birthdayEntries: CalendarEntry[] = (bdayPool ?? [])
      .map((p: any): CalendarEntry | null => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p.birthday ?? "");
        if (!m) return null;
        const month = Number(m[2]);
        const day = Number(m[3]);
        let next = new Date(thisYear, month - 1, day);
        if (next < todayLocal) next = new Date(thisYear + 1, month - 1, day);
        return {
          kind: "birthday" as const,
          id: p.id,
          sortAt: next.toISOString(),
          title: `${p.full_name}'s birthday`,
          subtitle: next.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          href: `/app/members/${p.id}`,
        };
      })
      .filter((x): x is CalendarEntry => x !== null);

    calendarEntries = [...eventEntries, ...meetupEntries, ...birthdayEntries]
      .sort((a, b) => a.sortAt.localeCompare(b.sortAt))
      // Window: show only the next 90 days so the list stays useful.
      .filter((e) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 90);
        return new Date(e.sortAt) <= cutoff;
      });
  }

  // RSVP counts + my-RSVP for events being shown.
  const eventIds = [...upcomingEvents, ...pastEvents].map((e) => e.id);
  const rsvpCount: Record<string, number> = {};
  const mineMap: Record<string, string> = {};
  if (eventIds.length > 0) {
    const [{ data: counts }, { data: mine }] = await Promise.all([
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
    ]);
    (counts ?? []).forEach((r: any) => {
      rsvpCount[r.event_id] = (rsvpCount[r.event_id] ?? 0) + 1;
    });
    (mine ?? []).forEach((r: any) => {
      mineMap[r.event_id] = r.status;
    });
  }

  // Counts for the tab pills.
  const [{ count: eventsCount }, { count: meetupCount }, { count: bdayCount }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", today)
        .eq("status", "published"),
      supabase
        .from("meetups")
        .select("*", { count: "exact", head: true })
        .gte("when_at", nowIso),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .not("birthday", "is", null),
    ]);
  const calendarCount =
    (eventsCount ?? 0) + (meetupCount ?? 0) + (bdayCount ?? 0);

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
        <TabPill href="/app/events?tab=calendar" label="Calendar" count={calendarCount} active={tab === "calendar"} />
      </div>

      {tab === "calendar" ? (
        <CalendarView entries={calendarEntries} />
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

function formatTime(t: string): string {
  // "18:30:00" -> "6:30 PM"
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 || 12;
  return `${display}:${mm} ${period}`;
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
