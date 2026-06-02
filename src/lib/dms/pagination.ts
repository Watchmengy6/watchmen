"use server";

import { supabaseServer } from "@/lib/supabase/server";

export interface OlderMessage {
  id: string;
  body: string;
  media_url: string | null;
  media_type: "none" | "image" | "video";
  created_at: string;
  author_id: string;
  author_name: string;
  author_photo: string | null;
}

/**
 * Page older thread_messages backward from `beforeCreatedAt`. Used by
 * the "Load older" button on /app/dms/[id], /app/groups/[id]/chat,
 * and the event-room chat. Returns up to 100 older messages plus a
 * hasMore flag.
 */
export async function loadOlderThreadMessagesAction(input: {
  threadId: string;
  beforeCreatedAt: string;
  limit?: number;
}): Promise<{ messages: OlderMessage[]; hasMore: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { messages: [], hasMore: false };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { messages: [], hasMore: false };

  const limit = Math.min(input.limit ?? 100, 200);
  // Request one extra to detect hasMore.
  const { data } = await supabase
    .from("thread_messages")
    .select(
      "id, body, media_url, media_type, created_at, author_id, author:profiles!thread_messages_author_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("thread_id", input.threadId)
    .is("deleted_at", null)
    .lt("created_at", input.beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  // Return oldest-first so the caller can prepend in display order.
  const messages: OlderMessage[] = trimmed
    .slice()
    .reverse()
    .map((m: any) => {
      const a = Array.isArray(m.author) ? m.author[0] : m.author;
      return {
        id: m.id,
        body: m.body ?? "",
        media_url: m.media_url ?? null,
        media_type: (m.media_type ?? "none") as "none" | "image" | "video",
        created_at: m.created_at,
        author_id: m.author_id,
        author_name: a?.full_name ?? "Brother",
        author_photo: a?.profile_photo_url ?? null,
      };
    });
  return { messages, hasMore };
}
