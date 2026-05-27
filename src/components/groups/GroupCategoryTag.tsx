import { cn } from "@/lib/utils/cn";
import type { GroupCategory } from "@/lib/preview/mock";

const styles: Record<GroupCategory, string> = {
  Fitness: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  Business: "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/30",
  Hobby: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
  Faith: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30",
  Social: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
  Sports: "bg-lime-500/15 text-lime-200 ring-1 ring-lime-500/30",
};

export function GroupCategoryTag({
  category,
  size = "sm",
}: {
  category: GroupCategory;
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
