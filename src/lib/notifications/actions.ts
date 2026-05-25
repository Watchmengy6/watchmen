"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function markAllReadAction() {
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

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", profile.id)
    .eq("read", false);

  revalidatePath("/app/notifications");
  return { success: true };
}
