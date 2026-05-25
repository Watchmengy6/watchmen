"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { votePollAction } from "@/lib/polls/actions";
import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";

interface Poll {
  id: string;
  question: string;
  options: { id: string; option_text: string }[];
  votes: { poll_option_id: string; user_id: string }[];
}

export function PollDisplay({
  poll,
  myProfileId,
}: {
  poll: Poll;
  myProfileId: string;
}) {
  const [, start] = useTransition();
  const total = poll.votes.length;
  const myVote = poll.votes.find((v) => v.user_id === myProfileId)?.poll_option_id;

  return (
    <Card>
      <CardBody>
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-gold-300/80 mb-1">
          Poll
        </div>
        <div className="text-white font-semibold">{poll.question}</div>
        <div className="mt-3 space-y-2">
          {poll.options.map((o) => {
            const count = poll.votes.filter((v) => v.poll_option_id === o.id).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const mine = myVote === o.id;
            return (
              <button
                key={o.id}
                onClick={() =>
                  start(() => void votePollAction({ poll_id: poll.id, option_id: o.id }))
                }
                className={cn(
                  "relative w-full overflow-hidden rounded-xl hairline px-3 py-2.5 text-left",
                  mine ? "ring-1 ring-gold-500/40 bg-gold-500/10" : "bg-ink-800 hover:bg-ink-700",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all",
                    mine ? "bg-gold-500/15" : "bg-white/[0.05]",
                  )}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="text-white text-sm">{o.option_text}</span>
                  <span className="text-ink-300 text-xs tabular-nums">
                    {pct}% · {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-ink-400">
          {total} {total === 1 ? "vote" : "votes"}
          {myVote ? " · You voted" : " · Tap an option to vote"}
        </div>
      </CardBody>
    </Card>
  );
}
