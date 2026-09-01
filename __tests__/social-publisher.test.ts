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
