"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Share button for an event. Uses navigator.share() when available (iOS PWA /
 * Android), falls back to copying the URL to the clipboard.
 */
export function ShareEventButton({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) {
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function share() {
    if (busy) return;
    setBusy(true);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/app/events/${eventId}`
        : `/app/events/${eventId}`;
    const payload = {
      title: `${title} — The Watchmen`,
      text: `${title} — joining me?`,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(payload);
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(url);
        push({ title: "Link copied", variant: "success" });
      } else {
        // Final fallback: surface the URL so the user can copy it manually.
        push({
          title: "Share link",
          body: url,
          variant: "default",
        });
      }
    } catch (e: any) {
      // navigator.share throws on user cancel — don't show that as an error.
      if (e?.name !== "AbortError") {
        push({ title: "Couldn't share", body: e?.message, variant: "error" });
      }
    }
    setBusy(false);
  }

  return (
    <Button variant="outline" size="md" fullWidth loading={busy} onClick={share}>
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
          <path d="M16 6l-4-4-4 4" />
          <path d="M12 2v14" />
        </svg>
        Share event
      </span>
    </Button>
  );
}
