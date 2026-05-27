import Link from "next/link";
import { WelcomeFrame } from "@/components/welcome/WelcomeFrame";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/brand/Logo";

export default function WelcomeStart() {
  return (
    <WelcomeFrame
      step={1}
      totalSteps={5}
      back={null}
      skip={null}
      next={{ href: "/preview/welcome/photo", label: "Let's go" }}
    >
      <div className="flex flex-col items-center text-center pt-6">
        <div className="relative">
          <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-gold-500/20 via-gold-700/10 to-ink-900 ring-1 ring-gold-500/25 flex items-center justify-center p-4">
            <Logo className="w-full h-auto text-gold-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-emerald-500 ring-4 ring-ink-900 flex items-center justify-center text-white font-bold">
            ✓
          </div>
        </div>

        <div className="mt-7 text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          You&apos;re In
        </div>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight leading-tight">
          Welcome to <br />
          <span className="text-gradient-gold">The Watchmen</span>
        </h1>
        <p className="mt-4 text-ink-200 text-[15px] leading-relaxed max-w-[300px]">
          You&apos;ve been approved. This is a private room — small, intentional,
          and built around showing up for one another.
        </p>

        <div className="mt-6 rounded-2xl bg-ink-800/60 hairline px-4 py-3.5 flex items-start gap-3 text-left max-w-[320px]">
          <Avatar name="Dustin Hardy" size={36} ring />
          <div className="flex-1">
            <div className="text-[12.5px] text-ink-100 leading-relaxed">
              &ldquo;Glad to have you in here, brother. Take five minutes to set up
              your profile — the rest is just showing up.&rdquo;
            </div>
            <div className="text-[11px] text-gold-300 font-semibold mt-1.5">
              — Dustin, founder
            </div>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-ink-400">Takes about 60 seconds.</p>
      </div>
    </WelcomeFrame>
  );
}
