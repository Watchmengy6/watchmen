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
 * Routes by `platform` — web subscriptions go through web-push (VAPID);
 * native subscriptions (ios/android) are stubbed pending Capacitor wrap.
 * Failures are logged but never thrown.
 */
export async function sendPushToUser(opts: {
  userId: string;
  payload: PushPayload;
}): Promise<{ sent: number; failed: number }> {
  const supabase = svc();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, platform, device_token")
    .eq("user_id", opts.userId);
  if (error || !subs) {
    console.warn("[push] failed to load subs", error);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const payloadJson = JSON.stringify(opts.payload);
  const webConfigured = configure();

  await Promise.all(
    subs.map(async (s: any) => {
      const platform = s.platform ?? "web";
      // Route by platform. Native delivery is stubbed until the
      // Capacitor wrap ships and we wire APNs/FCM credentials in env.
      if (platform === "ios" || platform === "android") {
        const delivered = await sendNativePushStub({
          platform,
          deviceToken: s.device_token,
          payload: opts.payload,
        });
        if (delivered) sent += 1;
        else failed += 1;
        return;
      }
      // Web path (existing).
      if (!webConfigured) {
        failed += 1;
        return;
      }
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
 * Stub native dispatcher. Will be implemented once we Capacitor-wrap
 * the PWA and have APNs/FCM credentials. For now it logs the intent
 * so we can see in Vercel that the route is reachable.
 *
 * To turn on:
 *   - APNs: install `@parse/node-apn`, load .p8 key from env, send
 *     with title/body/url payload.
 *   - FCM: install `firebase-admin`, init with service account JSON
 *     from env, send via messaging().send().
 */
async function sendNativePushStub(opts: {
  platform: "ios" | "android";
  deviceToken: string | null;
  payload: PushPayload;
}): Promise<boolean> {
  if (!opts.deviceToken) return false;
  // Once APNs/FCM are wired, replace this log with the real send.
  // We deliberately don't throw so absent credentials never break
  // the calling action.
  console.log(
    `[push.native:stub] would dispatch to ${opts.platform} token ${opts.deviceToken.slice(0, 8)}…: ${opts.payload.title}`,
  );
  return true;
}

/**
 * Super-admin firehose. Per Dustin: he wants a push for every feed
 * post, comment, event RSVP, poll vote, group/event-room message —
 * everything except 1:1 private DMs. Caller passes the actor (so we
 * can skip pushing when the super-admin is the one doing the action).
 *
 * Failures are swallowed; this should always be fire-and-forget so the
 * triggering action returns instantly.
 */
export async function sendPushToSuperAdmins(opts: {
  payload: PushPayload;
  /** Profile id of whoever triggered the event, so we don't push them their own action. */
  actorProfileId?: string;
}): Promise<void> {
  const supabase = svc();
  const { data: supers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .eq("status", "approved");
  if (!supers || supers.length === 0) return;
  await Promise.all(
    supers
      .filter((s) => s.id !== opts.actorProfileId)
      .map((s) => sendPushToUser({ userId: s.id, payload: opts.payload })),
  );
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
