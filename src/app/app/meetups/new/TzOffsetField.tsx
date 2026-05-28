"use client";

import { useEffect, useState } from "react";

/**
 * Hidden field that emits the user's current TZ offset (e.g. "-04:00")
 * so server actions can interpret datetime-local inputs without
 * depending on the server's timezone.
 */
export function TzOffsetField({ name = "tz_offset" }: { name?: string }) {
  const [offset, setOffset] = useState("+00:00");
  useEffect(() => {
    const mins = -new Date().getTimezoneOffset();
    const sign = mins >= 0 ? "+" : "-";
    const abs = Math.abs(mins);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    setOffset(`${sign}${hh}:${mm}`);
  }, []);
  return <input type="hidden" name={name} value={offset} />;
}
