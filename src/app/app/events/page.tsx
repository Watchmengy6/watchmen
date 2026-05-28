import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type Tab = "watchmen" | "meetups" | "sponsored";

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const tab: Tab =
    searchParams?.tab === "meetups" || searchParams?.tab === "sponsored"
      ? searchParams.tab
      : "watchmen";

  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  let upcomingEvents: any[] = [];
  let pastEvents: any[] = [];
  let upcomingMeetups: any[] = [];

  if (tab === "watchmen" || tab === "sponsored") {
    const [upRes, pastRes] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .gte("event_date", today)
        .eq("status", "published")
        .eq("kind", tab === "sponsored" ? "sponsored" : "watchmen")
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .lt("event_date", today)
        .in("status", ["published", "completed"])
        .eq("kind", tab === "sponsored" ? "sponsored" : "watchmen")
        .order("event_date", { ascending: false })
        .limit(20),
    ]);
    upcomingEvents = upRes.data ?? [];
    pastEvents = pastRes.data ?? [];
  } else {
    const { data } = await supabase
      .from("meetups")
      .select(
        "id, title, notes, when_at, duration_min, location_name, category, host:profiles!meetups_host_user_id_fkey(id, full_name, profile_photo_url)",
      )
      .gte("when_at", nowIso)
      .order("when_at", { ascending: true });
    upcomingMeetups = data ?? [];
  }

  // Counts for the tab pills.
  const [{ count: watchmenCount }, { count: meetupCount }, { count: sponsoredCount }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", today)
        .eq("status", "published")
        .eq("kind", "watchmen"),
      supabase
        .from("meetups")
        .select("*", { count: "exact", head: true })
        .gte("when_at", nowIso),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", today)
        .eq("status", "published")
        .eq("kind", "sponsored"),
    ]);

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
        {isAdmin && (tab === "watchmen" || tab === "sponsored") ? (
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
        ) : tab === "meetups" ? (
          <Link
            href="/app/meetups/new"
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

      {/* Segmented tabs */}
      <div className="flex gap-1.5">
        <TabPill href="/app/events?tab=watchmen" label="Watchmen" count={watchmenCount ?? 0} active={tab === "watchmen"} />
        <TabPill href="/app/events?tab=meetups" label="Meetups" count={meetupCount ?? 0} active={tab === "meetups"} />
        <TabPill href="/app/events?tab=sponsored" label="Sponsored" count={sponsoredCount ?? 0} active={tab === "sponsored"} />
      </div>

      {/* Sponsored intro */}
      {tab === "sponsored" ? (
        <div className="rounded-2xl bg-ink-800/60 hairline px-4 py-3 text-[13px] text-ink-300">
          <span className="text-white font-semibold">Sponsored events</span> are paid placements from partner businesses around Tampa Bay. RSVPs still earn you check-in points.
        </div>
      ) : null}

      {/* Meetups intro */}
      {tab === "meetups" ? (
        <div className="rounded-2xl bg-ink-800/60 hairline px-4 py-3 text-[13px] text-ink-300">
          <span className="text-white font-semibold">Meetups</span> are casual. Any brother can host one in five seconds — coffee, a workout, drinks, a walk.
        </div>
      ) : null}

      {/* List */}
      {tab === "meetups" ? (
        <section className="space-y-3">
          {upcomingMeetups.length === 0 ? (
            <EmptyState title="No meetups scheduled" body="Host one in five seconds." />
          ) : (
            upcomingMeetups.map((m: any) => {
              const host = Array.isArray(m.host) ? m.host[0] : m.host;
              const when = new Date(m.when_at);
              return (
                <Link
                  key={m.id}
                  href={`/app/meetups/${m.id}`}
                  className="block rounded-2xl bg-ink-800/80 hairline p-4 active:bg-ink-800"
                >
                  <div className="text-[10.5px] tracking-[0.2em] uppercase text-gold-300/80">
                    {m.category}
                  </div>
                  <div className="text-white text-[16px] font-semibold mt-0.5">{m.title}</div>
                  <div className="text-ink-300 text-[13px] mt-0.5">
                    {when.toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  {m.location_name ? (
                    <div className="text-ink-400 text-[12px]">{m.location_name}</div>
                  ) : null}
                  {host ? (
                    <div className="text-ink-400 text-[11.5px] mt-2">by {host.full_name}</div>
                  ) : null}
                </Link>
              );
            })
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <EmptyState
              title={tab === "sponsored" ? "No sponsored events yet" : "No upcoming events"}
              body={tab === "sponsored" ? "Partner placements will appear here." : "An admin will post the next one soon."}
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
