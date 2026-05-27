"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * RSVP to a meetup (going = true/false). Awards +2 points the first time you
 * say yes, capped at 10/day to prevent farming.
 */
export async function rsvpMeetupAction(meetupId: string, going: boolean) {
  const supabase = supabaseServer();
  const { error } = await supabase.rpc("rsvp_meetup", {
    p_meetup_id: meetupId,
    p_going: going,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/meetups/${meetupId}`);
  revalidatePath(`/app/meetups`);
  return { success: true };
}

/**
 * Check in at a meetup. Captures the device location, awards +10 points,
 * and auto-RSVPs if the user wasn't going yet.
 */
export async function checkInMeetupAction(input: {
  meetup_id: string;
  latitude: number;
  longitude: number;
}) {
  const supabase = supabaseServer();
  const { error } = await supabase.rpc("check_in_meetup", {
    p_meetup_id: input.meetup_id,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/meetups/${input.meetup_id}`);
  revalidatePath(`/app/home`);
  return { success: true };
}

/**
 * Create a member-hosted meetup. Any approved member can do this.
 */
export async function createMeetupAction(_prev: unknown, formData: FormData) {
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
  if (!profile || profile.status !== "approved") {
    return { error: "Must be approved." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const when_at = String(formData.get("when_at") ?? "").trim();
  const duration_min = Number(formData.get("duration_min") ?? 60);
  const location_name = String(formData.get("location_name") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const category = (String(formData.get("category") ?? "Other") ||
    "Other") as "Coffee" | "Workout" | "Drinks" | "Outdoors" | "Food" | "Other";
  const latitudeStr = String(formData.get("latitude") ?? "").trim();
  const longitudeStr = String(formData.get("longitude") ?? "").trim();

  if (!title || !when_at) return { error: "Title and time are required." };

  const { error } = await supabase.from("meetups").insert({
    title,
    when_at,
    duration_min,
    location_name,
    address,
    notes,
    category,
    latitude: latitudeStr ? Number(latitudeStr) : null,
    longitude: longitudeStr ? Number(longitudeStr) : null,
    host_user_id: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/meetups");
  return { success: true };
}
