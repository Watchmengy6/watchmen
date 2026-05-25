import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

interface Props {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  occupation: string | null;
  company: string | null;
  points_total: number;
  interests?: string[];
}

export function MemberCard(p: Props) {
  return (
    <Link href={`/app/members/${p.id}`}>
      <Card className="p-4 active:bg-white/[0.04]">
        <div className="flex items-center gap-3">
          <Avatar src={p.profile_photo_url} name={p.full_name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-white font-semibold truncate">{p.full_name}</div>
              <Badge variant="gold" className="shrink-0">{p.points_total}</Badge>
            </div>
            <div className="text-ink-300 text-sm truncate">
              {p.occupation ?? "Member"}
              {p.company ? ` · ${p.company}` : ""}
            </div>
            {p.interests && p.interests.length > 0 ? (
              <div className="mt-1.5 flex gap-1 flex-wrap">
                {p.interests.slice(0, 3).map((i) => (
                  <span
                    key={i}
                    className="text-[10.5px] px-2 h-5 rounded-full bg-ink-800 hairline text-ink-300 inline-flex items-center"
                  >
                    {i}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
