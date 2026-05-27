import { cn } from "@/lib/utils/cn";

export function CapacityBar({
  filled,
  capacity,
  showLabel = true,
}: {
  filled: number;
  capacity: number;
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.round((filled / capacity) * 100));
  const full = filled >= capacity;
  const tight = !full && pct >= 80;

  return (
    <div className="w-full">
      <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            full
              ? "bg-red-400"
              : tight
                ? "bg-gradient-to-r from-gold-400 to-gold-300"
                : "bg-gradient-to-r from-gold-500 to-gold-300",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-ink-300 tabular-nums">
            {filled}/{capacity} going
          </span>
          <span
            className={cn(
              "tabular-nums font-medium",
              full ? "text-red-300" : tight ? "text-gold-300" : "text-ink-300",
            )}
          >
            {full ? "Full · waitlist" : tight ? `${capacity - filled} spots left` : `${capacity - filled} open`}
          </span>
        </div>
      ) : null}
    </div>
  );
}
