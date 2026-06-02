"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser, sendPushToSuperAdmins } from "@/lib/push/send";

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
  const mediaUrl = String(formData.get("media_url") ?? "").trim() || null;
  const mediaTypeRaw = String(formData.get("media_type") ?? "none").trim();
  const mediaType = (["none", "image", "video"].includes(mediaTypeRaw)
    ? mediaTypeRaw
    : "none") as "none" | "image" | "video";

  if (!threadId) return { error: "Missing thread." };
  if (!body && !mediaUrl) return { error: "Empty message." };

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
    media_url: mediaUrl,
    media_type: mediaType,
  });
  if (error) return { error: error.message };

  // Fire-and-forget push fan-out. The action returns the moment the
  // message insert is acknowledged so the sender's bubble appears
  // instantly; push delivery happens in the background. Wrapped in an
  // IIFE that owns its own try/catch so unhandled rejections can't
  // crash the request.
  void (async () => {
    try {
      const { data: thread } = await supabase
        .from("threads")
        .select("kind, title, group_id")
        .eq("id", threadId)
        .maybeSingle();
      const { data: members } = await supabase
        .from("thread_members")
        .select("user_id, muted, profile:profiles!thread_members_user_id_fkey(id, full_name)")
        .eq("thread_id", threadId);
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", me.id)
        .maybeSingle();

      const senderName = meProfile?.full_name ?? "A brother";
      const previewBody = mediaUrl
        ? mediaType === "image"
          ? "📷 Photo"
          : "🎥 Video"
        : body.length > 120
          ? `${body.slice(0, 117)}…`
          : body;

      const isGroup = thread?.kind === "group" || thread?.kind === "event";
      const url =
        thread?.kind === "group" && thread.group_id
          ? `/app/groups/${thread.group_id}/chat`
          : `/app/dms/${threadId}`;
      const title = isGroup ? `${senderName} · ${thread?.title ?? "Group"}` : senderName;

      await Promise.all(
        (members ?? [])
          .filter((m: any) => m.user_id !== me.id && !m.muted)
          .map((m: any) =>
            sendPushToUser({
              userId: m.user_id,
              payload: {
                title,
                body: previewBody,
                url,
                tag: `thread:${threadId}`,
                renotify: true,
              },
            }),
          ),
      );

      // Super-admin firehose for group + event chats only. Private
      // 1:1 DMs are excluded for privacy (Dustin's call). The push to
      // thread members above already covers super-admins when they're
      // members of the thread; this branch covers cases where they're
      // not a thread member but still want signal.
      if (thread?.kind === "group" || thread?.kind === "event") {
        await sendPushToSuperAdmins({
          actorProfileId: me.id,
          payload: {
            title,
            body: previewBody,
            url,
            tag: `thread:${threadId}`,
            renotify: true,
          },
        });
      }
    } catch (e) {
      console.warn("[dm] push notify failed (non-fatal)", e);
    }
  })();

  revalidatePath(`/app/dms/${threadId}`);
  return {};
}

/**
 * Stamp the current user's last_read_at on a thread to "now()". Called
 * when a user opens a thread so the inbox unread badge clears.
 */
export async function markThreadReadAction(threadId: string): Promise<void> {
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
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", me.id);
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
