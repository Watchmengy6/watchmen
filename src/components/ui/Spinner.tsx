import { cn } from "@/lib/utils/cn";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-ink-300",
        className,
      )}
    />
  );
}
