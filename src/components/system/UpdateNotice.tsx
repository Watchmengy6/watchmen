"use client";

import { useEffect, useState } from "react";

/**
 * "Update ready" banner (July 2026, event day).
 *
 * The webview keeps running the OLD bundle after a Vercel deploy until
 * the page fully reloads — which looks like "the app is broken" and has
 * burned both Aaron and Dustin. This compares the commit SHA baked into
 * THIS bundle against the SHA the server is currently running (checked
 * on mount, whenever the app returns to the foreground, and every 5
 * minutes). On mismatch it shows a one-tap banner; the tap does a full
 * reload, which pulls the fresh bundle — no force-close required.
 *
 * Renders nothing in local dev (no Vercel SHAs available).
 */
const MY_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null;

export function UpdateNotice() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!MY_VERSION) return; // local dev / SHA not exposed
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v: string | null };
        if (!cancelled && v && v !== MY_VERSION) setUpdateReady(true);
      } catch {
        // Offline / transient — try again next cycle.
      }
    }

    check();
    const id = setInterval(check, 5 * 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed left-3 right-3 z-[300] rounded-2xl bg-gradient-to-b from-gold-300 to-gold-500 text-black shadow-2xl px-4 py-3 text-left"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      aria-live="polite"
    >
      <span className="block text-[14px] font-semibold">
        Update ready ✨
      </span>
      <span className="block text-[12.5px] opacity-80 mt-0.5">
        Tap here to refresh and get the latest version.
      </span>
    </button>
  );
}
