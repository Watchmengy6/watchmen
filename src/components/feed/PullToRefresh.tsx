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
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
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
        setPullDistance(0);
        return;
      }
      // Resistance curve so the pull feels natural past the threshold.
      const resisted = Math.min(dy, threshold * 2.5) * 0.6;
      setPullDistance(resisted);
    }
    async function onTouchEnd() {
      if (!activeRef.current) return;
      activeRef.current = false;
      const triggered = pullDistance >= threshold;
      if (triggered && !refreshing) {
        setRefreshing(true);
        setPullDistance(threshold);
        try {
          router.refresh();
          // Hold the spinner ~500ms so users feel the refresh; the RSC
          // payload usually lands well within that.
          await new Promise((r) => setTimeout(r, 500));
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
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
  }, [pullDistance, refreshing, threshold, router]);

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
