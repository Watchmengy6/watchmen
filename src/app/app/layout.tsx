import { requireApproved } from "@/lib/auth/gates";
import { BottomNav } from "@/components/nav/BottomNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireApproved();

  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white pb-20">
      <main className="mx-auto max-w-screen-sm">{children}</main>
      <BottomNav
        profileLabel={
          profile.full_name
            .split(" ")
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? "")
            .join("") || "·"
        }
        profileSrc={profile.profile_photo_url}
      />
    </div>
  );
}
