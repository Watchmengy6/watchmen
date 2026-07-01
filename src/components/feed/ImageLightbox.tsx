"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen image viewer. Tapping a feed/event/group image opens this so
 * members can read graphics with small text (feed cards crop + shrink them).
 *
 * Close paths (all work):
 *   - the × button (fixed, top layer)
 *   - tapping the backdrop / any empty space around the image
 *   - Escape key (desktop/web)
 * Tapping the IMAGE toggles a 2x zoom and lets you pan via scroll; it does
 * NOT close (stopPropagation), so you can inspect a dense graphic.
 */
export function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Backdrop is also the scroll container (needed when the image is
    // zoomed past the viewport). Tapping it closes.
    <div
      className="fixed inset-0 z-[120] bg-black/95 overflow-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Close button — fixed + top z so nothing can cover it. Its own
          stopPropagation avoids double-firing the backdrop handler. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="fixed right-4 z-[130] h-11 w-11 rounded-full bg-white/15 text-white text-2xl leading-none flex items-center justify-center active:bg-white/25"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        ×
      </button>

      <div className="min-h-full w-full flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out"
              : "max-w-full max-h-[90vh] object-contain cursor-zoom-in"
          }
          style={zoomed ? { width: "200%" } : undefined}
        />
      </div>
    </div>
  );
}
