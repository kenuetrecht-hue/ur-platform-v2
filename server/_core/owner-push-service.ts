/**
 * Owner-only Expo push — fire-alarm channel for website/app emergencies.
 * Never register or notify staff or members.
 */

import { persistOwnerPushDevice, loadOwnerPushTokensFromDb } from "../db-platform-ops";
import { OWNER_EMERGENCY_CHANNEL_ID } from "../../lib/owner-emergency";

const memoryTokens = new Map<string, { ownerUserId: string; platform: string }>();

export function registerOwnerPushToken(input: {
  token: string;
  ownerUserId: string;
  platform: string;
}): void {
  const token = input.token.trim().slice(0, 255);
  if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
    return;
  }
  memoryTokens.set(token, {
    ownerUserId: input.ownerUserId,
    platform: input.platform.slice(0, 16),
  });
  void persistOwnerPushDevice({
    token,
    ownerUserId: input.ownerUserId,
    platform: input.platform,
  });
}

export async function listOwnerPushTokens(): Promise<string[]> {
  const fromDb = await loadOwnerPushTokensFromDb();
  return [...new Set([...memoryTokens.keys(), ...fromDb])];
}

export async function sendOwnerEmergencyPush(input: {
  title: string;
  body: string;
  incidentId: string;
  severity?: string;
}): Promise<{ sent: number; skipped: boolean }> {
  const tokens = await listOwnerPushTokens();
  if (tokens.length === 0) {
    return { sent: 0, skipped: true };
  }

  const messages = tokens.map((to) => ({
    to,
    sound: "default" as const,
    priority: "high" as const,
    channelId: OWNER_EMERGENCY_CHANNEL_ID,
    title: input.title.slice(0, 80),
    body: input.body.replace(/\s+/g, " ").trim().slice(0, 180),
    data: {
      route: "/owner-ops",
      incidentId: input.incidentId,
      severity: input.severity ?? "high",
      kind: "owner_emergency",
    },
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      console.warn("[owner-push] Expo push failed:", response.status);
      return { sent: 0, skipped: false };
    }
    return { sent: messages.length, skipped: false };
  } catch (error) {
    console.warn("[owner-push] Expo push error:", error);
    return { sent: 0, skipped: false };
  }
}

export function _resetOwnerPushTokensForTests(): void {
  memoryTokens.clear();
}
