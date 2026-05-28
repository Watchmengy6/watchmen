"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/send";
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

  try {
    const { data: mainChat } = await supabase
      .from("chats")
      .select("id")
      .eq("type", "main")
      .maybeSingle();
    if (mainChat) {
      const dateLabel = new Date(event_date + "T00:00:00").toLocaleDateString(
        "en-US",
        { weekday: "short", month: "short", day: "numeric" },
      );
      const timeLabel = start_time ? ` · ${start_time.slice(0, 5)}` : "";
      await supabase.from("messages").insert({
        chat_id: mainChat.id,
        user_id: profile.id,
        // The chat renderer auto-converts /app/events/<id> into a "View
        // event →" pill, so the URL doubles as the call-to-action.
        content: `New event: ${title} · ${dateLabel}${timeLabel}${location_name ? ` · ${location_name}` : ""} /app/events/${insertedEvent.id}`,
      });
    }
  } catch (e) {
    console.warn("[createEventAction] main-chat broadcast failed (non-fatal)", e);
  }

  // Push notify all approved members about the new event.
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
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
                tag: "event-new",
              },
            }),
          ),
      );
    }
  } catch (e) {
    console.warn("[events.create] push notify failed (non-fatal)", e);
  }

  revalidatePath("/app/events");
  revalidatePath("/admin/events");
  revalidatePath("/app/home");
  revalidatePath("/app/chat");
  return { success: true };
}
