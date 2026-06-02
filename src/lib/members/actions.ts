"use server";

import { supabaseServer } from "@/lib/supabase/server";

export interface MemberRow {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  occupation: string | null;
  company: string | null;
  points_total: number;
  interests: string[] | null;
}

/**
 * Load a page of members for the directory's infinite-scroll path.
 * Mirrors the server-rendered first-page query so filtering stays
 * consistent. Page size = 30.
 */
export async function loadMoreMembersAction(input: {
  page: number;
  q?: string;
  interest?: string;
}): Promise<{ members: MemberRow[]; hasMore: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [], hasMore: false };
  const { data: me } = await supabase
    .from("profiles")
    .select("status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { members: [], hasMore: false };

  const PAGE_SIZE = 30;
  const from = input.page * PAGE_SIZE;
  const to = from + PAGE_SIZE; // request one extra to detect hasMore

  let query = supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url, occupation, company, points_total, interests")
    .eq("status", "approved")
    .order("points_total", { ascending: false })
    .range(from, to);

  if (input.q) {
    const safe = input.q
      .replace(/[,()]/g, " ")
      .replace(/[%_]/g, (c) => `\\${c}`)
      .trim();
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,occupation.ilike.%${safe}%,company.ilike.%${safe}%`,
      );
    }
  }
  if (input.interest) {
    query = query.contains("interests", [input.interest]);
  }

  const { data } = await query;
  const rows = (data ?? []) as MemberRow[];
  const hasMore = rows.length > PAGE_SIZE;
  return {
    members: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    hasMore,
  };
}
