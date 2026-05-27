"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMembers } from "@/lib/preview/mock";
import { cn } from "@/lib/utils/cn";

export default function PreviewMembers() {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const recent = useMemo(() => mockMembers.slice(0, 4), []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return mockMembers
      .filter((m) =>
        [m.full_name, m.occupation, m.company]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(term)),
      )
      .sort((a, b) => b.points_total - a.points_total);
  }, [q]);

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Link
            href="/preview/home"
            className="h-9 w-9 rounded-full flex items-center justify-center text-ink-200 text-lg"
            aria-label="Back"
          >
            ‹
          </Link>
          <div className="flex-1 min-w-0">
            <div className="h-10 rounded-full bg-ink-800 hairline px-3.5 flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-4 w-4 text-ink-400 shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search brothers — name, role, company"
                className="flex-1 bg-transparent text-[14px] text-white placeholder:text-ink-400 outline-none"
              />
              {q ? (
                <button
                  onClick={() => setQ("")}
                  className="h-5 w-5 rounded-full bg-ink-700 text-ink-200 text-[11px] shrink-0"
                  aria-label="Clear"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Recent peeps when not searching */}
      {!q ? (
        <div className="pt-3">
          <SectionLabel>Recent</SectionLabel>
          <div className="flex gap-3 px-4 pt-1 overflow-x-auto pb-2">
            {recent.map((m) => (
              <Link
                key={m.id}
                href="/preview/member"
                className="flex flex-col items-center gap-1.5 shrink-0 w-[64px]"
              >
                <Avatar src={m.profile_photo_url} name={m.full_name} size={56} ring />
                <div className="text-[11px] text-ink-200 text-center truncate w-full">
                  {m.full_name.split(" ")[0]}
                </div>
              </Link>
            ))}
          </div>

          <SectionLabel>All members · {mockMembers.length}</SectionLabel>
          <div>
            {mockMembers.map((m, i) => (
              <MemberRow key={m.id} member={m} isLast={i === mockMembers.length - 1} />
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-3">
          {results.length > 0 ? (
            <>
              <SectionLabel>
                {results.length} {results.length === 1 ? "result" : "results"}
              </SectionLabel>
              <div>
                {results.map((m, i) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    isLast={i === results.length - 1}
                    highlight={q}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-ink-300 text-sm">
                No brothers match <span className="text-white">&ldquo;{q}&rdquo;</span>.
              </p>
            </div>
          )}
        </div>
      )}

      <PreviewBottomNav />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-3 pb-2 text-[10.5px] tracking-[0.25em] uppercase text-ink-300">
      {children}
    </div>
  );
}

function MemberRow({
  member,
  isLast,
  highlight,
}: {
  member: (typeof mockMembers)[number];
  isLast: boolean;
  highlight?: string;
}) {
  return (
    <Link
      href="/preview/member"
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 active:bg-white/[0.04] transition-colors",
        !isLast ? "border-b border-white/[0.04]" : "",
      )}
    >
      <Avatar src={member.profile_photo_url} name={member.full_name} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-white text-[14px] font-semibold truncate">
            {member.full_name}
          </div>
          <Badge variant="gold" className="shrink-0">
            {member.points_total}
          </Badge>
        </div>
        <div className="text-ink-300 text-[12px] truncate mt-0.5">
          {member.occupation} · {member.company}
        </div>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-ink-500 shrink-0"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
