"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { MapPreview } from "@/components/events/MapPreview";
import { CategoryTag } from "@/components/events/CategoryTag";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMembers, mockUpcomingEvent } from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

type Step = "register" | "registered" | "checkedIn";

export default function PreviewEvent() {
  const e = mockUpcomingEvent;
  const attendees = mockMembers.slice(0, 6);
  // Start in "registered" because mock user_going = true
  const [step, setStep] = useState<Step>("registered");
  const [showForm, setShowForm] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const spotsLeft = e.capacity - e.rsvp_count;

  function handleCheckIn() {
    setCheckingIn(true);
    setTimeout(() => {
      setCheckingIn(false);
      setStep("checkedIn");
    }, 1200);
  }

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div className="pt-2 pb-2">
        <div className="relative h-52 overflow-hidden">
          {e.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
          <Link
            href="/preview/events"
            className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
          >
            ‹
          </Link>
          <div className="absolute bottom-3 left-4 right-4">
            <CategoryTag category={e.category} size="md" />
          </div>
        </div>

        <div className="px-5 mt-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="muted">{fmtEventDate(e.event_date)}</Badge>
              <Badge variant={spotsLeft <= 5 ? "gold" : "muted"}>
                {spotsLeft <= 0
                  ? "Waitlist"
                  : `${e.rsvp_count}/${e.capacity} · ${spotsLeft} spots left`}
              </Badge>
              {step === "registered" ? (
                <Badge variant="success">You&apos;re registered</Badge>
              ) : step === "checkedIn" ? (
                <Badge variant="success">Checked in ✓</Badge>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{e.title}</h1>
            <div className="mt-1 text-ink-300 text-sm">
              {fmtTime(e.start_time)} – {fmtTime(e.end_time)} · {e.location_name}
            </div>
            <div className="text-ink-400 text-xs mt-0.5">{e.address}</div>
          </div>

          <MapPreview lat={e.latitude} lng={e.longitude} label={e.location_name} />

          <Card>
            <CardBody>
              <p className="text-ink-200 text-sm whitespace-pre-wrap leading-relaxed">
                {e.description}
              </p>
            </CardBody>
          </Card>

          {/* PRIMARY CTAs — depends on state */}
          {step === "register" ? (
            <div className="space-y-2">
              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={() => setShowForm(true)}
                disabled={spotsLeft <= 0}
              >
                {spotsLeft <= 0 ? "Join Waitlist" : "Register"}
              </Button>
              <Link href="/preview/event-chat">
                <Button variant="outline" fullWidth size="lg">
                  View Event Room →
                </Button>
              </Link>
            </div>
          ) : null}

          {step === "registered" || step === "checkedIn" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => setStep("register")}
                >
                  Cancel RSVP
                </Button>
                {step === "checkedIn" ? (
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
                )}
              </div>
              <Link href="/preview/event-chat">
                <Button variant="outline" fullWidth size="lg">
                  View Event Room →
                </Button>
              </Link>
            </div>
          ) : null}

          {/* Check-in earned card */}
          {step === "checkedIn" ? (
            <Card className="ring-1 ring-emerald-500/30">
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-[15px] font-semibold">
                      You&apos;re here. Showing up matters.
                    </div>
                    <p className="text-ink-300 text-[13px] mt-0.5 leading-relaxed">
                      <span className="text-gold-300 font-semibold">+25 points</span> for
                      checking in. Location and time logged.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : step === "registered" ? (
            <div className="rounded-xl bg-ink-800/60 hairline px-3 py-2.5 text-[12px] text-ink-300">
              <span className="text-gold-300 font-semibold">+25 points</span> when you check in at
              the event. Calendar invite was sent to{" "}
              <span className="text-ink-100">aaron@skyway.media</span>.
            </div>
          ) : null}

          {/* Registration form sheet */}
          {showForm && step === "register" ? (
            <Card className="ring-1 ring-gold-500/30">
              <CardBody className="space-y-3">
                <div>
                  <div className="text-[10.5px] tracking-[0.25em] uppercase text-gold-300/80">
                    Registration
                  </div>
                  <h3 className="text-white text-lg font-semibold mt-1">Lock your spot</h3>
                  <p className="text-ink-300 text-[13px] mt-0.5">
                    You&apos;ll get a calendar invite and a reminder the day of.
                  </p>
                </div>
                <div>
                  <Label>Any dietary restrictions?</Label>
                  <Input placeholder="None / Vegetarian / Gluten-free…" />
                </div>
                <div>
                  <Label>Bringing a guest?</Label>
                  <select className="h-11 w-full rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white outline-none focus:ring-2 focus:ring-gold-400/30">
                    <option>Just me</option>
                    <option>+1 brother (must already be a member)</option>
                  </select>
                </div>
                <div>
                  <Label>Anything Dustin should know?</Label>
                  <Textarea rows={2} placeholder="Optional. Allergies, accessibility, etc." />
                </div>
                <div className="flex items-center gap-2 text-[12.5px] text-ink-300">
                  <input type="checkbox" defaultChecked className="accent-gold-400" />
                  <span>Send me a calendar invite for this event</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setShowForm(false)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => {
                      setShowForm(false);
                      setStep("registered");
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
                  Going · {e.rsvp_count}{step === "checkedIn" ? " · 11 checked in" : " · 10 checked in"}
                </div>
                <div
                  className={cn(
                    "text-[11px] font-semibold",
                    spotsLeft <= 5 ? "text-gold-300" : "text-ink-300",
                  )}
                >
                  {spotsLeft <= 0 ? "Full" : `${spotsLeft} spots left`}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {attendees.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 bg-ink-800 hairline rounded-full pr-3 pl-1 py-1"
                  >
                    <Avatar name={a.full_name} size={24} />
                    <span className="text-[12px] text-ink-100">
                      {a.full_name.split(" ")[0]}
                    </span>
                    {a.id === "p_dustin" || a.id === "p_jose" ? (
                      <span className="text-[10px] text-emerald-300">✓</span>
                    ) : null}
                  </div>
                ))}
                {step === "checkedIn" ? (
                  <div className="flex items-center gap-2 bg-emerald-500/15 ring-1 ring-emerald-500/30 rounded-full pr-3 pl-1 py-1">
                    <Avatar name="Aaron Pilkington" size={24} />
                    <span className="text-[12px] text-emerald-200 font-semibold">You ✓</span>
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
      <PreviewBottomNav />
    </div>
  );
}
