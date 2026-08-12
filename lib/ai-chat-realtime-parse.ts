export type AiChatRealtimeClientEvent =
  | { type: "connected"; creatorId: string; updatedAt: string }
  | { type: "thread_updated"; creatorId: string; updatedAt: string; threadId?: string };

export function parseAiChatRealtimeEvent(raw: string): AiChatRealtimeClientEvent | null {
  try {
    const data = JSON.parse(raw) as AiChatRealtimeClientEvent;
    if (data.type === "connected" || data.type === "thread_updated") {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
