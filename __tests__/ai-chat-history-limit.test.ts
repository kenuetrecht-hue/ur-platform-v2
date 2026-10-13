import { describe, expect, it } from "vitest";
import {
  AI_CHAT_HISTORY_CONTENT_MAX,
  AI_CHAT_MEMBER_HISTORY_CONTENT_MAX,
} from "../lib/ai-chat-limits";
import { sanitizeChatHistory } from "../server/_core/input-sanitize";

describe("business steward follow-up history", () => {
  it("keeps a long first answer for the owner and trims it for members", () => {
    const longAnswer = "Use the Members page. ".repeat(300).trim();
    expect(longAnswer.length).toBeGreaterThan(AI_CHAT_MEMBER_HISTORY_CONTENT_MAX);
    expect(longAnswer.length).toBeLessThanOrEqual(AI_CHAT_HISTORY_CONTENT_MAX);

    const turns = [
      { role: "user" as const, content: "How do I bring people to the site?" },
      { role: "assistant" as const, content: longAnswer },
    ];

    const ownerHistory = sanitizeChatHistory(turns, 80, AI_CHAT_HISTORY_CONTENT_MAX);
    expect(ownerHistory[1]?.content.length).toBeGreaterThan(4000);

    const memberHistory = sanitizeChatHistory(turns, 20, AI_CHAT_MEMBER_HISTORY_CONTENT_MAX);
    expect(memberHistory[1]?.content.length).toBe(AI_CHAT_MEMBER_HISTORY_CONTENT_MAX);
  });
});
