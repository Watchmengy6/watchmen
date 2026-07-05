"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls for approval while the member waits on /pending.
 *
 * Event-night reality (July 11): ~200 people stare at this screen
 * waiting for an admin tap. The page is a server component that
 * redirects to /app/home the moment status = approved — but nothing
 * re-ran it, so members sat in limbo until they manually refreshed
 * (final pre-launch audit, July 2026). This calls router.refresh() on
 * an interval; when the re-render sees "approved", the page's own
 * redirect fires and they're in.
 *
 * 8s cadence = at most ~450 cheap re-renders/hour/member — trivial next
 * to the approval UX win. Paused while the tab is backgrounded.
 */
export function PendingAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // don't burn battery/requests in a background tab
      }
      router.refresh();
    };
    const id = setInterval(tick, 8000);
    // Also refresh immediately when the app comes back to the foreground
    // — the classic "approved while my phone was locked" path.
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
