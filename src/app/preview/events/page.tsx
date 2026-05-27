"use client";

import Link from "next/link";
import { useState } from "react";
import { HeroEventCard } from "@/components/events/HeroEventCard";
import { EventRowCard } from "@/components/events/EventRowCard";
import { HeroMeetupCard } from "@/components/meetups/HeroMeetupCard";
import { MeetupRowCard } from "@/components/meetups/MeetupRowCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PreviewBottomNav } from "../PreviewBottomNav";
import {
  mockEvents,
  mockPastEvent,
  mockMembers,
  mockSponsoredEvents,
  mockMeetups,
  mockMe,
} from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

type Source = "watchmen" | "gettogethers" | "sponsored";
type Filter = "all" | "going";

const attendeePreview = mockMembers.slice(0, 4).map((m) => ({
  name: m.full_name,
  photo: m.profile_photo_url,
}));

function bucket(dateStr: string): "thisweek" | "soon" | "later" {
  const d = new Date(`${dateStr}T00:00:00`).getTime();
  const now = Date.now();
  const week = 1000 * 60 * 60 * 24 * 7;
  if (d - now <= week) return "thisweek";
  if (d - now <= week * 6) return "soon";
  return "later";
}

function bucketIso(iso: string): "thisweek" | "soon" | "later" {
  return bucket(iso.slice(0, 10));
}

export default function PreviewEvents() {
  const [source, setSource] = useState<Source>("watchmen");
  const [filter, setFilter] = useState<Filter>("all");
  const [showPast, setShowPast] = useState(false);
  const [creatorMenuOpen, setCreatorMenuOpen] = useState(false);

  const isAdmin = mockMe.role === "super_admin" || mockMe.role === "admin";

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Brotherhood
            </div>
            <div className="text-white text-[18px] font-semibold leading-tight">
              Events
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setCreatorMenuOpen((o) => !o)}
              className="h-9 px-3 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold inline-flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                   strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </button>
            {creatorMenuOpen ? (
              <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl bg-ink-800 ring-1 ring-white/10 shadow-card overflow-hidden">
                <Link
                  href="/preview/meetup-new"
                  onClick={() => setCreatorMenuOpen(false)}
                  className="block px-4 py-3 hover:bg-white/[0.04]"
                >
                  <div className="text-white text-[13.5px] font-semibold">
                    Host a Meetup
                  </div>
                  <div className="text-ink-300 text-[11.5px] mt-0.5">
                    Lightweight. Any brother can host.
                  </div>
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin/events"
                    onClick={() => setCreatorMenuOpen(false)}
                    className="block px-4 py-3 hover:bg-white/[0.04] border-t border-white/[0.05]"
                  >
                    <div className="text-white text-[13.5px] font-semibold">
                      Create Watchman Event
                    </div>
                    <div className="text-ink-300 text-[11.5px] mt-0.5">
                      Admin only · capacity, registration, calendar invite
                    </div>
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* 3-way toggle */}
        <div className="px-4 pb-2.5">
          <div className="rounded-full bg-ink-800 p-1 grid grid-cols-3 gap-1">
            <SegBtn active={source === "watchmen"} onClick={() => setSource("watchmen")}>
              Watchmen
            </SegBtn>
            <SegBtn active={source === "gettogethers"} onClick={() => setSource("gettogethers")}>
              Meetups
            </SegBtn>
            <SegBtn active={source === "sponsored"} onClick={() => setSource("sponsored")}>
              Sponsored
            </SegBtn>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {source === "watchmen" ? (
          <WatchmenView filter={filter} setFilter={setFilter} showPast={showPast} setShowPast={setShowPast} />
        ) : null}
        {source === "gettogethers" ? (
          <GetTogethersView filter={filter} setFilter={setFilter} />
        ) : null}
        {source === "sponsored" ? (
          <SponsoredView filter={filter} setFilter={setFilter} />
        ) : null}
      </div>
      <PreviewBottomNav />
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-full text-[12px] font-semibold transition-all",
        active ? "bg-ink-600 text-white shadow-sm" : "text-ink-300",
      )}
    >
      {children}
    </button>
  );
}

