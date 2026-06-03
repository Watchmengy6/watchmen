"use client";

import { useEffect } from "react";

/**
 * Mounts inside the authenticated app shell and kicks off native push
 * registration when the app is running inside Capacitor. No-op on web.
 *
 * Kept separate from the existing PushReceiver (which renders in-app
 * banners for incoming pushes) so the web and native bootstrap paths
 * don't tangle.
 */
export function NativePushRegistrar() {
  useEffect(() => {
    // Lazy import the helper so the heavy initialization (and the
    // dynamic import of @capacitor/push-notifications inside it) only
    // executes once we know we're in the browser.
    (async () => {
      try {
        const { initNativePush } = await import("@/lib/push/nativeClient");
        await initNativePush();
      } catch (e) {
        console.warn("[push.native] init failed", e);
      }
    })();
  }, []);

  return null;
}
