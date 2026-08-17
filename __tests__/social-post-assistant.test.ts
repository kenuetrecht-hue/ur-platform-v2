import { describe, it, expect, vi } from "vitest";
import {
  purchaseSocialPostAssistant,
  hasSocialPostAssistantAccess,
  getSocialPostAssistantStatus,
  generateSocialPostDraft,
  POST_ASSISTANT_PLANS,
} from "../server/_core/social-post-assistant-service";

vi.mock("../server/_core/google-ai", () => ({
  isGoogleCloudAiConfigured: vi.fn(() => false),
  generateGoogleChatReply: vi.fn(async () => "Great hike! 🥾 #WeekendVibes"),
}));

describe("Social Post Assistant", () => {
  const userId = "spa-user-1";
  const userEmail = "spa@test.com";

  it("exposes subscription plans with assists and pricing", () => {
    expect(POST_ASSISTANT_PLANS.month.priceCents).toBe(1199);
    expect(POST_ASSISTANT_PLANS.month.assists).toBe(80);
    expect(POST_ASSISTANT_PLANS.day.assists).toBe(5);
  });

  it("grants access after purchase and tracks remaining assists", () => {
    expect(hasSocialPostAssistantAccess(userId)).toBe(false);

    const sub = purchaseSocialPostAssistant({ userId, userEmail, plan: "day" });
    expect(sub.plan).toBe("day");
    expect(hasSocialPostAssistantAccess(userId)).toBe(true);

    const status = getSocialPostAssistantStatus(userId);
    expect(status.hasAccess).toBe(true);
    expect(status.assistsRemaining).toBe(POST_ASSISTANT_PLANS.day.assists);
  });

  it("consumes assist credits when generating drafts", async () => {
    const draftUser = "spa-user-draft";
    purchaseSocialPostAssistant({ userId: draftUser, userEmail: "draft@test.com", plan: "day" });

    const result = await generateSocialPostDraft({
      userId: draftUser,
      userName: "Alex",
      prompt: "Had a great weekend hiking",
      tone: "casual",
      isPlatformOwner: false,
    });

    expect(result.draft.length).toBeGreaterThan(0);
    expect(result.aiAssisted).toBe(true);

    const status = getSocialPostAssistantStatus(draftUser);
    expect(status.assistsRemaining).toBe(POST_ASSISTANT_PLANS.day.assists - 1);
  });

  it("platform owner gets unlimited assists without purchase", async () => {
    const result = await generateSocialPostDraft({
      userId: "owner-user",
      userName: "Owner",
      prompt: "Sharing platform news",
      isPlatformOwner: true,
    });
    expect(result.draft.length).toBeGreaterThan(0);
    expect(result.assistsRemaining).toBe(999);
  });
});
