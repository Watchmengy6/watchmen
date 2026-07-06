"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The GY6 "YG" hexagon monogram (the Watchmen brand mark) — the master
 * gold-on-transparent art. Rendered as an <img> so it stays pixel-exact
 * to the brand file. Size it with height/width utility classes.
 *
 * Resilience (July 2026, from Dustin's broken-logo screenshots): when
 * the webview reloads on a flaky connection the PNG fetch can fail and
 * iOS renders its blue "?" broken-image box — ugly, and it showed on
 * the splash AND the feed header. On error we retry ONCE with a
 * cache-buster; if that also fails we hide the image entirely (a clean
 * text-only header beats a broken-image icon).
 *
 * Use:  <Logo className="h-12 w-12" />
 */
export function Logo({ className }: { className?: string }) {
  const [attempt, setAttempt] = useState(0);
  if (attempt >= 2) return null; // both loads failed — render nothing
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={attempt === 0 ? "/logo-yg.png" : `/logo-yg.png?retry=${Date.now()}`}
      alt=""
      onError={() => setAttempt((a) => a + 1)}
      className={cn("inline-block object-contain", className)}
    />
  );
}

/** Full lockup — currently just the mark; wordmark lockup TBD from Jeremy. */
export function LogoLockup({ className }: { className?: string }) {
  return <Logo className={cn("block", className)} />;
}
