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

function safeRoomId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value) ? value : "";
}

function safeCallPath(value, roomId, decline) {
  const answer = roomId ? `/call/${roomId}?pickUp=1` : "";
  if (decline && roomId) return `/call/${roomId}?decline=1`;
  if (answer && value === answer) return answer;
  if (answer) return answer;
  return "/messages";
}

function readPushPayload(event) {
  const payload = {
    title: "Incoming video call",
    body: "Someone is calling you on UR Platform. Tap Answer to pick up.",
    url: "/messages",
    roomId: "",
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
        payload.roomId = safeRoomId(parsed.roomId);
        if (
          payload.roomId &&
          typeof parsed.url === "string" &&
          parsed.url === `/call/${payload.roomId}?pickUp=1`
        ) {
          payload.url = parsed.url;
        }
      }
    }
  } catch {
    /* keep the default incoming-call copy */
  }
  return payload;
}

async function openCallPage(target, message) {
  const absolute = new URL(target, self.location.origin).href;
  const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of list) {
    client.postMessage(message);
    if (typeof client.navigate === "function") {
      try {
        await client.navigate(absolute);
      } catch {
        /* The focused page still receives the message above. */
      }
    }
    if (typeof client.focus === "function") return client.focus();
  }
  if (self.clients.openWindow) return self.clients.openWindow(absolute);
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const isCall = Boolean(payload.roomId);
  event.waitUntil(
    self.registration
      .showNotification(payload.title, {
        body: payload.body,
        tag: isCall ? "ur-video-call" : "ur-social-post",
        renotify: isCall,
        requireInteraction: isCall,
        vibrate: isCall ? [180, 120, 180, 120, 420] : [80, 40, 80],
        icon: "/pwa-icon-192.png",
        actions: isCall
          ? [
              { action: "answer", title: "Answer the call" },
              { action: "decline", title: "Decline" },
            ]
          : [],
        data: {
          url: isCall ? safeCallPath(payload.url, payload.roomId, false) : "/messages",
          roomId: payload.roomId,
        },
      })
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((list) => {
        if (!isCall) return;
        for (const client of list) {
          client.postMessage({ type: "ur-incoming-call", roomId: payload.roomId });
        }
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const roomId = safeRoomId(data.roomId);
  if (!roomId) {
    event.waitUntil(openCallPage("/messages", { type: "ur-social-post" }));
    return;
  }
  const decline = event.action === "decline";
  const target = safeCallPath(data.url, roomId, decline);
  event.waitUntil(
    openCallPage(target, {
      type: decline ? "ur-decline-call" : "ur-answer-call",
      roomId,
    }),
  );
});
