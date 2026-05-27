import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

export default async function MeetupsPage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const nowIso = new Date().toISOString();
  const { data: meetups } = await supabase
    .from("meetups")
    .select(
      "id, title, notes, when_at, duration_min, location_name, category, host:profiles!meetups_host_user_id_fkey(id, full_name, profile_photo_url)",
    )
    .gte("when_at", nowIso)
    .order("when_at", { ascending: true });

  // RSVP counts + my RSVPs.
  const ids = (meetups ?? []).map((m: any) => m.id);
  const rsvpCount = new Map<string, number>();
  const myRsvp = new Set<string>();
  if (ids.length > 0) {
    const [{ data: rsvps }, { data: mine }] = await Promise.all([
      supabase.from("meetup_rsvps").select("meetup_id").in("meetup_id", ids).eq("going", true),
      supabase
        .from("meetup_rsvps")
        .select("meetup_id")
        .in("meetup_id", ids)
        .eq("user_id", profile.id)
        .eq("going", true),
    ]);
    (rsvps ?? []).forEach((r: any) =>
      rsvpCount.set(r.meetup_id, (rsvpCount.get(r.meetup_id) ?? 0) + 1),
    );
    (mine ?? []).forEach((r: any) => myRsvp.add(r.meetup_id));
  }

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 -mx-4 sm:mx-0">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Brotherhood
            </div>
            <div className="text-white text-[22px] font-semibold leading-tight">
              Meetups
            </div>
          </div>
          <Link
            href="/app/meetups/new"
            className="h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        </div>
      </div>

      <div className="px-4 pt-3">
        <p className="text-ink-300 text-[13.5px] mb-4">
          <span className="text-white font-semibold">Meetups</span> are casual. Any brother can host one in five seconds — coffee, a workout, drinks, a walk.
        </p>

        <div className="space-y-3">
          {(meetups ?? []).length === 0 ? (
            <div className="text-center text-ink-300 text-sm py-10">
              No meetups scheduled. Host one in five seconds.
            </div>
          ) : (
            (meetups ?? []).map((m: any) => {
              const host = Array.isArray(m.host) ? m.host[0] : m.host;
              const when = new Date(m.when_at);
              const dateLabel = when.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <Link
                  key={m.id}
                  href={`/app/meetups/${m.id}`}
                  className="block rounded-2xl bg-ink-800/80 hairline p-4 active:bg-ink-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10.5px] tracking-[0.2em] uppercase text-gold-300/80">
                        {m.category}
                      </div>
                      <div className="text-white text-[16px] font-semibold mt-0.5">
                        {m.title}
                      </div>
                      <div className="text-ink-300 text-[13px] mt-0.5">{dateLabel}</div>
                      {m.location_name ? (
                        <div className="text-ink-400 text-[12px]">{m.location_name}</div>
                      ) : null}
                    </div>
                    {myRsvp.has(m.id) ? (
                      <span className="text-[10.5px] px-2 h-6 rounded-full bg-emerald-500/15 text-emerald-300 inline-flex items-center font-semibold uppercase tracking-wider shrink-0">
                        Going
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    {host ? (
                      <>
                        <Avatar src={host.profile_photo_url ?? undefined} name={host.full_name} size={24} />
                        <span className="text-ink-300 text-[12.5px]">
                          by <span className="text-ink-100">{host.full_name}</span>
                        </span>
                      </>
                    ) : null}
                    <span className="text-ink-400 text-[12px] ml-auto">
                      {rsvpCount.get(m.id) ?? 0} going
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
