// The Watchmen — Service Worker
// Handles:
//   1. Incoming Web Push and notification clicks (existing).
//   2. App shell + static asset caching so repeat opens feel native-fast.
//
// Cache strategy:
//   - Static assets (icons, logos, manifest, fonts, _next/static/*) →
//     cache-first with background refresh ("stale-while-revalidate").
//   - App pages (/app/*, /, /login) → network-first, falling back to
//     cache only if the network fails. We never want to serve a stale
//     RSC payload when the network is healthy.
//   - Supabase API / push / auth → never cached.

const CACHE_VERSION = "watchmen-v3";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

self.addEventListener("install", () => {
  // Activate immediately on first install so push + caching work without a reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim clients AND nuke any caches that don't match the current version
  // so a SW update doesn't leave the user on stale assets.
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Helpers ---------------------------------------------------------------

function isAssetRequest(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/logo") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(png|jpe?g|svg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$/i.test(
      url.pathname,
    )
  );
}

function isPageRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (request.method !== "GET") return false;
  // Don't cache the SW itself, push endpoint, or any API/auth path.
  if (url.pathname === "/sw.js") return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/auth/")) return false;
  // We treat HTML navigations as page requests.
  const accept = request.headers.get("accept") || "";
  return request.mode === "navigate" || accept.includes("text/html");
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  // Return cache immediately if we have it; otherwise wait for network.
  return cached || fetchPromise;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && request.method === "GET") {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline and no cache");
  }
}

// Fetch interception ----------------------------------------------------

self.addEventListener("fetch", (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // Skip cross-origin requests entirely (Supabase, web-push, etc).
  if (url.origin !== self.location.origin) return;

  if (isAssetRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (isPageRequest(request, url)) {
    event.respondWith(networkFirst(request));
    return;
  }
  // Everything else falls through to the network.
});

// Push (unchanged) ------------------------------------------------------

self.addEventListener("push", (event) => {
  let payload = { title: "The Watchmen", body: "" };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (_) {
    try {
      const text = event.data && event.data.text();
      if (text) payload = { title: "The Watchmen", body: text };
    } catch (_) {}
  }

  const title = payload.title || "The Watchmen";
  const targetUrl = payload.url || "/app/home";
  const options = {
    body: payload.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || undefined,
    renotify: !!payload.renotify,
    data: { url: targetUrl },
  };

  event.waitUntil(
    (async () => {
      let hasVisibleClient = false;
      try {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        // 1) Broadcast to open tabs so they can show an in-app banner.
        for (const client of clients) {
          client.postMessage({
            type: "watchmen:push",
            payload: { title, body: options.body, url: targetUrl, tag: options.tag },
          });
          // visibilityState 'visible' means the user is actively viewing this tab.
          if (client.visibilityState === "visible") {
            hasVisibleClient = true;
          }
        }
      } catch (_) {}

      // 2) Only fire the OS notification when no visible app tab is in
      //    foreground. Avoids double-notifying (in-app banner + system banner).
      //    Background/locked = no visible client = system notification fires.
      if (!hasVisibleClient) {
        await self.registration.showNotification(title, options);
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app/home";

  event.waitUntil(
    (async () => {
      // If a tab is already open, focus it and navigate.
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) await client.navigate(targetUrl);
            return;
          } catch (_) {}
        }
      }
      // Otherwise open a fresh window.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
