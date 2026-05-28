import "server-only";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;

function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@gy6.me";
  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys not set — push disabled");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export interface PushPayload {
  title: string;
  body: string;
  /** Where to navigate on notification click. */
  url?: string;
  /** Same-tag notifications collapse; useful for "you have a new DM" updates. */
  tag?: string;
  renotify?: boolean;
}

/**
 * Send a push notification to every device a given member has registered.
 * Failures are logged but never thrown.
 */
export async function sendPushToUser(opts: {
  userId: string;
  payload: PushPayload;
}): Promise<{ sent: number; failed: number }> {
  if (!configure()) return { sent: 0, failed: 0 };
  const supabase = svc();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", opts.userId);
  if (error || !subs) {
    console.warn("[push] failed to load subs", error);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const payloadJson = JSON.stringify(opts.payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payloadJson,
        );
        sent += 1;
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", s.id);
      } catch (e: any) {
        failed += 1;
        // 404 / 410 means the endpoint is dead — clean it up.
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.warn("[push] send failed", e?.statusCode, e?.body);
        }
      }
    }),
  );

  return { sent, failed };
}

/** Send the same payload to every approved admin. */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  const supabase = svc();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "super_admin"])
    .eq("status", "approved");
  if (!admins) return;
  await Promise.all(
    admins.map((a) => sendPushToUser({ userId: a.id, payload })),
  );
}
