"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/preview/admin", label: "Overview" },
  { href: "/preview/admin-pending", label: "Pending" },
  { href: "/preview/admin-members", label: "Members" },
  { href: "/preview/admin-events", label: "Events" },
  { href: "/preview/admin-leaderboard", label: "Points" },
];

export function AdminPreviewShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white pb-10">
      <header
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Master Admin
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight leading-tight">
              Command Room
            </h1>
          </div>
          <Link
            href="/preview/home"
            className="text-[11px] tracking-wider uppercase text-ink-200 px-3 h-8 rounded-full bg-ink-800 hairline inline-flex items-center"
          >
            Exit
          </Link>
        </div>
        <nav className="px-3 pb-2">
          <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 scrollbar-none">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "shrink-0 inline-flex items-center justify-center h-8 px-3.5 rounded-full text-[12.5px] leading-none transition-colors",
                    active
                      ? "bg-white text-black font-semibold"
                      : "bg-ink-800 hairline text-ink-200",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-screen-sm pt-3">{children}</main>
    </div>
  );
}
