"use client";
import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-white text-black hover:bg-ink-100 active:bg-ink-200 shadow-card disabled:opacity-50",
  gold:
    "bg-gradient-to-b from-gold-200 to-gold-500 text-black hover:from-gold-100 hover:to-gold-400 shadow-glow disabled:opacity-50 font-semibold",
  outline:
    "bg-transparent text-white hairline hover:bg-white/[0.04] active:bg-white/[0.08]",
  ghost:
    "bg-transparent text-white hover:bg-white/[0.04] active:bg-white/[0.08]",
  danger:
    "bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, fullWidth, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium select-none",
        "transition-transform duration-150 active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60",
        sizes[size],
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});
