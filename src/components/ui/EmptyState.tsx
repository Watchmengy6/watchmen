import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-14",
        className,
      )}
    >
      <div className="h-12 w-12 rounded-full bg-ink-800 hairline mb-4 flex items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-gold-400" />
      </div>
      <h3 className="text-white text-base font-semibold">{title}</h3>
      {body ? <p className="text-ink-300 text-sm mt-1 max-w-sm">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
