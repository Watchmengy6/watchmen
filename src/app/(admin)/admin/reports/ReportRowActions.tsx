"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewReportAction, suspendUserAction } from "@/lib/moderation/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Three-way triage controls on a pending report row: Dismiss, Mark
 * Reviewed, or Suspend Member (which both suspends and marks
 * actioned). Each button confirms before running.
 */
export function ReportRowActions({
  reportId,
  targetUserId,
}: {
  reportId: string;
  targetUserId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const { push } = useToast();

  function dismiss() {
    start(async () => {
      const r = await reviewReportAction({
        reportId,
        status: "dismissed",
        action_taken: "No action taken.",
      });
      if (r.error) {
        push({ title: "Couldn't dismiss", body: r.error, variant: "error" });
        return;
      }
      push({ title: "Dismissed", variant: "success" });
      router.refresh();
    });
  }

  function markReviewed() {
    start(async () => {
      const r = await reviewReportAction({
        reportId,
        status: "reviewed",
        action_taken: "Reviewed — kept content.",
      });
      if (r.error) {
        push({ title: "Couldn't update", body: r.error, variant: "error" });
        return;
      }
      push({ title: "Marked reviewed", variant: "success" });
      router.refresh();
    });
  }

  function suspendMember() {
    if (!targetUserId) return;
    start(async () => {
      const s = await suspendUserAction(targetUserId);
      if (s.error) {
        push({ title: "Suspend failed", body: s.error, variant: "error" });
        return;
      }
      const r = await reviewReportAction({
        reportId,
        status: "actioned",
        action_taken: "Member suspended.",
      });
      if (r.error) {
        push({
          title: "Suspend OK, report update failed",
          body: r.error,
          variant: "error",
        });
        router.refresh();
        return;
      }
      push({ title: "Member suspended", variant: "success" });
      setConfirmingSuspend(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap pt-1">
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="h-9 px-3 rounded-full bg-ink-700 hairline text-ink-100 text-[12.5px] disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={markReviewed}
          disabled={pending}
          className="h-9 px-3 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-200 text-[12.5px] disabled:opacity-50"
        >
          Mark reviewed
        </button>
        {targetUserId ? (
          <button
            type="button"
            onClick={() => setConfirmingSuspend(true)}
            disabled={pending}
            className="h-9 px-3 rounded-full bg-red-500/15 ring-1 ring-red-500/30 text-red-200 text-[12.5px] disabled:opacity-50"
          >
            Suspend member
          </button>
        ) : null}
      </div>

      {confirmingSuspend ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setConfirmingSuspend(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-ink-800 hairline p-5 space-y-3">
            <div className="text-white text-[16px] font-semibold">
              Suspend this member?
            </div>
            <div className="text-ink-300 text-[13.5px]">
              They lose access to The Watchmen immediately. You can flip
              them back to approved from Admin → Members if it&apos;s a
              mistake.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingSuspend(false)}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={suspendMember}
                className="flex-1 h-11 rounded-full bg-red-500 text-white text-[14px] font-semibold disabled:opacity-50"
              >
                {pending ? "Suspending…" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
