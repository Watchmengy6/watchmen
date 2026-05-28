"use client";

import { useState, useTransition } from "react";
import { deleteMyAccountAction } from "@/lib/account/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Self-serve account deletion button. Required for App Store. Triggers
 * a two-step confirm flow: open modal → type "DELETE" → tap Confirm.
 * That double-gate is the standard pattern Apple reviewers expect.
 */
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const { push } = useToast();
  const canDelete = typed.trim().toUpperCase() === "DELETE";

  function confirm() {
    if (!canDelete) return;
    start(async () => {
      const r = await deleteMyAccountAction();
      // If deletion succeeded the action redirects, so we shouldn't
      // see r here. If we do, it's an error.
      if ((r as any)?.error) {
        push({
          title: "Couldn't delete",
          body: (r as any).error,
          variant: "error",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-full bg-red-500/15 ring-1 ring-red-500/30 text-red-300 text-[13.5px] font-semibold"
      >
        Delete my account
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-ink-800 hairline p-5 space-y-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-red-300">
                Permanent
              </div>
              <div className="text-white text-[17px] font-semibold mt-0.5">
                Delete your Watchmen account
              </div>
            </div>
            <div className="text-ink-200 text-[13.5px] leading-relaxed">
              This removes your profile, photos, payment handles, RSVPs, and
              sign-in. Your posts and messages stay in the room but show as
              &ldquo;Deleted member.&rdquo; You can&apos;t undo this — you&apos;d need a
              fresh invite from an admin to come back.
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-1.5">
                Type DELETE to confirm
              </div>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full h-11 rounded-xl bg-ink-900 hairline px-3 text-[15px] text-white outline-none focus:ring-2 focus:ring-red-500/30"
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canDelete || pending}
                onClick={confirm}
                className="flex-1 h-11 rounded-full bg-red-500 text-white text-[14px] font-semibold disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
