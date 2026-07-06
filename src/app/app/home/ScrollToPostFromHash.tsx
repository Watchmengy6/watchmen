"use client";

import { useEffect } from "react";

/**
 * Deep-link landing for /app/home#post-<id>.
 *
 * Push notifications ("X commented on your post", mentions, replies)
 * and share links carry a #post-<id> hash. This scrolls the feed to
 * that post and flashes a gold ring on it so the member instantly sees
 * WHICH post the notification was about (July 2026 — before this,
 * every notification tap just dumped you at the top of the feed).
 *
 * Retries for a few seconds because the feed streams in after the
 * shell: the anchor may not exist on the first animation frame. If the
 * post isn't in the first feed page (very old), we quietly give up —
 * the member is still on the feed, which was the old behavior.
 */
export function ScrollToPostFromHash() {
  useEffect(() => {
    let cancelled = false;

    const run = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#post-")) return;
      let attempts = 0;
      const MAX_ATTEMPTS = 20; // ~5s at 250ms

      const tryScroll = () => {
        if (cancelled) return;
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          // Gold flash so the eye lands on the right card.
          el.style.transition = "box-shadow 0.4s ease";
          el.style.borderRadius = "1rem";
          el.style.boxShadow = "0 0 0 2px rgba(212, 175, 55, 0.75)";
          setTimeout(() => {
            if (!cancelled) el.style.boxShadow = "0 0 0 2px rgba(212, 175, 55, 0)";
          }, 1800);
          return;
        }
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) setTimeout(tryScroll, 250);
      };

      requestAnimationFrame(tryScroll);
    };

    // Initial mount (cold navigation / full page load with a hash)…
    run();
    // …and hash changes while ALREADY on the feed — the in-app push
    // banner router.push()es a #post- URL, which does NOT remount this
    // component (PushReceiver dispatches a synthetic hashchange).
    window.addEventListener("hashchange", run);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", run);
    };
  }, []);

  return null;
}
