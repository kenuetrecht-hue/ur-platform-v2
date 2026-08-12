import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import { PLATFORM_PUBLIC_ORIGIN } from "@/lib/platform-urls";
import {
  parseAiChatRealtimeEvent,
  type AiChatRealtimeClientEvent,
} from "@/lib/ai-chat-realtime-parse";

export { parseAiChatRealtimeEvent, type AiChatRealtimeClientEvent };

function resolveHttpOrigin(): string {
  const base = getApiBaseUrl();
  if (base) return base;

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return PLATFORM_PUBLIC_ORIGIN;
}

/**
 * Build WebSocket URL for AI chat realtime sync.
 * Token is passed as query param because browser WebSocket cannot set Authorization headers.
 */
export function buildAiChatRealtimeWsUrl(params: {
  creatorId: string;
  accessToken: string;
}): string {
  const parsed = new URL(resolveHttpOrigin());
  const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  const wsBase = `${protocol}//${parsed.host}`;
  const token = encodeURIComponent(params.accessToken);
  const creatorId = encodeURIComponent(params.creatorId);
  return `${wsBase}/api/ws/ai-chat?token=${token}&creatorId=${creatorId}`;
}
