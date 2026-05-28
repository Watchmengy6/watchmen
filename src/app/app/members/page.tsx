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

  let query = supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url, occupation, company, points_total, interests")
    .eq("status", "approved")
    .order("points_total", { ascending: false });

  if (searchParams.q) {
    // PostgREST's .or() takes a comma-separated filter string, and commas /
    // parens inside the user's query would corrupt that grammar. Strip the
    // dangerous chars and also escape % / _ so users can't inject wildcards.
    const safe = searchParams.q
      .replace(/[,()]/g, " ")
      .replace(/[%_]/g, (c) => `\\${c}`)
      .trim();
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,occupation.ilike.%${safe}%,company.ilike.%${safe}%`,
      );
    }
  }
  if (searchParams.interest) {
    query = query.contains("interests", [searchParams.interest]);
  }

  const { data: members } = await query.limit(100);

  return (
    <div className="pt-8">
      <div className="px-5 mb-4">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">Members</div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">The Room</h1>
      </div>
      <MemberSearch
        initialQ={searchParams.q ?? ""}
        initialInterest={searchParams.interest ?? ""}
        members={members ?? []}
      />
    </div>
  );
}
