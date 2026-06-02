import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = supabaseServer();
  const [
    { count: pending },
    { count: members },
    { count: events },
    { data: topInviters },
    { data: birthdayPool },
    { data: admins },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id, full_name, points_total, profile_photo_url")
      .eq("status", "approved")
      .order("points_total", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("id, full_name, profile_photo_url, birthday")
      .eq("status", "approved")
      .not("birthday", "is", null),
    // Admin push-subscription check: surface whether each admin has at
    // least one push subscription on file so we know who'll actually
    // receive signup pushes (Dustin missed one because his device
    // didn't have push enabled).
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["admin", "super_admin"])
      .eq("status", "approved"),
  ]);
  const { data: adminSubs } = admins && admins.length > 0
    ? await supabase
        .from("push_subscriptions")
        .select("user_id")
        .in(
          "user_id",
          admins.map((a: any) => a.id),
        )
    : { data: [] };
  const subscribedAdminIds = new Set(
    (adminSubs ?? []).map((s: any) => s.user_id),
  );
  const adminPushStatus = (admins ?? []).map((a: any) => ({
    id: a.id,
    full_name: a.full_name,
    subscribed: subscribedAdminIds.has(a.id),
  }));
  const someAdminMissingPush = adminPushStatus.some((a) => !a.subscribed);

  // Compute next-birthday occurrence + days-until for each member, keep
  // anyone whose next birthday is within 30 days, sort soonest first.
  const upcomingBirthdays = computeUpcomingBirthdays(birthdayPool ?? [], 30, 10);

  return (
    <div className="px-5 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Tile href="/admin/pending" value={pending ?? 0} label="Pending" highlight={(pending ?? 0) > 0} />
        <Tile href="/admin/members" value={members ?? 0} label="Members" />
        <Tile href="/admin/events" value={events ?? 0} label="Events" />
      </div>

      {/* Admin push status — flags any admin who hasn't enabled push on
          a device so we know if signup/report notifications will reach
          them. Dustin missed a signup push because his device wasn't
          subscribed yet. */}
      {someAdminMissingPush ? (
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-red-300 mb-2">
              Push not enabled
            </div>
            <div className="text-ink-200 text-[13.5px] mb-2">
              These admins won&apos;t get signup or report pushes until they
              tap <span className="text-white font-semibold">Enable notifications</span> on their profile:
            </div>
            <div className="space-y-1">
              {adminPushStatus
                .filter((a) => !a.subscribed)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-[13px] py-1"
                  >
                    <span className="text-white">{a.full_name}</span>
                    <span className="text-red-300/80 text-[11.5px]">not subscribed</span>
                  </div>
                ))}
            </div>
            <div className="text-ink-400 text-[11.5px] mt-2">
              On iPhone, the app has to be installed to Home Screen first.
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Upcoming birthdays — next 30 days. The home feed already fires
          an automated post on the day; this card gives admins a heads
          up so they can plan ahead. */}
      {upcomingBirthdays.length > 0 ? (
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
              Upcoming Birthdays
            </div>
            <div className="-mx-1">
              {upcomingBirthdays.map((b) => (
                <Link
                  key={b.id}
                  href={`/app/members/${b.id}`}
                  className="flex items-center gap-3 px-1 py-2 border-b border-white/[0.05] last:border-0"
                >
                  <Avatar src={b.profile_photo_url ?? undefined} name={b.full_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[14px] font-semibold truncate">
                      {b.full_name}
                    </div>
                    <div className="text-ink-300 text-[12px]">{b.dateLabel}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={
                        b.daysUntil === 0
                          ? "text-gold-300 text-[13px] font-semibold"
                          : "text-ink-200 text-[13px]"
                      }
                    >
                      {b.daysUntil === 0 ? "Today 🎂" : `${b.daysUntil}d`}
                    </div>
                    {b.turning ? (
                      <div className="text-ink-400 text-[11px]">turns {b.turning}</div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
            Top Contributors
          </div>
          {(topInviters ?? []).map((t, i) => (
            <Link
              key={t.id}
              href={`/app/members/${t.id}`}
              className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0"
            >
              <div className="w-5 text-[12px] text-ink-400 font-semibold tabular-nums">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 text-white text-sm truncate">{t.full_name}</div>
              <div className="text-gold-300 text-sm font-semibold">{t.points_total}</div>
            </Link>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">
            Quick links
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link href="/admin/leaderboard" className="rounded-xl bg-ink-800 hairline px-3 py-3">
              <div className="text-white text-sm font-medium">Leaderboard</div>
              <div className="text-ink-300 text-xs mt-0.5">Audit points</div>
            </Link>
            <Link href="/admin/events" className="rounded-xl bg-ink-800 hairline px-3 py-3">
              <div className="text-white text-sm font-medium">Create event</div>
              <div className="text-ink-300 text-xs mt-0.5">Add a Watchman night</div>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * For each member with a birthday set, compute when their next birthday
 * lands (this year if it hasn't passed, otherwise next year), how many
 * days away that is, and how old they'll turn (if their birthday year
 * is set — old enough to compute an age from). Filter to within
 * `windowDays`, sort soonest first, slice to `max`.
 */
function computeUpcomingBirthdays(
  rows: { id: string; full_name: string; profile_photo_url: string | null; birthday: string | null }[],
  windowDays: number,
  max: number,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();

  return rows
    .map((r) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(r.birthday ?? "");
      if (!match) return null;
      const birthYear = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      // Next occurrence — this year if today is still on/before it,
      // otherwise next year.
      let next = new Date(thisYear, month - 1, day);
      if (next < today) next = new Date(thisYear + 1, month - 1, day);
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      const turning =
        birthYear && birthYear > 1900 ? next.getFullYear() - birthYear : null;
      const dateLabel = next.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return {
        id: r.id,
        full_name: r.full_name,
        profile_photo_url: r.profile_photo_url,
        daysUntil,
        turning,
        dateLabel,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, max);
}

function Tile({
  href,
  value,
  label,
  highlight,
}: {
  href: string;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`px-3 py-3 text-center ${highlight ? "glow-gold" : ""}`}>
        <div className="text-gradient-gold text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-[11px] text-ink-300 mt-1">{label}</div>
      </Card>
    </Link>
  );
}
