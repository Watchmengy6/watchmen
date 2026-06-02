import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Per Dustin: Groups, Meet-ups, Hobbies are three flavors of community
// sub-units. Each is color-coded so brothers can scan the grid quickly.
type Kind = "group" | "meetup" | "hobby";
type Tab = "all" | Kind | "joined";

const KIND_STYLES: Record<Kind, { ring: string; pillBg: string; pillText: string; tintGrad: string }> = {
  group: {
    ring: "ring-gold-500/40",
    pillBg: "bg-gold-500/15",
    pillText: "text-gold-200",
    tintGrad: "from-gold-500/25 via-gold-700/10",
  },
  meetup: {
    ring: "ring-emerald-500/40",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-200",
    tintGrad: "from-emerald-500/25 via-emerald-800/10",
  },
  hobby: {
    ring: "ring-violet-500/40",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-200",
    tintGrad: "from-violet-500/25 via-violet-800/10",
  },
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const tabRaw = searchParams?.tab ?? "all";
  const tab: Tab = (
    ["all", "group", "meetup", "hobby", "joined"] as const
  ).includes(tabRaw as Tab)
    ? (tabRaw as Tab)
    : "all";

  const [{ data: allGroups }, { data: myMemberships }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, description, category, kind, cover_url, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("group_members").select("group_id").eq("user_id", profile.id),
  ]);
  const myGroupIds = new Set((myMemberships ?? []).map((r: any) => r.group_id));

  const list = (allGroups ?? []).filter((g: any) => {
    if (tab === "all") return true;
    if (tab === "joined") return myGroupIds.has(g.id);
    return g.kind === tab;
  });

  // Member counts via the grouped RPC added in migration 00025.
  const counts = new Map<string, number>();
  const ids = (allGroups ?? []).map((g: any) => g.id);
  if (ids.length > 0) {
    const { data: countRows } = await supabase.rpc("group_member_counts", {
      p_group_ids: ids,
    });
    (countRows ?? []).forEach((r: any) => {
      counts.set(r.group_id, Number(r.member_count));
    });
  }

  // Tab counts (per kind).
  const kindCounts: Record<Kind, number> = { group: 0, meetup: 0, hobby: 0 };
  (allGroups ?? []).forEach((g: any) => {
    const k = (g.kind ?? "group") as Kind;
    if (kindCounts[k] !== undefined) kindCounts[k] += 1;
  });
  const joinedCount = myGroupIds.size;

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Brotherhood
            </div>
            <div className="text-white text-[22px] font-semibold leading-tight">
              Groups
            </div>
          </div>
          <Link
            href="/app/groups/new"
            className="h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        </div>
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
          <FilterPill href="/app/groups?tab=all" label="All" count={(allGroups ?? []).length} active={tab === "all"} />
          <FilterPill href="/app/groups?tab=group" label="Groups" count={kindCounts.group} active={tab === "group"} accent="gold" />
          <FilterPill href="/app/groups?tab=meetup" label="Meet-ups" count={kindCounts.meetup} active={tab === "meetup"} accent="emerald" />
          <FilterPill href="/app/groups?tab=hobby" label="Hobbies" count={kindCounts.hobby} active={tab === "hobby"} accent="violet" />
          <FilterPill href="/app/groups?tab=joined" label="Joined" count={joinedCount} active={tab === "joined"} />
        </div>
      </div>

      <div className="px-4 pt-3">
        {list.length === 0 ? (
          <div className="text-center text-ink-300 text-sm py-10">
            {tab === "joined"
              ? "You haven't joined any groups yet."
              : "Nothing here yet."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((g: any) => {
              const kind = (g.kind ?? "group") as Kind;
              const style = KIND_STYLES[kind];
              return (
                <Link
                  key={g.id}
                  href={`/app/groups/${g.id}`}
                  className={`block rounded-2xl bg-ink-800/80 ring-1 ${style.ring} overflow-hidden active:bg-ink-800 shadow-card`}
                >
                  {g.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.cover_url}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className={`w-full aspect-square bg-gradient-to-br ${style.tintGrad} to-ink-900 flex items-center justify-center`}>
                      <span className="text-white text-3xl font-semibold">
                        {g.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className={`text-[9px] tracking-[0.18em] uppercase ${style.pillText} ${style.pillBg} px-1.5 py-0.5 rounded-full`}
                      >
                        {labelForKind(kind)}
                      </span>
                      {myGroupIds.has(g.id) ? (
                        <span className="text-[9px] px-1.5 h-4 rounded-full bg-emerald-500/15 text-emerald-300 inline-flex items-center shrink-0">
                          Joined
                        </span>
                      ) : null}
                    </div>
                    <div className="text-white text-[14px] font-semibold leading-tight truncate">
                      {g.name}
                    </div>
                    <div className="text-ink-400 text-[11px] mt-1">
                      {counts.get(g.id) ?? 0} member{(counts.get(g.id) ?? 0) === 1 ? "" : "s"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function labelForKind(k: Kind): string {
  if (k === "group") return "Group";
  if (k === "meetup") return "Meet-up";
  return "Hobby";
}

function FilterPill({
  href,
  label,
  count,
  active,
  accent,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  accent?: "gold" | "emerald" | "violet";
}) {
  const accentRing =
    accent === "gold"
      ? "ring-gold-500/40"
      : accent === "emerald"
        ? "ring-emerald-500/40"
        : accent === "violet"
          ? "ring-violet-500/40"
          : "ring-white/[0.06]";
  return (
    <Link
      href={href}
      className={
        active
          ? `shrink-0 h-8 px-3 rounded-full bg-white text-black font-semibold text-[12.5px] inline-flex items-center gap-1.5 ring-1 ${accentRing}`
          : `shrink-0 h-8 px-3 rounded-full bg-ink-800 hairline text-ink-200 text-[12.5px] inline-flex items-center gap-1.5 ring-1 ${accentRing}`
      }
    >
      {label}
      {count > 0 ? (
        <span
          className={
            active
              ? "h-4 min-w-4 px-1 rounded-full bg-black/15 text-black text-[10px] font-bold inline-flex items-center justify-center"
              : "h-4 min-w-4 px-1 rounded-full bg-ink-700 text-ink-100 text-[10px] font-bold inline-flex items-center justify-center"
          }
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
