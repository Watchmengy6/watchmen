import Link from "next/link";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TimeDivider } from "@/components/chat/TimeDivider";
import { groupMessages } from "@/components/chat/groupMessages";
import { IosChatInput } from "@/components/chat/IosChatInput";
import { PreviewBottomNav } from "../PreviewBottomNav";

const groupMessagesData = [
  {
    id: "gm1",
    chat_id: "g_mastermind",
    user_id: "p_devon",
    content: "Aaron — looking forward to seeing your Q2 numbers Tuesday.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:48:00Z",
    updated_at: "2026-05-25T11:48:00Z",
    author: { full_name: "Devon Park", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "gm2",
    chat_id: "g_mastermind",
    user_id: "p_aaron",
    content: "Sharing my Q2 P&L for the meeting on Tuesday.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:50:00Z",
    updated_at: "2026-05-25T11:50:00Z",
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [{ reaction_type: "like", user_id: "p_devon" }],
  },
  {
    id: "gm3",
    chat_id: "g_mastermind",
    user_id: "p_aaron",
    content: "Plus where I think we're going to land Q3 if nothing changes.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:50:30Z",
    updated_at: "2026-05-25T11:50:30Z",
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "gm4",
    chat_id: "g_mastermind",
    user_id: "p_dustin",
    content: "Good. I want to talk about the deal flow problem too.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T12:08:00Z",
    updated_at: "2026-05-25T12:08:00Z",
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [
      { reaction_type: "like", user_id: "p_aaron" },
      { reaction_type: "like", user_id: "p_devon" },
    ],
  },
];

export default function PreviewGroupChat() {
  const items = groupMessages(groupMessagesData as any, "p_aaron");
  return (
    <div className="min-h-[100dvh] bg-black text-white pb-28 relative flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-30 glass border-b border-white/[0.06] md:absolute">
        <div
          className="mx-auto max-w-screen-sm flex items-center justify-between px-4 py-2 gap-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <Link href="/preview/dms?tab=groups" className="text-ink-200 text-sm w-12">‹</Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-white text-[14px] font-semibold leading-tight">
              💼 Business Mastermind
            </div>
            <div className="text-[11px] text-ink-400">11 members</div>
          </div>
          <div className="w-12 text-right text-ink-300 text-sm">⋯</div>
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
              showName={it.showName}
            />
          ),
        )}
        <div className="text-center text-[10px] text-ink-500 mt-2">Delivered</div>
      </div>

      <IosChatInput placeholder="Message Mastermind" />
      <PreviewBottomNav />
    </div>
  );
}
