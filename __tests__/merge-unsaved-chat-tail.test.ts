import { describe, expect, it } from "vitest";
import { mergeUnsavedChatTail } from "../lib/merge-unsaved-chat-tail";

describe("mergeUnsavedChatTail", () => {
  it("keeps a spoken reply that the server has not saved yet", () => {
    const local = [
      { id: "welcome", role: "ai" as const, text: "Owner channel active." },
      { id: "u1", role: "user" as const, text: "How is the store?" },
      { id: "a1", role: "ai" as const, text: "The store is open." },
    ];
    const synced = [
      { id: "s0", role: "ai" as const, text: "Owner channel active." },
      { id: "s1", role: "user" as const, text: "How is the store?" },
    ];

    expect(mergeUnsavedChatTail(local, synced).map((message) => message.text)).toEqual([
      "Owner channel active.",
      "How is the store?",
      "The store is open.",
    ]);
  });

  it("drops the local opening line once the saved thread has real turns", () => {
    const local = [{ id: "welcome", role: "ai" as const, text: "Owner channel active." }];
    const synced = [
      { id: "s1", role: "user" as const, text: "Hello" },
      { id: "s2", role: "ai" as const, text: "Hello back." },
    ];

    expect(mergeUnsavedChatTail(local, synced)).toEqual(synced);
  });
});
