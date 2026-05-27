import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export default function PreviewInviteLanding() {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-10 text-center">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          You&apos;ve been invited
        </div>
        <h1 className="text-4xl font-semibold tracking-tight mt-3">
          <span className="text-gradient-gold">The Watchman</span>
        </h1>
      </div>
      <div className="flex-1 flex items-center">
        <Card className="w-full max-w-sm mx-auto">
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar name="Marcus Bell" size={56} ring />
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">Marcus Bell</div>
                <div className="text-ink-300 text-sm truncate">Realtor · Coastal Bell Group</div>
              </div>
            </div>
            <p className="text-ink-200 mt-4 text-sm leading-relaxed">
              Marcus invited you to join The Watchman — a private men&apos;s networking room
              in St. Petersburg / Tampa Bay. Create your account and Dustin will review your request.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/preview/signup">
                <Button variant="gold" size="lg" fullWidth>Accept invite</Button>
              </Link>
              <Link href="/preview/login">
                <Button variant="ghost" size="md" fullWidth>I already have an account</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
      <footer className="py-4 text-center text-[11px] text-ink-400">Private · Members Only</footer>
    </main>
  );
}
