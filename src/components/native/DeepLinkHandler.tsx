"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Universal Link router for the native (Capacitor) app.
 *
 * When iOS opens the app from a tapped https link (e.g. a shared
 * /app/events/<id>), Capacitor delivers the URL via App.getLaunchUrl()
 * (cold start) or the "appUrlOpen" event (already running). We pull the
 * path off that URL and navigate the in-app WebView to it, so a shared
 * event opens directly to that event instead of the last screen.
 *
 * No-op on plain web (the home-screen PWA / browser) — the Capacitor
 * plugins are only active inside the native shell.
 */
export function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor?.isNativePlatform?.()) return; // web: do nothing
        const { App } = await import("@capacitor/app");

        const navigate = (rawUrl?: string | null) => {
          if (!rawUrl) return;
          let dest = "";
          try {
            const u = new URL(rawUrl);
            dest = u.pathname + u.search + u.hash;
          } catch {
            dest = rawUrl.startsWith("/") ? rawUrl : "";
          }
          // Only follow internal app paths (never an external/foreign URL).
          if (!dest.startsWith("/")) return;
          const current = window.location.pathname + window.location.search;
          if (dest !== current) router.replace(dest);
        };

        // Cold start: the app was launched directly from a link.
        try {
          const launch = await App.getLaunchUrl();
          navigate(launch?.url);
        } catch {
          /* getLaunchUrl can reject on some platforms — ignore */
        }

        // Warm: a link was tapped while the app was already open.
        const sub = await App.addListener("appUrlOpen", (data) =>
          navigate(data?.url),
        );
        cleanup = () => {
          sub.remove();
        };
      } catch (e) {
        console.warn("[deeplink] init failed", e);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [router]);

  return null;
}
