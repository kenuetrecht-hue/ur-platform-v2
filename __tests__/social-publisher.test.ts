import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  getSocialPublisherStatus,
  publishOwnerSocialPost,
  resolveNetworkRoute,
  _resetSocialPublisherForTests,
  _setSocialPublisherFetchForTests,
} from "../server/_core/social-publisher-service";

const SOCIAL_ENV = [
  "AYRSHARE_API_KEY",
  "AYRSHARE_PROFILE_KEY",
  "BUFFER_ACCESS_TOKEN",
  "BUFFER_FACEBOOK_PROFILE_ID",
  "BUFFER_INSTAGRAM_PROFILE_ID",
  "BUFFER_TWITTER_PROFILE_ID",
  "SOCIAL_ROUTE_FACEBOOK",
  "SOCIAL_ROUTE_INSTAGRAM",
  "SOCIAL_ROUTE_TWITTER",
] as const;

const saved: Record<string, string | undefined> = {};

function clearSocialEnv(): void {
  for (const key of SOCIAL_ENV) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreSocialEnv(): void {
  for (const key of SOCIAL_ENV) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

describe("social publisher routing", () => {
  afterEach(() => {
    _resetSocialPublisherForTests();
    restoreSocialEnv();
  });

  it("uses Ayrshare alone when only that key is set", async () => {
    clearSocialEnv();
    process.env.AYRSHARE_API_KEY = "test-ayrshare";
    expect(resolveNetworkRoute("instagram")).toMatchObject({
      publisher: "ayrshare",
      ready: true,
    });
    await expect(getSocialPublisherStatus()).resolves.toMatchObject({ mode: "ayrshare" });
  });

  it("uses Buffer alone when only that token and profile are set", () => {
    clearSocialEnv();
    process.env.BUFFER_ACCESS_TOKEN = "test-buffer";
    process.env.BUFFER_INSTAGRAM_PROFILE_ID = "ig-1";
    expect(resolveNetworkRoute("instagram")).toMatchObject({
      publisher: "buffer",
      ready: true,
    });
    expect(resolveNetworkRoute("facebook").ready).toBe(false);
  });

  it("refuses a network when both publishers can post until a route is set", () => {
    clearSocialEnv();
    process.env.AYRSHARE_API_KEY = "test-ayrshare";
    process.env.BUFFER_ACCESS_TOKEN = "test-buffer";
    process.env.BUFFER_INSTAGRAM_PROFILE_ID = "ig-1";
    const route = resolveNetworkRoute("instagram");
    expect(route.ready).toBe(false);
    expect(route.publisher).toBeNull();
    expect(route.reason).toMatch(/SOCIAL_ROUTE_INSTAGRAM/);
  });

  it("splits networks so Ayrshare and Buffer never share the same one", async () => {
    clearSocialEnv();
    process.env.AYRSHARE_API_KEY = "test-ayrshare";
    process.env.BUFFER_ACCESS_TOKEN = "test-buffer";
    process.env.BUFFER_TWITTER_PROFILE_ID = "x-1";
    process.env.SOCIAL_ROUTE_INSTAGRAM = "ayrshare";
    process.env.SOCIAL_ROUTE_TWITTER = "buffer";
    expect(resolveNetworkRoute("instagram")).toMatchObject({
      publisher: "ayrshare",
      ready: true,
    });
    expect(resolveNetworkRoute("twitter")).toMatchObject({
      publisher: "buffer",
      ready: true,
    });
    await expect(getSocialPublisherStatus()).resolves.toMatchObject({ mode: "split" });
  });

  it("does not call a post sent when Ayrshare answers with an error", async () => {
    clearSocialEnv();
    process.env.AYRSHARE_API_KEY = "test-ayrshare";
    _setSocialPublisherFetchForTests(async () =>
      new Response(JSON.stringify({ status: "error", message: "No social accounts linked" }), {
        status: 200,
      }),
    );
    await expect(
      publishOwnerSocialPost({
        body: "Hello from UR",
        platforms: ["facebook"],
      }),
    ).rejects.toThrow(/No social accounts linked/);
  });

  it("does not treat an Ayrshare web page as a sent post", async () => {
    clearSocialEnv();
    process.env.AYRSHARE_API_KEY = "test-ayrshare";
    let postedTo = "";
    _setSocialPublisherFetchForTests(async (url) => {
      postedTo = String(url);
      return new Response("<!DOCTYPE html><html><body>Bad Gateway</body></html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      });
    });
    await expect(
      publishOwnerSocialPost({
        body: "Hello from UR",
        platforms: ["facebook"],
      }),
    ).rejects.toThrow(/web page/i);
    expect(postedTo).toBe("https://api.ayrshare.com/api/post");
  });

  it("lets Post now receive the click and send to the linked accounts", () => {
    const panel = readFileSync("components/owner-social-publisher-panel.tsx", "utf8");
    expect(panel).toContain("AppPressable");
    expect(panel).toContain('testID="owner-social-post-now"');
    expect(panel).toContain("pointerEvents=\"none\"");
    expect(panel).not.toContain("<Pressable");
    expect(panel).toContain("readyNetworks.map");
  });

  it("blocks the same caption on the same network twice in 24 hours", async () => {
    clearSocialEnv();
    process.env.AYRSHARE_API_KEY = "test-ayrshare";
    _setSocialPublisherFetchForTests(async () =>
      new Response(JSON.stringify({ id: "post-1" }), { status: 200 }),
    );
    await publishOwnerSocialPost({
      body: "Have Songwriter write a UR anthem",
      platforms: ["facebook"],
    });
    await expect(
      publishOwnerSocialPost({
        body: "Have Songwriter write a UR anthem",
        platforms: ["facebook"],
      }),
    ).rejects.toThrow(/already went out/);
  });
});
