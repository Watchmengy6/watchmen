import { cn } from "@/lib/utils/cn";
import type { EventCategory } from "@/lib/preview/mock";

const styles: Record<EventCategory, string> = {
  Dinner: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
  Retreat: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  Mixer: "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/30",
  Speaker: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30",
  Service: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
};

export function CategoryTag({
  category,
  size = "sm",
}: {
  category: EventCategory;
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
