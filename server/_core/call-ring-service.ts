/**
 * Phone ring for an incoming UR video call.
 * Subscriptions stay in memory (same lifetime as call rooms).
 * The private VAPID key is read from server env, or generated once per process
 * when env is unset. It is never returned to the client.
 */

import { createRequire } from "node:module";
import { getVideoCallRoom } from "./video-call-service";
import { listFriends } from "./social-service";
import { hasPaidChannelSubscription } from "./creator-audience-service";
import { getWebPushVapidPrivateKey, getWebPushVapidPublicKey } from "./secrets";
import {
  deleteCallNotice,
  loadCallNotices,
  loadCallRingKeyPair,
  loadCallRingSubscriptions,
  newCallNoticeId,
  persistCallNotice,
  persistCallRingKeyPair,
  persistCallRingSubscription,
  persistAppCallToken,
  loadAppCallTokens,
  deleteAppCallToken,
  type StoredCallNotice,
} from "./call-ring-persistence";

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
const appCallTokens = new Map<string, string[]>();
const notices = new Map<string, StoredCallNotice[]>();
let vapidPublicKey = "";
let vapidPrivateKey = "";
let vapidReady = false;
let warming: Promise<string> | null = null;

function loadWebPush(): WebPush {
  const require = createRequire(import.meta.url);
  return require("web-push") as WebPush;
}

function applyVapidPair(pair: { publicKey: string; privateKey: string }): string {
  const webpush = loadWebPush();
  webpush.setVapidDetails("https://urplatform.llc", pair.publicKey, pair.privateKey);
  vapidPublicKey = pair.publicKey;
  vapidPrivateKey = pair.privateKey;
  vapidReady = true;
  return vapidPublicKey;
}

function ensureVapid(): string {
  if (vapidReady && vapidPublicKey && vapidPrivateKey) return vapidPublicKey;
  const fromEnvPublic = getWebPushVapidPublicKey();
  const fromEnvPrivate = getWebPushVapidPrivateKey();
  if (fromEnvPublic && fromEnvPrivate) {
    return applyVapidPair({ publicKey: fromEnvPublic, privateKey: fromEnvPrivate });
  }
  const webpush = loadWebPush();
  return applyVapidPair(webpush.generateVAPIDKeys());
}

/** One ring key for this website, so a phone allowed earlier still rings after a restart. */
export async function readyCallRingPublicKey(): Promise<string> {
  if (vapidReady && vapidPublicKey) return vapidPublicKey;
  if (!warming) {
    warming = (async () => {
      const fromEnvPublic = getWebPushVapidPublicKey();
      const fromEnvPrivate = getWebPushVapidPrivateKey();
      if (fromEnvPublic && fromEnvPrivate) {
        return applyVapidPair({ publicKey: fromEnvPublic, privateKey: fromEnvPrivate });
      }
      const stored = await loadCallRingKeyPair();
      if (stored) return applyVapidPair(stored);
      const webpush = loadWebPush();
      const pair = webpush.generateVAPIDKeys();
      applyVapidPair(pair);
      await persistCallRingKeyPair(pair);
      return pair.publicKey;
    })().catch(() => {
      warming = null;
      return "";
    });
  }
  return warming;
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

export function callAnswerPath(roomId: string): string {
  const safe = roomId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  return safe ? `/call/${safe}?pickUp=1` : "/messages";
}

export function buildCallRingPayload(params: { callerLabel: string; roomId: string; bump?: number }): string {
  const roomId = params.roomId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  return JSON.stringify({
    title: "Incoming video call",
    body: `${params.callerLabel} is calling you on UR Platform. Tap Answer to pick up.`,
    url: callAnswerPath(roomId),
    roomId,
    bump: params.bump ?? 0,
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
  void persistCallRingSubscription({
    userId,
    endpoint,
    p256dh: subscription.keys.p256dh.trim(),
    auth: subscription.keys.auth.trim(),
  });
}

export function listCallRingSubscriptions(userId: string): PushSubscription[] {
  return [...(subscriptions.get(userId) ?? [])];
}

async function subscriptionsFor(userId: string): Promise<PushSubscription[]> {
  const stored = await loadCallRingSubscriptions(userId);
  for (const row of stored) saveCallRingSubscription(userId, row);
  return listCallRingSubscriptions(userId);
}

async function sendOnce(userId: string, payload: string): Promise<void> {
  await readyCallRingPublicKey();
  const rows = await subscriptionsFor(userId);
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
      await webpush.sendNotification(row, payload, { TTL: 120, urgency: "high" });
      kept.push(row);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== 404 && status !== 410) kept.push(row);
    }
  }
  subscriptions.set(userId, kept);
}

export function buildSocialPostNotice(authorName: string): string {
  const name = callRingCallerLabel(authorName);
  return JSON.stringify({
    title: "New post on UR Platform",
    body: `${name} posted on UR Platform.`,
    url: "/messages",
    roomId: "",
  });
}

export function friendPostAlertRecipients(params: {
  authorUserId: string;
  visibility: "public" | "friends" | "members";
}): string[] {
  return listFriends(params.authorUserId)
    .map((friend) => friend.peerUserId)
    .filter((peerUserId) => {
      if (params.visibility !== "members") return true;
      return hasPaidChannelSubscription(peerUserId, params.authorUserId);
    });
}

