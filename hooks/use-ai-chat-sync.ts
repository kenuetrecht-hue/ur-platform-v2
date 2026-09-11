import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useNetworkConnectivity } from "@/hooks/use-network-connectivity";
import {
  buildAiChatRealtimeWsUrl,
  parseAiChatRealtimeEvent,
} from "@/lib/ai-chat-realtime-url";

/** Poll interval while chat is open — keeps web + app in sync when WebSocket is down. */
export const AI_CHAT_SYNC_INTERVAL_MS = 2_500;

/** Slow safety poll when WebSocket is already pushing the same thread to web + phone. */
export const AI_CHAT_SYNC_FALLBACK_INTERVAL_MS = 30_000;

export type SyncedChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  createdAt: string;
};

function mapServerMessages(
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>,
): SyncedChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "ai" : "user",
    text: m.content,
    createdAt: m.createdAt,
  }));
}

/**
 * Loads and continuously syncs AI chat from the server (same thread on web + mobile).
 * WebSocket pushes thread updates; HTTP polling is the fallback.
 */
export function useAiChatSync(params: {
  creatorId: string;
  enabled: boolean;
  onSync: (messages: SyncedChatMessage[], meta: { threadUpdatedAt: string | null }) => void;
}) {
  const { isAuthenticated, accessToken } = useAuth();
  const { isOnline, isApiReachable } = useNetworkConnectivity();
  const connected = isOnline && isApiReachable;
  const active = params.enabled && isAuthenticated && connected;
  const lastAppliedUpdatedAt = useRef<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const reconnectDelayRef = useRef(1_000);

  const threadQuery = trpc.aiCreators.getThread.useQuery(
    { creatorId: params.creatorId },
    {
      enabled: active,
      staleTime: realtimeConnected ? 10_000 : 0,
      refetchInterval: active
        ? realtimeConnected
          ? AI_CHAT_SYNC_FALLBACK_INTERVAL_MS
          : AI_CHAT_SYNC_INTERVAL_MS
        : false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  );

  useEffect(() => {
    lastAppliedUpdatedAt.current = null;
  }, [params.creatorId]);

  useEffect(() => {
    if (!active || !threadQuery.data) return;
    const updatedAt = threadQuery.data.updatedAt;
    if (lastAppliedUpdatedAt.current === updatedAt && threadQuery.data.messages.length === 0) {
      return;
    }
    lastAppliedUpdatedAt.current = updatedAt;
    params.onSync(mapServerMessages(threadQuery.data.messages), {
      threadUpdatedAt: updatedAt,
    });
  }, [active, threadQuery.data, params.creatorId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (connected && active) {
      void threadQuery.refetch();
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || !accessToken) {
      setRealtimeConnected(false);
      return;
    }

    let closed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleReconnect = () => {
      if (closed) return;
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, 15_000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, reconnectDelayRef.current);
    };

    const connect = () => {
      if (closed) return;
      try {
        const url = buildAiChatRealtimeWsUrl({
          creatorId: params.creatorId,
          accessToken,
        });
        ws = new WebSocket(url);

        ws.onopen = () => {
          setRealtimeConnected(true);
          reconnectDelayRef.current = 1_000;
        };

        ws.onmessage = (event) => {
          const parsed = parseAiChatRealtimeEvent(String(event.data));
          if (parsed?.type === "thread_updated" && parsed.creatorId === params.creatorId) {
            void threadQuery.refetch();
          }
        };

        ws.onclose = () => {
          setRealtimeConnected(false);
          ws = null;
          scheduleReconnect();
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      setRealtimeConnected(false);
    };
  }, [active, accessToken, params.creatorId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connected,
    realtimeConnected,
    syncing: threadQuery.isFetching,
    syncError: threadQuery.error?.message ?? null,
    refetch: threadQuery.refetch,
  };
}
