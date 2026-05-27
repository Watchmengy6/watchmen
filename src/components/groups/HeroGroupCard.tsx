import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { GroupCategoryTag } from "./GroupCategoryTag";
import { relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { MockGroup } from "@/lib/preview/mock";

export function HeroGroupCard({ group }: { group: MockGroup }) {
  return (
    <Link href="/preview/group-chat">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl shadow-card hairline",
          "bg-gradient-to-br",
          group.gradient,
        )}
      >
        {/* subtle ambient texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />

        <div className="relative p-5">
          {/* top row */}
          <div className="flex items-start justify-between">
            <div className="px-2.5 h-7 rounded-full bg-black/45 backdrop-blur text-[10.5px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center font-semibold">
              Most Active · Now
            </div>
            <GroupCategoryTag category={group.category} size="md" />
          </div>

          {/* emoji */}
          <div className="mt-4 flex items-end gap-4">
            <div className="h-20 w-20 rounded-3xl bg-black/40 ring-1 ring-white/10 flex items-center justify-center text-5xl">
              {group.emoji}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-white text-[24px] font-semibold tracking-tight leading-tight">
                {group.name}
              </h2>
              <div className="text-ink-200 text-[12.5px] mt-0.5 line-clamp-1">
                {group.description}
              </div>
            </div>
          </div>

          {/* latest message */}
          {group.last_message ? (
            <div className="mt-4 rounded-2xl bg-black/30 ring-1 ring-white/[0.08] px-3 py-2.5 backdrop-blur">
              <div className="text-[10.5px] tracking-wider uppercase text-ink-400 mb-0.5">
                Latest · {relativeTime(group.last_message.created_at)}
              </div>
              <div className="text-[13px] text-ink-100 leading-snug">
                <span className="font-semibold">{group.last_message.author}:</span>{" "}
                {group.last_message.content}
              </div>
            </div>
          ) : null}

          {/* bottom row */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {group.members_preview.slice(0, 4).map((m, i) => (
                  <Avatar
                    key={i}
                    name={m.name}
                    src={m.photo}
                    size={24}
                    className="ring-2 ring-black/60"
                  />
                ))}
              </div>
              <span className="text-[12px] text-ink-200">
                {group.member_count} members
              </span>
              {group.unread > 0 ? (
                <>
                  <span className="text-ink-500 mx-0.5">·</span>
                  <span className="text-[12px] text-gold-300 font-semibold">
                    {group.unread} new
                  </span>
                </>
              ) : null}
            </div>
            <div className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold">
              Open Chat
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
