"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";

/**
 * Cold-start splash with a branded reveal:
 *   1. YG mark on the brand-dark background, a gold loading bar fills.
 *   2. When the bar completes, the mark rushes toward the viewer (fast
 *      accelerating zoom + fade) while the splash fades out, revealing
 *      the app behind it.
 *
 * Mounted once in the root layout, so it only plays on a full document
 * load (PWA launch / hard refresh) — not on in-app navigations. Respects
 * prefers-reduced-motion by skipping the zoom.
 */
const BAR_MS = 1500; // bar fill duration
const ZOOM_MS = 600; // zoom/reveal duration

export function SplashGate() {
  const [phase, setPhase] = useState<"loading" | "zoom" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setReduced(!!prefersReduced);

    // Kick the bar to 100% on the next frame so the CSS width transition runs.
    const raf = requestAnimationFrame(() => setProgress(100));
    const toZoom = window.setTimeout(() => setPhase("zoom"), BAR_MS + 120);
    const toDone = window.setTimeout(
      () => setPhase("done"),
      BAR_MS + 120 + ZOOM_MS,
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(toZoom);
      window.clearTimeout(toDone);
    };
  }, []);

  if (phase === "done") return null;

  const zooming = phase === "zoom";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-900"
      style={{
        opacity: zooming ? 0 : 1,
        transition: `opacity ${ZOOM_MS}ms ease-in`,
        pointerEvents: zooming ? "none" : "auto",
      }}
    >
      <div
        style={{
          transform: zooming ? (reduced ? "scale(1)" : "scale(18)") : "scale(1)",
          opacity: zooming ? 0 : 1,
          // Accelerating curve = the "rushing toward your face" feel.
          transition: `transform ${ZOOM_MS}ms cubic-bezier(0.6, 0, 0.85, 0.25), opacity ${ZOOM_MS}ms ease-in`,
          willChange: "transform, opacity",
        }}
      >
        <Logo className="h-28 w-28" />
      </div>

      {/* Loading bar */}
      <div
        className="mt-9 h-1 w-44 overflow-hidden rounded-full bg-white/10"
        style={{
          opacity: zooming ? 0 : 1,
          transition: "opacity 200ms ease-out",
        }}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
          style={{
            width: `${progress}%`,
            transition: `width ${BAR_MS}ms ease-out`,
          }}
        />
      </div>
    </div>
  );
}
