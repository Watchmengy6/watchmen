"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface InAppBanner {
  id: number;
  title: string;
  body: string;
  url: string;
}

/**
 * Listens for push payloads broadcast from the service worker and renders an
 * iMessage-style in-app banner at the top of the screen. iOS suppresses the
 * system push notification when the app is in the foreground (PWA), so we
 * surface it inside the app ourselves.
 */
export function PushReceiver() {
  const [banners, setBanners] = useState<InAppBanner[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    function onMessage(e: MessageEvent) {
      const data = e?.data;
      if (!data || data.type !== "watchmen:push" || !data.payload) return;
      const p = data.payload as { title?: string; body?: string; url?: string; tag?: string };
      // Don't notify about the page we're already on (e.g. you're in the
      // DM thread that just got a message).
      if (p.url && pathname && p.url === pathname) return;
      const id = Date.now() + Math.random();
      setBanners((prev) => [
        ...prev,
        {
          id,
          title: p.title || "The Watchmen",
          body: p.body || "",
          url: p.url || "/app/home",
        },
      ]);
      // Auto-dismiss after 5s.
      setTimeout(() => {
        setBanners((prev) => prev.filter((b) => b.id !== id));
      }, 5000);
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [pathname]);

  if (banners.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[200] flex flex-col items-center gap-2 px-3 pointer-events-none"
      style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      {banners.map((b) => (
        <button
          key={b.id}
          onClick={() => {
            setBanners((prev) => prev.filter((x) => x.id !== b.id));
            router.push(b.url);
          }}
          className="pointer-events-auto w-full max-w-md rounded-2xl bg-ink-800/95 backdrop-blur-xl hairline shadow-2xl ring-1 ring-gold-500/30 px-4 py-3 text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-black">
                <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[14px] font-semibold truncate">{b.title}</div>
              {b.body ? (
                <div className="text-ink-200 text-[13px] mt-0.5 line-clamp-2">{b.body}</div>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
