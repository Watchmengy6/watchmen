"use client";

import { useState, useTransition } from "react";
import { adminTogglePinPostAction } from "@/lib/feed/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Admin-only pin toggle on every feed post. Tap once to pin (floats to
 * top of feed); tap again to unpin. Gold when active, dim outline
 * otherwise so admins can see at a glance which posts are pinned.
 */
export function AdminPinPostButton({
  postId,
  initialPinned,
}: {
  postId: string;
  initialPinned: boolean;
}) {
  const [pinned, setPinned] = useState(initialPinned);
  const [pending, start] = useTransition();
  const { push } = useToast();

  function go() {
    if (pending) return;
    // Optimistic flip; roll back on error.
    const prev = pinned;
    setPinned(!prev);
    start(async () => {
      const r = await adminTogglePinPostAction(postId);
      if (r.error) {
        setPinned(prev);
        push({ title: "Couldn't update", body: r.error, variant: "error" });
        return;
      }
      push({
        title: r.pinned ? "Pinned to top" : "Unpinned",
        variant: "success",
      });
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      aria-label={pinned ? "Unpin post" : "Pin to top"}
      title={pinned ? "Unpin from top" : "Pin to top"}
      className={
        pinned
          ? "px-2 h-9 text-gold-300 hover:text-gold-200 text-[14px]"
          : "px-2 h-9 text-ink-400 hover:text-gold-300 text-[14px]"
      }
    >
      📌
    </button>
  );
}
