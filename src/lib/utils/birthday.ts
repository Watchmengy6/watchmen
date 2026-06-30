/**
 * Returns true if the given birthday string (YYYY-MM-DD) falls on today
 * in America/New_York (Tampa) — matching the DB banner + the server-side
 * `public.is_birthday_today` idempotency check. Using a fixed zone (rather
 * than the device/server local time) keeps the cake icon in agreement with
 * the feed birthday banner regardless of where the viewer's device is set.
 *
 * Accepts null/undefined and missing inputs — returns false safely.
 */
export function isBirthdayToday(birthday: string | null | undefined): boolean {
  if (!birthday) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!m) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayMonth = Number(parts.find((p) => p.type === "month")?.value);
  const todayDay = Number(parts.find((p) => p.type === "day")?.value);
  return Number(m[2]) === todayMonth && Number(m[3]) === todayDay;
}
