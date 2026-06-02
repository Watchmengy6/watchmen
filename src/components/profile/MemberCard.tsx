"use client";

import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useToast } from "@/components/ui/Toast";

interface MemberCardProps {
  fullName: string;
  email: string;
  phone: string | null;
  memberNumber: number | null;
  appUrl?: string;
}

/**
 * Gold digital member card — Dustin's "Watchmen Member" credential.
 * Renders as a credit-card-shaped artifact with the logo, full name,
 * email, phone, and Watchmen number. Tap Share to fire the device's
 * native share sheet (iMessage, AirDrop, email). Falls back to
 * clipboard copy when navigator.share isn't available.
 */
export function MemberCard({
  fullName,
  email,
  phone,
  memberNumber,
  appUrl = "https://watchmen-six.vercel.app",
}: MemberCardProps) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  const numberDisplay =
    typeof memberNumber === "number"
      ? `#${String(memberNumber).padStart(3, "0")}`
      : null;

  function buildShareText(): string {
    return [
      `${fullName} — The Watchmen${numberDisplay ? ` ${numberDisplay}` : ""}`,
      email,
      phone ?? "",
      "",
      `The Watchmen · ${appUrl}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function share() {
    const text = buildShareText();
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${fullName} · The Watchmen`,
          text,
        });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      push({ title: "Card copied", variant: "success" });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      push({
        title: "Couldn't share",
        body: "Long-press the card text to copy.",
        variant: "error",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="relative w-full max-w-md mx-auto rounded-[22px] overflow-hidden ring-1 ring-gold-300/60 shadow-[0_18px_40px_-12px_rgba(212,175,55,0.45)]"
        style={{ aspectRatio: "1.586 / 1" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0d57a] via-[#c79b3b] to-[#8a6210]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent mix-blend-overlay" />
        <div className="absolute -top-1/2 -left-1/4 w-3/4 h-full bg-gradient-to-br from-white/30 to-transparent rotate-12 blur-2xl" />

        <div className="absolute top-4 left-5 right-5 flex items-start justify-between text-black">
          <Logo className="h-8 w-8" />
          <div className="text-right">
            <div className="text-[9.5px] tracking-[0.28em] uppercase opacity-75">
              The Watchmen
            </div>
            <div className="text-[10.5px] tracking-[0.18em] uppercase font-semibold">
              Member
            </div>
          </div>
        </div>

        {numberDisplay ? (
          <div className="absolute left-5 top-[48%] -translate-y-1/2 text-black">
            <div className="text-[9.5px] tracking-[0.28em] uppercase opacity-70">
              Member No.
            </div>
            <div className="text-[28px] font-bold tabular-nums leading-none mt-1">
              {numberDisplay}
            </div>
          </div>
        ) : null}

        <div className="absolute left-5 right-5 bottom-3.5 text-black">
          <div className="text-[10.5px] tracking-[0.22em] uppercase opacity-70 mb-0.5">
            Name
          </div>
          <div className="text-[17px] font-bold leading-tight">{fullName}</div>
          <div className="mt-1.5 text-[11.5px] font-medium opacity-90 truncate">
            {email}
          </div>
          {phone ? (
            <div className="text-[11.5px] font-medium opacity-80">{phone}</div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={share}
        className="w-full h-12 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[14.5px] font-semibold flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M16 6l-4-4-4 4" />
          <path d="M12 2v14" />
        </svg>
        {copied ? "Card copied ✓" : "Share my card"}
      </button>
      <p className="text-[11.5px] text-ink-400 text-center max-w-md mx-auto">
        Show this when you visit a partner business for your Watchmen discount,
        or share it with someone you just met so they have your info.
      </p>
    </div>
  );
}
