"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { MemberCard } from "@/components/members/MemberCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { INTERESTS } from "@/lib/profile/interests";
import { loadMoreMembersAction } from "@/lib/members/actions";

export function MemberSearch({
  initialQ,
  initialInterest,
  members,
  initialHasMore = false,
}: {
  initialQ: string;
  initialInterest: string;
  members: any[];
  initialHasMore?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [interest, setInterest] = useState(initialInterest);
  const [, startTransition] = useTransition();
  // Pagination: server renders page 0, client appends from there.
  const [list, setList] = useState<any[]>(members);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset pagination state any time the server-rendered first page
  // changes (e.g. filter applied via URL).
  useEffect(() => {
    setList(members);
    setPage(0);
    setHasMore(initialHasMore);
  }, [members, initialHasMore]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const r = await loadMoreMembersAction({
      page: nextPage,
      q: initialQ || undefined,
      interest: initialInterest || undefined,
    });
    setList((prev) => [...prev, ...r.members]);
    setPage(nextPage);
    setHasMore(r.hasMore);
    setLoadingMore(false);
  }

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
        {list.length === 0 ? (
          <EmptyState title="No members match" body="Try clearing filters." />
        ) : (
          list.map((m) => <MemberCard key={m.id} {...m} />)
        )}
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full h-11 rounded-full bg-ink-800 hairline text-ink-100 text-[13.5px] font-semibold disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
