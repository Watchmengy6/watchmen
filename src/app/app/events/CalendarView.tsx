"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface CalendarEntry {
  kind: "event" | "meetup";
  id: string;
  /** ISO datetime — exact time on a specific date. */
  at: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface BirthdayMember {
  id: string;
  full_name: string;
  /** YYYY-MM-DD — year is ignored, only month+day matter. */
  birthday: string;
}

const KIND_STYLES = {
  event: {
    dot: "bg-gold-400",
    pill: "bg-gold-500/15 text-gold-200",
    label: "Event",
  },
  meetup: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/15 text-emerald-200",
    label: "Meetup",
  },
  birthday: {
    dot: "bg-pink-400",
    pill: "bg-pink-500/15 text-pink-200",
    label: "Birthday",
  },
} as const;

type AnyEntry =
  | { kind: "event" | "meetup"; id: string; at: string; title: string; subtitle: string; href: string }
  | { kind: "birthday"; id: string; at: string; title: string; subtitle: string; href: string };

/**
 * Actual month-grid calendar. Renders a Sun→Sat 7-column grid for the
 * currently displayed month, with colored dots on each day that has
 * an event / meetup / birthday. Tap a day to see the details below
 * the grid. Prev/Next nav steps a month at a time.
 *
 * Birthdays repeat annually — they appear in every month grid on
 * their month/day, not just the next occurrence.
 */
export function CalendarView({
  entries,
  birthdays,
}: {
  entries: CalendarEntry[];
  birthdays: BirthdayMember[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // Build the grid for the displayed month.
  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(year, month, d) });
    }
    // Pad to 6 rows of 7 = 42 cells so the height stays stable.
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [year, month]);

  // Group entries by YYYY-MM-DD (local) for fast lookup.
  const entriesByDay = useMemo(() => {
    const map = new Map<string, AnyEntry[]>();
    for (const e of entries) {
      const d = new Date(e.at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    // Birthdays: project onto the displayed month's matching day.
    for (const b of birthdays) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(b.birthday);
      if (!m) continue;
      const bMonth = Number(m[2]) - 1;
      const bDay = Number(m[3]);
      // Place on this displayed year's birthday so it shows up in the
      // grid for whatever month the user is viewing.
      const key = `${year}-${String(bMonth + 1).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push({
        kind: "birthday",
        id: b.id,
        at: new Date(year, bMonth, bDay).toISOString(),
        title: `${b.full_name}'s birthday`,
        subtitle: "🎂 Wish them well",
        href: `/app/members/${b.id}`,
      });
      map.set(key, arr);
    }
    return map;
  }, [entries, birthdays, year]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function step(delta: -1 | 1) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setYear(y);
    setMonth(m);
    setSelectedDay(null);
  }

  function jumpToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }

  const selectedKey =
    selectedDay !== null
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
      : null;
  const selectedEntries = selectedKey ? entriesByDay.get(selectedKey) ?? [] : [];

  // For the dot row inside each cell, dedupe by kind (max 3 dots).
  function dotsForKey(key: string): ("event" | "meetup" | "birthday")[] {
    const items = entriesByDay.get(key) ?? [];
    const kinds = new Set<"event" | "meetup" | "birthday">();
    for (const e of items) kinds.add(e.kind);
    return Array.from(kinds);
  }

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="h-9 w-9 rounded-full bg-ink-800 hairline text-ink-100 text-lg inline-flex items-center justify-center"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={jumpToday}
          className="text-white text-[16px] font-semibold tracking-tight"
        >
          {monthLabel}
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="h-9 w-9 rounded-full bg-ink-800 hairline text-ink-100 text-lg inline-flex items-center justify-center"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-[10px] tracking-[0.18em] uppercase text-ink-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell) {
            return <div key={i} className="aspect-square" />;
          }
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
          const dots = dotsForKey(key);
          const todayCell = isToday(cell.date);
          const selected = selectedDay === cell.day;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDay(cell.day)}
              className={
                "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors " +
                (selected
                  ? "bg-gold-500/20 ring-1 ring-gold-500/50"
                  : todayCell
                    ? "bg-ink-800 ring-1 ring-white/[0.12]"
                    : "bg-ink-800/50 hover:bg-ink-800/80")
              }
              aria-pressed={selected}
            >
              <span
                className={
                  "text-[13px] " +
                  (selected
                    ? "text-white font-bold"
                    : todayCell
                      ? "text-white font-semibold"
                      : "text-ink-200")
                }
              >
                {cell.day}
              </span>
              {dots.length > 0 ? (
                <div className="flex gap-0.5 h-1.5">
                  {dots.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className={`block h-1.5 w-1.5 rounded-full ${KIND_STYLES[k].dot}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 pt-1 text-[10.5px] uppercase tracking-[0.18em]">
        <span className="inline-flex items-center gap-1.5 text-ink-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> Event
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Meetup
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink-300">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400" /> Birthday
        </span>
      </div>

      {/* Selected day details */}
      {selectedDay !== null ? (
        <div className="pt-2 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold-300/80">
            {new Date(year, month, selectedDay).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          {selectedEntries.length === 0 ? (
            <div className="text-ink-300 text-[13.5px] py-2">
              Nothing on this day.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEntries
                .slice()
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((e) => {
                  const style = KIND_STYLES[e.kind];
                  const t = new Date(e.at);
                  const timeLabel =
                    e.kind === "birthday"
                      ? "All day"
                      : t.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                  return (
                    <Link
                      key={`${e.kind}-${e.id}`}
                      href={e.href}
                      className="block rounded-2xl bg-ink-800/80 hairline px-3 py-3 flex items-center gap-3"
                    >
                      <span
                        className={`text-[9.5px] tracking-[0.22em] uppercase ${style.pill} px-1.5 py-0.5 rounded-full shrink-0`}
                      >
                        {style.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-[14px] font-semibold truncate">
                          {e.title}
                        </div>
                        <div className="text-ink-300 text-[12px] truncate">
                          {timeLabel}
                          {e.subtitle ? ` · ${e.subtitle}` : ""}
                        </div>
                      </div>
                      <div className="text-ink-300 text-sm">›</div>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
