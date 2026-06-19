"use client";

/**
 * Client-side bootstrap for native iOS / Android push notifications.
 *
 * Only runs inside the Capacitor wrap — on web (Safari, Chrome, Firefox)
 * this is a no-op so the existing web push path keeps working. On the
 * native app it:
 *   1. Asks the user for notification permission (system dialog).
 *   2. Registers with APNs / FCM and gets a device token back.
 *   3. Sends the token to the server (registerNativeDeviceTokenAction)
 *      so the push fan-out can deliver to this device.
 *   4. Wires foreground + tap listeners so a notification arriving while
 *      the app is open shows the in-app toast, and tapping a system
 *      notification deep-links to the right page.
 */

import { registerNativeDeviceTokenAction } from "@/lib/push/native";

let booted = false;

/**
 * TEMPORARY diagnostic helper for the 1.0.2 push debug session
 * (Aaron, June 18 2026). Dispatches a window event the on-screen
 * PushDiagOverlay listens to so we can see the registration flow
 * step-by-step on a production device that isn't Web-Inspectable.
 * Safe no-op when window is missing (SSR) or when no listener is
 * attached. Remove once push is confirmed working end-to-end.
 */
function diag(msg: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("watchmen:push-diag", {
        detail: { msg, ts: Date.now() },
      }),
    );
  } catch {
    // never throw from a diagnostic
  }
}

export async function initNativePush(): Promise<void> {
  diag("init: start");
  // Idempotent — multiple mounts of the registrar component shouldn't
  // double-register the device or stack listeners.
  if (booted) {
    diag("init: already booted (skip)");
    return;
  }
  if (typeof window === "undefined") return;
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) {
    diag("init: not native (skip)");
    return;
  }
  diag("init: native platform confirmed");
  booted = true;

  let PushNotifications: any;
  try {
    // Dynamic import so the web bundle stays free of the native plugin.
    const mod = await import("@capacitor/push-notifications");
    PushNotifications = mod.PushNotifications;
    diag("init: plugin imported OK");
  } catch (e: any) {
    diag(`init: plugin import FAILED: ${e?.message ?? String(e)}`);
    console.warn("[push.native] @capacitor/push-notifications not installed", e);
    return;
  }

  try {
    let perm = await PushNotifications.checkPermissions();
    diag(`init: checkPermissions → ${perm.receive}`);
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
      diag(`init: requestPermissions → ${perm.receive}`);
    }
    if (perm.receive !== "granted") {
      console.log("[push.native] permission not granted", perm.receive);
      return;
    }
  } catch (e: any) {
    diag(`init: permission check THREW: ${e?.message ?? String(e)}`);
    console.warn("[push.native] permission check failed", e);
    return;
  }

  // Wire listeners BEFORE register() so we don't miss the registration
  // callback that fires almost immediately after the call.
  PushNotifications.addListener("registration", async (token: { value: string }) => {
    diag(`listener: registration fired (token starts ${token?.value?.slice(0, 8) ?? "?"})`);
    try {
      const platform =
        (window as any).Capacitor?.getPlatform?.() === "android" ? "android" : "ios";
      const ua = navigator.userAgent ?? null;
      const res = await registerNativeDeviceTokenAction({
        token: token.value,
        platform,
        userAgent: ua ?? undefined,
      });
      if (res?.error) {
        diag(`listener: server action ERROR: ${res.error}`);
        console.warn("[push.native] register action failed:", res.error);
      } else {
        diag("listener: server action OK — DB row should exist");
        console.log("[push.native] device token registered");
      }
    } catch (e: any) {
      diag(`listener: server action THREW: ${e?.message ?? String(e)}`);
      console.warn("[push.native] register action threw", e);
    }
  });

  PushNotifications.addListener("registrationError", (err: any) => {
    diag(`listener: registrationError: ${JSON.stringify(err)?.slice(0, 80)}`);
    console.warn("[push.native] registration error", err);
  });
  diag("init: listeners wired");

  // Foreground notification: iOS does NOT show a system banner when the
  // app is open. The in-app PushReceiver component handles the toast UI
  // for the web path; we mirror that here by dispatching a window event
  // so the same component can listen.
  PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
    try {
      window.dispatchEvent(
        new CustomEvent("watchmen:native-push", {
          detail: {
            title: notification.title ?? notification.data?.title ?? "Watchmen",
            body: notification.body ?? notification.data?.body ?? "",
            url: notification.data?.url ?? null,
          },
        }),
      );
    } catch (e) {
      console.warn("[push.native] foreground dispatch failed", e);
    }
  });

  // Tap from the lock screen or notification tray.
  PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
    const url = action?.notification?.data?.url;
    if (typeof url === "string" && url.startsWith("/")) {
      // Hard-navigate so we land on the server-rendered route the push
      // pointed at — softer router.push would race with auth gates.
      window.location.assign(url);
    }
  });

  try {
    diag("init: calling register()");
    await PushNotifications.register();
    diag("init: register() returned (now waiting for OS callback)");
  } catch (e: any) {
    diag(`init: register() THREW: ${e?.message ?? String(e)}`);
    console.warn("[push.native] register() threw", e);
  }
}
