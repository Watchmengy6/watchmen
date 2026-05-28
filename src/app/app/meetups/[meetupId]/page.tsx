import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { rsvpMeetupAction } from "@/lib/meetups/realActions";

export const dynamic = "force-dynamic";

export default async function MeetupDetail({
  params,
}: {
  params: { meetupId: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: meetup } = await supabase
    .from("meetups")
    .select(
      "id, title, notes, when_at, duration_min, location_name, address, category, host:profiles!meetups_host_user_id_fkey(id, full_name, profile_photo_url, occupation, company)",
    )
    .eq("id", params.meetupId)
    .maybeSingle();
  if (!meetup) notFound();

  const { data: rsvps } = await supabase
    .from("meetup_rsvps")
    .select(
      "user_id, going, profile:profiles!meetup_rsvps_user_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("meetup_id", meetup.id)
    .eq("going", true);

  const goingList = (rsvps ?? [])
    .map((r: any) => (Array.isArray(r.profile) ? r.profile[0] : r.profile))
    .filter(Boolean);
  const iAmGoing = (rsvps ?? []).some((r: any) => r.user_id === profile.id);
  const host = Array.isArray(meetup.host) ? meetup.host[0] : meetup.host;

  const when = new Date(meetup.when_at);
  const dateLabel = when.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/app/meetups"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Meetup
            </div>
            <div className="text-white text-[16px] font-semibold leading-tight truncate">
              {meetup.title}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-700/30 via-amber-900/10 to-transparent ring-1 ring-gold-500/30 p-5">
          <div className="text-[10.5px] tracking-[0.22em] uppercase text-gold-300/80">
            {meetup.category}
          </div>
          <div className="text-white text-[22px] font-semibold mt-1">{meetup.title}</div>
          <div className="text-ink-100 text-[14px] mt-2">{dateLabel}</div>
          {meetup.location_name ? (
            <div className="text-ink-300 text-[13px]">{meetup.location_name}</div>
          ) : null}
        </div>

        {/* Host */}
        {host ? (
          <div className="rounded-2xl bg-ink-800/80 hairline p-3 flex items-center gap-3">
            <Avatar src={host.profile_photo_url ?? undefined} name={host.full_name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-400">
                Hosted by
              </div>
              <Link href={`/app/members/${host.id}`} className="text-white text-[15px] font-semibold">
                {host.full_name}
              </Link>
              {host.occupation || host.company ? (
                <div className="text-ink-300 text-[12px] truncate">
                  {[host.occupation, host.company].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Notes */}
        {meetup.notes ? (
          <div className="rounded-2xl bg-ink-800/80 hairline p-4">
            <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-400 mb-1">
              Notes
            </div>
            <p className="text-ink-100 text-[14px] leading-relaxed whitespace-pre-wrap">
              {meetup.notes}
            </p>
          </div>
        ) : null}

        {/* RSVP */}
        <form action={rsvpMeetupAction}>
          <input type="hidden" name="meetup_id" value={meetup.id} />
          <input type="hidden" name="going" value={iAmGoing ? "false" : "true"} />
          <button
            type="submit"
            className={
              iAmGoing
                ? "w-full h-12 rounded-full bg-ink-800 hairline text-ink-200 text-[15px] font-semibold"
                : "w-full h-12 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[15px] font-semibold"
            }
          >
            {iAmGoing ? "You're going · tap to undo" : "I'm in"}
          </button>
        </form>

        {/* Going list */}
        <div>
          <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-400 mb-2 px-1">
            {goingList.length} going
          </div>
          <div className="rounded-2xl bg-ink-800/80 hairline divide-y divide-white/[0.04]">
            {goingList.map((p: any) => (
              <Link
                key={p.id}
                href={`/app/members/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.02]"
              >
                <Avatar src={p.profile_photo_url ?? undefined} name={p.full_name} size={36} />
                <div className="flex-1 min-w-0 text-white text-[14px]">{p.full_name}</div>
              </Link>
            ))}
            {goingList.length === 0 ? (
              <div className="px-4 py-3 text-ink-300 text-[13px]">
                Nobody's RSVPd yet. Be the first.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
