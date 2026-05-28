"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the full error so it's visible in the browser console.
    console.error("[/app error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 mb-2">
        The Watchmen
      </div>
      <h1 className="text-2xl font-semibold mb-3">Something broke.</h1>
      <p className="text-ink-300 text-sm max-w-sm">
        {error.message || "We hit an unexpected error."}
      </p>
      {error.digest ? (
        <p className="text-ink-400 text-xs mt-2">ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="h-10 px-4 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold text-[14px]"
        >
          Try again
        </button>
        <Link
          href="/app/home"
          className="h-10 px-4 rounded-full bg-ink-800 hairline text-ink-200 inline-flex items-center text-[14px]"
        >
          Go to feed
        </Link>
      </div>
    </div>
  );
}
