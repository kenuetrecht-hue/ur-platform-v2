import type { IncomingMessage, Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { sdk } from "./sdk";
import { aiChatRealtimeHub } from "./ai-chat-realtime-hub";
import { isCreatorAiId } from "./ai-creator-registry";

type ClientMeta = {
  userId: number;
  creatorId: string;
};

const clientMeta = new WeakMap<WebSocket, ClientMeta>();

function parseCreatorId(url: string): string | null {
  try {
    const parsed = new URL(url, "http://localhost");
    const creatorId = parsed.searchParams.get("creatorId")?.trim();
    if (!creatorId || !isCreatorAiId(creatorId)) return null;
    return creatorId;
  } catch {
    return null;
  }
}

function parseToken(url: string): string | null {
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.searchParams.get("token")?.trim() || null;
  } catch {
    return null;
  }
}

async function authenticateWsToken(token: string | null): Promise<{ id: number } | null> {
  if (!token) return null;
  try {
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as IncomingMessage;
    const user = await sdk.authenticateRequest(req);
    return { id: user.id };
  } catch {
    return null;
  }
}

/**
 * WebSocket endpoint: /api/ws/ai-chat?token=...&creatorId=contentmate
 * Pushes thread_updated events so clients refetch without waiting for poll.
 */
export function registerAiChatRealtimeWs(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = req.url?.split("?")[0];
    if (pathname !== "/api/ws/ai-chat") {
      return;
    }

    void (async () => {
      const token = parseToken(req.url ?? "");
      const creatorId = parseCreatorId(req.url ?? "");
      const user = await authenticateWsToken(token);

      if (!user || !creatorId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        clientMeta.set(ws, { userId: user.id, creatorId });
        aiChatRealtimeHub.subscribe(user.id, creatorId, ws);

        ws.send(
          JSON.stringify({
            type: "connected",
            creatorId,
            updatedAt: new Date().toISOString(),
          }),
        );

        ws.on("close", () => {
          const meta = clientMeta.get(ws);
          if (meta) {
            aiChatRealtimeHub.unsubscribe(meta.userId, meta.creatorId, ws);
          } else {
            aiChatRealtimeHub.unsubscribeAll(ws);
          }
          clientMeta.delete(ws);
        });

        ws.on("error", () => {
          ws.close();
        });
      });
    })();
  });

  console.log("[ai-chat-realtime] WebSocket ready at /api/ws/ai-chat");
}

export function notifyAiChatThreadUpdated(params: {
  userId: number;
  creatorId: string;
  updatedAt: string;
  threadId?: string;
}): void {
  aiChatRealtimeHub.notifyThreadUpdated(params);
}
