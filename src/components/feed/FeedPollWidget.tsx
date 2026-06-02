"use client";

import { useState, useTransition } from "react";
import { votePollAction } from "@/lib/feed/actions";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

/**
 * Inline poll renderer that lives below a feed post. Tap an option to
 * vote; tap a different option to change your vote. Server-side upserts
 * on (post_id, user_id) so the unique constraint guarantees one vote.
 *
 * Optimistic UI — flips the bar percentages instantly, rolls back if
 * the server action rejects.
 */
export function FeedPollWidget({
  postId,
  options,
  initialVotes,
  initialMyVote,
}: {
  postId: string;
  options: string[];
  initialVotes: number[];
  initialMyVote: number | null;
}) {
  const [votes, setVotes] = useState<number[]>(initialVotes);
  const [myVote, setMyVote] = useState<number | null>(initialMyVote);
  const [pending, start] = useTransition();
  const { push } = useToast();

  const total = votes.reduce((s, n) => s + n, 0);

  function cast(idx: number) {
    if (pending || idx === myVote) return;
    // Optimistic: decrement old vote if any, increment the new one.
    const nextVotes = [...votes];
    if (myVote !== null && nextVotes[myVote] != null) nextVotes[myVote] -= 1;
    nextVotes[idx] = (nextVotes[idx] ?? 0) + 1;
    const prevMyVote = myVote;
    const prevVotes = votes;
    setVotes(nextVotes);
    setMyVote(idx);
    start(async () => {
      const r = await votePollAction({ postId, optionIndex: idx });
      if (r.error) {
        setVotes(prevVotes);
        setMyVote(prevMyVote);
        push({ title: "Vote didn't save", body: r.error, variant: "error" });
      }
    });
  }

  return (
    <div className="px-4 pt-3 space-y-1.5">
      {options.map((opt, idx) => {
        const count = votes[idx] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const mine = myVote === idx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => cast(idx)}
            disabled={pending}
            className={cn(
              "relative w-full h-10 rounded-xl overflow-hidden text-left",
              mine
                ? "ring-1 ring-gold-500/50 bg-ink-900/40"
                : "ring-1 ring-white/[0.06] bg-ink-900/40 hover:ring-white/[0.12]",
              "transition-colors",
            )}
            aria-pressed={mine}
          >
            {/* Progress fill behind the label. */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-[width] duration-200",
                mine ? "bg-gold-500/20" : "bg-white/[0.05]",
              )}
              style={{ width: `${total === 0 ? 0 : pct}%` }}
            />
            <div className="relative flex items-center justify-between h-full px-3">
              <span className="text-white text-[13.5px] font-medium truncate pr-2">
                {opt}
              </span>
              <span
                className={cn(
                  "text-[12px] tabular-nums shrink-0",
                  mine ? "text-gold-200 font-semibold" : "text-ink-300",
                )}
              >
                {pct}% · {count}
              </span>
            </div>
          </button>
        );
      })}
      <div className="text-[11px] text-ink-400 pt-0.5">
        {total} {total === 1 ? "vote" : "votes"}
        {myVote !== null ? " · You voted" : ""}
      </div>
    </div>
  );
}
