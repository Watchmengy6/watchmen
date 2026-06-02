import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const tab = (searchParams?.tab ?? "all") as "all" | "joined";

  // All groups + the ones I'm a member of.
  const [{ data: allGroups }, { data: myMemberships }] = await Promise.all([
    supabase.from("groups").select("id, name, description, category, cover_url, created_at").order("created_at", { ascending: false }),
    supabase.from("group_members").select("group_id").eq("user_id", profile.id),
  ]);
  const myGroupIds = new Set((myMemberships ?? []).map((r: any) => r.group_id));
  const list = (allGroups ?? []).filter((g: any) => (tab === "joined" ? myGroupIds.has(g.id) : true));

  // Member counts via grouped RPC — was fetching every row and
  // counting in JS, which scaled with total memberships. The function
  // does a single group-by on the database.
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
        <div className="px-4 pb-2 flex gap-2">
          <Link
            href="/app/groups?tab=all"
            className={
              tab === "all"
                ? "h-8 px-4 rounded-full bg-white text-black font-semibold text-[12.5px] inline-flex items-center"
                : "h-8 px-4 rounded-full bg-ink-800 hairline text-ink-200 text-[12.5px] inline-flex items-center"
            }
          >
            All
          </Link>
          <Link
            href="/app/groups?tab=joined"
            className={
              tab === "joined"
                ? "h-8 px-4 rounded-full bg-white text-black font-semibold text-[12.5px] inline-flex items-center"
                : "h-8 px-4 rounded-full bg-ink-800 hairline text-ink-200 text-[12.5px] inline-flex items-center"
            }
          >
            Joined
          </Link>
        </div>
      </div>

      <div className="px-4 pt-3">
        {list.length === 0 ? (
          <div className="text-center text-ink-300 text-sm py-10">
            {tab === "joined"
              ? "You haven't joined any groups yet."
              : "No groups yet — be the first to create one."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((g: any) => (
              <Link
                key={g.id}
                href={`/app/groups/${g.id}`}
                className="block rounded-2xl bg-ink-800/80 hairline overflow-hidden active:bg-ink-800 shadow-card"
              >
                {/* Cover (square-ish hero) */}
                {g.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.cover_url}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-gold-500/25 via-gold-700/10 to-ink-900 ring-1 ring-gold-500/30 flex items-center justify-center">
                    <span className="text-gradient-gold text-3xl font-semibold">
                      {g.name[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="text-[9.5px] tracking-[0.2em] uppercase text-gold-300/80 truncate">
                      {g.category}
                    </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