function FilterRow({
  filter,
  setFilter,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  return (
    <div className="flex gap-2">
      <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
        All
      </FilterChip>
      <FilterChip active={filter === "going"} onClick={() => setFilter("going")}>
        Going
      </FilterChip>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 h-8 px-3.5 rounded-full text-[12px] transition-colors",
        active
          ? "bg-white text-black font-semibold"
          : "bg-ink-800 text-ink-200 hairline",
      )}
    >
      {children}
    </button>
  );
}

// ====== Watchmen view ======
function WatchmenView({
  filter,
  setFilter,
  showPast,
  setShowPast,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  showPast: boolean;
  setShowPast: (v: boolean) => void;
}) {
  const sorted = [...mockEvents].sort((a, b) =>
    a.event_date.localeCompare(b.event_date),
  );
  const hero = sorted[0];
  const rest = sorted.slice(1);

  let filtered = rest;
  if (filter === "going") filtered = filtered.filter((e) => e.user_going);

  const thisWeek = filtered.filter((e) => bucket(e.event_date) === "thisweek");
  const soon = filtered.filter((e) => bucket(e.event_date) === "soon");
  const later = filtered.filter((e) => bucket(e.event_date) === "later");

  return (
    <>
      {hero ? (
        <HeroEventCard
          id={hero.id}
          title={hero.title}
          event_date={hero.event_date}
          start_time={hero.start_time}
          location_name={hero.location_name}
          image_url={hero.image_url}
          rsvp_count={hero.rsvp_count}
          capacity={hero.capacity}
          user_going={hero.user_going}
          category={hero.category}
          attendees={attendeePreview}
        />
      ) : null}
      <FilterRow filter={filter} setFilter={setFilter} />
      {thisWeek.length > 0 ? <EventSection title="This week" items={thisWeek} /> : null}
      {soon.length > 0 ? <EventSection title="Coming up" items={soon} /> : null}
      {later.length > 0 ? <EventSection title="Save the date" items={later} /> : null}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          body={filter === "going" ? "You haven't RSVP'd to other Watchman events." : "Check back soon."}
        />
      ) : null}
      <div>
        <button
          onClick={() => setShowPast(!showPast)}
          className="w-full flex items-center justify-between py-3 text-ink-300 hover:text-white"
        >
          <span className="text-[10.5px] tracking-[0.25em] uppercase">Past events</span>
          <span className="text-sm">{showPast ? "Hide" : "View"} →</span>
        </button>
        {showPast ? (
          <div className="space-y-2">
            <EventRowCard
              id={mockPastEvent.id}
              title={mockPastEvent.title}
              event_date={mockPastEvent.event_date}
              start_time={mockPastEvent.start_time}
              location_name={mockPastEvent.location_name}
              image_url={mockPastEvent.image_url}
              rsvp_count={mockPastEvent.rsvp_count}
              capacity={28}
              user_going={false}
              category="Mixer"
              attendees={attendeePreview}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

function EventSection({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">{title}</div>
        <div className="text-[10.5px] text-ink-400 tabular-nums">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.map((e) => (
          <EventRowCard
            key={e.id}
            id={e.id}
            title={e.title}
            event_date={e.event_date}
            start_time={e.start_time}
            location_name={e.location_name}
            image_url={e.image_url}
            rsvp_count={e.rsvp_count}
            capacity={e.capacity}
            user_going={e.user_going}
            category={e.category}
            attendees={attendeePreview}
          />
        ))}
      </div>
    </div>
  );
}

// ====== Meetups view (was Meetups) ======
function GetTogethersView({
  filter,
  setFilter,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const sorted = [...mockMeetups].sort((a, b) => a.when_iso.localeCompare(b.when_iso));
  const hero = sorted[0];
  const rest = sorted.slice(1);

  let filtered = rest;
  if (filter === "going") filtered = filtered.filter((m) => m.user_going);

  const today = filtered.filter((m) => bucketIso(m.when_iso) === "thisweek" && new Date(m.when_iso).toDateString() === new Date().toDateString());
  const thisWeek = filtered.filter((m) => bucketIso(m.when_iso) === "thisweek" && new Date(m.when_iso).toDateString() !== new Date().toDateString());
  const later = filtered.filter((m) => bucketIso(m.when_iso) !== "thisweek");

  return (
    <>
      <div className="rounded-xl bg-ink-800/60 hairline px-3 py-2.5 text-[12px] text-ink-300">
        <span className="text-white font-semibold">Meetups</span> are
        casual. Any brother can host one in five seconds — coffee, a workout, drinks, a walk.
      </div>
      {hero ? <HeroMeetupCard meetup={hero} /> : null}
      <FilterRow filter={filter} setFilter={setFilter} />
      {today.length > 0 ? <MeetupSection title="Today" items={today} /> : null}
      {thisWeek.length > 0 ? <MeetupSection title="This week" items={thisWeek} /> : null}
      {later.length > 0 ? <MeetupSection title="Upcoming" items={later} /> : null}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          body={filter === "going" ? "You haven't said you're in to anything else." : "Be the first to host one."}
          action={
            <Link
              href="/preview/meetup-new"
              className="inline-flex h-9 px-4 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold items-center"
            >
              Host a Meetup
            </Link>
          }
        />
      ) : null}
    </>
  );
}

