import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  _resetCallRingsForTests,
  buildCallRingPayload,
  callRingCallerLabel,
  listCallNotices,
  listCallRingSubscriptions,
  recordCallNotice,
  saveCallRingSubscription,
  shouldRepeatCallRing,
} from "../server/_core/call-ring-service";

describe("incoming video call rings the phone", () => {
  it("names the caller without putting an email on the lock screen", () => {
    expect(callRingCallerLabel("Ada")).toBe("Ada");
    expect(callRingCallerLabel("ada@example.com")).toBe("A friend");
    expect(callRingCallerLabel("")).toBe("A friend");
    const payload = JSON.parse(buildCallRingPayload({ callerLabel: "Ada", roomId: "room-1" })) as {
      title: string;
      body: string;
      url: string;
    };
    expect(payload.title).toBe("Incoming video call");
    expect(payload.body).toContain("Ada");
    expect(payload.body).toContain("UR Platform");
    expect(payload.body).toContain("Answer");
    expect(payload.body).not.toContain("@");
    expect(payload.url).toBe("/call/room-1?pickUp=1");
  });

  it("keeps only https push subscriptions for that person", () => {
    _resetCallRingsForTests();
    saveCallRingSubscription("9", {
      endpoint: "http://evil.example/push",
      keys: { p256dh: "abc", auth: "def" },
    });
    saveCallRingSubscription("9", {
      endpoint: "https://push.example/subscription",
      keys: { p256dh: "abc", auth: "def" },
    });
    expect(listCallRingSubscriptions("9")).toEqual([
      {
        endpoint: "https://push.example/subscription",
        keys: { p256dh: "abc", auth: "def" },
      },
    ]);
    expect(shouldRepeatCallRing("ringing")).toBe(true);
    expect(shouldRepeatCallRing("active")).toBe(false);
    expect(shouldRepeatCallRing("ended")).toBe(false);
  });

  it("wires the ring from the call, the open site, and the installed site", () => {
    const router = readFileSync("server/routers/social-router.ts", "utf8");
    const dock = readFileSync("components/incoming-video-call-dock.tsx", "utf8");
    const worker = readFileSync("public/sw.js", "utf8");
    expect(router).toContain("ringCallee");
    expect(router).toContain("registerCallRing");
    expect(dock).toContain("startCallRingtone");
    expect(dock).toContain("subscribeCallRing");
    expect(worker).toContain('addEventListener("push"');
    expect(worker).toContain('addEventListener("notificationclick"');
    expect(worker).toContain("ur-incoming-call");
    expect(worker).toContain("silent: false");
    expect(worker).toContain('title: "Answer the call"');
    expect(worker).toContain("ur-video-call-");
    expect(worker).toContain("getNotifications");
    expect(worker).toContain("ur-answer-call");
    expect(worker).toContain("clients.openWindow");
    expect(worker.indexOf("clients.openWindow")).toBeGreaterThan(worker.indexOf("client.navigate"));
    expect(dock).toContain("roomOpenedFromNotification");
    expect(dock).toContain('get("pickUp")');
  });

  it("keeps a note that someone tried to call, even after the ring stops", async () => {
    _resetCallRingsForTests();
    recordCallNotice({
      callerUserId: "owner",
      calleeUserId: "buddy",
      callerName: "Kenneth",
      roomId: "room-9",
    });
    const notes = await listCallNotices("buddy");
    expect(notes).toHaveLength(1);
    expect(notes[0]?.callerName).toBe("Kenneth");
    expect(notes[0]?.callerName).not.toContain("@");
  });
});
