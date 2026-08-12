import type { WebSocket } from "ws";

export type AiChatRealtimeEvent = {
  type: "thread_updated";
  creatorId: string;
  updatedAt: string;
  threadId?: string;
};

function roomKey(userId: number, creatorId: string): string {
  return `${userId}:${creatorId}`;
}

/**
 * In-process pub/sub for AI chat thread updates (web + mobile on same account).
 */
export class AiChatRealtimeHub {
  private rooms = new Map<string, Set<WebSocket>>();

  subscribe(userId: number, creatorId: string, ws: WebSocket): void {
    const key = roomKey(userId, creatorId);
    let set = this.rooms.get(key);
    if (!set) {
      set = new Set();
      this.rooms.set(key, set);
    }
    set.add(ws);
  }

  unsubscribe(userId: number, creatorId: string, ws: WebSocket): void {
    const key = roomKey(userId, creatorId);
    const set = this.rooms.get(key);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      this.rooms.delete(key);
    }
  }

  unsubscribeAll(ws: WebSocket): void {
    for (const [key, set] of this.rooms.entries()) {
      if (set.delete(ws) && set.size === 0) {
        this.rooms.delete(key);
      }
    }
  }

  notifyThreadUpdated(params: {
    userId: number;
    creatorId: string;
    updatedAt: string;
    threadId?: string;
  }): number {
    const key = roomKey(params.userId, params.creatorId);
    const set = this.rooms.get(key);
    if (!set?.size) return 0;

    const payload: AiChatRealtimeEvent = {
      type: "thread_updated",
      creatorId: params.creatorId,
      updatedAt: params.updatedAt,
      threadId: params.threadId,
    };
    const body = JSON.stringify(payload);
    let delivered = 0;

    for (const ws of set) {
      if (ws.readyState === ws.OPEN) {
        ws.send(body);
        delivered += 1;
      }
    }
    return delivered;
  }

  /** @internal test helper */
  _roomSize(userId: number, creatorId: string): number {
    return this.rooms.get(roomKey(userId, creatorId))?.size ?? 0;
  }

  /** @internal test helper */
  _reset(): void {
    this.rooms.clear();
  }
}

export const aiChatRealtimeHub = new AiChatRealtimeHub();
