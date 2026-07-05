"use server";
import { runInBackground } from "@/lib/utils/background";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser, sendPushToSuperAdmins } from "@/lib/push/send";
import type { RsvpStatus } from "@/types/database";

export async function rsvpAction(eventId: string, status: RsvpStatus) {
  const supabase = supabaseServer();

  // Look up the previous RSVP so we can tell the client whether THIS call
  // was the one that earned the +5 points. (The DB RPC only awards on
  // first transition to "going", but the UI used to toast "+5" on every
  // click which made users think they were farming.)
  let wasGoing = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (me) {
        const { data: existing } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("event_id", eventId)
          .eq("user_id", me.id)
          .maybeSingle();
        wasGoing = existing?.status === "going";
      }
    }
  } catch {}

  const { error } = await supabase.rpc("rsvp_event", {
    p_event_id: eventId,
    p_status: status,
  });
  if (error) return { error: error.message };

  const awardedPoints = !wasGoing && status === "going";

  // Super-admin firehose. Skip if Dustin is RSVPing his own event.
  runInBackground(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: me } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      const { data: ev } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .maybeSingle();
      const verb = status === "going" ? "is going to" : status === "maybe" ? "might attend" : "passed on";
      await sendPushToSuperAdmins({
        actorProfileId: me?.id,
        payload: {
          title: `${me?.full_name ?? "A brother"} ${verb}`,
          body: ev?.title ?? "an event",
          url: `/app/events/${eventId}`,
          tag: `rsvp:${eventId}`,
        },
      });
    } catch (e) {
      console.warn("[event.rsvp] super-admin push failed", e);
    }
  });

  revalidatePath(`/app/events/${eventId}`);
  revalidatePath(`/app/events`);
  revalidatePath(`/app/home`);
  return { success: true, awardedPoints };
}

export async function checkInAction(input: {
  event_id: string;
  latitude: number;
  longitude: number;
}) {
  const supabase = supabaseServer();
  const { error } = await supabase.rpc("check_in_event", {
    p_event_id: input.event_id,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/events/${input.event_id}`);
  revalidatePath(`/app/home`);
  return { success: true };
}

export async function createEventAction(_prev: unknown, formData: FormData) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return { error: "Admin only." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const event_date = String(formData.get("event_date") ?? "").trim();
  const start_time = String(formData.get("start_time") ?? "").trim() || null;
  const end_time = String(formData.get("end_time") ?? "").trim() || null;
  const location_name = String(formData.get("location_name") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const latitudeStr = String(formData.get("latitude") ?? "").trim();
  const longitudeStr = String(formData.get("longitude") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "watchmen").trim();
  const kind = kindRaw === "sponsored" ? "sponsored" : "watchmen";

  if (!title || !event_date) return { error: "Title and date are required." };

  const { data: insertedEvent, error } = await supabase
    .from("events")
    .insert({
      title,
      description,
      event_date,
      start_time,
      end_time,
      location_name,
      address,
      image_url,
      latitude: latitudeStr ? Number(latitudeStr) : null,
      longitude: longitudeStr ? Number(longitudeStr) : null,
      created_by_user_id: profile.id,
      status: "published",
      kind,
    })
    .select("id")
    .single();
  if (error || !insertedEvent) return { error: error?.message ?? "Insert failed." };

  // Auto-broadcast to feed wall + main chat so the new event surfaces
  // where brothers actually look. Non-fatal — if these fail the event
  // still exists.
  try {
    await supabase.from("posts").insert({
      author_id: profile.id,
      kind: "announcement",
      body: `New ${kind === "sponsored" ? "sponsored " : ""}event: ${title}${location_name ? ` at ${location_name}` : ""}`,
      tagged_event_id: insertedEvent.id,
      media_url: image_url,
      media_type: image_url ? "image" : "none",
    });
  } catch (e) {
    console.warn("[createEventAction] feed post insert failed (non-fatal)", e);
  }

  // Note: master chat broadcast was removed when the master chat tab
  // was deleted (migration 00020). The feed post above is the only
  // broadcast surface now.

  // Fire-and-forget push fan-out — don't make the creator wait for
  // every push delivery before the action returns.
  runInBackground(async () => {
    try {
      const admin = supabaseAdmin();
      const { data: approved } = await admin
        .from("profiles")
        .select("id")
        .eq("status", "approved");
      if (approved && approved.length > 0) {
        const targetUrl = "/app/events";
        const isSponsored = kind === "sponsored";
        const pushTitle = isSponsored ? "New sponsored event" : "New Watchmen event";
        const dateLabel = new Date(event_date + "T00:00:00").toLocaleDateString(
          "en-US",
          { weekday: "short", month: "short", day: "numeric" },
        );
        const pushBody = `${title} · ${dateLabel}`;
        await Promise.all(
          approved
            .filter((p) => p.id !== profile.id)
            .map((p) =>
              sendPushToUser({
                userId: p.id,
                payload: {
                  title: pushTitle,
                  body: pushBody,
                  url: targetUrl,
                  // Unique per event — a shared "event-new" tag made
                  // back-to-back announcements REPLACE each other in
                  // the notification tray (final pre-launch audit).
                  tag: `event-new:${insertedEvent.id}`,
                },
              }),
            ),
        );
      }
    } catch (e) {
      console.warn("[events.create] push notify failed (non-fatal)", e);
    }
  });

  revalidatePath("/app/events");
  revalidatePath("/admin/events");
  revalidatePath("/app/home");
  return { success: true };
}

/**
 * Update an existing event. Admin-gated. Reads `event_id` from the form
 * (the edit form injects it as a hidden field) and overwrites the event's
 * fields with the submitted values — including swapping the flyer image.
 */
export async function updateEventAction(_prev: unknown, formData: FormData) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return { error: "Admin only." };
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  if (!eventId) return { error: "Missing event." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const event_date = String(formData.get("event_date") ?? "").trim();
  const start_time = String(formData.get("start_time") ?? "").trim() || null;
  const end_time = String(formData.get("end_time") ?? "").trim() || null;
  const location_name = String(formData.get("location_name") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const latitudeStr = String(formData.get("latitude") ?? "").trim();
  const longitudeStr = String(formData.get("longitude") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "watchmen").trim();
  const kind = kindRaw === "sponsored" ? "sponsored" : "watchmen";

  if (!title || !event_date) return { error: "Title and date are required." };

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description,
      event_date,
      start_time,
      end_time,
      location_name,
      address,
      image_url,
      latitude: latitudeStr ? Number(latitudeStr) : null,
      longitude: longitudeStr ? Number(longitudeStr) : null,
      kind,
    })
    .eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app/events");
  revalidatePath("/admin/events");
  revalidatePath("/app/home");
  return { success: true };
}
