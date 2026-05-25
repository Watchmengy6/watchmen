import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Greeting } from "@/components/home/Greeting";
import { NextEventCard } from "@/components/home/NextEventCard";
import { StatsRow } from "@/components/home/StatsRow";
import { LeaderboardPreview } from "@/components/home/LeaderboardPreview";
import { QuickActions } from "@/components/home/QuickActions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  // Next upcoming published event
  const today = new Date().toISOString().slice(0, 10);
  const { data: nextEvent } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  let eventWithMeta: any = nextEvent;
  if (nextEvent) {
    const [{ count: rsvpCount }, { data: myRsvp }] = await Promise.all([
      supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", nextEvent.id)
        .eq("status", "going"),
      supabase
        .from("event_rsvps")
        .select("status")
        .eq("event_id", nextEvent.id)
        .eq("user_id", profile.id)
        .maybeSingle(),
    ]);
    eventWithMeta = {
      ...nextEvent,
      rsvp_count: rsvpCount ?? 0,
      user_going: myRsvp?.status === "going",
    };
  }

  // Stats
  const { count: eventsAttended } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("checked_in", true);

  const { count: invitesApproved } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("invited_by_user_id", profile.id)
    .eq("status", "approved");

  // Leaderboard (top 5)
  const { data: leaderboard } = await supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url, points_total")
    .eq("status", "approved")
    .order("points_total", { ascending: false })
    .limit(5);

  // Unread notifications count
  const { count: unread } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("read", false);

  return (
    <div className="space-y-5 pt-2">
      <Greeting name={profile.full_name} unread={unread ?? 0} />
      <NextEventCard event={eventWithMeta} />
      <StatsRow
        points={profile.points_total}
        eventsAttended={eventsAttended ?? 0}
        invitesApproved={invitesApproved ?? 0}
      />
      <LeaderboardPreview rows={leaderboard ?? []} />
      <QuickActions />
      <p className="text-center text-[11px] text-ink-400 pb-4 px-6">
        On iPhone? Tap <span className="text-ink-200">Share → Add to Home Screen</span> to install.
      </p>
    </div>
  );
}
