"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points/award";

const CATEGORIES = ["Coffee", "Workout", "Drinks", "Outdoors", "Food", "Other"] as const;

export async function createMeetupAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const whenAtLocal = String(formData.get("when_at") ?? "").trim();
  const duration = Number(formData.get("duration_min") ?? 60);
  const locationName = String(formData.get("location_name") ?? "").trim() || null;
  const categoryRaw = String(formData.get("category") ?? "Other").trim();
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw)
    ? categoryRaw
    : "Other";
  if (!title) return;
  if (!whenAtLocal) return;

  // datetime-local has no timezone. The client sends a `tz_offset` (e.g.
  // "-04:00") via a hidden field on the form so we can construct the
  // correct UTC moment regardless of the server's timezone.
  const tzOffset = String(formData.get("tz_offset") ?? "").trim() || "+00:00";
  // Normalize "2026-05-27T19:00" + "-04:00" → "2026-05-27T19:00:00-04:00".
  const isoWithTz = `${whenAtLocal}${whenAtLocal.includes(":") && whenAtLocal.split(":").length === 2 ? ":00" : ""}${tzOffset}`;
  const whenAt = new Date(isoWithTz).toISOString();

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

  const { data: m, error } = await supabase
    .from("meetups")
    .insert({
      title,
      notes,
      when_at: whenAt,
      duration_min: duration,
      location_name: locationName,
      category,
      host_user_id: me.id,
    })
    .select("id")
    .single();
  if (error || !m) {
    console.error("[createMeetupAction]", error);
    redirect("/app/meetups");
  }

  // Auto-RSVP the host.
  await supabase
    .from("meetup_rsvps")
    .insert({ meetup_id: m.id, user_id: me.id, going: true });

  await awardPoints({ userId: me.id, action: "meetup_created", meta: { meetup_id: m.id } });

  // Auto-broadcast: post to feed wall + drop a message in the main chat
  // so brothers see the meetup in their two main surfaces. Non-fatal —
  // if these fail the meetup itself still exists.
  try {
    await supabase.from("posts").insert({
      author_id: me.id,
      kind: "post",
      body: `Hosting a meetup: ${title}${locationName ? ` at ${locationName}` : ""}`,
      tagged_meetup_id: m.id,
    });
  } catch (e) {
    console.warn("[createMeetupAction] feed post insert failed (non-fatal)", e);
  }

  try {
    // Main Room is admin-write-only via RLS, so the meetup host (a regular
    // member) can't insert directly. Use the service-role client to bypass
    // — this is a system-style broadcast, attributed to the host so the
    // bubble shows their name + avatar.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: mainChat } = await admin
      .from("chats")
      .select("id")
      .eq("type", "main")
      .maybeSingle();
    if (mainChat) {
      const whenLabel = new Date(whenAt).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      await admin.from("messages").insert({
        chat_id: mainChat.id,
        user_id: me.id,
        // The chat renderer auto-converts /app/meetups/<id> into a "View
        // meetup →" pill, so we don't have to write a friendly label here.
        content: `New meetup: ${title}${locationName ? ` · ${locationName}` : ""} · ${whenLabel} /app/meetups/${m.id}`,
      });
    }
  } catch (e) {
    console.warn("[createMeetupAction] main-chat broadcast failed (non-fatal)", e);
  }

  revalidatePath("/app/meetups");
  revalidatePath("/app/home");
  revalidatePath("/app/chat");
  redirect(`/app/meetups/${m.id}`);
}

export async function rsvpMeetupAction(formData: FormData) {
  const meetupId = String(formData.get("meetup_id") ?? "").trim();
  const going = String(formData.get("going") ?? "true") === "true";
  if (!meetupId) return;
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
  // Detect if this is a new "going" RSVP so we only award points once.
  const { data: existing } = await supabase
    .from("meetup_rsvps")
    .select("going")
    .eq("meetup_id", meetupId)
    .eq("user_id", me.id)
    .maybeSingle();
  const isNewYes = going && (!existing || !existing.going);

  await supabase
    .from("meetup_rsvps")
    .upsert(
      { meetup_id: meetupId, user_id: me.id, going },
      { onConflict: "meetup_id,user_id" },
    );

  if (isNewYes) {
    await awardPoints({ userId: me.id, action: "meetup_rsvp", meta: { meetup_id: meetupId } });
  }

  revalidatePath(`/app/meetups/${meetupId}`);
  revalidatePath("/app/meetups");
}
