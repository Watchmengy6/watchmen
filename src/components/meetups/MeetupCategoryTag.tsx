import { cn } from "@/lib/utils/cn";
import type { MeetupCategory } from "@/lib/preview/mock";

const styles: Record<MeetupCategory, string> = {
  Coffee: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  Workout: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  Drinks: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
  Outdoors: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
  Food: "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30",
  Other: "bg-ink-700 text-ink-200 ring-1 ring-white/10",
};

export function MeetupCategoryTag({
  category,
  size = "sm",
}: {
  category: MeetupCategory;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 h-5 text-[10.5px]" : "px-2.5 h-6 text-[11.5px]",
        styles[category],
      )}
    >
      {category}
    </span>
  );
}
