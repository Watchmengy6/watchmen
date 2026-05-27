import Link from "next/link";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TimeDivider } from "@/components/chat/TimeDivider";
import { ActivityCard } from "@/components/chat/ActivityCard";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMeetups, mockUpcomingEvent } from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

// The master chat is Dustin-only typed messages, plus auto-posted meetups + events.
const dustinMessages = [
  {
    id: "wm1",
    chat_id: "main",
    user_id: "p_dustin",
    content: "Brothers. Cigar Night next week. 25 spots, 18 taken. If you're coming, register today so I can plan.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T08:14:00Z",
    updated_at: "2026-05-25T08:14:00Z",
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [
      { reaction_type: "like", user_id: "p_aaron" },
      { reaction_type: "like", user_id: "p_marcus" },
      { reaction_type: "like", user_id: "p_jose" },
    ],
  },
  {
    id: "wm2",
    chat_id: "main",
    user_id: "p_dustin",
    content: "Also — if anyone's hiring or hunting right now, post it on the Feed. Tag #Hiring. We've placed three guys in the last month.",
    media_url: null,
    media_type: "none" as const,
    created_at: "2026-05-25T08:15:00Z",
    updated_at: "2026-05-25T08:15:00Z",
    author: { full_name: "Dustin Hardy", profile_photo_url: null },
    reactions: [{ reaction_type: "like", user_id: "p_devon" }],
  },
];

export default function PreviewChat() {
  // Build a hybrid timeline: Dustin's typed messages + auto-posted meetups + the event
  const myMeetup = mockMeetups.find((m) => m.host_name === "Aaron Pilkington");
  const someoneElseMeetup = mockMeetups.find((m) => m.host_name === "Marcus Bell") ?? mockMeetups[1];

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-32 relative flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 glass border-b border-white/[0.06] md:absolute">
        <div
          className="mx-auto max-w-screen-sm flex items-center justify-between px-4 py-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="w-12" />
          <div className="flex-1 text-center">
            <div className="text-white text-[15px] font-semibold leading-tight">
              The Watchman
            </div>
            <div className="text-[11px] text-ink-400">Broadcast · 47 members</div>
          </div>
          <div className="w-12 text-right text-ink-300 text-sm">⋯</div>
        </div>
      </div>

      <div className="flex-1 pt-16 md:pt-14 pb-2">
        <TimeDivider iso="2026-05-25T08:14:00Z" />

        {/* Dustin opens with an announcement */}
        <MessageBubble
          message={dustinMessages[0] as any}
          mine={false}
          groupPosition="first"
          showName={true}
        />
        <MessageBubble
          message={dustinMessages[1] as any}
          mine={false}
          groupPosition="last"
          showName={false}
        />

        {/* Dustin auto-posts the official event */}
        <div className="flex gap-2 px-3 mt-3">
          <div className="w-7 shrink-0 flex items-end pb-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-ink-600 to-ink-700 flex items-center justify-center text-[10px] font-bold text-ink-100">
              DH
            </div>
          </div>
          <div className="flex-1 max-w-[80%]">
            <div className="text-[11px] text-ink-400 mb-1 ml-1">Dustin Hardy</div>
            <ActivityCard
              kind="event"
              data={mockUpcomingEvent as any}
              hostName="Dustin Hardy"
              hostPhoto={null}
              going={true}
            />
          </div>
        </div>

        <TimeDivider iso="2026-05-25T11:30:00Z" />

        {/* Marcus auto-posts a meetup — appears on left */}
        <div className="flex gap-2 px-3">
          <div className="w-7 shrink-0 flex items-end pb-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-ink-600 to-ink-700 flex items-center justify-center text-[10px] font-bold text-ink-100">
              MB
            </div>
          </div>
          <div className="flex-1 max-w-[80%]">
            <div className="text-[11px] text-ink-400 mb-1 ml-1">
              Marcus Bell · created a meetup
            </div>
            <ActivityCard
              kind="meetup"
              data={someoneElseMeetup}
              hostName={someoneElseMeetup.host_name}
              hostPhoto={null}
              going={false}
            />
          </div>
        </div>

        <TimeDivider iso="2026-05-25T13:02:00Z" />

        {/* You auto-post a meetup — appears on the right */}
        {myMeetup ? (
          <div className="flex flex-row-reverse gap-2 px-3">
            <div className="max-w-[80%]">
              <div className="text-[11px] text-ink-400 mb-1 mr-1 text-right">
                You · created a meetup
              </div>
              <ActivityCard
                kind="meetup"
                data={myMeetup}
                hostName="Aaron Pilkington"
                hostPhoto={null}
                mine={true}
                going={true}
              />
            </div>
          </div>
        ) : null}

        <div className="text-center text-[10px] text-ink-500 mt-3">Delivered</div>
      </div>

      {/* Locked input — members can't type. Only Dustin can. */}
      <LockedInput />
      <PreviewBottomNav />
    </div>
  );
}

function LockedInput() {
  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-white/[0.05]">
      <div
        className="px-3 pt-2.5"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="rounded-2xl bg-ink-900/80 ring-1 ring-white/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gold-500/15 ring-1 ring-gold-500/30 flex items-center justify-center text-gold-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white font-semibold leading-tight">
                Only Dustin can post here
              </div>
              <div className="text-[11px] text-ink-300 leading-tight">
                Want to broadcast? Create a Meetup — the whole room sees it.
              </div>
            </div>
            <Link
              href="/preview/meetup-new"
              className={cn(
                "shrink-0 h-8 px-3 rounded-full text-[11.5px] font-semibold inline-flex items-center gap-1",
                "bg-gradient-to-b from-gold-300 to-gold-500 text-black",
              )}
            >
              + Meetup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