function MeetupSection({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">{title}</div>
        <div className="text-[10.5px] text-ink-400 tabular-nums">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.map((m) => (
          <MeetupRowCard key={m.id} meetup={m} />
        ))}
      </div>
    </div>
  );
}

// ====== Sponsored view ======
function SponsoredView({
  filter,
  setFilter,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const sorted = [...mockSponsoredEvents].sort((a, b) =>
    a.event_date.localeCompare(b.event_date),
  );
  const hero = sorted[0];
  const rest = sorted.slice(1);

  let filtered = rest;
  if (filter === "going") filtered = filtered.filter((e) => e.user_going);

  const thisWeek = filtered.filter((e) => bucket(e.event_date) === "thisweek");
  const soon = filtered.filter((e) => bucket(e.event_date) === "soon");
  const later = filtered.filter((e) => bucket(e.event_date) === "later");

  return (
    <>
      <div className="rounded-xl bg-ink-800/60 hairline px-3 py-2.5 text-[12px] text-ink-300">
        <span className="text-white font-semibold">Sponsored events</span> are paid
        placements from partner businesses around Tampa Bay. RSVPs still earn you
        check-in points.
      </div>
      {hero ? (
        <div className="relative">
          <HeroEventCard
            id={hero.id}
            title={hero.title}
            event_date={hero.event_date}
            start_time={hero.start_time}
            location_name={hero.location_name}
            image_url={hero.image_url}
            rsvp_count={hero.rsvp_count}
            capacity={hero.capacity}
            user_going={hero.user_going}
            category={hero.category}
            attendees={attendeePreview}
          />
          <div className="absolute top-3 right-3 z-10 px-2 h-6 rounded-full bg-black/55 backdrop-blur text-[10px] tracking-wider uppercase text-gold-300 font-semibold inline-flex items-center">
            Sponsored · {hero.sponsor_name}
          </div>
        </div>
      ) : null}
      <FilterRow filter={filter} setFilter={setFilter} />
      {thisWeek.length > 0 ? <SponsoredSection title="This week" items={thisWeek} /> : null}
      {soon.length > 0 ? <SponsoredSection title="Coming up" items={soon} /> : null}
      {later.length > 0 ? <SponsoredSection title="Save the date" items={later} /> : null}
      {filtered.length === 0 ? (
        <EmptyState title="Nothing matches" body="No sponsored events match." />
      ) : null}
    </>
  );
}

function SponsoredSection({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">{title}</div>
        <div className="text-[10.5px] text-ink-400 tabular-nums">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.map((e) => (
          <div key={e.id} className="relative">
            <EventRowCard
              id={e.id}
              title={e.title}
              event_date={e.event_date}
              start_time={e.start_time}
              location_name={e.location_name}
              image_url={e.image_url}
              rsvp_count={e.rsvp_count}
              capacity={e.capacity}
              user_going={e.user_going}
              category={e.category}
              attendees={attendeePreview}
            />
            <div className="absolute top-2 right-2 z-10 px-2 h-5 rounded-full bg-black/55 backdrop-blur text-[9.5px] tracking-wider uppercase text-gold-300 font-semibold inline-flex items-center">
              Sponsored · {e.sponsor_name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
