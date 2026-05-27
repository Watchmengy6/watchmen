"use client";

import { useState } from "react";
import { WelcomeFrame } from "@/components/welcome/WelcomeFrame";
import { cn } from "@/lib/utils/cn";

export default function WelcomePermissions() {
  const [notif, setNotif] = useState<null | "on" | "off">(null);

  return (
    <WelcomeFrame
      step={5}
      totalSteps={5}
      back="/preview/welcome/pay"
      skip={null}
      title="Stay close to the room"
      subtitle="Turn on notifications and pin the app to your home screen. Both take ten seconds."
      next={{ href: "/preview/home", label: "Open The Watchman" }}
    >
      <div className="space-y-3">
        {/* Push notifications card */}
        <div className="rounded-2xl bg-ink-800/80 hairline overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-gold-400/30 to-ink-800 ring-1 ring-gold-500/30 flex items-center justify-center text-gold-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                     strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-[15px] font-semibold">Push notifications</div>
                <div className="text-ink-300 text-[12.5px] mt-0.5 leading-snug">
                  New events, group messages, RSVPs. You can mute any group later.
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setNotif("off")}
                className={cn(
                  "h-10 rounded-full text-[13px] font-medium transition-colors",
                  notif === "off"
                    ? "bg-ink-700 text-white ring-1 ring-white/15"
                    : "bg-transparent text-ink-300 hairline",
                )}
              >
                Not now
              </button>
              <button
                onClick={() => setNotif("on")}
                className={cn(
                  "h-10 rounded-full text-[13px] font-semibold transition-all",
                  notif === "on"
                    ? "bg-gradient-to-b from-gold-300 to-gold-500 text-black"
                    : "bg-transparent text-gold-300 ring-1 ring-gold-500/40",
                )}
              >
                {notif === "on" ? "Enabled ✓" : "Turn on"}
              </button>
            </div>
          </div>
        </div>

        {/* Add to home screen card */}
        <div className="rounded-2xl bg-ink-800/80 hairline overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-ink-800 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                     strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <rect x="5" y="2" width="14" height="20" rx="2.5" />
                  <path d="M12 18h.01" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-[15px] font-semibold">Add to home screen</div>
                <div className="text-ink-300 text-[12.5px] mt-0.5 leading-snug">
                  One tap to open. Full-screen, no Safari chrome.
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-ink-900/60 hairline px-3 py-2.5 text-[12px] text-ink-300 leading-relaxed">
              In Safari, tap{" "}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ink-800 text-ink-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                     className="h-3.5 w-3.5">
                  <path d="M12 16V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="12" width="16" height="8" rx="2" />
                </svg>
                Share
              </span>{" "}
              →{" "}
              <span className="text-ink-100 font-medium">Add to Home Screen</span>.
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-ink-400 mt-2">
          You can change either of these later in Settings.
        </div>
      </div>
    </WelcomeFrame>
  );
}
