/* Network-only worker so browsers can install UR from this website.
 * Do not cache HTML or JS — a stale Expo bundle would break the app. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Leave the request on the network. Presence of this listener is enough
  // for Chrome's "install from website" check.
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Incoming video call",
    body: "Someone is calling you on UR",
    url: "/messages",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string" && parsed.title.length > 0 && parsed.title.length < 80) {
          payload.title = parsed.title;
        }
        if (typeof parsed.body === "string" && parsed.body.length > 0 && parsed.body.length < 180) {
          payload.body = parsed.body;
        }
        if (typeof parsed.url === "string" && parsed.url.startsWith("/") && !parsed.url.startsWith("//")) {
          payload.url = parsed.url;
        }
      }
    }
  } catch {
    /* keep the default incoming-call copy */
  }
  event.waitUntil(
    self.registration
      .showNotification(payload.title, {
        body: payload.body,
        tag: "ur-video-call",
        renotify: true,
        requireInteraction: true,
        vibrate: [180, 120, 180, 120, 420],
        icon: "/pwa-icon-192.png",
        data: { url: payload.url },
      })
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((list) => {
        for (const client of list) {
          client.postMessage({ type: "ur-incoming-call" });
        }
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/messages";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
