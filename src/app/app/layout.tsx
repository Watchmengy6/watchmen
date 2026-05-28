import { requireApproved } from "@/lib/auth/gates";
import { BottomNav } from "@/components/nav/BottomNav";
import { PushReceiver } from "@/components/push/PushReceiver";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireApproved();

  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white pb-20 overflow-x-hidden">
      {/* In-app push banner — shows when a push arrives while the user is
          actively in the app (iOS suppresses system banners in foreground). */}
      <PushReceiver />
      {/* main has NO horizontal padding so pages can fully control their own
          inset (and use full width for sticky headers / hero cards). Pages
          should add px-4 or px-5 to their content as needed. */}
      <main className="mx-auto w-full max-w-screen-sm">{children}</main>
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
