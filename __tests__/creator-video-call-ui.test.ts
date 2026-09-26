import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("1-to-1 call UI is on website and app screens", () => {
  it("puts a Call button on Social feed, friends, and creator subscriptions", () => {
    const hub = readFileSync("components/social-hub-panel.tsx", "utf8");
    const feed = readFileSync("components/social-feed-panel.tsx", "utf8");
    expect(hub).toContain("Video call");
    expect(hub).toContain("callingPeerId === f.peerUserId");
    expect(hub).toContain("CreatorCallButton");
    expect(feed).toContain("CreatorCallButton");
  });

  it("lets creators set a 1-to-1 price on the creator dashboard", () => {
    const dash = readFileSync("components/content-creator-dashboard-panel.tsx", "utf8");
    expect(dash).toContain("CreatorVideoCallPricePanel");
  });

  it("opens the same call page from the native in-app browser", () => {
    const panel = readFileSync("components/friend-video-call-panel.tsx", "utf8");
    const page = readFileSync("app/call/[roomId].tsx", "utf8");
    expect(panel).toContain("mediaReady");
    expect(panel).toContain("remoteAudioRef");
    expect(panel).toContain("Only this person is being called.");
    expect(panel).not.toContain("<audio");
    expect(readFileSync("components/incoming-video-call-dock.tsx", "utf8")).toContain("is calling you");
    expect(readFileSync("components/incoming-video-call-dock.tsx", "utf8")).toContain("Decline");
    expect(panel).toContain("ev.track");
    expect(panel).toContain('roomData?.status !== "ended"');
    expect(panel).toContain("row.fromUserId === selfId");
    expect(readFileSync("components/incoming-video-call-dock.tsx", "utf8")).toContain("Incoming video call");
    expect(readFileSync("components/social-hub-panel.tsx", "utf8")).not.toContain(
      'startFriendCall.isPending ? "Calling…"',
    );
    expect(readFileSync("app/_layout.tsx", "utf8")).toContain("IncomingVideoCallDock");
    expect(panel).toContain("mintCallAccess");
    expect(panel).toContain("heartbeatVideoCall");
    expect(panel).toContain("iceServers.useMutation");
    expect(panel).not.toContain("iceServers.fetch");
    expect(page).toContain("accessToken");
    expect(page).toContain("readHashCallToken");
    expect(page).not.toContain("params.t");
    const routerSrc = readFileSync("server/routers/social-router.ts", "utf8");
    expect(routerSrc).toContain("#t=${encodeURIComponent(token)}");
    expect(routerSrc).not.toContain("?t=${encodeURIComponent(token)}");
  });
});
