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

/**
 * Send the same payload to every approved admin. Logs each step so we
 * can debug from Vercel why a signup push didn't land (most common
 * cause: the admin never enabled push on the device they expect it on).
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  const supabase = svc();
  const { data: admins, error: adminErr } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "super_admin"])
    .eq("status", "approved");
  if (adminErr) {
    console.warn("[push.admins] failed to load admins", adminErr);
    return;
  }
  if (!admins || admins.length === 0) {
    console.warn("[push.admins] no approved admins found");
    return;
  }

  // Count subscriptions up front so we can log "0 admins reachable"
  // distinctly from "no admins at all".
  const { count: subCount } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .in(
      "user_id",
      admins.map((a) => a.id),
    );
  console.log(
    `[push.admins] notifying ${admins.length} admin(s) — ${subCount ?? 0} subscriptions on file`,
  );

  const results = await Promise.all(
    admins.map(async (a) => {
      const r = await sendPushToUser({ userId: a.id, payload });
      if (r.sent === 0) {
        console.warn(
          `[push.admins] no subscription for admin ${a.full_name} (${a.id}) — they haven't enabled push on any device`,
        );
      }
      return r;
    }),
  );
  const totalSent = results.reduce((s, r) => s + r.sent, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  console.log(
    `[push.admins] done: ${totalSent} delivered, ${totalFailed} failed`,
  );
}
