"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Start (or open) a DM thread with the given member. */
export async function startDmAction(formData: FormData) {
  const otherId = String(formData.get("other_profile_id") ?? "").trim();
  if (!otherId) return;
  const supabase = supabaseServer();
  const { data: threadId, error } = await supabase.rpc("find_or_create_dm", {
    p_other_profile_id: otherId,
  });
  if (error || !threadId) {
    console.error("[startDmAction]", error);
    redirect("/app/dms");
  }
  redirect(`/app/dms/${threadId}`);
}

/** Send a message to a thread. */
export async function sendThreadMessageAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const threadId = String(formData.get("thread_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!threadId || !body) return { error: "Missing fields." };
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return { error: "No profile." };
  const { error } = await supabase.from("thread_messages").insert({
    thread_id: threadId,
    author_id: me.id,
    body,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/dms/${threadId}`);
  return {};
}

/** Mute / unmute a thread for the current user. */
export async function muteThreadAction(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "").trim();
  const muted = String(formData.get("muted") ?? "true") === "true";
  if (!threadId) return;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;
  await supabase
    .from("thread_members")
    .update({ muted })
    .eq("thread_id", threadId)
    .eq("user_id", me.id);
  revalidatePath("/app/dms");
}

/** Leave a thread (removes membership; for DMs effectively archives it on your side). */
export async function leaveThreadAction(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "").trim();
  if (!threadId) return;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;
  await supabase
    .from("thread_members")
    .delete()
    .eq("thread_id", threadId)
    .eq("user_id", me.id);
  revalidatePath("/app/dms");
}
