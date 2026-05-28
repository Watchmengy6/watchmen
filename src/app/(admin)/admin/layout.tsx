import Link from "next/link";
import { requireAdmin } from "@/lib/auth/gates";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/pending", label: "Pending" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white pb-10 overflow-x-hidden">
      <header
        className="px-5 pb-3"
        style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
              Admin
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Command Room
            </h1>
          </div>
          <Link
            href="/app/home"
            className="text-[11px] tracking-wider uppercase text-ink-300 px-3 h-8 rounded-full bg-ink-800 hairline inline-flex items-center"
          >
            Exit
          </Link>
        </div>
      </header>
      {/* Horizontally-scrollable tab strip. Use mx-0 padding-left, NOT
          negative-margin overflow tricks (those caused the misalignment). */}
      <nav className="mb-4">
        <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="shrink-0 h-9 px-4 rounded-full bg-ink-800 hairline text-ink-100 text-[13px] hover:bg-ink-700 inline-flex items-center"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-screen-sm">{children}</main>
    </div>
  );
}
