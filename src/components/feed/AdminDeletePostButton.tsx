"use client";

import { useState, useTransition } from "react";
import { adminDeletePostAction } from "@/lib/feed/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Admin-only trash icon on every feed post. Soft-deletes the post via
 * a service-role server action so RLS doesn't get in the way. Wrapped
 * in a confirm so a misclick doesn't nuke a thread.
 */
export function AdminDeletePostButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { push } = useToast();

  function go() {
    start(async () => {
      const r = await adminDeletePostAction(postId);
      if (r.error) {
        push({ title: "Couldn't delete", body: r.error, variant: "error" });
        return;
      }
      push({ title: "Post deleted", variant: "success" });
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete post (admin)"
        onClick={() => setOpen(true)}
        className="px-2 h-9 text-red-300/80 hover:text-red-300 text-[14px]"
        title="Delete (admin)"
      >
        🗑
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-ink-800 hairline p-5 space-y-3">
            <div className="text-white text-[16px] font-semibold">
              Delete this post?
            </div>
            <div className="text-ink-300 text-[13.5px]">
              The post will disappear for everyone. Comments on it disappear
              too. This is admin-only — use it for moderation, not editing.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={go}
                className="flex-1 h-11 rounded-full bg-red-500 text-white text-[14px] font-semibold disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
