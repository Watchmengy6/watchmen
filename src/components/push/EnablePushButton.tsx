"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushAction,
} from "@/lib/push/actions";
import { unregisterAllMyNativeDevicesAction } from "@/lib/push/native";
import { useToast } from "@/components/ui/Toast";

/** Convert a base64url VAPID public key to the Uint8Array the browser expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "native-pending"
  | "denied"
  | "off"
  | "on"
  | "busy";

export function EnablePushButton() {
  const [state, setState] = useState<State>("checking");
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      // Feature checks.
      if (typeof window === "undefined") return;
      // Capacitor wrap: skip the web push branch entirely; the
      // NativePushRegistrar component already requested permission and
      // registered an APNs/FCM token at app launch. Reflect the current
      // permission state so the user can re-trigger it if they declined.
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          const perm = await PushNotifications.checkPermissions();
          if (perm.receive === "granted") setState("on");
          else if (perm.receive === "denied") setState("denied");
          else setState("native-pending");
        } catch {
          setState("native-pending");
        }
        return;
      }
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        setState("unsupported");
        return;
      }
      // iOS requires PWA standalone mode before push works.
      const standalone =
        // @ts-expect-error iOS-specific
        window.navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        // @ts-expect-error vendor exists on Safari
        !window.MSStream;
      if (isIOS && !standalone) {
        setState("needs-install");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      // Register the SW + check current subscription.
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const existing = await reg.pushManager.getSubscription();
        setState(existing ? "on" : "off");
      } catch (e) {
        console.warn("[push] sw register failed", e);
        setState("unsupported");
      }
    })();
  }, []);

  async function enable() {
    setState("busy");
    try {
      const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPub) {
        push({ title: "Push not configured", body: "VAPID key missing.", variant: "error" });
        setState("off");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast through ArrayBufferView to satisfy TS DOM typings that don't accept Uint8Array directly.
        applicationServerKey: urlBase64ToUint8Array(vapidPub) as unknown as BufferSource,
      });
      const json = sub.toJSON() as any;
      const r = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });
      if (r?.error) {
        push({ title: "Couldn't save subscription", body: r.error, variant: "error" });
        setState("off");
        return;
      }
      push({ title: "Notifications on", variant: "success" });
      setState("on");
    } catch (e: any) {
      console.warn("[push] enable failed", e);
      push({ title: "Couldn't enable", body: e?.message, variant: "error" });
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      // Native Capacitor branch — iOS WKWebView does NOT expose
      // navigator.serviceWorker, so the web-only code below crashes
      // with "undefined is not an object (evaluating
      // 'navigator.serviceWorker.getRegistration')". Detect Capacitor
      // first and call the server-side bulk unregister for native
      // tokens instead. After deleting the DB rows, the OS still has
      // notification permission granted (we don't programmatically
      // revoke OS permission — only the user can), but the server
      // won't fan out to this device anymore.
      //
      // After a successful disable we move the button back to
      // "native-pending" so re-tapping it re-runs the registration
      // flow and re-inserts a fresh device_token row.
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        const r = await unregisterAllMyNativeDevicesAction();
        if (r?.error) {
          push({ title: "Couldn't disable", body: r.error, variant: "error" });
          setState("on");
          return;
        }
        push({
          title: "Notifications off",
          body: r?.deleted
            ? `Removed ${r.deleted} device${r.deleted === 1 ? "" : "s"}.`
            : "No active devices to remove.",
          variant: "success",
        });
        setState("native-pending");
        return;
      }

      // Web branch — original path, untouched.
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      push({ title: "Notifications off", variant: "success" });
      setState("off");
    } catch (e: any) {
      push({ title: "Couldn't disable", body: e?.message, variant: "error" });
      setState("on");
    }
  }

  const baseBtn =
    "w-full h-11 rounded-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors";

  if (state === "checking" || state === "busy") {
    return (
      <button disabled className={`${baseBtn} bg-ink-800 hairline text-ink-300`}>
        {state === "busy" ? "Working…" : "Checking…"}
      </button>
    );
  }
  if (state === "unsupported") {
    return (
      <div className="rounded-xl bg-ink-800 hairline p-3 text-[13px] text-ink-300 leading-relaxed">
        This browser doesn&apos;t support push notifications. Try Chrome on Android or Safari (added to Home Screen) on iPhone.
      </div>
    );
  }
  if (state === "native-pending") {
    return (
      <button
        onClick={async () => {
          setState("busy");
          try {
            const { PushNotifications } = await import("@capacitor/push-notifications");
            const perm = await PushNotifications.requestPermissions();
            if (perm.receive !== "granted") {
              setState(perm.receive === "denied" ? "denied" : "native-pending");
              push({ title: "Notifications declined", variant: "error" });
              return;
            }
            await PushNotifications.register();
            push({ title: "Notifications on", variant: "success" });
            setState("on");
          } catch (e: any) {
            push({ title: "Couldn't enable", body: e?.message, variant: "error" });
            setState("native-pending");
          }
        }}
        className={`${baseBtn} bg-gradient-to-b from-gold-300 to-gold-500 text-black`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        Enable push notifications
      </button>
    );
  }
  if (state === "needs-install") {
    return (
      <div className="rounded-xl bg-ink-800 hairline p-3 text-[13px] text-ink-200 leading-relaxed">
        To get push notifications on iPhone, first add this app to your Home Screen:
        <br />
        <span className="text-ink-300">Tap the Share button (square with arrow) → <strong className="text-white">Add to Home Screen</strong></span>
        . Then open it from your Home Screen and come back here.
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="rounded-xl bg-ink-800 hairline p-3 text-[13px] text-ink-200 leading-relaxed">
        Notifications were blocked for this site. Enable them in your browser/device Settings, then refresh.
      </div>
    );
  }
  if (state === "on") {
    return (
      <div className="space-y-2">
        <button onClick={disable} className={`${baseBtn} bg-ink-800 hairline text-ink-200`}>
          Notifications on · tap to disable
        </button>
        <button
          onClick={async () => {
            const r = await sendTestPushAction();
            if (r?.error) {
              push({ title: "Test failed", body: r.error, variant: "error" });
            } else {
              push({
                title: "Test sent",
                body: `${r.sent ?? 0} device${(r.sent ?? 0) === 1 ? "" : "s"} · check your notification tray`,
                variant: "success",
              });
            }
          }}
          className={`${baseBtn} bg-ink-900 hairline text-ink-300 text-[13px]`}
        >
          Send test notification
        </button>
      </div>
    );
  }
  // off
  return (
    <button
      onClick={enable}
      className={`${baseBtn} bg-gradient-to-b from-gold-300 to-gold-500 text-black`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
           strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      Enable push notifications
    </button>
  );
}
