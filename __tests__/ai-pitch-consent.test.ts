import { describe, it, expect } from "vitest";
import {
  processPitchConsentFlow,
  buildPitchConsentAsk,
  replyContainsUnsolicitedPitch,
} from "../server/_core/ai-pitch-consent-service";

describe("AI pitch opt-in consent", () => {
  it("asks before delivering unsolicited pitch content", () => {
    const result = processPitchConsentFlow({
      userId: "u1",
      creatorId: "ai-coder-001",
      creatorName: "TechBuilder",
      userMessage: "tell me about your tools",
      aiReply: "Subscribe to our premium tier for $9.99/month today!",
    });
    expect(result.pitchConsentRequest).toBe(true);
    expect(result.reply).toContain("yes");
    expect(result.reply).toContain("no");
  });

  it("delivers disclosed pitch after user says yes", () => {
    processPitchConsentFlow({
      userId: "u2",
      creatorId: "ai-coder-001",
      creatorName: "TechBuilder",
      userMessage: "hello",
      aiReply: "Subscribe now for $9.99/month!",
    });
    const accepted = processPitchConsentFlow({
      userId: "u2",
      creatorId: "ai-coder-001",
      creatorName: "TechBuilder",
      userMessage: "yes",
      aiReply: "ignored",
    });
    expect(accepted.pitchAccepted).toBe(true);
    expect(accepted.reply).toContain("AI-generated");
    expect(accepted.reply).toContain("percentage");
  });

  it("detects pitch patterns", () => {
    expect(replyContainsUnsolicitedPitch("Get our affiliate link today")).toBe(true);
    expect(replyContainsUnsolicitedPitch("Here is a coding tip")).toBe(false);
  });

  it("builds consent ask with commission notice", () => {
    expect(buildPitchConsentAsk("ContentMate")).toContain("commission");
  });
});
