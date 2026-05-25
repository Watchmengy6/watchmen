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
          <div className="font-mono text-sm text-gold-200 break-all">{link}</div>
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
