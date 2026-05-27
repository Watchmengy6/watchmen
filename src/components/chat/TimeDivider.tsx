export function TimeDivider({ iso }: { iso: string }) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();

  const dayLabel = sameDay
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex items-center justify-center my-3 px-3">
      <div className="text-[11px] text-ink-400">
        <span className="font-semibold text-ink-300">{dayLabel}</span>
        <span className="mx-1.5">·</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
