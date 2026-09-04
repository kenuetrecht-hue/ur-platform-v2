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
