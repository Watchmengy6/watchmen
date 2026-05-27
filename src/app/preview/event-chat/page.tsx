import Link from "next/link";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TimeDivider } from "@/components/chat/TimeDivider";
import { groupMessages } from "@/components/chat/groupMessages";
import { IosChatInput } from "@/components/chat/IosChatInput";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockUpcomingEvent } from "@/lib/preview/mock";

const eventMessages = [
  {
    id: "em1",
    chat_id: "ev_cigar_jun",
    user_id: "p_dustin",
    content: "Cigars covered. Bringing two boxes of Padrons.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T09:00:00Z",
    updated_at: "2026-05-25T09:00:00Z",
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [{ reaction_type: "like", user_id: "p_aaron" }],
  },
  {
    id: "em1b",
    chat_id: "ev_cigar_jun",
    user_id: "p_dustin",
    content: "Bourbon too. Don't bring any.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T09:00:40Z",
    updated_at: "2026-05-25T09:00:40Z",
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "em2",
    chat_id: "ev_cigar_jun",
    user_id: "p_aaron",
    content: "I'll handle rideshare codes for guys flying in.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T09:04:00Z",
    updated_at: "2026-05-25T09:04:00Z",
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "em2b",
    chat_id: "ev_cigar_jun",
    user_id: "p_aaron",
    content: "Will drop them here Friday AM.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T09:04:30Z",
    updated_at: "2026-05-25T09:04:30Z",
    author: { full_name: "Aaron Pilkington", profile_photo_url: null },
    reactions: [],
  },
  {
    id: "em3",
    chat_id: "ev_cigar_jun",
    user_id: "p_jose",
    content: "Bringing the new guy from my crew — Sam, strength coach. Worth knowing.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T11:11:00Z",
    updated_at: "2026-05-25T11:11:00Z",
    author: { full_name: "Jose Ramirez", profile_photo_url: null },
    reactions: [
      { reaction_type: "like", user_id: "p_dustin" },
      { reaction_type: "like", user_id: "p_marcus" },
    ],
  },
];

export default function PreviewEventChat() {
  const items = groupMessages(eventMessages as any, "p_aaron");

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-28 relative flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-30 glass border-b border-white/[0.06] md:absolute">
        <div
          className="mx-auto max-w-screen-sm flex items-center justify-between px-4 py-2 gap-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <Link href="/preview/event" className="text-ink-200 text-sm w-12">‹</Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-white text-[14px] font-semibold leading-tight truncate">
              {mockUpcomingEvent.title}
            </div>
            <div className="text-[11px] text-ink-400">Event Room · 18 going</div>
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

      <IosChatInput placeholder="iMessage" />
      <PreviewBottomNav />
    </div>
  );
}
