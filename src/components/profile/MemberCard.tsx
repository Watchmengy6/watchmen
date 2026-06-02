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

  /**
   * Rasterize the card to a PNG by drawing onto a canvas at 2x retina
   * scale. This is what gets attached to the iMessage / email share so
   * the recipient sees the actual gold card, not just plain text.
   */
  async function renderCardToPng(): Promise<Blob | null> {
    if (typeof document === "undefined") return null;
    // 800x504 (≈ 1.586:1 credit-card ratio) at 2x = 1600x1008 pixels.
    const W = 1600;
    const H = 1008;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // ---------- background gradient ----------
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#f0d57a");
    bg.addColorStop(0.55, "#c79b3b");
    bg.addColorStop(1, "#8a6210");
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 56);
    ctx.fill();

    // ---------- top-left highlight (the "embossed" feel) ----------
    const highlight = ctx.createLinearGradient(0, 0, W * 0.6, H * 0.6);
    highlight.addColorStop(0, "rgba(255,255,255,0.32)");
    highlight.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, W, H);

    // ---------- subtle inner border ----------
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    roundRect(ctx, 6, 6, W - 12, H - 12, 50);
    ctx.stroke();

    // ---------- top row: logo placeholder + label ----------
    // We draw a stylized "W" since loading the SVG into canvas reliably
    // across browsers (especially Safari) is fiddly. Keep the brand
    // mark deterministic.
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.font = "900 86px 'Helvetica Neue', system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("W", 56, 48);

    // top-right "THE WATCHMEN / MEMBER" label
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.font = "600 22px 'Helvetica Neue', system-ui, sans-serif";
    ctx.fillText("THE WATCHMEN", W - 56, 56);
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.font = "700 28px 'Helvetica Neue', system-ui, sans-serif";
    ctx.fillText("MEMBER", W - 56, 90);
    ctx.textAlign = "left";

    // ---------- center: member number ----------
    if (numberDisplay) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = "600 22px 'Helvetica Neue', system-ui, sans-serif";
      ctx.fillText("MEMBER NO.", 56, H * 0.42);
      ctx.fillStyle = "rgba(0,0,0,0.95)";
      ctx.font = "900 96px 'Helvetica Neue', system-ui, sans-serif";
      ctx.fillText(numberDisplay, 56, H * 0.42 + 40);
    }

    // ---------- bottom: name + contact ----------
    const bottomY = H - 64;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.font = "600 20px 'Helvetica Neue', system-ui, sans-serif";
    ctx.fillText("NAME", 56, bottomY - 120);

    ctx.fillStyle = "rgba(0,0,0,0.95)";
    ctx.font = "800 44px 'Helvetica Neue', system-ui, sans-serif";
    ctx.fillText(truncate(fullName, 28), 56, bottomY - 90);

    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.font = "600 26px 'Helvetica Neue', system-ui, sans-serif";
    ctx.fillText(truncate(email, 42), 56, bottomY - 30);
    if (phone) {
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillText(truncate(phone, 42), 56, bottomY + 4);
    }

    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.95),
    );
  }

  async function share() {
    const text = buildShareText();

    // Try to share with the rasterized card image first. Web Share Level 2
    // (iOS 16.4+, Android Chrome) supports `files`; older browsers fall
    // back to text-only share or clipboard.
    try {
      const blob = await renderCardToPng();
      const nav = navigator as any;
      if (blob && nav?.share && nav?.canShare) {
        const file = new File(
          [blob],
          `${fullName.replace(/\s+/g, "-").toLowerCase()}-watchmen-card.png`,
          { type: "image/png" },
        );
        if (nav.canShare({ files: [file] })) {
          try {
            await nav.share({
              title: `${fullName} · The Watchmen`,
              text,
              files: [file],
            });
            return;
          } catch {
            // user cancelled — drop through
            return;
          }
        }
      }
    } catch (e) {
      console.warn("[member-card] image share failed, falling back", e);
    }

    // Fallback 1: text-only share (older Safari / Android browsers).
    const nav2 = navigator as any;
    if (nav2?.share) {
      try {
        await nav2.share({
          title: `${fullName} · The Watchmen`,
          text,
        });
        return;
      } catch {
        // dropped through
      }
    }

    // Fallback 2: clipboard copy.
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

  /** Draw a rounded rectangle path for canvas fill/stroke. */
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + "…";
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
