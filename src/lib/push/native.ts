"use server";

import { supabaseServer } from "@/lib/supabase/server";

/**
 * Register a native (iOS/Android) device token for the current user.
 * Called by the Capacitor app after asking for push permission. Web
 * subscriptions still use the existing savePushSubscriptionAction
 * path; this is the parallel native path.
 *
 * Token is upserted on the unique constraint so re-registers don't
 * spam the table.
 */
export async function registerNativeDeviceTokenAction(input: {
  token: string;
  platform: "ios" | "android";
  /** Friendly device label, e.g. "Dustin's iPhone 15". Optional. */
  userAgent?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { error: "Approval required." };

  const token = input.token.trim();
  if (!token) return { error: "Empty token." };

  // upsert keyed on device_token (unique index). p256dh/auth/endpoint
  // are required on the web path but unused for native — we satisfy
  // the column with placeholder values.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: me.id,
      platform: input.platform,
      device_token: token,
      // Legacy web-push columns: not null in the original schema.
      // Native rows put the token in `endpoint` too so existing
      // joins keep working; the dispatcher routes by `platform`.
      endpoint: `${input.platform}:${token}`,
      p256dh: "native",
      auth: "native",
      user_agent: input.userAgent ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "device_token" },
  );
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Unregister a native device token (on sign-out or notifications-off).
 */
export async function unregisterNativeDeviceTokenAction(
  token: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("device_token", token);
  if (error) return { error: error.message };
  return { success: true };
}
