"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Kind = "group" | "meetup" | "hobby";

interface KindOption {
  id: Kind;
  label: string;
  hint: string;
  pillBg: string;
  pillText: string;
  ringActive: string;
}

const OPTIONS: KindOption[] = [
  {
    id: "group",
    label: "Group",
    hint: "Ongoing — Run Club, Bible Study",
    pillBg: "bg-gold-500/15",
    pillText: "text-gold-200",
    ringActive: "ring-gold-500/60",
  },
  {
    id: "meetup",
    label: "Meet-up",
    hint: "Scheduled — a concert, a hike",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-200",
    ringActive: "ring-emerald-500/60",
  },
  {
    id: "hobby",
    label: "Hobby",
    hint: "Interest-based — shooting, cars",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-200",
    ringActive: "ring-violet-500/60",
  },
];

/**
 * Three-way picker for the group's color-coded "kind" — Group, Meet-up,
 * or Hobby. Group + Hobby are long-lived rooms (created here via the
 * generic Group form). Meet-up is a scheduled one-off — picking it
 * jumps to /app/meetups/new where the form asks for when + where, since
 * meet-ups live in a different table and have different fields than
 * the room-style groups.
 */
export function GroupKindPicker({ defaultValue = "group" }: { defaultValue?: Kind }) {
  const [kind, setKind] = useState<Kind>(defaultValue);
  const router = useRouter();
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">
        Kind
      </div>
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = kind === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (opt.id === "meetup") {
                  // Meet-ups live in a different model — punt to the
                  // dedicated form so the user picks a date, time, and
                  // location instead of filling out Name + Category.
                  router.push("/app/meetups/new");
                  return;
                }
                setKind(opt.id);
              }}
              className={cn(
                "rounded-2xl px-2.5 py-2.5 text-left ring-1 transition-colors",
                active
                  ? `bg-ink-800 ${opt.ringActive}`
                  : "bg-ink-800/60 ring-white/[0.06]",
              )}
              aria-pressed={active}
            >
              <div className={cn("text-[11px] uppercase tracking-[0.2em] font-semibold inline-block px-1.5 py-0.5 rounded-full mb-1.5", opt.pillBg, opt.pillText)}>
                {opt.label}
              </div>
              <div className="text-ink-200 text-[11.5px] leading-snug">
                {opt.hint}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
