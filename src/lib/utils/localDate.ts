/**
 * Server-side "today" computation that respects the user's local day.
 *
 * Problem: `new Date().toISOString().slice(0, 10)` gives the UTC date,
 * which for US time zones flips a day too early. An event on May 31
 * (Tampa) is May 31 UTC until 8 PM Tampa time; after 8 PM it becomes
 * June 1 UTC and our "upcoming" filter drops it.
 *
 * Solution: compute the day in the room's configured time zone
 * (America/New_York by default — the Watchmen are Tampa-based).
 * Returns "YYYY-MM-DD" suitable for `.gte('event_date', ...)`.
 */
export function localTodayISO(tz: string = "America/New_York"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD date-only string as a *local* Date instead of UTC
 * midnight. `new Date("2026-05-31")` parses as UTC midnight, which
 * renders as May 30 in US time zones. Use this whenever you only need
 * the calendar day (e.g. event_date, birthday).
 */
export function parseLocalDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return new Date(dateStr);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
