"use client";

import { useState } from "react";
import { fileReportAction, type ReportTarget } from "@/lib/moderation/actions";
import { useToast } from "@/components/ui/Toast";

const REASONS = [
  "Harassment or hate",
  "Sexual or explicit content",
  "Threats or violence",
  "Spam or scam",
  "Misinformation",
  "Other",
] as const;

/**
 * Inline "Report" button + modal. Required by App Store for every piece
 * of user-generated content. The label can be hidden via iconOnly so it
 * fits in cramped UI like a chat bubble's overflow menu.
 */
export function ReportButton({
  target,
  className,
  iconOnly = false,
  label = "Report",
}: {
  target: ReportTarget;
  className?: string;
  iconOnly?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("Harassment or hate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function submit() {
    setBusy(true);
    const r = await fileReportAction({
      target,
      reason,
      details: details.trim() || undefined,
    });
    setBusy(false);
    if (r.error) {
      push({ title: "Couldn't send", body: r.error, variant: "error" });
      return;
    }
    push({
      title: "Report sent",
      body: "Leadership will review within 24 hours.",
      variant: "success",
    });
    setOpen(false);
    setDetails("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "text-ink-300 text-[12px] hover:text-white transition-colors"
        }
        aria-label="Report"
      >
        {iconOnly ? "⚑" : label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center p-3"
          // z-[100] (above BottomNav's z-50) + paddingBottom clearance so
          // the bottom-anchored sheet sits ABOVE the fixed BottomNav.
          // Same fix as BlockButton — without this, the Send report /
          // Cancel buttons end up underneath the tab bar.
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-ink-800 hairline p-5 space-y-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-gold-300/80">
                Moderation
              </div>
              <div className="text-white text-[17px] font-semibold mt-0.5">
                Report this {target.kind === "user" ? "member" : "content"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-1.5">
                Reason
              </div>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
                className="w-full h-11 rounded-xl bg-ink-900 hairline px-3 text-[15px] text-white outline-none"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-1.5">
                Details (optional)
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Anything leadership should know?"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl bg-ink-900 hairline px-3 py-2.5 text-[15px] text-white placeholder:text-ink-400 outline-none resize-none"
              />
            </div>
            <div className="text-[11px] text-ink-400">
              Reports are reviewed within 24 hours. Repeat offenders lose
              access to the room.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="flex-1 h-11 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[14px] font-semibold disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send report"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
