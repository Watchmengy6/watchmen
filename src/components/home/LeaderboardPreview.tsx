import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

interface Row {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  points_total: number;
}

export function LeaderboardPreview({ rows }: { rows: Row[] }) {
  return (
    <Card className="mx-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
              Top Contributors
            </div>
            <h3 className="text-white text-lg font-semibold mt-0.5">Leaderboard</h3>
          </div>
          <Link href="/app/members" className="text-gold-300 text-xs">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <div className="text-ink-300 text-sm py-4 text-center">
            Activity will show up here.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((r, i) => (
              <li key={r.id}>
                <Link
                  href={`/app/members/${r.id}`}
                  className="flex items-center gap-3 py-2.5 -mx-1 px-1 rounded-lg active:bg-white/[0.04]"
                >
                  <div className="w-5 text-[12px] text-ink-400 font-semibold tabular-nums">
                    {i + 1}
                  </div>
                  <Avatar src={r.profile_photo_url} name={r.full_name} size={32} />
                  <div className="flex-1 min-w-0 text-white text-sm truncate">
                    {r.full_name}
                  </div>
                  <div className="text-gold-300 text-sm font-semibold tabular-nums">
                    {r.points_total}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
