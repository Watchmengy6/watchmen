/**
 * Returns true if the given birthday string (YYYY-MM-DD) falls on today
 * in the viewer's local time. Server-side equivalent lives in the DB
 * (`public.is_birthday_today`) for the auto-post idempotency check.
 *
 * Accepts null/undefined and missing inputs — returns false safely.
 */
export function isBirthdayToday(birthday: string | null | undefined): boolean {
  if (!birthday) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!m) return false;
  const today = new Date();
  return (
    Number(m[2]) === today.getMonth() + 1 &&
    Number(m[3]) === today.getDate()
  );
}
