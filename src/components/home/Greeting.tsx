import Link from "next/link";

export function Greeting({ name, unread = 0 }: { name: string; unread?: number }) {
  const first = name.split(" ")[0] ?? name;
  const hour = new Date().getHours();
  const greet =
    hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Welcome back" : "Good evening";
  return (
    <div className="px-5 pt-8 flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          The Watchman · Private Network
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
          {greet}, {first}
        </h1>
      </div>
      <Link
        href="/app/notifications"
        className="relative h-10 w-10 rounded-full bg-ink-800 hairline flex items-center justify-center"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-ink-200">
          <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-400 text-black text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
