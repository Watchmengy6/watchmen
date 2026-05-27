import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

export default async function Landing() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile?.status === "approved") redirect("/app/home");
    redirect("/pending");
  }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-6">
          <Logo className="h-24 w-24 text-gold-400" />
        </div>
        <div className="mb-2 text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Private Network · Members Only
        </div>
        <h1 className="text-5xl font-semibold tracking-tight">
          <span className="text-gradient-gold">The Watchmen</span>
        </h1>
        <div className="mt-3 text-[11px] tracking-[0.32em] uppercase text-gold-300/90">
          Got Your 6
        </div>
        <p className="mt-5 max-w-sm text-ink-200 text-[15px] leading-relaxed">
          A private room for the brothers who actually show up. Networking,
          events, and brotherhood — by invitation only.
        </p>
        <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          <Link href="/login">
            <Button variant="gold" size="lg" fullWidth>
              Sign In
            </Button>
          </Link>
          <p className="text-ink-400 text-xs mt-2">
            Don&apos;t have an invite? Ask a member for your link.
          </p>
        </div>
      </div>
      <footer className="px-6 py-6 text-center text-[11px] text-ink-400 safe-bottom">
        St. Petersburg · Tampa Bay
      </footer>
    </main>
  );
}