export function notifyFriendsOfPost(params: {
  authorUserId: string;
  authorName: string;
  visibility: "public" | "friends" | "members";
}): void {
  const payload = buildSocialPostNotice(params.authorName);
  for (const peerUserId of friendPostAlertRecipients(params)) {
    void sendOnce(peerUserId, payload);
  }
}

const APP_CALL_TOKEN = /^ExponentPushToken\[[A-Za-z0-9_-]{8,140}\]$/;
const MAX_APP_TOKENS = 5;

export function isAppCallToken(value: string): boolean {
  return APP_CALL_TOKEN.test(value);
}

export function buildAppCallPush(
  token: string,
  params: { callerLabel: string; roomId: string },
): {
  to: string;
  title: string;
  body: string;
  sound: "default";
  priority: "high";
  channelId: string;
  categoryId: string;
  data: { type: "incoming-call"; roomId: string; url: string };
} {
  const roomId = params.roomId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80);
  return {
    to: token,
    title: "Incoming video call",
    body: `${params.callerLabel} is calling you on UR Platform. Tap Answer.`,
    sound: "default",
    priority: "high",
    channelId: "ur-incoming-call",
    categoryId: "incomingCall",
    data: { type: "incoming-call", roomId, url: callAnswerPath(roomId) },
  };
}

export function saveAppCallToken(userId: string, token: string): void {
  if (!isAppCallToken(token)) return;
  const current = (appCallTokens.get(userId) ?? []).filter((row) => row !== token);
  current.push(token);
  appCallTokens.set(userId, current.slice(-MAX_APP_TOKENS));
  void persistAppCallToken({ userId, token });
}

export function listAppCallTokens(userId: string): string[] {
  return [...(appCallTokens.get(userId) ?? [])];
}

function forgetAppCallToken(token: string): void {
  for (const [userId, rows] of appCallTokens) {
    appCallTokens.set(userId, rows.filter((row) => row !== token));
  }
  void deleteAppCallToken(token);
}

async function appTokensFor(userId: string): Promise<string[]> {
  const stored = await loadAppCallTokens(userId);
  for (const token of stored) saveAppCallToken(userId, token);
  return listAppCallTokens(userId);
}

export async function sendAppCallPush(
  userId: string,
  params: { callerLabel: string; roomId: string },
): Promise<void> {
  const tokens = (await appTokensFor(userId)).filter(isAppCallToken);
  if (tokens.length === 0) return;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((token) => buildAppCallPush(token, params))),
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };
    (body.data ?? []).forEach((row, index) => {
      if (row.details?.error === "DeviceNotRegistered") forgetAppCallToken(tokens[index] ?? "");
    });
  } catch {
    /* The website ring still goes out. */
  }
}

export function ringUserForVideoCall(params: {
  calleeUserId: string;
  roomId: string;
  callerLabel: string;
}): void {
  const callerLabel = callRingCallerLabel(params.callerLabel);
  void sendAppCallPush(params.calleeUserId, { callerLabel, roomId: params.roomId });
  for (const delay of RING_REPEAT_MS) {
    const timer = setTimeout(() => {
      const room = getVideoCallRoom(params.roomId);
      if (!shouldRepeatCallRing(room?.status) && delay !== 0) return;
      if (delay !== 0 && !room) return;
      if (room && room.status !== "ringing") return;
      const payload = buildCallRingPayload({
        callerLabel: callRingCallerLabel(params.callerLabel),
        roomId: params.roomId,
        bump: delay,
      });
      void sendOnce(params.calleeUserId, payload);
    }, delay);
    timer.unref?.();
  }
}

export function recordCallNotice(params: {
  callerUserId: string;
  calleeUserId: string;
  callerName: string;
  roomId: string;
}): StoredCallNotice {
  const notice: StoredCallNotice = {
    id: newCallNoticeId(),
    callerUserId: params.callerUserId,
    calleeUserId: params.calleeUserId,
    callerName: callRingCallerLabel(params.callerName),
    roomId: params.roomId,
    createdAt: new Date().toISOString(),
  };
  const list = notices.get(params.calleeUserId) ?? [];
  list.push(notice);
  notices.set(params.calleeUserId, list.slice(-20));
  void persistCallNotice(notice);
  return notice;
}

export async function listCallNotices(userId: string): Promise<StoredCallNotice[]> {
  const stored = await loadCallNotices(userId);
  const list = notices.get(userId) ?? [];
  for (const row of stored) {
    if (!list.some((item) => item.id === row.id)) list.push(row);
  }
  notices.set(userId, list.slice(-20));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (notices.get(userId) ?? []).filter((row) => new Date(row.createdAt).getTime() >= weekAgo);
}

export function dismissCallNotice(userId: string, noticeId: string): void {
  const list = (notices.get(userId) ?? []).filter((row) => row.id !== noticeId);
  notices.set(userId, list);
  void deleteCallNotice(noticeId);
}

export function _resetCallRingsForTests(): void {
  subscriptions.clear();
  appCallTokens.clear();
  notices.clear();
}
