"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen image viewer — single-stage open, native-feeling zoom.
 *
 * Rebuilt (July 2026) from Dustin's field reports on 1.0.3:
 *   - The old zoom set `width: 200%` inside a flex-centered container,
 *     which clipped the LEFT half of the image with no way to scroll to
 *     it (classic flexbox centering-overflow bug). Zoom is now a
 *     transform with translate clamping, so every edge is reachable.
 *   - Rendered through a PORTAL to document.body. The old version
 *     mounted inside the feed Card (overflow-hidden + its own stacking
 *     context), which could trap the overlay and leave "dead" zones
 *     eating taps after close — the broken-comment-button repro.
 *   - Body scroll locks while open and ALWAYS unlocks on unmount.
 *
 * Interactions:
 *   - Tap the image        → toggle zoom (2.5x at the tapped point)
 *   - Pinch                → zoom 1x–4x, anchored between fingers
 *   - Drag while zoomed    → pan, clamped to the image bounds
 *   - Tap backdrop / × / Esc → close (one tap, from any zoom state)
 *
 * All gestures are handled on the ONE overlay element (not the <img>),
 * so pointer capture can never split a gesture between two targets —
 * whether a tap landed on the image is decided from the pointerdown
 * target instead.
 */
export function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Transform state lives in refs and is applied directly to the <img>
  // style — no React re-render per gesture frame, so panning stays at
  // 60fps even on older iPhones.
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  // Active pointers (supports pinch = 2 fingers).
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  // Gesture bookkeeping.
  const gestureRef = useRef({
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    startMidX: 0,
    startMidY: 0,
    lastX: 0,
    lastY: 0,
    downX: 0,
    downY: 0,
    downAt: 0,
    downOnImage: false,
    moved: false,
    pinched: false,
  });

  function applyTransform() {
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = `translate3d(${txRef.current}px, ${tyRef.current}px, 0) scale(${scaleRef.current})`;
  }

  /** Clamp translate so you can never push the image past its own edge —
   *  every part of a zoomed image stays reachable. */
  function clamp() {
    const img = imgRef.current;
    if (!img) return;
    const s = scaleRef.current;
    // offsetWidth/Height are the LAYOUT size — unaffected by transform.
    const maxTx = Math.max(0, (img.offsetWidth * s - window.innerWidth) / 2);
    const maxTy = Math.max(0, (img.offsetHeight * s - window.innerHeight) / 2);
    txRef.current = Math.min(maxTx, Math.max(-maxTx, txRef.current));
    tyRef.current = Math.min(maxTy, Math.max(-maxTy, tyRef.current));
  }

  function setZoom(nextScale: number, anchorX: number, anchorY: number) {
    const s = scaleRef.current;
    const next = Math.min(4, Math.max(1, nextScale));
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    // Keep the anchored screen point fixed while the scale changes.
    const vx = anchorX - cx - txRef.current;
    const vy = anchorY - cy - tyRef.current;
    txRef.current = anchorX - cx - (vx / s) * next;
    tyRef.current = anchorY - cy - (vy / s) * next;
    scaleRef.current = next;
    if (next === 1) {
      txRef.current = 0;
      tyRef.current = 0;
    }
    clamp();
    applyTransform();
  }

  function onPointerDown(e: React.PointerEvent) {
    const g = gestureRef.current;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      g.downX = e.clientX;
      g.downY = e.clientY;
      g.downAt = Date.now();
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      g.downOnImage = e.target === imgRef.current;
      g.moved = false;
      g.pinched = false;
    } else if (pts.length === 2) {
      g.pinched = true;
      g.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.startScale = scaleRef.current;
      g.startTx = txRef.current;
      g.startTy = tyRef.current;
      g.startMidX = (pts[0].x + pts[1].x) / 2;
      g.startMidY = (pts[0].y + pts[1].y) / 2;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    const pts = Array.from(pointersRef.current.values());

    if (pts.length === 2) {
      // Pinch — scale around the midpoint of the two fingers.
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (g.startDist > 0) {
        const next = Math.min(4, Math.max(1, g.startScale * (dist / g.startDist)));
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const vx = g.startMidX - cx - g.startTx;
        const vy = g.startMidY - cy - g.startTy;
        txRef.current = midX - cx - (vx / g.startScale) * next;
        tyRef.current = midY - cy - (vy / g.startScale) * next;
        scaleRef.current = next;
        clamp();
        applyTransform();
      }
      return;
    }

    // One-finger pan (only meaningful when zoomed in).
    const dx = e.clientX - g.lastX;
    const dy = e.clientY - g.lastY;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (Math.hypot(e.clientX - g.downX, e.clientY - g.downY) > 8) g.moved = true;
    if (scaleRef.current > 1 && !g.pinched) {
      txRef.current += dx;
      tyRef.current += dy;
      clamp();
      applyTransform();
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.delete(e.pointerId);
    const g = gestureRef.current;
    if (pointersRef.current.size > 0) return; // other finger still down
    if (g.pinched) {
      // Snap back to 1x if the pinch ended just under it.
      if (scaleRef.current < 1.05) setZoom(1, 0, 0);
      return;
    }
    const isTap = !g.moved && Date.now() - g.downAt < 350;
    if (!isTap) return;
    if (!g.downOnImage) {
      onClose();
      return;
    }
    // Tap on the image toggles zoom at the tapped point.
    if (scaleRef.current > 1) setZoom(1, 0, 0);
    else setZoom(2.5, e.clientX, e.clientY);
  }

  // Escape closes (desktop/web); body scroll locks while open. The
  // cleanup ALWAYS restores scroll — nothing can leave the page dead.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const overlay = (
    <div
      className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center overscroll-contain"
      style={{ touchAction: "none" }}
      role="dialog"
      aria-modal="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => pointersRef.current.delete(e.pointerId)}
    >
      {/* Close — always one tap, from any zoom state. */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="fixed right-4 z-[130] h-11 w-11 rounded-full bg-white/15 text-white text-2xl leading-none flex items-center justify-center active:bg-white/25"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        ×
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        className="max-w-[100vw] max-h-[100dvh] object-contain select-none will-change-transform"
        style={{ touchAction: "none" }}
      />
    </div>
  );

  // Portal to <body> so no ancestor (overflow-hidden cards, transformed
  // pull-to-refresh wrappers, sticky headers) can clip or trap the overlay.
  return typeof document !== "undefined"
    ? createPortal(overlay, document.body)
    : null;
}
