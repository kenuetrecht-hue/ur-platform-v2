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
    bump: 0,
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
        if (typeof parsed.bump === "number" && parsed.bump >= 0 && parsed.bump < 60_000) {
          payload.bump = Math.floor(parsed.bump);
        }
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
    if (!String(client.url || "").startsWith(self.location.origin)) continue;
    client.postMessage(message);
    if (typeof client.navigate === "function") {
      try {
        const next = await client.navigate(absolute);
        if (next && typeof next.focus === "function") return next.focus();
      } catch {
        /* This window could not move to the call. Open one that can. */
      }
    }
  }
  if (self.clients.openWindow) {
    const opened = await self.clients.openWindow(absolute);
    if (opened) return opened;
  }
  const first = list[0];
  if (first && typeof first.focus === "function") return first.focus();
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const isCall = Boolean(payload.roomId);
  const show = async () => {
    if (!isCall) {
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: "ur-social-post",
        icon: "/pwa-icon-192.png",
        data: { url: "/messages", roomId: "" },
      });
      return;
    }
    const existing = await self.registration.getNotifications();
    for (const note of existing) {
      if (typeof note.tag === "string" && note.tag.indexOf("ur-video-call") === 0) note.close();
    }
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: "ur-video-call-" + payload.roomId + "-" + payload.bump,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [400, 200, 400, 200, 800],
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      timestamp: Date.now(),
      actions: [
        { action: "answer", title: "Answer the call" },
        { action: "decline", title: "Decline" },
      ],
      data: {
        url: safeCallPath(payload.url, payload.roomId, false),
        roomId: payload.roomId,
      },
    });
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of list) {
      client.postMessage({ type: "ur-incoming-call", roomId: payload.roomId });
    }
  };
  event.waitUntil(show());
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
