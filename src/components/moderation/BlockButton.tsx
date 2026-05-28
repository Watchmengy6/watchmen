"use client";

import { useState, useTransition } from "react";
import { blockUserAction, unblockUserAction } from "@/lib/blocks/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Block / unblock toggle for a member profile. Blocked users' posts,
 * comments, and DMs are hidden by RLS on the server side.
 */
export function BlockButton({
  targetProfileId,
  isBlocked,
  variant = "default",
}: {
  targetProfileId: string;
  isBlocked: boolean;
  variant?: "default" | "compact";
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();
  const { push } = useToast();

  function doToggle() {
    start(async () => {
      const r = isBlocked
        ? await unblockUserAction(targetProfileId)
        : await blockUserAction(targetProfileId);
      if (r.error) {
        push({ title: "Couldn't update", body: r.error, variant: "error" });
        return;
      }
      push({
        title: isBlocked ? "Unblocked" : "Blocked",
        body: isBlocked
          ? "Their posts and messages will show again."
          : "You won't see their posts or messages.",
        variant: "success",
      });
      setConfirmOpen(false);
    });
  }

  const cls =
    variant === "compact"
      ? "h-9 px-3 rounded-full bg-ink-800 hairline text-ink-100 text-[12px] font-semibold"
      : "w-full h-11 rounded-full bg-ink-800 hairline text-ink-100 text-[13.5px] font-semibold";

  if (isBlocked) {
    return (
      <button type="button" onClick={doToggle} disabled={pending} className={cls}>
        {pending ? "…" : "Unblock"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className={cls}
      >
        Block
      </button>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-ink-800 hairline p-5 space-y-3">
            <div className="text-white text-[16px] font-semibold">Block this brother?</div>
            <div className="text-ink-300 text-[13.5px]">
              You won&apos;t see their posts, comments, or messages, and they
              won&apos;t see yours. You can unblock anytime in settings.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={doToggle}
                className="flex-1 h-11 rounded-full bg-red-500 text-white text-[14px] font-semibold disabled:opacity-50"
              >
                {pending ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
