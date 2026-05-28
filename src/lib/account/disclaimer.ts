"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Mark the current member as having watched + acknowledged the
 * onboarding code-of-conduct video. Apple App Store wants every social
 * app to gate first use behind an EULA-style acknowledgment.
 */
export async function acceptDisclaimerAction(): Promise<{ error?: string }> {
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
  const { error } = await supabase
    .from("profiles")
    .update({ disclaimer_accepted_at: new Date().toISOString() })
    .eq("id", me.id);
  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  return {};
}
