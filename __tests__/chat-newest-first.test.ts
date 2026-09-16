import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { newestConversationFirst } from "../lib/chat-newest-first";

describe("newestConversationFirst", () => {
  it("puts the latest typed line and its reply at the top", () => {
    const thread = newestConversationFirst([
      { role: "ai", text: "welcome" },
      { role: "user", text: "hi" },
      { role: "ai", text: "hello" },
      { role: "user", text: "next" },
      { role: "ai", text: "reply" },
    ]);
    expect(thread.map((item) => item.text)).toEqual(["next", "reply", "hi", "hello", "welcome"]);
  });

  it("keeps a just-typed line on top before the AI answers", () => {
    const thread = newestConversationFirst([
      { role: "ai", text: "welcome" },
      { role: "user", text: "hi" },
    ]);
    expect(thread.map((item) => item.text)).toEqual(["hi", "welcome"]);
  });

  it("uses the same newest-first thread on website and app chats", () => {
    const files = [
      "components/creator-ai-interface.tsx",
      "components/language-ai-interface.tsx",
      "components/personal-ai-interface.tsx",
      "components/voice-chat-interface.tsx",
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8")).toContain("newestConversationFirst");
    }
  });
});
