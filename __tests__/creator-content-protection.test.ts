import { describe, expect, it, beforeEach } from "vitest";
import {
  findImpersonationMatch,
  isReservedCreatorName,
  normalizeContentText,
  textSimilarity,
} from "../lib/creator-content-protection-core";
import {
  __resetContentProtectionForTests,
  markCreatorIdentityVerified,
  registerAndVerifyContent,
  registerCreatorIdentity,
  ContentProtectionError,
  submitProtectionReport,
  ownerReviewReport,
  getUserProtectionStatus,
} from "../server/_core/creator-content-protection-service";

describe("creator-content-protection-core", () => {
  it("blocks reserved platform names", () => {
    expect(isReservedCreatorName("ContentMate")).toBe(true);
    expect(isReservedCreatorName("Jane's Marina Tips")).toBe(false);
  });

  it("detects near-identical display names", () => {
    const match = findImpersonationMatch("MarinaMike", [
      { userId: "u1", displayName: "MarinaMike" },
    ], "u2");
    expect(match).not.toBeNull();
    expect(match!.existingUserId).toBe("u1");
  });

  it("flags cloned captions via text similarity", () => {
    const original =
      "Winterize outboard motor step by step before cold storage every fall season now";
    const clone = original;
    expect(textSimilarity(original, clone)).toBe(1);
    expect(normalizeContentText(original)).not.toBe("");
  });
});

describe("creator-content-protection-service", () => {
  beforeEach(() => {
    __resetContentProtectionForTests();
  });

  it("registers first creator and blocks impersonator enrollment", () => {
    registerCreatorIdentity({ userId: "creator-a", displayName: "Captain Ken" });
    expect(() =>
      registerCreatorIdentity({ userId: "fake-a", displayName: "Captain Ken" }),
    ).toThrow(ContentProtectionError);
  });

  it("blocks exact duplicate content from another creator (original mode)", () => {
    registerCreatorIdentity({ userId: "creator-a", displayName: "Creator A" });
    registerCreatorIdentity({ userId: "creator-b", displayName: "Creator B" });

    const body = "My original marina maintenance checklist for spring launch.";
    registerAndVerifyContent({
      ownerUserId: "creator-a",
      source: "social_post",
      sourceId: "post-1",
      body,
    });

    expect(() =>
      registerAndVerifyContent({
        ownerUserId: "creator-b",
        source: "social_post",
        sourceId: "post-2",
        body,
      }),
    ).toThrow(ContentProtectionError);
  });

  it("allows licensed repost of public content with attribution", () => {
    registerCreatorIdentity({ userId: "creator-a", displayName: "Creator A" });
    registerCreatorIdentity({ userId: "creator-b", displayName: "Creator B" });

    const body = "Spring marina checklist — shared from the public feed.";
    registerAndVerifyContent({
      ownerUserId: "creator-a",
      source: "social_post",
      sourceId: "post-1",
      body,
    });

    expect(() =>
      registerAndVerifyContent({
        ownerUserId: "creator-b",
        source: "social_post",
        sourceId: "post-2",
        body,
        contentRightsMode: "licensed_repost",
        attributionSourceName: "Creator A",
        licenseType: "platform_public",
      }),
    ).not.toThrow();
  });

  it("applies publish block after three confirmed strikes", () => {
    registerCreatorIdentity({ userId: "bad-actor", displayName: "Copy Cat" });

    for (let i = 0; i < 3; i++) {
      const report = submitProtectionReport({
        reporterUserId: "victim",
        reportType: "content_theft",
        subjectUserId: "bad-actor",
        description: `Stolen post batch ${i + 1} from my channel.`,
      });
      ownerReviewReport({
        reportId: report.id,
        ownerUserId: "owner-1",
        decision: "confirmed",
      });
    }

    const status = getUserProtectionStatus("bad-actor");
    expect(status.strikes.strikeCount).toBe(3);
    expect(status.canPublish).toBe(false);
  });

  it("locks a verified creator name so it cannot be stolen by a rename", () => {
    registerCreatorIdentity({ userId: "real-creator", displayName: "Harbor Hanna" });
    markCreatorIdentityVerified("real-creator");

    expect(() =>
      registerCreatorIdentity({ userId: "real-creator", displayName: "Totally Different" }),
    ).toThrow(ContentProtectionError);

    expect(() =>
      registerCreatorIdentity({ userId: "imposter", displayName: "Harbor Hanna" }),
    ).toThrow(ContentProtectionError);
  });
});
