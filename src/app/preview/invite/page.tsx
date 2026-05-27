import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMe } from "@/lib/preview/mock";

export default function PreviewInvite() {
  const link = `https://thewatchman.app/invite/${mockMe.invite_code}`;
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-24 relative">
      <div className="pt-8 px-5 space-y-4">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
            Invite a Brother
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Your invite link</h1>
          <p className="mt-1 text-ink-300 text-sm">
            Share this with men you trust. They land on a private welcome screen
            and Dustin reviews every request.
          </p>
        </div>

        <Card>
          <CardBody>
            <div className="rounded-xl bg-ink-900/60 hairline p-3">
              <div className="text-[10.5px] tracking-[0.2em] uppercase text-ink-400 mb-1">Your link</div>
              <div className="font-mono text-sm text-gold-200 break-all">{link}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline">Copy</Button>
              <Button variant="gold">Share</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
              Your impact
            </div>
            <div className="grid grid-cols-3 text-center gap-2">
              <Stat label="Total invited" value={6} />
              <Stat label="Approved" value={4} />
              <Stat label="Points earned" value={200} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">Reward</div>
            <p className="text-ink-200 text-sm leading-relaxed">
              You earn <span className="text-gold-300 font-semibold">+50 points</span> each
              time someone you invited is approved. Points may unlock recognition,
              event perks, or rewards Dustin decides on later.
            </p>
          </CardBody>
        </Card>
      </div>
      <PreviewBottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-gradient-gold text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-ink-300 mt-0.5">{label}</div>
    </div>
  );
}
