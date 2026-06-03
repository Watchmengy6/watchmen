"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function InviteLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      push({ title: "Link copied", variant: "success" });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      push({ title: "Couldn't copy", body: "Long-press the link to copy.", variant: "error" });
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "The Watchman",
          text: "You're invited to join The Watchman — a private brotherhood.",
          url: link,
        });
      } catch {
        // user cancelled
      }
    } else {
      copy();
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="rounded-xl bg-ink-900/60 hairline p-3">
          <div className="text-[10.5px] tracking-[0.2em] uppercase text-ink-400 mb-1">
            Your link
          </div>
          {/* Read-only input so long-press / tap-and-hold lets users select
              and copy on iOS even when navigator.clipboard isn't available. */}
          <input
            type="text"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            className="block w-full max-w-full bg-transparent font-mono text-sm text-gold-200 outline-none select-text"
            // minWidth:0 lets the input shrink below its intrinsic
            // content size; without it iOS WebKit refuses to wrap a
            // long URL and the parent ends up wider than the screen,
            // which lets the user rubber-band the whole app sideways.
            style={{ WebkitUserSelect: "text", userSelect: "text", minWidth: 0 }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          <Button variant="gold" onClick={share}>
            Share
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
