import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";
import { logoutAction } from "@/lib/auth/actions";
import { WebOnly } from "@/components/util/WebOnly";
import { EnablePushButton } from "@/components/push/EnablePushButton";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.status === "approved") redirect("/app/home");
  const rejected = profile?.status === "rejected";

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <div className="flex justify-center mb-5">
        <Logo className="h-16 w-16 text-gold-400" />
      </div>
      <div className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 mb-1">
        The Watchmen
      </div>
      <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-300 mb-5">
        Got Your 6
      </div>
      <Card className="w-full max-w-sm">
        <CardBody>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
            {rejected ? "Not approved" : "Pending approval"}
          </div>
          <h1 className="text-2xl font-semibold mt-3">
            {rejected ? "We can't add you right now." : `Hold tight, ${profile?.full_name?.split(" ")[0] ?? "brother"}.`}
          </h1>
          <p className="text-ink-300 mt-3 text-[15px] leading-relaxed">
            {rejected
              ? "Reach out to your inviter if you think this is a mistake."
              : "An admin will review your request. Turn on notifications below and we'll ping you the moment you're approved."}
          </p>
          <form action={logoutAction} className="mt-6">
            <Button type="submit" variant="outline" fullWidth>
              Sign out
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Only show install nudges on web — native iOS users are already
          inside the installed app.

          Now that Watchmen GY6 is live on the App Store (1.0.1 ships
          with production APNs), the App Store download is the primary
          path. Pending applicants install the app while leadership
          reviews their request so they're ready the moment the
          approval email + push hits. The legacy PWA "Add to Home Screen"
          hint is preserved as a smaller fallback for users who can't
          access the App Store (e.g. desktop preview). */}
      <WebOnly>
        <div className="mt-7 w-full max-w-sm">
          <div className="rounded-2xl bg-ink-800 hairline px-4 py-5 text-left">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              While you wait
            </div>
            <div className="text-white text-[15px] font-semibold mt-1.5">
              Get the iPhone app
            </div>
            <p className="text-ink-300 text-[13px] leading-relaxed mt-2">
              Install Watchmen so you&apos;re ready the moment leadership approves your request.
            </p>
            <a
              href="https://apps.apple.com/app/id6776308985"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-black ring-1 ring-white/15 text-white hover:bg-ink-900 transition-colors"
              aria-label="Download Watchmen on the App Store"
            >
              {/* Apple logo SVG — matches Apple's badge spec at small size.
                  We're using an inline mark rather than the official PNG
                  badge to keep the page asset-light; the wordmark "App
                  Store" is included as text so the link still satisfies
                  Apple's identification guideline. */}
              <svg
                viewBox="0 0 384 512"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM260.8 90.3c25.5-30.3 23.2-57.8 22.4-67.8-22.5 1.3-48.5 15.3-63.3 32.6-16.3 18.6-25.9 41.6-23.8 66.4 24.3 1.9 46.5-10.6 64.7-31.2z" />
              </svg>
              <span className="text-[14.5px] font-semibold">Download on the App Store</span>
            </a>
          </div>
          <p className="mt-3 text-ink-400 text-xs text-center">
            Don&apos;t have an iPhone? Tap{" "}
            <span className="text-ink-200">Share → Add to Home Screen</span> in
            Safari to use the web version meanwhile.
          </p>
        </div>
      </WebOnly>

      {/* Notifications — so the approval lands as a push. In the native app
          this is the APNs enable button; on un-installed iOS Safari it
          explains the Add-to-Home-Screen step. Shown after the download CTA
          because enabling push really happens once they're in the app. */}
      {!rejected ? (
        <div className="mt-5 w-full max-w-sm">
          <div className="rounded-2xl bg-ink-800 hairline px-4 py-5 text-left">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Get notified
            </div>
            <div className="text-white text-[15px] font-semibold mt-1.5">
              Turn on notifications
            </div>
            <p className="text-ink-300 text-[13px] leading-relaxed mt-2">
              We&apos;ll send you a push the moment you&apos;re approved so you can
              finish setting up your account.
            </p>
            <div className="mt-4">
              <EnablePushButton />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
