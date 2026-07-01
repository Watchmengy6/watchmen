import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { debugLog } from "@/lib/utils/debugLog";

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

// ----- APNs (iOS) provider, lazy-initialized -----------------------------
//
// We use @parse/node-apn which talks HTTP/2 to api.push.apple.com (or the
// sandbox host when APNS_PRODUCTION isn't "true"). One provider is cached
// per process across invocations. Env vars (set on Vercel):
//   APNS_KEY_ID         10-char key id from developer.apple.com
//   APNS_TEAM_ID        Apple team id (5F5C5G25Y6 for Watchmen)
//   APNS_BUNDLE_ID      me.gy6.watchmen
//   APNS_P8_KEY_BASE64  base64-encoded contents of the .p8 file
//   APNS_PRODUCTION     "true" for App Store / TestFlight builds;
//                       leave unset for local Xcode builds (sandbox).
let apnsProvider: any = null;
let apnsLoaded = false;
async function getApnsProvider(): Promise<any | null> {
  if (apnsLoaded) return apnsProvider;
  apnsLoaded = true;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const p8B64 = process.env.APNS_P8_KEY_BASE64;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!keyId || !teamId || !p8B64 || !bundleId) {
    console.warn("[push.apns] missing env vars — native iOS push disabled");
    return null;
  }
  try {
    const apn = (await import("@parse/node-apn")).default;
    apnsProvider = new apn.Provider({
      token: {
        key: Buffer.from(p8B64, "base64").toString("utf-8"),
        keyId,
        teamId,
      },
      production: process.env.APNS_PRODUCTION === "true",
    });
    debugLog(
      `[push.apns] provider ready (${process.env.APNS_PRODUCTION === "true" ? "production" : "sandbox"})`,
    );
    return apnsProvider;
  } catch (e) {
    console.warn("[push.apns] provider init failed", e);
    return null;
  }
}

function svc() {
  return supabaseAdmin();
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
}): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = svc();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, platform, device_token")
    .eq("user_id", opts.userId);
  if (error || !subs) {
    console.warn("[push] failed to load subs", error);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  // Native (ios/android) sends are not wired to APNs/FCM yet. They are
  // counted as `skipped` — NOT `sent` — so logs and delivery totals never
  // report a false positive for a notification that didn't actually go out.
  let skipped = 0;
  const payloadJson = JSON.stringify(opts.payload);
  const webConfigured = configure();

  await Promise.all(
    subs.map(async (s: any) => {
      const platform = s.platform ?? "web";
      // Route by platform. iOS goes through APNs; Android is still
      // stubbed (FCM wiring will land when we ship Android).
      if (platform === "ios") {
        const ok = await sendApnsPush({
          deviceToken: s.device_token,
          payload: opts.payload,
          subscriptionId: s.id,
          supabase,
        });
        if (ok) sent += 1;
        else failed += 1;
        return;
      }
      if (platform === "android") {
        sendNativePushStub({
          platform,
          deviceToken: s.device_token,
          payload: opts.payload,
        });
        skipped += 1;
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

  return { sent, failed, skipped };
}

/**
 * Stub native dispatcher (Android only now — iOS uses sendApnsPush).
 * FCM wiring will land when we ship the Android Capacitor wrap.
 */
function sendNativePushStub(opts: {
  platform: "ios" | "android";
  deviceToken: string | null;
  payload: PushPayload;
}): void {
  if (!opts.deviceToken) return;
  debugLog(
    `[push.native:stub] NOT delivered (${opts.platform} sender not wired) — token ${opts.deviceToken.slice(0, 8)}…: ${opts.payload.title}`,
  );
}

/**
 * Send a push notification to one iOS device via APNs.
 * Returns true on success, false on failure. Deletes stale subscriptions
 * when APNs reports BadDeviceToken / Unregistered (same logic the web
 * path uses for 404/410).
 */
async function sendApnsPush(opts: {
  deviceToken: string | null;
  payload: PushPayload;
  subscriptionId: string;
  supabase: ReturnType<typeof svc>;
}): Promise<boolean> {
  if (!opts.deviceToken) {
    console.warn("[push.apns] missing device token");
    return false;
  }
  const provider = await getApnsProvider();
  if (!provider) return false;
  const apn = (await import("@parse/node-apn")).default;
  const note = new apn.Notification();
  note.alert = { title: opts.payload.title, body: opts.payload.body };
  note.topic = process.env.APNS_BUNDLE_ID!;
  note.sound = "default";
  note.payload = { url: opts.payload.url ?? null };
  if (opts.payload.tag) {
    note.threadId = opts.payload.tag;
  }
  // contentAvailable wakes the app briefly so it can refresh badges /
  // unread state in the background — same affordance the web SW gets.
  note.contentAvailable = false;

  try {
    const res = await provider.send(note, opts.deviceToken);
    if (res.sent?.length > 0) {
      await opts.supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", opts.subscriptionId);
      return true;
    }
    const failure = res.failed?.[0];
    const reason = failure?.response?.reason ?? failure?.error ?? "unknown";
    if (reason === "BadDeviceToken" || reason === "Unregistered") {
      await opts.supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", opts.subscriptionId);
      debugLog(`[push.apns] pruned stale token (${reason})`);
    } else {
      console.warn("[push.apns] send failed:", reason, failure);
    }
    return false;
  } catch (e) {
    console.warn("[push.apns] send threw", e);
    return false;
  }
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
  debugLog(
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
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
  debugLog(
    `[push.admins] done: ${totalSent} delivered, ${totalFailed} failed, ${totalSkipped} skipped (native stub)`,
  );
}
