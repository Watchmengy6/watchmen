"use client";

import { useEffect } from "react";
import { registerNativeDeviceTokenAction } from "@/lib/push/native";

// Module-level guard — the bridge must only wire once per app session.
let bridged = false;

/**
 * Native push bridge for the /pending screen (July 2026 signup wave).
 *
 * Two stacked bugs meant pending members NEVER got the "You've been
 * approved 🎉" push, even after enabling notifications:
 *   1. The global registration listener (NativePushRegistrar →
 *      initNativePush) only mounts inside the APPROVED /app layout —
 *      on /pending, EnablePushButton called register() but nobody
 *      caught the token callback, so it was never sent to the server.
 *   2. registerNativeDeviceTokenAction rejected non-approved members
 *      ("Approval required") — fixed alongside this component.
 *
 * This bridge, mounted on /pending:
 *   - wires a registration listener that saves the token (so the
 *     EnablePushButton tap now actually works here), and
 *   - if permission is ALREADY granted, silently re-registers — which
 *     retroactively rescues every member who tapped enable before the
 *     fix and is still waiting for approval.
 *
 * It never prompts — the EnablePushButton stays the one contextual ask.
 */
export function PendingPushBridge() {
  useEffect(() => {
    (async () => {
      if (bridged) return;
      if (typeof window === "undefined") return;
      const cap = (window as any).Capacitor;
      if (!cap?.isNativePlatform?.()) return;
      bridged = true;

      try {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );

        PushNotifications.addListener(
          "registration",
          async (token: { value: string }) => {
            try {
              const platform =
                cap?.getPlatform?.() === "android" ? "android" : "ios";
              const res = await registerNativeDeviceTokenAction({
                token: token.value,
                platform,
                userAgent: navigator.userAgent ?? undefined,
              });
              if (res?.error) {
                console.warn("[push.pending] register action failed:", res.error);
              }
            } catch (e) {
              console.warn("[push.pending] register action threw", e);
            }
          },
        );

        // Silent re-register — ONLY when the member already granted
        // permission (either just now via the button, or before this
        // fix shipped). Never prompts.
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.register();
        }
      } catch (e) {
        console.warn("[push.pending] bridge failed (non-fatal)", e);
      }
    })();
  }, []);

  return null;
}
