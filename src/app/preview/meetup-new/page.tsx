"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMe } from "@/lib/preview/mock";

export default function PreviewNewMeetup() {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [length, setLength] = useState("1 hour");
  const [where, setWhere] = useState("");
  const [notes, setNotes] = useState("");

  const canPost = title.trim().length > 0;

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/preview/events" className="text-ink-200 text-sm">‹ Events</Link>
          <div className="text-white text-[15px] font-semibold">New Meetup</div>
          <div className="w-16 text-right">
            <Button variant="gold" size="sm" disabled={!canPost}>Post</Button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Explainer */}
        <div className="rounded-xl bg-gold-500/10 ring-1 ring-gold-500/25 px-3 py-2.5 flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-full bg-gold-500/20 ring-1 ring-gold-500/30 flex items-center justify-center text-gold-300 shrink-0 mt-0.5 text-[11px]">
            ⓘ
          </div>
          <div className="text-[12px] text-ink-100 leading-relaxed">
            Posting a meetup drops it on <span className="font-semibold">The Feed</span>{" "}
            so everyone can tap{" "}
            <span className="text-gold-300 font-semibold">I&apos;m in</span> right
            from there.
          </div>
        </div>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <Label>What is it?</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Morning coffee, pickleball, evening walk…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>When</Label>
                <Input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
              <div>
                <Label>Length</Label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="h-11 w-full rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white outline-none focus:ring-2 focus:ring-gold-400/30"
                >
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>1.5 hours</option>
                  <option>2 hours</option>
                  <option>3 hours</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Where</Label>
              <Input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="Café, court, park, address…"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>What to say on the Feed</Label>
                <span className="text-[10.5px] text-ink-400">
                  {notes.length}/240
                </span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 240))}
                rows={3}
                placeholder="What to bring, who you're hoping to see, why you're hosting."
              />
              <p className="text-[10.5px] text-ink-400 mt-1.5">
                This is the post members see on the Feed. Skip it and only the
                title + details show up.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Live preview of the resulting feed post */}
        <div>
          <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300 mb-2 px-1">
            Feed Preview
          </div>
          <FeedPreview
            title={title || "Morning coffee"}
            notes={notes}
            whenIso={when}
            where={where}
            meName={mockMe.full_name}
          />
        </div>
      </div>
      <PreviewBottomNav />
    </div>
  );
}

function FeedPreview({
  title,
  notes,
  whenIso,
  where,
  meName,
}: {
  title: string;
  notes: string;
  whenIso: string;
  where: string;
  meName: string;
}) {
  const whenLabel = whenIso
    ? new Date(whenIso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "When you set it";

  return (
    <div className="rounded-2xl bg-ink-800/80 hairline overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={meName} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-white text-[14px] font-semibold truncate">{meName}</div>
            <span className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] bg-ink-700 text-ink-200 hairline">
              Meetup
            </span>
          </div>
          <div className="text-ink-400 text-[11.5px] truncate">Founder · Skyway Media</div>
        </div>
        <div className="text-[11px] text-ink-400">now</div>
      </div>

      {notes ? (
        <div className="px-4 pt-3 text-[14.5px] text-ink-100 leading-relaxed whitespace-pre-wrap">
          {notes}
        </div>
      ) : null}

      {/* Inline meetup card */}
      <div className="px-4 pt-3">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/[0.06] bg-gradient-to-br from-amber-500/25 via-amber-700/15 to-ink-900 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] tracking-[0.25em] uppercase text-gold-300/90 font-semibold">
              New Meetup
            </span>
            <span className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30">
              Coffee
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-black/40 ring-1 ring-white/10 flex items-center justify-center text-2xl shrink-0">
              ☕
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                {title}
              </div>
              <div className="text-ink-200 text-[12px] mt-0.5">{whenLabel}</div>
              {where ? (
                <div className="text-ink-300 text-[11.5px] truncate">{where}</div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
            <Avatar name={meName} size={20} />
            <div className="text-[11px] text-ink-300 flex-1">
              Hosted by <span className="text-ink-100 font-medium">{meName}</span>
            </div>
            <div className="h-7 px-3 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[11.5px] font-semibold inline-flex items-center">
              I&apos;m in
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 mt-3 border-t border-white/[0.04] text-[12.5px] text-ink-400">
        <span>♡ 0</span>
        <span>💬 0</span>
      </div>
    </div>
  );
}
