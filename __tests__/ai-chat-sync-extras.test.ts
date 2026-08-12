import { describe, it, expect } from "vitest";
import { parseAiChatOutboxJson } from "../lib/ai-chat-outbox-parse";
import { parseAiChatRealtimeEvent } from "../lib/ai-chat-realtime-parse";

describe("ai-chat-outbox", () => {
  it("parses valid outbox JSON", () => {
    const items = parseAiChatOutboxJson(
      JSON.stringify([
        {
          id: "outbox-1",
          creatorId: "contentmate",
          message: "Hello",
          channel: "creators",
          createdAt: "2026-08-11T12:00:00.000Z",
          attempts: 0,
        },
      ]),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.message).toBe("Hello");
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseAiChatOutboxJson("{bad")).toEqual([]);
  });
});

describe("ai-chat-realtime-url", () => {
  it("parses thread_updated events", () => {
    const event = parseAiChatRealtimeEvent(
      JSON.stringify({
        type: "thread_updated",
        creatorId: "contentmate",
        updatedAt: "2026-08-11T12:00:00.000Z",
      }),
    );
    expect(event?.type).toBe("thread_updated");
  });
});

describe("ai-chat-realtime-hub", () => {
  it("tracks subscribers per user and creator", async () => {
    const { AiChatRealtimeHub } = await import("../server/_core/ai-chat-realtime-hub");
    const hub = new AiChatRealtimeHub();
    const ws = { readyState: 1, OPEN: 1, send: () => {} } as unknown as import("ws").WebSocket;
    hub.subscribe(5, "contentmate", ws);
    expect(hub._roomSize(5, "contentmate")).toBe(1);
    hub.unsubscribe(5, "contentmate", ws);
    expect(hub._roomSize(5, "contentmate")).toBe(0);
  });
});
