"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * iOS-style pull-to-refresh. Wrap a scrollable area with this component.
 * When the user pulls down past the threshold while scrolled to the very top,
 * we call router.refresh() to re-fetch the server component data.
 *
 * Notes:
 * - Only activates when window.scrollY === 0 (i.e. they're at the top).
 * - Threshold default: 70px (matches iOS Safari's native gesture).
 * - Touch-only — on desktop the gesture won't fire because pointers can't
 *   produce a downward pull at scroll-top easily.
 * - Listeners are bound ONCE (empty deps) and read state via refs so we
 *   don't churn document-level handlers on every drag frame.
 */
export function PullToRefresh({
  children,
  threshold = 70,
}: {
  children: React.ReactNode;
  threshold?: number;
}) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs mirror the state so the long-lived touch handlers can read the
  // latest values without forcing the effect to rebind on every change.
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const thresholdRef = useRef(threshold);

  // Keep the threshold ref in sync with prop changes (rare).
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  useEffect(() => {
    // Local setters that update both ref + state without re-creating handlers.
    const updatePull = (next: number) => {
      pullDistanceRef.current = next;
      setPullDistance(next);
    };
    const updateRefreshing = (next: boolean) => {
      refreshingRef.current = next;
      setRefreshing(next);
    };

    function onTouchStart(e: TouchEvent) {
      // Only engage when we're at the top of the page.
      if (window.scrollY > 0) {
        startYRef.current = null;
        activeRef.current = false;
        return;
      }
      startYRef.current = e.touches[0]?.clientY ?? null;
      activeRef.current = true;
    }
    function onTouchMove(e: TouchEvent) {
      if (!activeRef.current || startYRef.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startYRef.current;
      if (dy <= 0) {
        updatePull(0);
        return;
      }
      // Resistance curve so the pull feels natural past the threshold.
      const resisted = Math.min(dy, thresholdRef.current * 2.5) * 0.6;
      updatePull(resisted);
    }
    async function onTouchEnd() {
      if (!activeRef.current) return;
      activeRef.current = false;
      const triggered = pullDistanceRef.current >= thresholdRef.current;
      if (triggered && !refreshingRef.current) {
        updateRefreshing(true);
        updatePull(thresholdRef.current);
        try {
          router.refresh();
          // Hold the spinner ~500ms so users feel the refresh; the RSC
          // payload usually lands well within that.
          await new Promise((r) => setTimeout(r, 500));
        } finally {
          updateRefreshing(false);
          updatePull(0);
        }
      } else {
        updatePull(0);
      }
      startYRef.current = null;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
    // Intentionally empty: handlers read everything off refs so we bind
    // listeners exactly once for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <>
      {/* Pull indicator — fades in as the user pulls. */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center"
        style={{
          top: `max(0.25rem, env(safe-area-inset-top))`,
          transform: `translateY(${pullDistance * 0.5}px)`,
          opacity: progress,
          transition: refreshing ? "none" : "opacity 120ms",
        }}
      >
        <div className="h-9 w-9 rounded-full bg-ink-800/95 backdrop-blur-xl hairline flex items-center justify-center shadow-card">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 text-gold-300 ${refreshing ? "animate-spin" : ""}`}
            style={{
              transform: refreshing
                ? undefined
                : `rotate(${progress * 360}deg)`,
              transition: refreshing ? "none" : "transform 80ms",
            }}
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
        </div>
      </div>
      <div
        style={{
          transform: pullDistance ? `translateY(${pullDistance * 0.35}px)` : undefined,
          transition: refreshing || pullDistance === 0 ? "transform 220ms" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
