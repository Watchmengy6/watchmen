"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function createPollAction(input: {
  chat_id: string | null;
  event_id: string | null;
  question: string;
  options: string[];
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

  const question = input.question.trim();
  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (!question) return { error: "Question is required." };
  if (options.length < 2) return { error: "Add at least two options." };
  if (options.length > 8) return { error: "Max 8 options." };

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      chat_id: input.chat_id,
      event_id: input.event_id,
      question,
      created_by_user_id: profile.id,
    })
    .select()
    .single();
  if (error || !poll) return { error: error?.message ?? "Couldn't create poll." };

  const { error: optErr } = await supabase
    .from("poll_options")
    .insert(options.map((o) => ({ poll_id: poll.id, option_text: o })));
  if (optErr) return { error: optErr.message };

  return { success: true, poll };
}

export async function votePollAction(input: { poll_id: string; option_id: string }) {
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

  // remove any existing vote on this poll
  await supabase
    .from("poll_votes")
    .delete()
    .eq("poll_id", input.poll_id)
    .eq("user_id", profile.id);

  const { error } = await supabase.from("poll_votes").insert({
    poll_id: input.poll_id,
    poll_option_id: input.option_id,
    user_id: profile.id,
  });
  if (error) return { error: error.message };

  return { success: true };
}
