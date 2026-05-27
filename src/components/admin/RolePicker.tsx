"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

type Role = "member" | "admin" | "super_admin";

const roles: { value: Role; label: string; desc: string }[] = [
  { value: "member", label: "Member", desc: "Standard access" },
  { value: "admin", label: "Admin", desc: "Approve, manage events" },
  { value: "super_admin", label: "Super Admin", desc: "Full access · role control" },
];

// useLayoutEffect doesn't exist on server; guard for SSR.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function RolePicker({
  initial = "member",
  disabled,
}: {
  initial?: Role;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<Role>(initial);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute the panel's screen coordinates anchored to the trigger.
  const place = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: r.bottom + 6,
      right: Math.max(8, window.innerWidth - r.right),
    });
  };

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    place();
    const handler = () => place();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  // Close on outside click / tap.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onClick);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onClick);
    };
  }, [open]);

  const current = roles.find((r) => r.value === value)!;
  const isElevated = value !== "member";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors",
          isElevated
            ? "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40"
            : "bg-ink-700 text-ink-100 ring-1 ring-white/10",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {current.label}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {mounted && open && coords
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: coords.top, right: coords.right }}
              className="z-[100] w-56 rounded-2xl bg-ink-800 ring-1 ring-white/10 shadow-card overflow-hidden animate-slideUp"
            >
              {roles.map((r, i) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setValue(r.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors",
                    i < roles.length - 1 && "border-b border-white/[0.05]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-white text-[13px] font-semibold">
                      {r.label}
                    </div>
                    {r.value === value ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5 text-gold-300"
                      >
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    ) : null}
                  </div>
                  <div className="text-ink-400 text-[11px] mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
