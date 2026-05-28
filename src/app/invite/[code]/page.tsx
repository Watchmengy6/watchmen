import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

export default async function InviteLanding({
  params,
}: {
  params: { code: string };
}) {
  const supabase = supabaseServer();
  // SECURITY DEFINER RPC — works for anon viewers (they can't read profiles directly).
  const { data: inviterRows } = await supabase.rpc("get_invite_inviter", {
    p_invite_code: params.code,
  });
  const inviter = inviterRows && inviterRows.length > 0 ? inviterRows[0] : null;

  if (!inviter || inviter.status !== "approved") {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-ink-300 mt-2 max-w-sm">
          This invite link is invalid or has been revoked. Ask the member for a new one.
        </p>
        <Link href="/login" className="mt-6">
          <Button variant="outline">Go to sign in</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-10 text-center">
        <div className="flex justify-center mb-4">
          <Logo className="h-20 w-20 text-gold-400" />
        </div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          You&apos;ve been invited
        </div>
        <h1 className="text-4xl font-semibold tracking-tight mt-3">
          <span className="text-gradient-gold">The Watchmen</span>
        </h1>
        <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-300 mt-1.5">
          Got Your 6
        </div>
      </div>

      <div className="flex-1 flex items-center">
        <Card className="w-full max-w-sm mx-auto">
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar
                src={inviter.profile_photo_url}
                name={inviter.full_name}
                size={56}
                ring
              />
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">
                  {inviter.full_name}
                </div>
                <div className="text-ink-300 text-sm truncate">
                  {inviter.occupation ?? "Member"}
                </div>
              </div>
            </div>
            <p className="text-ink-200 mt-4 text-sm leading-relaxed">
              {inviter.full_name.split(" ")[0]} invited you to join The Watchmen —
              a private men&apos;s networking room in St. Petersburg / Tampa Bay.
              Create your account and an admin will review your request.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link href={`/signup?code=${params.code}`}>
                <Button variant="gold" size="lg" fullWidth>
                  Accept invite
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="md" fullWidth>
                  I already have an account
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <footer className="py-4 text-center text-[11px] text-ink-400">
        Private · Members Only
      </footer>
    </main>
  );
}
