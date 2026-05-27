"use client";

import { useState } from "react";
import { WelcomeFrame } from "@/components/welcome/WelcomeFrame";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

export default function WelcomePay() {
  const [venmo, setVenmo] = useState("");
  const [cashapp, setCashapp] = useState("");

  return (
    <WelcomeFrame
      step={4}
      totalSteps={5}
      back="/preview/welcome/basics"
      skip="/preview/welcome/permissions"
      title="Settle up fast"
      subtitle="Drop your Venmo or CashApp so brothers can pay you back without asking for your handle every time."
      next={{ href: "/preview/welcome/permissions", label: "Continue" }}
    >
      <div className="space-y-3">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-9 w-9 rounded-xl bg-[#008CFF] flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M19.5 4c1 0 1.5.6 1.5 1.7 0 3.1-4.6 11.2-7 14.3H8.5L6 7.5l4-.4L11.5 16c1.4-2.2 3.5-6 3.5-8 0-1-.4-1.7-.6-2L19.5 4Z" />
                  </svg>
                </div>
                <Label className="!mb-0">Venmo</Label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-400 pointer-events-none">
                  @
                </span>
                <Input
                  value={venmo}
                  onChange={(e) => setVenmo(e.target.value)}
                  placeholder="username"
                  className="pl-7"
                />
              </div>
              {venmo ? (
                <a
                  href={`https://venmo.com/u/${venmo.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-block text-[11.5px] text-gold-300 hover:text-gold-200"
                >
                  venmo.com/u/{venmo.replace(/^@/, "")} ↗
                </a>
              ) : null}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-9 w-9 rounded-xl bg-[#00C244] flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M14.7 9.2c-.7-.6-1.7-1-2.7-1-1.1 0-2 .4-2 1.2 0 .8.8 1 2.4 1.4 2.6.6 4.1 1.6 4.1 3.6 0 2.2-2 3.6-4.3 3.8l-.3 1c-.1.3-.4.5-.7.4l-.7-.2c-.3-.1-.5-.4-.4-.7l.3-1.1c-1.1-.3-2.1-.9-2.8-1.7-.2-.2-.2-.6 0-.8l1-1c.2-.2.5-.2.7 0 .8.8 2 1.3 3.2 1.3 1.3 0 2.1-.5 2.1-1.4 0-.8-.7-1.1-2.5-1.5-2.2-.5-4-1.5-4-3.5 0-2 1.9-3.3 4-3.5l.3-1c.1-.3.4-.5.7-.4l.7.2c.3.1.5.4.4.7l-.3 1c.9.2 1.7.6 2.4 1.2.2.2.2.5 0 .7l-1 1.1c-.1.2-.4.2-.6 0Z" />
                  </svg>
                </div>
                <Label className="!mb-0">CashApp</Label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-400 pointer-events-none">
                  $
                </span>
                <Input
                  value={cashapp}
                  onChange={(e) => setCashapp(e.target.value)}
                  placeholder="cashtag"
                  className="pl-7"
                />
              </div>
              {cashapp ? (
                <a
                  href={`https://cash.app/$${cashapp.replace(/^\$/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-block text-[11.5px] text-gold-300 hover:text-gold-200"
                >
                  cash.app/${cashapp.replace(/^\$/, "")} ↗
                </a>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <div className="rounded-xl bg-ink-800/60 hairline px-3 py-2.5 text-[12px] text-ink-300 leading-relaxed">
          Only members can see this. Type just your username — we build the link.
        </div>
      </div>
    </WelcomeFrame>
  );
}
