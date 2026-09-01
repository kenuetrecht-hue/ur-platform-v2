import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../server/_core/google-ai", () => ({
  isGoogleCloudAiConfigured: () => false,
  generateGoogleChatReply: vi.fn(async () => ({
    reply: "English copy for owner review.",
    model: "test",
  })),
}));
import { TRPCError } from "@trpc/server";
import {
  _resetWorldMonitorForTests,
  assertNotUnderWorldReview,
  getNativeLanguage,
  inferSpokenLanguage,
  listWorldRedFlagsForOwner,
  monitorWorldCommunication,
  rememberNativeLanguage,
  tryApplyWorldReviewCommand,
} from "../server/_core/world-monitor-service";
import { MULTILINGUAL_CAPABILITY_PROMPT } from "../server/_core/multilingual-prompts";

describe("World Director monitor", () => {
  beforeEach(() => _resetWorldMonitorForTests());

  it("treats mixed Spanish and English as Spanish native language", () => {
    const mixed = "Hola amigo, let's learn a trade. ¿Cómo estás?";
    expect(inferSpokenLanguage(mixed)).toBe("Spanish");
    rememberNativeLanguage("member-es", "Hello friend");
    expect(getNativeLanguage("member-es")).toBe("English");
    rememberNativeLanguage("member-es", mixed);
    expect(getNativeLanguage("member-es")).toBe("Spanish");
  });

  it("pauses a member on hate/harassment and sends an English red flag", async () => {
    const flag = await monitorWorldCommunication({
      userId: "member-bad",
      userEmail: "bad@example.com",
      channel: "direct_message",
      original: "Join our hate group and harass them until they leave.",
      english: "Join our hate group and harass them until they leave.",
    });
    expect(flag).not.toBeNull();
    expect(flag?.status).toBe("paused_review");
    expect(flag?.ownerNotice).toMatch(/RED FLAG/i);
    expect(flag?.ownerNotice).toMatch(/English/i);
    expect(flag?.memberWarning.toLowerCase()).toMatch(/paused|review/);
    expect(flag?.memberWarningEnglish.toLowerCase()).toMatch(/paused for review/);
    expect(flag?.originalExcerpt).toBe("Join our hate group and harass them until they leave.");
    expect(flag?.englishExcerpt).toContain("hate group");
    expect(flag?.recommendation).toMatch(/REACTIVATE WORLD USER member-bad/);
    expect(listWorldRedFlagsForOwner()[0]?.userId).toBe("member-bad");
    expect(() => assertNotUnderWorldReview({ userId: "member-bad" })).toThrow(TRPCError);
  });

  it("never pauses the platform owner", async () => {
    const flag = await monitorWorldCommunication({
      userId: "owner",
      channel: "ai_chat",
      original: "Join our hate group",
      english: "Join our hate group",
      isPlatformOwner: true,
    });
    expect(flag).toBeNull();
    expect(() =>
      assertNotUnderWorldReview({ userId: "owner", isPlatformOwner: true }),
    ).not.toThrow();
  });

  it("does not stack a second hold while already paused", async () => {
    await monitorWorldCommunication({
      userId: "member-bad",
      channel: "ai_chat",
      original: "I will harass you",
      english: "I will harass you",
    });
    const second = await monitorWorldCommunication({
      userId: "member-bad",
      channel: "ai_chat",
      original: "Join a hate group",
      english: "Join a hate group",
    });
    expect(second?.status).toBe("paused_review");
    expect(listWorldRedFlagsForOwner()).toHaveLength(1);
  });

  it("lets the owner reactivate after review", async () => {
    await monitorWorldCommunication({
      userId: "member-ok",
      channel: "social_post",
      original: "white supremacist trash talk",
      english: "white supremacist trash talk",
    });
    expect(() => assertNotUnderWorldReview({ userId: "member-ok" })).toThrow();
    const reply = await tryApplyWorldReviewCommand("REACTIVATE WORLD USER member-ok");
    expect(reply).toMatch(/Reactivated/i);
    expect(() => assertNotUnderWorldReview({ userId: "member-ok" })).not.toThrow();
  });

  it("lets the owner discontinue after review", async () => {
    await monitorWorldCommunication({
      userId: "member-out",
      channel: "direct_message",
      original: "I will stalk and doxx you",
      english: "I will stalk and doxx you",
    });
    const reply = await tryApplyWorldReviewCommand("DISCONTINUE WORLD USER member-out");
    expect(reply).toMatch(/Discontinued/i);
    expect(() => assertNotUnderWorldReview({ userId: "member-out" })).toThrow(TRPCError);
  });

  it("does not pause friendly talk", async () => {
    const flag = await monitorWorldCommunication({
      userId: "member-good",
      channel: "ai_chat",
      original: "Hello friend, let's learn a trade together.",
      english: "Hello friend, let's learn a trade together.",
    });
    expect(flag).toBeNull();
    expect(() => assertNotUnderWorldReview({ userId: "member-good" })).not.toThrow();
  });

  it("keeps a foreign-language original next to an English copy on the red-flag file", async () => {
    const original = "Hola amigo, join our hate group. ¿Cómo estás?";
    const flag = await monitorWorldCommunication({
      userId: "member-es-flag",
      channel: "direct_message",
      original,
      english: original,
    });
    expect(flag).not.toBeNull();
    expect(flag?.nativeLanguage).toBe("Spanish");
    expect(flag?.originalExcerpt).toBe(original);
    expect(flag?.englishExcerpt).toBeTruthy();
    expect(flag?.englishExcerpt).not.toBe(original);
    expect(flag?.translated).toBe(true);
    expect(flag?.memberWarningEnglish.toLowerCase()).toMatch(/paused for review/);
    expect(flag?.ownerNotice).toContain("English copy");
    expect(flag?.ownerNotice).toContain(original);
  });

  it("tells specialists to reply in the stored native language when members mix languages", () => {
    expect(MULTILINGUAL_CAPABILITY_PROMPT.toLowerCase()).toContain("native language");
    expect(MULTILINGUAL_CAPABILITY_PROMPT.toLowerCase()).toContain("mix");
  });
});
