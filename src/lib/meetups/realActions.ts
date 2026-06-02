"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points/award";
import { sendPushToUser } from "@/lib/push/send";

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
  // Optional GPS coords for venue. When present, geo check-in is
  // enforced — attendees must be within 250m of these coords. When
  // absent, check-in only enforces the time window.
  const latitudeStr = String(formData.get("latitude") ?? "").trim();
  const longitudeStr = String(formData.get("longitude") ?? "").trim();
  const latitude = latitudeStr ? Number(latitudeStr) : null;
  const longitude = longitudeStr ? Number(longitudeStr) : null;
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
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;

  // Belt-and-suspenders: meetups are admin-only per Dustin. RLS in
  // migration 00020 enforces this at the DB layer, but we also check
  // here so we get a clean redirect (instead of a silent RLS failure)
  // and so the check works even if the migration hasn't been applied
  // yet on a given environment.
  if (me.role !== "admin" && me.role !== "super_admin") {
    redirect("/app/meetups");
  }

  const { data: m, error } = await supabase
    .from("meetups")
    .insert({
      title,
      notes,
      when_at: whenAt,
      duration_min: duration,
      location_name: locationName,
      category,
      latitude,
      longitude,
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

  // Note: master chat broadcast was removed when the master chat tab
  // was deleted (migration 00020). The feed post above is the only
  // broadcast surface now.

  // Fire-and-forget push fan-out — the host shouldn't wait for every
  // recipient's push to deliver before being redirected to the meetup.
  void (async () => {
    try {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const [{ data: approved }, { data: hostProfile }] = await Promise.all([
        admin.from("profiles").select("id").eq("status", "approved"),
        admin.from("profiles").select("full_name").eq("id", me.id).maybeSingle(),
      ]);
      if (approved && approved.length > 0) {
        const hostName = hostProfile?.full_name ?? "A brother";
        const whenLabel = new Date(whenAt).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        const pushBody = `${title} · ${whenLabel}${locationName ? ` · ${locationName}` : ""}`;
        await Promise.all(
          approved
            .filter((p) => p.id !== me.id)
            .map((p) =>
              sendPushToUser({
                userId: p.id,
                payload: {
                  title: `${hostName} is hosting a meetup`,
                  body: pushBody,
                  url: `/app/meetups/${m.id}`,
                  tag: `meetup:${m.id}`,
                },
              }),
            ),
        );
      }
    } catch (e) {
      console.warn("[createMeetupAction] push notify failed (non-fatal)", e);
    }
  })();

  revalidatePath("/app/meetups");
  revalidatePath("/app/home");
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

  // Only award points after the RSVP write actually persists. The old
  // code ignored the upsert result and could hand out points even when
  // the row never landed (RLS failure, network blip, etc).
  const { error: rsvpErr } = await supabase
    .from("meetup_rsvps")
    .upsert(
      { meetup_id: meetupId, user_id: me.id, going },
      { onConflict: "meetup_id,user_id" },
    );
  if (rsvpErr) {
    console.error("[rsvpMeetupAction] upsert failed", rsvpErr);
    return;
  }

  if (isNewYes) {
    await awardPoints({ userId: me.id, action: "meetup_rsvp", meta: { meetup_id: meetupId } });
  }

  revalidatePath(`/app/meetups/${meetupId}`);
  revalidatePath("/app/meetups");
}
