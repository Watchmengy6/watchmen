import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { GroupCategoryTag } from "./GroupCategoryTag";
import { relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { MockGroup } from "@/lib/preview/mock";

export function GroupRowCard({ group }: { group: MockGroup }) {
  const href = group.joined ? "/preview/group-chat" : "/preview/group-discover";
  return (
    <Link href={href} className="block">
      <Card className="overflow-hidden">
        <div className="flex">
          {/* Colored side strip with emoji — mirrors Event row's date strip */}
          <div
            className={cn(
              "relative shrink-0 w-[88px] bg-gradient-to-br flex items-center justify-center",
              group.gradient,
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="text-4xl drop-shadow-lg">{group.emoji}</div>
            {group.unread > 0 ? (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-400 text-black text-[10px] font-bold flex items-center justify-center">
                {group.unread}
              </span>
            ) : null}
          </div>

          <div className="flex-1 min-w-0 p-3 pl-3.5">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="text-white text-[14.5px] font-semibold leading-tight truncate">
                {group.name}
              </div>
              <GroupCategoryTag category={group.category} />
            </div>

            {group.last_message ? (
              <div className="text-ink-300 text-[12.5px] truncate">
                <span className="text-ink-200 font-medium">{group.last_message.author}:</span>{" "}
                {group.last_message.content}
              </div>
            ) : (
              <div className="text-ink-400 text-[12.5px] truncate">{group.description}</div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {group.members_preview.slice(0, 3).map((m, i) => (
                    <Avatar
                      key={i}
                      name={m.name}
                      src={m.photo}
                      size={18}
                      className="ring-2 ring-ink-800"
                    />
                  ))}
                </div>
                <span className="text-[10.5px] text-ink-400">
                  {group.member_count} members
                </span>
              </div>
              {group.last_message ? (
                <span className="text-[10.5px] text-ink-400">
                  {relativeTime(group.last_message.created_at)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
