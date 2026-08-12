import { describe, it, expect, beforeEach } from "vitest";
import {
  appendAiChatTurns,
  getOrCreateAiChatThread,
  listAiChatMessages,
  loadAiChatHistoryForModel,
  _resetAiChatPersistenceForTests,
} from "../server/_core/ai-chat-persistence-service";

describe("ai-chat-persistence-service (in-memory fallback)", () => {
  beforeEach(() => {
    _resetAiChatPersistenceForTests();
  });

  it("creates a thread per user + creator pair", async () => {
    const first = await getOrCreateAiChatThread({ userId: 42, creatorId: "contentmate" });
    const second = await getOrCreateAiChatThread({ userId: 42, creatorId: "contentmate" });
    expect(second.threadId).toBe(first.threadId);
  });

  it("persists and loads chat turns for cross-device sync", async () => {
    await appendAiChatTurns({
      userId: 7,
      creatorId: "ai-coder-001",
      turns: [
        { role: "user", content: "Hello from app" },
        { role: "assistant", content: "Hello from server" },
      ],
    });

    const thread = await listAiChatMessages({ userId: 7, creatorId: "ai-coder-001" });
    expect(thread?.messages).toHaveLength(2);
    expect(thread?.messages[0]?.role).toBe("user");
    expect(thread?.messages[1]?.content).toBe("Hello from server");

    const history = await loadAiChatHistoryForModel({
      userId: 7,
      creatorId: "ai-coder-001",
      maxTurns: 10,
    });
    expect(history).toEqual([
      { role: "user", content: "Hello from app" },
      { role: "assistant", content: "Hello from server" },
    ]);
  });

  it("returns incremental updates after since timestamp", async () => {
    await appendAiChatTurns({
      userId: 9,
      creatorId: "linguamate",
      turns: [{ role: "user", content: "Hola" }, { role: "assistant", content: "¡Hola!" }],
    });

    const full = await listAiChatMessages({ userId: 9, creatorId: "linguamate" });
    const since = full!.messages[0]!.createdAt;

    await appendAiChatTurns({
      userId: 9,
      creatorId: "linguamate",
      turns: [{ role: "user", content: "Gracias" }, { role: "assistant", content: "De nada" }],
    });

    const delta = await listAiChatMessages({
      userId: 9,
      creatorId: "linguamate",
      since: new Date(since),
    });
    expect(delta?.messages.length).toBeGreaterThanOrEqual(2);
    expect(delta?.messages.some((m) => m.content === "Gracias")).toBe(true);
  });

  it("isolates threads by creator for the same user", async () => {
    await appendAiChatTurns({
      userId: 3,
      creatorId: "contentmate",
      turns: [{ role: "user", content: "Write a caption" }, { role: "assistant", content: "Done" }],
    });
    await appendAiChatTurns({
      userId: 3,
      creatorId: "ai-coder-001",
      turns: [{ role: "user", content: "Fix my bug" }, { role: "assistant", content: "Sure" }],
    });

    const contentmate = await listAiChatMessages({ userId: 3, creatorId: "contentmate" });
    const coder = await listAiChatMessages({ userId: 3, creatorId: "ai-coder-001" });
    expect(contentmate?.messages[0]?.content).toBe("Write a caption");
    expect(coder?.messages[0]?.content).toBe("Fix my bug");
  });
});
