import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TimeDivider } from "@/components/chat/TimeDivider";
import { groupMessages } from "@/components/chat/groupMessages";
import { IosChatInput } from "@/components/chat/IosChatInput";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockDmConversation } from "@/lib/preview/mock";

export default function PreviewDm() {
  const items = groupMessages(mockDmConversation as any, "p_aaron");

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-28 relative flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-30 glass border-b border-white/[0.06] md:absolute">
        <div
          className="mx-auto max-w-screen-sm flex items-center justify-between px-3 py-2 gap-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <Link href="/preview/dms" className="text-ink-200 text-sm w-10">‹</Link>
          <Link
            href="/preview/member"
            className="flex-1 flex items-center justify-center gap-2 min-w-0"
          >
            <div className="relative shrink-0">
              <Avatar name="Marcus Bell" size={30} />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>
            <div className="min-w-0 text-center">
              <div className="text-white text-[14px] font-semibold leading-tight truncate">
                Marcus Bell
              </div>
              <div className="text-[10.5px] text-emerald-300">Online</div>
            </div>
          </Link>
          <div className="w-10 text-right text-ink-300 text-sm">⋯</div>
        </div>
      </div>

      <div className="flex-1 pt-16 md:pt-14 pb-2">
        {items.map((it, i) =>
          it.kind === "divider" ? (
            <TimeDivider key={`d-${i}`} iso={it.divider!} />
          ) : (
            <MessageBubble
              key={it.message!.id}
              message={it.message as any}
              mine={it.message!.user_id === "p_aaron"}
              groupPosition={it.groupPosition}
              showName={false}
            />
          ),
        )}
        <div className="text-center text-[10px] text-ink-500 mt-2">Read · just now</div>
      </div>

      <IosChatInput placeholder="iMessage" />
      <PreviewBottomNav />
    </div>
  );
}
