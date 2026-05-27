"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

export interface SwipeAction {
  label: string;
  /** Tailwind background class, e.g. "bg-red-500" */
  color: string;
  onClick: () => void;
}

const ACTION_WIDTH = 76;

/**
 * iOS-style swipe-left to reveal actions on a row.
 * Touch on mobile, pointer drag on desktop.
 */
export function SwipeableRow({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
}) {
  const maxReveal = actions.length * ACTION_WIDTH;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);

  // Snap helper
  const snap = (current: number) => {
    if (current < -maxReveal / 2) setOffset(-maxReveal);
    else setOffset(0);
  };

  // Close when tapping outside this row
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (offset === 0) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOffset(0);
      }
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [offset]);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startOffset.current = offset;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const next = Math.min(0, Math.max(-maxReveal - 20, startOffset.current + dx));
    setOffset(next);
  };

  const onPointerUp = () => {
    setDragging(false);
    snap(offset);
  };

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden touch-pan-y select-none", className)}
    >
      {/* Action buttons sit underneath */}
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ width: maxReveal }}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => {
              a.onClick();
              setOffset(0);
            }}
            className={cn(
              "flex items-center justify-center text-white text-[12.5px] font-semibold",
              a.color,
            )}
            style={{ width: ACTION_WIDTH }}
          >
            {a.label}
          </button>
        ))}
      </div>
      {/* Swipeable foreground */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "relative bg-ink-900",
          dragging ? "" : "transition-transform duration-200",
        )}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
      >
        {children}
      </div>
    </div>
  );
}
