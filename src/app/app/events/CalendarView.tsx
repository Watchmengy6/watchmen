import Link from "next/link";

export interface CalendarEntry {
  kind: "event" | "meetup" | "birthday";
  id: string;
  // ISO datetime used for sorting. Birthdays are anchored to midnight
  // local on the birthday date so they cluster at the top of that day.
  sortAt: string;
  title: string;
  subtitle: string;
  href: string | null;
}

const KIND_STYLES: Record<
  CalendarEntry["kind"],
  { tile: string; label: string; pillBg: string; pillText: string }
> = {
  event: {
    tile: "bg-gold-500/20 ring-gold-500/30 text-gold-200",
    label: "Event",
    pillBg: "bg-gold-500/15",
    pillText: "text-gold-200",
  },
  meetup: {
    tile: "bg-emerald-500/15 ring-emerald-500/30 text-emerald-200",
    label: "Meetup",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-200",
  },
  birthday: {
    tile: "bg-pink-500/15 ring-pink-400/30 text-pink-200",
    label: "Birthday",
    pillBg: "bg-pink-500/15",
    pillText: "text-pink-200",
  },
};

/**
 * Chronological "calendar" — not a grid, a sorted list. Renders every
 * upcoming item (events, meetups, birthdays) with the soonest first.
 * Birthdays group at the top of their own date entry. Per Dustin: just
 * everything listed out, not a grid view.
 */
export function CalendarView({ entries }: { entries: CalendarEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-ink-300 text-[14px] py-10">
        Nothing on the calendar yet. Events, meetups, and birthdays show up here.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const style = KIND_STYLES[e.kind];
        const dt = new Date(e.sortAt);
        const month = dt
          .toLocaleString("en-US", { month: "short" })
          .toUpperCase();
        const day = dt.getDate();
        const dayLabel = dt.toLocaleDateString("en-US", { weekday: "short" });
        const inner = (
          <div className="rounded-2xl bg-ink-800/80 hairline px-3 py-3 flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-xl ring-1 flex flex-col items-center justify-center shrink-0 ${style.tile}`}
            >
              <div className="text-[9px] uppercase tracking-wider leading-none opacity-80">
                {month}
              </div>
              <div className="text-[16px] font-bold text-white leading-none mt-0.5">
                {day}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`text-[9px] tracking-[0.22em] uppercase ${style.pillText} ${style.pillBg} px-1.5 py-0.5 rounded-full`}
                >
                  {style.label}
                </span>
                <span className="text-ink-400 text-[11.5px]">{dayLabel}</span>
              </div>
              <div className="text-white text-[14px] font-semibold truncate">
                {e.title}
              </div>
              <div className="text-ink-300 text-[12px] truncate">
                {e.subtitle}
              </div>
            </div>
            {e.href ? <div className="text-ink-300 text-sm">›</div> : null}
          </div>
        );
        return e.href ? (
          <Link key={`${e.kind}-${e.id}`} href={e.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={`${e.kind}-${e.id}`}>{inner}</div>
        );
      })}
    </div>
  );
}
