import { requireApproved } from "@/lib/auth/gates";
import { BottomNav } from "@/components/nav/BottomNav";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireApproved();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white pb-20">
      {isAdmin ? (
        <div className="fixed top-3 right-3 z-30 safe-top">
          <Link
            href="/admin"
            className="glass hairline rounded-full px-3 py-1.5 text-[11px] tracking-wider uppercase text-gold-300"
          >
            Admin
          </Link>
        </div>
      ) : null}
      <main className="mx-auto max-w-screen-sm">{children}</main>
      <BottomNav />
    </div>
  );
}
