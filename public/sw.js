// The Watchmen — Service Worker
// Handles incoming Web Push messages and routes notification clicks
// back to the right app screen.

self.addEventListener("install", (event) => {
  // Activate immediately on first install so push works without a reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
  const options = {
    body: payload.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || undefined,
    renotify: !!payload.renotify,
    data: { url: payload.url || "/app/home" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
