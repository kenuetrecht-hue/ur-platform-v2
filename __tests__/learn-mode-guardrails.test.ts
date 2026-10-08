import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { enforceAiGuardrails } from "../server/_core/ai-guardrails";

describe("learn mode guardrails", () => {
  it("passes the member's step and the AI lesson into the safety check", () => {
    const source = readFileSync("server/_core/ai-learning-mode.ts", "utf8");
    const call = source.slice(
      source.indexOf("const lesson = enforceAiGuardrails"),
      source.indexOf("aiUserMemoryService.initializeUser"),
    );
    expect(call).toContain("userMessage: message");
    expect(call).toContain("aiReply: reply");
    expect(call).toContain("isOwner: params.isPlatformOwner");
    expect(call).not.toContain("isPlatformOwner:");
  });

  it("returns the lesson when the step and the answer are both present", () => {
    const lesson = enforceAiGuardrails({
      userMessage: 'Start self-paced step: "Find your story seed" (Story ideas that stick). Guide me step by step.',
      aiReply: "Start with one sentence: who wants what, and what stops them.",
      userId: "member-learn",
      isOwner: false,
    });
    expect(lesson).toContain("one sentence");
  });
});
