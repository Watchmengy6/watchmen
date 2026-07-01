"use client";

import { debugLog } from "@/lib/utils/debugLog";

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

export async function initNativePush(): Promise<void> {
  // Idempotent — multiple mounts of the registrar component shouldn't
  // double-register the device or stack listeners.
  if (booted) return;
  if (typeof window === "undefined") return;
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  booted = true;

  let PushNotifications: any;
  try {
    // Dynamic import so the web bundle stays free of the native plugin.
    const mod = await import("@capacitor/push-notifications");
    PushNotifications = mod.PushNotifications;
  } catch (e) {
    console.warn("[push.native] @capacitor/push-notifications not installed", e);
    return;
  }

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      debugLog("[push.native] permission not granted", perm.receive);
      return;
    }
  } catch (e) {
    console.warn("[push.native] permission check failed", e);
    return;
  }

  // Wire listeners BEFORE register() so we don't miss the registration
  // callback that fires almost immediately after the call.
  PushNotifications.addListener("registration", async (token: { value: string }) => {
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
        console.warn("[push.native] register action failed:", res.error);
      } else {
        debugLog("[push.native] device token registered");
      }
    } catch (e) {
      console.warn("[push.native] register action threw", e);
    }
  });

  PushNotifications.addListener("registrationError", (err: any) => {
    console.warn("[push.native] registration error", err);
  });

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
    await PushNotifications.register();
  } catch (e) {
    console.warn("[push.native] register() threw", e);
  }
}
