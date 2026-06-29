"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";

/**
 * Cold-start splash. Covers the brief blank/boot flash when the PWA is
 * launched (or hard-refreshed) with the YG mark on the brand-dark
 * background, then fades out once the shell is mounted and interactive.
 *
 * Mounted once in the root layout — it does NOT re-show on client-side
 * (SPA) navigations, only on a full document load, which is exactly the
 * moment users would otherwise see a blank screen.
 */
export function SplashGate() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Begin fading once we've painted (shell is up). Remove from the tree
    // after the fade completes so it never intercepts taps.
    const fade = window.setTimeout(() => setHidden(true), 450);
    const drop = window.setTimeout(() => setRemoved(true), 1050);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(drop);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      aria-hidden="true"
      className={
        "fixed inset-0 z-[100] flex items-center justify-center bg-ink-900 transition-opacity duration-[600ms] ease-out " +
        (hidden ? "opacity-0 pointer-events-none" : "opacity-100")
      }
    >
      <Logo className="h-24 w-24 animate-pulse" />
    </div>
  );
}
