"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

/**
 * Share a feed post — uses navigator.share() when available, falls back to
 * clipboard, then to a toast that surfaces the URL for manual copy.
 */
export function SharePostButton({
  postId,
  authorName,
}: {
  postId: string;
  authorName: string;
}) {
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function share() {
    if (busy) return;
    setBusy(true);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/app/home#post-${postId}`
        : `/app/home#post-${postId}`;
    const payload = {
      title: `${authorName} on The Watchmen`,
      text: `${authorName} just posted in The Watchmen — take a look:`,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(payload);
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(url);
        push({ title: "Link copied", variant: "success" });
      } else {
        push({ title: "Share link", body: url, variant: "default" });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        push({ title: "Couldn't share", body: e?.message, variant: "error" });
      }
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      aria-label="Share"
      className="px-3 h-9 rounded-full text-[13px] text-ink-200 hover:text-white transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
           strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v14" />
      </svg>
    </button>
  );
}
