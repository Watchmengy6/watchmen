"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptDisclaimerAction } from "@/lib/account/disclaimer";

/**
 * Full-screen, non-dismissable modal that plays the onboarding video,
 * requires a checkbox + tap, then records acceptance. Rendered by the
 * app layout when the signed-in member's profile lacks
 * disclaimer_accepted_at.
 *
 * The video URL comes from NEXT_PUBLIC_DISCLAIMER_VIDEO_URL so Dustin
 * can swap a final cut in later without a code change. If the env var
 * isn't set, we just show the text — checkbox + Accept still works.
 */
export function DisclaimerGate({ videoUrl }: { videoUrl?: string }) {
  const [agreed, setAgreed] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function accept() {
    if (!agreed) return;
    setErr(null);
    start(async () => {
      const r = await acceptDisclaimerAction();
      if (r.error) {
        setErr(r.error);
        return;
      }
      // RSC payload will re-render layout without the gate; refresh
      // just makes sure the change is reflected immediately.
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-ink-800 ring-1 ring-gold-500/30 p-5 space-y-4 max-h-[95dvh] overflow-y-auto"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-gold-300/80">
            Welcome to the Watchmen
          </div>
          <div
            id="disclaimer-title"
            className="text-white text-[19px] font-semibold mt-1"
          >
            Before you go in
          </div>
        </div>

        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full rounded-2xl bg-black aspect-video"
          />
        ) : (
          <div className="rounded-2xl bg-black/60 p-6 text-center text-ink-300 text-[13px]">
            (Welcome video coming soon — keep reading.)
          </div>
        )}

        <div className="text-ink-100 text-[13.5px] leading-relaxed space-y-2.5">
          <p>
            The Watchmen is a private room for brothers who want to live
            with integrity. What you read here, stays here.
          </p>
          <p>
            <strong className="text-white">Hard rules:</strong> no hate
            speech, no harassment, no doxxing, no sexually explicit
            content, no scams. Treat every brother like they&apos;re sitting
            across from you.
          </p>
          <p>
            Reports are reviewed within 24 hours. Repeat offenders lose
            access — no warning, no appeal. Leadership&apos;s call is final.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-gold-400"
          />
          <span className="text-ink-100 text-[13px] leading-snug">
            I&apos;ve read the code of conduct and I&apos;ll uphold it. I
            understand I can lose access if I don&apos;t. I&apos;ve also
            read and agree to the{" "}
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener"
              className="underline text-gold-300"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noopener"
              className="underline text-gold-300"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {err ? <div className="text-red-300 text-[12px]">{err}</div> : null}

        <button
          type="button"
          disabled={!agreed || pending}
          onClick={accept}
          className="w-full h-12 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Loading…" : "I'm in"}
        </button>
      </div>
    </div>
  );
}
