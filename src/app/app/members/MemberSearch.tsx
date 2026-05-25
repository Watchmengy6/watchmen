"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { MemberCard } from "@/components/members/MemberCard";
import { EmptyState } from "@/components/ui/EmptyState";

const INTERESTS = [
  "Real estate","Business","Investing","Tech","Fitness","Cars","Watches",
  "Church","Networking","Entrepreneurship","Golf","Boating",
];

export function MemberSearch({
  initialQ,
  initialInterest,
  members,
}: {
  initialQ: string;
  initialInterest: string;
  members: any[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [interest, setInterest] = useState(initialInterest);
  const [, startTransition] = useTransition();

  function update(next: { q?: string; interest?: string }) {
    const params = new URLSearchParams();
    const newQ = next.q !== undefined ? next.q : q;
    const newInt = next.interest !== undefined ? next.interest : interest;
    if (newQ) params.set("q", newQ);
    if (newInt) params.set("interest", newInt);
    startTransition(() => router.push(`/app/members${params.size ? `?${params}` : ""}`));
  }

  return (
    <div className="px-5">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
        }}
        onBlur={() => update({ q })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
            update({ q });
          }
        }}
        placeholder="Search name, role, company"
      />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
        <button
          onClick={() => {
            setInterest("");
            update({ interest: "" });
          }}
          className={`shrink-0 h-8 px-3 rounded-full text-[12px] ${
            interest === "" ? "bg-white text-black" : "bg-ink-800 text-ink-200 hairline"
          }`}
        >
          All
        </button>
        {INTERESTS.map((i) => (
          <button
            key={i}
            onClick={() => {
              const next = interest === i ? "" : i;
              setInterest(next);
              update({ interest: next });
            }}
            className={`shrink-0 h-8 px-3 rounded-full text-[12px] ${
              interest === i ? "bg-gold-500/20 text-gold-100 ring-1 ring-gold-500/40" : "bg-ink-800 text-ink-200 hairline"
            }`}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {members.length === 0 ? (
          <EmptyState title="No members match" body="Try clearing filters." />
        ) : (
          members.map((m) => <MemberCard key={m.id} {...m} />)
        )}
      </div>
    </div>
  );
}
