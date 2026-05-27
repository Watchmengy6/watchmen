"use client";

import Link from "next/link";
import { useState } from "react";
import { HeroGroupCard } from "@/components/groups/HeroGroupCard";
import { GroupRowCard } from "@/components/groups/GroupRowCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockGroups } from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | "joined";

export default function PreviewGroups() {
  const [filter, setFilter] = useState<Filter>("all");

  // Pick the single most-active joined group as the hero
  const hero = [...mockGroups]
    .filter((g) => g.joined)
    .sort((a, b) => b.active_today - a.active_today)[0];

  const rest = mockGroups.filter((g) => g.id !== hero?.id);

  let filtered = rest;
  if (filter === "joined") filtered = filtered.filter((g) => g.joined);

  const joined = filtered.filter((g) => g.joined);
  const discover = filtered.filter((g) => !g.joined);

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
              Groups
            </div>
          </div>
          <Link
            href="/preview/group-new"
            className="h-9 px-3 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold inline-flex items-center gap-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                 strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* HERO */}
        {hero ? <HeroGroupCard group={hero} /> : null}

        {/* Filter chips */}
        <div className="flex gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          <FilterChip active={filter === "joined"} onClick={() => setFilter("joined")}>
            Joined
          </FilterChip>
        </div>

        {/* Your Groups */}
        {joined.length > 0 ? (
          <Section title="Your groups" count={joined.length}>
            <div className="space-y-2">
              {joined.map((g) => (
                <GroupRowCard key={g.id} group={g} />
              ))}
            </div>
          </Section>
        ) : null}

        {/* Discover */}
        {discover.length > 0 ? (
          <Section title="Discover" count={discover.length}>
            <div className="space-y-2">
              {discover.map((g) => (
                <GroupRowCard key={g.id} group={g} />
              ))}
            </div>
          </Section>
        ) : null}

        {joined.length === 0 && discover.length === 0 ? (
          <EmptyState
            title="No groups match"
            body="Try clearing the filter."
          />
        ) : null}
      </div>
      <PreviewBottomNav />
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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">
          {title}
        </div>
        <div className="text-[10.5px] text-ink-400 tabular-nums">{count}</div>
      </div>
      {children}
    </div>
  );
}
