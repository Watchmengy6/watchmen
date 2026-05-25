"use client";

import { useTransition } from "react";
import { markAllReadAction } from "@/lib/notifications/actions";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => void markAllReadAction())}
      disabled={pending}
      className="text-[11px] tracking-wider uppercase text-ink-300 px-3 h-8 rounded-full bg-ink-800 hairline disabled:opacity-50"
    >
      {pending ? "…" : "Mark all read"}
    </button>
  );
}
