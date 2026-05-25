import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = supabaseServer();

  const [{ data: members }, { data: ledger }, { data: invitersRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, profile_photo_url, points_total")
      .eq("status", "approved")
      .order("points_total", { ascending: false })
      .limit(100),
    supabase
      .from("points_ledger")
      .select("user_id, action_type, points, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("profiles")
      .select("invited_by_user_id")
      .eq("status", "approved")
      .not("invited_by_user_id", "is", null),
  ]);

  // Tally invites per inviter
  const inviterMap: Record<string, number> = {};
  for (const row of invitersRaw ?? []) {
    if (!row.invited_by_user_id) continue;
    inviterMap[row.invited_by_user_id] = (inviterMap[row.invited_by_user_id] ?? 0) + 1;
  }
  const topInviterIds = Object.entries(inviterMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topInviters: any[] = [];
  if (topInviterIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, profile_photo_url")
      .in("id", topInviterIds);
    topInviters = (data ?? []).map((p) => ({ ...p, count: inviterMap[p.id] ?? 0 }));
    topInviters.sort((a, b) => b.count - a.count);
  }

  // Hydrate ledger user names
  const ledgerUserIds = Array.from(new Set((ledger ?? []).map((l) => l.user_id)));
  const { data: ledgerUsers } = ledgerUserIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ledgerUserIds)
    : { data: [] as any[] };
  const userNameMap: Record<string, string> = {};
  for (const u of ledgerUsers ?? []) userNameMap[u.id] = u.full_name;

  return (
    <div className="px-5 space-y-4 pb-8">
      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">Points</div>
          {(members ?? []).map((m, i) => (
            <Link
              key={m.id}
              href={`/app/members/${m.id}`}
              className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
            >
              <div className="w-5 text-[12px] text-ink-400 tabular-nums">{i + 1}</div>
              <Avatar src={m.profile_photo_url} name={m.full_name} size={32} />
              <div className="flex-1 text-white text-sm truncate">{m.full_name}</div>
              <div className="text-gold-300 text-sm font-semibold tabular-nums">{m.points_total}</div>
            </Link>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
            Top inviters
          </div>
          {topInviters.length === 0 ? (
            <div className="text-ink-400 text-sm">No invites approved yet.</div>
          ) : (
            topInviters.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="w-5 text-[12px] text-ink-400 tabular-nums">{i + 1}</div>
                <Avatar src={p.profile_photo_url} name={p.full_name} size={28} />
                <div className="flex-1 text-white text-sm truncate">{p.full_name}</div>
                <div className="text-gold-300 text-sm font-semibold tabular-nums">
                  {p.count} brought in
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
            Recent points ledger
          </div>
          {(ledger ?? []).length === 0 ? (
            <div className="text-ink-400 text-sm">No activity yet.</div>
          ) : (
            <ul className="text-sm divide-y divide-white/[0.04]">
              {(ledger ?? []).map((l, i) => (
                <li key={i} className="py-2 flex items-center gap-2">
                  <span className="text-ink-300 flex-1 truncate">
                    {userNameMap[l.user_id] ?? "Unknown"} · {l.action_type}
                  </span>
                  <span className="text-gold-300 font-semibold tabular-nums">+{l.points}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
