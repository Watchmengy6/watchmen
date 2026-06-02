"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Check in at a meetup. Captures the device location, awards +10 points,
 * and auto-RSVPs if the user wasn't going yet.
 *
 * NOTE: meetup creation and RSVP live in `realActions.ts` (the versions
 * the pages actually import). The duplicate createMeetupAction/
 * rsvpMeetupAction that used to live here were dead code that didn't
 * enforce the admin-only meetup policy — removed to avoid divergent,
 * addressable server-action endpoints.
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
