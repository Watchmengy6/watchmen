import { cn } from "@/lib/utils/cn";

type Variant = "default" | "gold" | "muted" | "success";

const variants: Record<Variant, string> = {
  default: "bg-ink-700 text-ink-100",
  gold: "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/30",
  muted: "bg-ink-800 text-ink-300 hairline",
  success: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[12px] font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
