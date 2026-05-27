import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PreviewPending() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <Card className="w-full max-w-sm">
        <CardBody>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
            Pending approval
          </div>
          <h1 className="text-2xl font-semibold mt-3">Hold tight, Hunter.</h1>
          <p className="text-ink-300 mt-3 text-[15px] leading-relaxed">
            Dustin will review your request. You&apos;ll get access once you&apos;re approved.
          </p>
          <Link href="/preview/landing" className="block mt-6">
            <Button variant="outline" fullWidth>Sign out</Button>
          </Link>
        </CardBody>
      </Card>
      <p className="mt-6 text-ink-400 text-xs">
        Tap <span className="text-ink-200">Share → Add to Home Screen</span> in Safari to install the app.
      </p>
    </main>
  );
}
