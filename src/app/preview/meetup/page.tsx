"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MapPreview } from "@/components/events/MapPreview";
import { MeetupCategoryTag } from "@/components/meetups/MeetupCategoryTag";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMeetups, mockMembers } from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

export default function PreviewMeetupDetail() {
  const m = mockMeetups[0];
  const attendees = mockMembers.slice(0, 4);
  const d = new Date(m.when_iso);

  const [going, setGoing] = useState(m.user_going);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  function handleCheckIn() {
    if (checkedIn) return;
    setCheckingIn(true);
    setTimeout(() => {
      setCheckingIn(false);
      setCheckedIn(true);
    }, 1200);
  }

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/preview/meetups" className="text-ink-200 text-sm">‹ Meetups</Link>
          <div className="text-white text-[15px] font-semibold">Meetup</div>
          <div className="w-12 text-right text-ink-300 text-sm">⋯</div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Hero strip — colored gradient with emoji */}
        <div
          className={cn(
            "rounded-2xl bg-gradient-to-br p-4 flex items-center gap-4 ring-1 ring-white/[0.06]",
            m.gradient,
          )}
        >
          <div className="h-14 w-14 rounded-2xl bg-black/40 ring-1 ring-white/10 flex items-center justify-center text-3xl">
            {m.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <MeetupCategoryTag category={m.category} />
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{m.title}</h1>
          </div>
        </div>

        <div>
          <div className="text-ink-300 text-sm">
            {d.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            <span className="text-ink-500"> · </span>
            <span className="text-ink-300">{m.duration_min} min</span>
          </div>
          <div className="text-ink-400 text-xs mt-0.5">{m.location}</div>
        </div>

        <MapPreview lat={27.7706} lng={-82.6403} label={m.location} />

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar name={m.host_name} size={40} />
              <div>
                <div className="text-ink-400 text-[11px] uppercase tracking-wider">Hosted by</div>
                <div className="text-white text-[14px] font-semibold">{m.host_name}</div>
              </div>
            </div>
            <p className="text-ink-200 text-sm mt-3 leading-relaxed">{m.notes}</p>
          </CardBody>
        </Card>

        {/* PRIMARY ACTIONS — RSVP + Check-in */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={going ? "outline" : "gold"}
            size="lg"
            fullWidth
            onClick={() => setGoing((g) => !g)}
          >
            {going ? "Cancel RSVP" : "I'm in"}
          </Button>
          {going ? (
            checkedIn ? (
              <Button variant="outline" size="lg" fullWidth disabled>
                Checked in ✓
              </Button>
            ) : (
              <Button
                variant="gold"
                size="lg"
                fullWidth
                loading={checkingIn}
                onClick={handleCheckIn}
              >
                Check In
              </Button>
            )
          ) : (
            <Button variant="outline" size="lg" fullWidth disabled>
              Check In
            </Button>
          )}
        </div>

        {/* Check-in earned card */}
        {checkedIn ? (
          <Card className="ring-1 ring-emerald-500/30">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="text-white text-[15px] font-semibold">
                    You&apos;re here. Nice.
                  </div>
                  <p className="text-ink-300 text-[13px] mt-0.5 leading-relaxed">
                    <span className="text-gold-300 font-semibold">+10 points</span> for showing up.
                    Location and time logged.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : going ? (
          <div className="rounded-xl bg-ink-800/60 hairline px-3 py-2.5 text-[12px] text-ink-300">
            <span className="text-gold-300 font-semibold">+10 points</span> when you check in at the
            meetup. We use your phone&apos;s location to confirm.
          </div>
        ) : null}

        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
              Going · {m.attendees_going}{checkedIn ? " · 1 checked in" : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              {attendees.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 bg-ink-800 hairline rounded-full pr-3 pl-1 py-1"
                >
                  <Avatar name={a.full_name} size={24} />
                  <span className="text-[12px] text-ink-100">{a.full_name.split(" ")[0]}</span>
                </div>
              ))}
              {checkedIn ? (
                <div className="flex items-center gap-2 bg-emerald-500/15 ring-1 ring-emerald-500/30 rounded-full pr-3 pl-1 py-1">
                  <Avatar name="Aaron Pilkington" size={24} />
                  <span className="text-[12px] text-emerald-200 font-semibold">You ✓</span>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
      <PreviewBottomNav />
    </div>
  );
}
