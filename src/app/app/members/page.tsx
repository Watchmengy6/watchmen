import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { MemberSearch } from "./MemberSearch";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { q?: string; interest?: string };
}) {
  await requireApproved();
  const supabase = supabaseServer();

  // Page size 30 — matches loadMoreMembersAction so the client-side
  // "Load more" path stays in sync. Request one extra to detect hasMore.
  const PAGE_SIZE = 30;
  let query = supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url, occupation, company, points_total, interests")
    .eq("status", "approved")
    .order("points_total", { ascending: false })
    .range(0, PAGE_SIZE); // 0..PAGE_SIZE = 31 rows

  if (searchParams.q) {
    const safe = searchParams.q
      .replace(/[,()]/g, " ")
      .replace(/[%_]/g, (c) => `\\${c}`)
      .trim();
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,occupation.ilike.%${safe}%,company.ilike.%${safe}%,username.ilike.%${safe}%`,
      );
    }
  }
  if (searchParams.interest) {
    query = query.contains("interests", [searchParams.interest]);
  }

  const { data } = await query;
  const rawMembers = data ?? [];
  const hasMore = rawMembers.length > PAGE_SIZE;
  const members = hasMore ? rawMembers.slice(0, PAGE_SIZE) : rawMembers;

  return (
    <div className="pt-8">
      <div className="px-5 mb-4">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">Members</div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">The Room</h1>
      </div>
      <MemberSearch
        initialQ={searchParams.q ?? ""}
        initialInterest={searchParams.interest ?? ""}
        members={members}
        initialHasMore={hasMore}
      />
    </div>
  );
}
