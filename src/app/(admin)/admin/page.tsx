import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = supabaseServer();
  const [{ count: pending }, { count: members }, { count: events }, { data: topInviters }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id, full_name, points_total, profile_photo_url")
        .eq("status", "approved")
        .order("points_total", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="px-5 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Tile href="/admin/pending" value={pending ?? 0} label="Pending" highlight={(pending ?? 0) > 0} />
        <Tile href="/admin/members" value={members ?? 0} label="Members" />
        <Tile href="/admin/events" value={events ?? 0} label="Events" />
      </div>

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
