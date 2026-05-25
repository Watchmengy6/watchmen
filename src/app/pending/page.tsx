import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/lib/auth/actions";

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
              : "Dustin will review your request. You'll get access once you're approved."}
          </p>
          <form action={logoutAction} className="mt-6">
            <Button type="submit" variant="outline" fullWidth>
              Sign out
            </Button>
          </form>
        </CardBody>
      </Card>
      <p className="mt-6 text-ink-400 text-xs">
        Tap <span className="text-ink-200">Share → Add to Home Screen</span> in Safari to install the app.
      </p>
    </main>
  );
}
