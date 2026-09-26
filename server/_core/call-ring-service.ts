/**
 * Phone ring for an incoming UR video call.
 * Subscriptions stay in memory (same lifetime as call rooms).
 * The private VAPID key is read from server env, or generated once per process
 * when env is unset. It is never returned to the client.
 */

import { createRequire } from "node:module";
import { getVideoCallRoom } from "./video-call-service";
import { getWebPushVapidPrivateKey, getWebPushVapidPublicKey } from "./secrets";

type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type WebPush = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  generateVAPIDKeys(): { publicKey: string; privateKey: string };
  sendNotification(
    subscription: PushSubscription,
    payload: string,
    options?: { TTL?: number; urgency?: "very-low" | "low" | "normal" | "high" },
  ): Promise<{ statusCode?: number }>;
};

const MAX_SUBS_PER_USER = 5;
const RING_REPEAT_MS = [0, 4000, 8000, 12000] as const;

const subscriptions = new Map<string, PushSubscription[]>();
let vapidPublicKey = "";
let vapidReady = false;

function loadWebPush(): WebPush {
  const require = createRequire(import.meta.url);
  return require("web-push") as WebPush;
}

function ensureVapid(): string {
  if (vapidReady && vapidPublicKey) return vapidPublicKey;
  const webpush = loadWebPush();
  const fromEnvPublic = getWebPushVapidPublicKey();
  const fromEnvPrivate = getWebPushVapidPrivateKey();
  const pair =
    fromEnvPublic && fromEnvPrivate
      ? { publicKey: fromEnvPublic, privateKey: fromEnvPrivate }
      : webpush.generateVAPIDKeys();
  webpush.setVapidDetails("https://urplatform.llc", pair.publicKey, pair.privateKey);
  vapidPublicKey = pair.publicKey;
  vapidReady = true;
  return vapidPublicKey;
}

export function getCallRingPublicKey(): string {
  try {
    return ensureVapid();
  } catch {
    return "";
  }
}

export function callRingCallerLabel(name: string | undefined): string {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.includes("@") || trimmed.length > 40) return "A friend";
  return trimmed;
}

export function buildCallRingPayload(params: { callerLabel: string; roomId: string }): string {
  return JSON.stringify({
    title: "Incoming video call",
    body: `${params.callerLabel} is calling you on UR`,
    url: "/messages",
    roomId: params.roomId,
  });
}

export function shouldRepeatCallRing(status: string | undefined): boolean {
  return status === "ringing";
}

export function saveCallRingSubscription(userId: string, subscription: PushSubscription): void {
  const endpoint = subscription.endpoint.trim();
  if (!endpoint.startsWith("https://") || endpoint.length > 2000) return;
  const current = (subscriptions.get(userId) ?? []).filter((row) => row.endpoint !== endpoint);
  current.push({
    endpoint,
    keys: {
      p256dh: subscription.keys.p256dh.trim(),
      auth: subscription.keys.auth.trim(),
    },
  });
  subscriptions.set(userId, current.slice(-MAX_SUBS_PER_USER));
}

export function listCallRingSubscriptions(userId: string): PushSubscription[] {
  return [...(subscriptions.get(userId) ?? [])];
}

async function sendOnce(userId: string, payload: string): Promise<void> {
  const rows = listCallRingSubscriptions(userId);
  if (rows.length === 0) return;
  let webpush: WebPush;
  try {
    ensureVapid();
    webpush = loadWebPush();
  } catch {
    return;
  }
  const kept: PushSubscription[] = [];
  for (const row of rows) {
    try {
      await webpush.sendNotification(row, payload, { TTL: 30, urgency: "high" });
      kept.push(row);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== 404 && status !== 410) kept.push(row);
    }
  }
  subscriptions.set(userId, kept);
}

export function ringUserForVideoCall(params: {
  calleeUserId: string;
  roomId: string;
  callerLabel: string;
}): void {
  const payload = buildCallRingPayload({
    callerLabel: callRingCallerLabel(params.callerLabel),
    roomId: params.roomId,
  });
  for (const delay of RING_REPEAT_MS) {
    const timer = setTimeout(() => {
      const room = getVideoCallRoom(params.roomId);
      if (!shouldRepeatCallRing(room?.status) && delay !== 0) return;
      if (delay !== 0 && !room) return;
      if (room && room.status !== "ringing") return;
      void sendOnce(params.calleeUserId, payload);
    }, delay);
    timer.unref?.();
  }
}

export function _resetCallRingsForTests(): void {
  subscriptions.clear();
}
