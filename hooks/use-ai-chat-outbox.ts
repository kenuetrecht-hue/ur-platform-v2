import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNetworkConnectivity } from "@/hooks/use-network-connectivity";
import { trpc } from "@/lib/trpc";
import {
  bumpAiChatOutboxAttempt,
  enqueueAiChatOutbox,
  loadAiChatOutboxForCreator,
  removeAiChatOutboxItem,
  type AiChatOutboxItem,
} from "@/lib/ai-chat-outbox";

export type AiChatOutboxEnqueueInput = {
  creatorId: string;
  message: string;
  channel: AiChatOutboxItem["channel"];
  useHiveConsult?: boolean;
  targetLanguage?: string;
};

/**
 * Queues offline AI chat sends and flushes when the API is reachable again.
 */
export function useAiChatOutbox(params: {
  creatorId: string;
  enabled: boolean;
  onFlushed: () => void;
}) {
  const { isOnline, isApiReachable } = useNetworkConnectivity();
  const connected = isOnline && isApiReachable;
  const flushingRef = useRef(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [flushing, setFlushing] = useState(false);

  const creatorsSend = trpc.aiCreators.sendMessage.useMutation();
  const languageChat = trpc.aiLanguage.chat.useMutation();

  const refreshPending = useCallback(async () => {
    if (!params.enabled) {
      setPendingIds([]);
      return;
    }
    const items = await loadAiChatOutboxForCreator(params.creatorId);
    setPendingIds(items.map((i) => i.id));
  }, [params.creatorId, params.enabled]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  const enqueue = useCallback(
    async (input: AiChatOutboxEnqueueInput) => {
      const item = await enqueueAiChatOutbox(input);
      setPendingIds((prev) => [...prev, item.id]);
      return item;
    },
    [],
  );

  const flushOne = useCallback(
    async (item: AiChatOutboxItem) => {
      if (item.channel === "language") {
        await languageChat.mutateAsync({
          message: item.message,
          targetLanguage: item.targetLanguage,
        });
      } else {
        await creatorsSend.mutateAsync({
          creatorId: item.creatorId,
          message: item.message,
          useHiveConsult: item.useHiveConsult,
        });
      }
      await removeAiChatOutboxItem(item.id);
    },
    [creatorsSend, languageChat],
  );

  const flush = useCallback(async () => {
    if (!params.enabled || !connected || flushingRef.current) return;
    flushingRef.current = true;
    setFlushing(true);
    try {
      const items = await loadAiChatOutboxForCreator(params.creatorId);
      for (const item of items) {
        try {
          await flushOne(item);
        } catch {
          await bumpAiChatOutboxAttempt(item.id);
          break;
        }
      }
      await refreshPending();
      params.onFlushed();
    } finally {
      flushingRef.current = false;
      setFlushing(false);
    }
  }, [connected, flushOne, params]);

  useEffect(() => {
    if (connected && params.enabled) {
      void flush();
    }
  }, [connected, params.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connected,
    pendingIds,
    pendingCount: pendingIds.length,
    enqueue,
    flush,
    flushing,
    refreshPending,
  };
}
