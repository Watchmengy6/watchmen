import Link from "next/link";

/**
 * Compact gold shield button for the top-right of a member screen.
 * Same footprint as the bell/search round icons next to it, with a small
 * black badge for the pending-approval count. Only render for admin roles.
 */
export function AdminPill({
  pendingCount = 0,
  href = "/admin/pending",
}: {
  pendingCount?: number;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Admin${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`}
      className="relative h-9 w-9 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black flex items-center justify-center shadow-glow"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
      >
        <path d="M12 2 4 6v6c0 5 3.6 9.4 8 10 4.4-.6 8-5 8-10V6Z" />
      </svg>
      {pendingCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-black text-gold-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-ink-900">
          {pendingCount}
        </span>
      ) : null}
    </Link>
  );
}
