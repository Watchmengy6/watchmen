import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AdminPreviewShell } from "../AdminPreviewShell";
import { mockMembers, mockLedger } from "@/lib/preview/mock";

export default function PreviewAdminLeaderboard() {
  const sorted = [...mockMembers].sort((a, b) => b.points_total - a.points_total);
  // Fake "top inviter" data for display
  const topInviters = [
    { id: "p_marcus", full_name: "Marcus Bell", count: 6 },
    { id: "p_dustin", full_name: "Dustin Hardy", count: 5 },
    { id: "p_aaron", full_name: "Aaron Pilkington", count: 4 },
  ];

  return (
    <AdminPreviewShell>
      <div className="px-5 space-y-4 pb-8">
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">Points</div>
            {sorted.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="w-5 text-[12px] text-ink-400 tabular-nums">{i + 1}</div>
                <Avatar src={m.profile_photo_url} name={m.full_name} size={32} />
                <div className="flex-1 text-white text-sm truncate">{m.full_name}</div>
                <div className="text-gold-300 text-sm font-semibold tabular-nums">{m.points_total}</div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
              Top inviters
            </div>
            {topInviters.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="w-5 text-[12px] text-ink-400 tabular-nums">{i + 1}</div>
                <Avatar name={p.full_name} size={28} />
                <div className="flex-1 text-white text-sm truncate">{p.full_name}</div>
                <div className="text-gold-300 text-sm font-semibold tabular-nums">
                  {p.count} brought in
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
              Recent points ledger
            </div>
            <ul className="text-sm divide-y divide-white/[0.04]">
              {mockLedger.map((l, i) => (
                <li key={i} className="py-2 flex items-center gap-2">
                  <span className="text-ink-300 flex-1 truncate">
                    {l.user_name} · {l.action_type}
                  </span>
                  <span className="text-gold-300 font-semibold tabular-nums">+{l.points}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </AdminPreviewShell>
  );
}
