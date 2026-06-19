import { requireApproved } from "@/lib/auth/gates";
import { BottomNav } from "@/components/nav/BottomNav";
import { PushReceiver } from "@/components/push/PushReceiver";
import { NativePushRegistrar } from "@/components/push/NativePushRegistrar";
import { DisclaimerGate } from "@/components/account/DisclaimerGate";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireApproved();
  const needsDisclaimer = !profile.disclaimer_accepted_at;
  // Configurable video URL so Dustin can swap in the final cut without
  // a code change. Set NEXT_PUBLIC_DISCLAIMER_VIDEO_URL in Vercel env.
  const disclaimerVideoUrl = process.env.NEXT_PUBLIC_DISCLAIMER_VIDEO_URL;

  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white pb-20 overflow-x-hidden">
      {/* In-app push banner — shows when a push arrives while the user is
          actively in the app (iOS suppresses system banners in foreground). */}
      <PushReceiver />
      {/* Native (Capacitor) push registrar — asks for permission and
          stores the APNs/FCM device token. No-op on plain web. */}
      <NativePushRegistrar />
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
      {/* App Store requires an EULA / code-of-conduct gate before first use.
          Rendered over the app shell so the user can't tap past it. */}
      {needsDisclaimer ? <DisclaimerGate videoUrl={disclaimerVideoUrl} /> : null}
    </div>
  );
}
