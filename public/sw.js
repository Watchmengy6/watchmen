// The Watchmen — Service Worker
// Handles incoming Web Push messages and routes notification clicks
// back to the right app screen. Also broadcasts to open tabs so the
// app can render an in-app banner when the user is actively using it
// (iOS suppresses the system banner in foreground).

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
