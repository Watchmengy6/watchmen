"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import type { MediaType } from "@/types/database";

export async function sendMessageAction(input: {
  chat_id: string;
  content: string;
  media_url?: string | null;
  media_type?: MediaType;
}) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile || profile.status !== "approved") return { error: "Not approved." };

  const content = (input.content ?? "").trim();
  if (!content && !input.media_url) return { error: "Empty message." };

  const { error } = await supabase.from("messages").insert({
    chat_id: input.chat_id,
    user_id: profile.id,
    content: content || null,
    media_url: input.media_url ?? null,
    media_type: input.media_type ?? "none",
  });
  if (error) return { error: error.message };

  return { success: true };
}

export async function toggleReactionAction(input: {
  message_id: string;
  reaction_type?: string;
}) {
  const reaction = input.reaction_type ?? "like";
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return { error: "No profile." };

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", input.message_id)
    .eq("user_id", profile.id)
    .eq("reaction_type", reaction)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("message_reactions").insert({
      message_id: input.message_id,
      user_id: profile.id,
      reaction_type: reaction,
    });
    // Swallow unique-violation (Postgres 23505): a fast double-tap raced
    // two inserts and the reaction already exists — treat as success so the
    // toggle stays idempotent (mirrors toggleLikeAction).
    if (error && (error as any).code !== "23505") return { error: error.message };
  }
  return { success: true };
}

export async function getOrCreateMainChat() {
  const supabase = supabaseServer();
  const { data } = await supabase.from("chats").select("*").eq("type", "main").maybeSingle();
  return data;
}
