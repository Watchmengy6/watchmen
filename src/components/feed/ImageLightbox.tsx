"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen image viewer. Tapping a feed image opens this so members
 * can read graphics with small text (the feed card crops + shrinks them).
 *
 * - Tap the backdrop or the × to close.
 * - Tap the image to toggle a 2x zoom; when zoomed, the container scrolls
 *   so you can pan around a dense graphic.
 * - Locks body scroll while open.
 */
export function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  // Close on Escape (harmless on mobile, handy on desktop/web).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 h-10 w-10 rounded-full bg-white/10 text-white text-2xl leading-none flex items-center justify-center"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        ×
      </button>
      <div
        className="w-full h-full overflow-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          onClick={() => setZoomed((z) => !z)}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out"
              : "max-w-full max-h-full object-contain cursor-zoom-in"
          }
          style={zoomed ? { width: "200%" } : undefined}
        />
      </div>
    </div>
  );
}
