"use server";

import { supabaseServer } from "@/lib/supabase/server";

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

/** Persist a Web Push subscription for the current user. */
export async function savePushSubscriptionAction(
  sub: SubscriptionInput,
): Promise<{ error?: string }> {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { error: "Invalid subscription." };
  }
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

  // Upsert by (user_id, endpoint) — re-enabling on the same device
  // shouldn't create a duplicate row.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: me.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: sub.userAgent ?? null,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return { error: error.message };
  return {};
}

/** Remove the subscription for this device (logout / disable). */
export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<{ error?: string }> {
  if (!endpoint) return { error: "Missing endpoint." };
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
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", me.id)
    .eq("endpoint", endpoint);
  return {};
}
