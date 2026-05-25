export function fmtEventDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(timeStr: string | null) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diff = (Date.now() - then) / 1000;
  if (diff < 45) return "just now";
  if (diff < 90) return "1 min";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 7200) return "1 hr";
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr`;
  if (diff < 172800) return "1 day";
  if (diff < 604800) return `${Math.floor(diff / 86400)} days`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
