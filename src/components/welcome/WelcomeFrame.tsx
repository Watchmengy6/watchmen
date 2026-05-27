"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** 1-based step index */
  step: number;
  totalSteps: number;
  back?: string | null;
  skip?: string | null;
  next?: { href: string; label: string; variant?: "gold" | "outline" };
  secondary?: { label: string; href?: string; onClick?: () => void };
  brand?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function WelcomeFrame({
  step,
  totalSteps,
  back,
  skip,
  next,
  secondary,
  brand = "GOT YOUR 6IX",
  title,
  subtitle,
  children,
}: Props) {
  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white flex flex-col">
      {/* Top bar — progress + back + skip */}
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          {back ? (
            <Link
              href={back}
              className="h-8 w-8 -ml-1 flex items-center justify-center text-ink-200 text-lg"
              aria-label="Back"
            >
              ‹
            </Link>
          ) : (
            <div className="h-8 w-8" />
          )}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i + 1 <= step ? "w-6 bg-gold-400" : "w-3 bg-ink-700",
                )}
              />
            ))}
          </div>
          {skip ? (
            <Link
              href={skip}
              className="text-[12px] text-ink-300 px-2 h-8 inline-flex items-center"
            >
              Skip
            </Link>
          ) : (
            <div className="h-8 w-12" />
          )}
        </div>
      </div>

      {/* Heading */}
      {title || subtitle ? (
        <div className="px-6 pt-4 pb-2">
          {brand ? (
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              {brand}
            </div>
          ) : null}
          {title ? (
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight leading-tight">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="mt-2 text-ink-300 text-[14.5px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Content */}
      <div className="flex-1 px-6 pt-2 pb-6">{children}</div>

      {/* Bottom CTA bar */}
      {next ? (
        <div
          className="sticky bottom-0 z-30 bg-ink-900/95 backdrop-blur-xl border-t border-white/[0.05]"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="px-6 pt-3 space-y-2">
            <Link href={next.href}>
              <button
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 h-12 rounded-full font-semibold transition-transform active:scale-[0.98]",
                  next.variant === "outline"
                    ? "bg-transparent text-white hairline"
                    : "bg-gradient-to-b from-gold-300 to-gold-500 text-black",
                )}
              >
                {next.label}
              </button>
            </Link>
            {secondary ? (
              secondary.href ? (
                <Link
                  href={secondary.href}
                  className="block text-center text-[13px] text-ink-300 py-2"
                >
                  {secondary.label}
                </Link>
              ) : (
                <button
                  onClick={secondary.onClick}
                  className="w-full text-center text-[13px] text-ink-300 py-2"
                >
                  {secondary.label}
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
