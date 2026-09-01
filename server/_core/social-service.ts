/**
 * Friends, direct messages, creator subscriptions, and ride-along preferences.
 * In-memory MVP — same pattern as partner program & transaction ledger.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { getPlatformOwnerDisplayName, isOwnerEmail } from "./owner-auth";
import { getUserByEmail, getUserByOpenId } from "../db";
import { toSupabaseOpenId } from "../supabase-auth";

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type Friendship = {
  id: string;
  userId: string;
  friendUserId: string;
  friendEmail: string;
  friendName: string;
  status: FriendshipStatus;
  initiatedBy: string;
  createdAt: string;
  acceptedAt?: string;
};

export type DirectMessage = {
  id: string;
  threadId: string;
  senderUserId: string;
  recipientUserId: string;
  body: string;
  deliveredBody?: string;
  subject?: string;
  senderEmail?: string;
  recipientEmail?: string;
  createdAt: string;
  readAt?: string;
};

export type CreatorSubscription = {
  id: string;
  subscriberUserId: string;
  creatorUserId: string;
  creatorName: string;
  creatorSlug?: string;
  notifyLiveClasses: boolean;
  rideAlongWithAi: boolean;
  subscribedAt: string;
};

const friendships = new Map<string, Friendship>();
const messages: DirectMessage[] = [];
const subscriptions = new Map<string, CreatorSubscription>();
const emailIndex = new Map<string, string>();

function threadId(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function subKey(subscriberId: string, creatorId: string): string {
  return `${subscriberId}:${creatorId}`;
}

export function registerSocialUser(params: {
  userId: string;
  email: string;
  displayName: string;
}): void {
  emailIndex.set(params.email.toLowerCase().trim(), params.userId);
  if (isOwnerEmail(params.email)) {
    cachedOwnerUserId = params.userId;
  }
  void ensureOwnerWelcomeFriendship(params);
}

function buildOwnerWelcomeMessage(params: {
  memberName: string;
  ownerName: string;
}): { subject: string; body: string } {
  const greeting = params.memberName.trim() || "there";
  return {
    subject: `Thank you for joining UR — ${params.ownerName}`,
    body:
      `Hey ${greeting}! 👋\n\n` +
      `Thank you for joining UR Platform — I'm really glad you're here.\n\n` +
      `I'm ${params.ownerName}, and you're connected with me as your first friend on UR. ` +
      `If you have any questions about the website or the app, message me anytime through ` +
      `Friends & Messages or Internet Center — I'm happy to help.\n\n` +
      `Welcome aboard!`,
  };
}

function friendshipExists(userIdA: string, userIdB: string): boolean {
  return [...friendships.values()].some(
    (f) =>
      f.status !== "blocked" &&
      ((f.userId === userIdA && f.friendUserId === userIdB) ||
        (f.userId === userIdB && f.friendUserId === userIdA)),
  );
}

function establishAcceptedFriendship(params: {
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  memberUserId: string;
  memberEmail: string;
  memberName: string;
}): Friendship {
  const friendship: Friendship = {
    id: randomUUID(),
    userId: params.ownerUserId,
    friendUserId: params.memberUserId,
    friendEmail: params.memberEmail.toLowerCase().trim(),
    friendName: params.memberName,
    status: "accepted",
    initiatedBy: params.ownerUserId,
    createdAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
  };
  friendships.set(friendship.id, friendship);
  return friendship;
}

let cachedOwnerUserId: string | null | undefined;

async function resolveOwnerSocialUserId(): Promise<string | null> {
  if (cachedOwnerUserId !== undefined) {
    return cachedOwnerUserId;
  }

  if (ENV.platformOwnerEmail) {
    const indexed = emailIndex.get(ENV.platformOwnerEmail.toLowerCase().trim());
    if (indexed) {
      cachedOwnerUserId = indexed;
      return indexed;
    }
  }

  if (ENV.platformOwnerSupabaseId) {
    const owner = await getUserByOpenId(toSupabaseOpenId(ENV.platformOwnerSupabaseId));
    if (owner) {
      cachedOwnerUserId = String(owner.id);
      if (owner.email) {
        emailIndex.set(owner.email.toLowerCase().trim(), cachedOwnerUserId);
      }
      return cachedOwnerUserId;
    }
  }

  if (ENV.platformOwnerEmail) {
    const owner = await getUserByEmail(ENV.platformOwnerEmail);
    if (owner) {
      cachedOwnerUserId = String(owner.id);
      if (owner.email) {
        emailIndex.set(owner.email.toLowerCase().trim(), cachedOwnerUserId);
      }
      return cachedOwnerUserId;
    }
  }

  cachedOwnerUserId = null;
  return null;
}

const welcomeFriendInFlight = new Set<string>();

/** Platform owner becomes every new member's first accepted friend. */
export async function ensureOwnerWelcomeFriendship(params: {
  userId: string;
  email: string;
  displayName: string;
}): Promise<Friendship | null> {
  const memberEmail = params.email.toLowerCase().trim();
  if (!memberEmail || isOwnerEmail(memberEmail)) {
    return null;
  }
  if (welcomeFriendInFlight.has(params.userId)) {
    return null;
  }

  welcomeFriendInFlight.add(params.userId);
  try {
    const ownerUserId = await resolveOwnerSocialUserId();
    if (!ownerUserId || ownerUserId === params.userId) {
      return null;
    }
    if (friendshipExists(ownerUserId, params.userId)) {
      return null;
    }

    const ownerEmail = ENV.platformOwnerEmail.toLowerCase().trim();
    const ownerName = getPlatformOwnerDisplayName();
    const friendship = establishAcceptedFriendship({
      ownerUserId,
      ownerEmail,
      ownerName,
      memberUserId: params.userId,
      memberEmail,
      memberName: params.displayName || memberEmail.split("@")[0] || "Friend",
    });

    const welcome = buildOwnerWelcomeMessage({
      memberName: params.displayName,
      ownerName,
    });
    sendDirectMessage({
      senderUserId: ownerUserId,
      recipientUserId: params.userId,
      subject: welcome.subject,
      body: welcome.body,
      senderEmail: ownerEmail,
      recipientEmail: memberEmail,
      requireFriend: false,
    });

    return friendship;
  } finally {
    welcomeFriendInFlight.delete(params.userId);
  }
}

export function _resetSocialStateForTests(): void {
  friendships.clear();
  messages.length = 0;
  subscriptions.clear();
  emailIndex.clear();
  cachedOwnerUserId = undefined;
  welcomeFriendInFlight.clear();
}

export function resolveUserIdByEmail(email: string): string | null {
  return emailIndex.get(email.toLowerCase().trim()) ?? null;
}

export function sendFriendRequest(params: {
  fromUserId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
}): Friendship {
  const toUserId = resolveUserIdByEmail(params.toEmail);
  if (!toUserId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No user found with that email. They must sign up on UR Platform first.",
    });
  }
  if (toUserId === params.fromUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot add yourself." });
  }

  for (const f of friendships.values()) {
    const pair =
      (f.userId === params.fromUserId && f.friendUserId === toUserId) ||
      (f.userId === toUserId && f.friendUserId === params.fromUserId);
    if (pair && f.status !== "blocked") {
      throw new TRPCError({ code: "CONFLICT", message: "Friend request already exists." });
    }
  }

  const friendship: Friendship = {
    id: randomUUID(),
    userId: params.fromUserId,
    friendUserId: toUserId,
    friendEmail: params.toEmail.toLowerCase().trim(),
    friendName: params.toEmail.split("@")[0] ?? "Friend",
    status: "pending",
    initiatedBy: params.fromUserId,
    createdAt: new Date().toISOString(),
  };
  friendships.set(friendship.id, friendship);
  return friendship;
}

export function listFriends(userId: string): Array<
  Friendship & { peerUserId: string; peerEmail: string; peerName: string }
> {
  return [...friendships.values()]
    .filter(
      (f) =>
        f.status === "accepted" &&
        (f.userId === userId || f.friendUserId === userId),
    )
    .map((f) => {
      const isRequester = f.userId === userId;
      return {
        ...f,
        peerUserId: isRequester ? f.friendUserId : f.userId,
        peerEmail: f.friendEmail,
        peerName: f.friendName,
      };
    });
}

export function listPendingFriendRequests(userId: string): Friendship[] {
  return [...friendships.values()].filter(
    (f) => f.status === "pending" && f.friendUserId === userId,
  );
}

export function acceptFriendRequest(params: {
  userId: string;
  friendshipId: string;
}): Friendship {
  const f = friendships.get(params.friendshipId);
  if (!f || f.friendUserId !== params.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Friend request not found." });
  }
  f.status = "accepted";
  f.acceptedAt = new Date().toISOString();
  friendships.set(f.id, f);
  return f;
}

export function sendDirectMessage(params: {
  senderUserId: string;
  recipientUserId: string;
  body: string;
  subject?: string;
  senderEmail?: string;
  recipientEmail?: string;
  requireFriend?: boolean;
  deliveredBody?: string;
}): DirectMessage {
  const body = params.body.trim().slice(0, 2000);
  if (!body) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Message cannot be empty." });
  }

  const requireFriend = params.requireFriend !== false;
  if (requireFriend) {
    const friends = listFriends(params.senderUserId);
    const isFriend = friends.some((f) => f.peerUserId === params.recipientUserId);
    if (!isFriend) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only message accepted friends.",
      });
    }
  }

  const subject = (params.subject ?? "Message from UR Internet Center").trim().slice(0, 120);

  const msg: DirectMessage = {
    id: randomUUID(),
    threadId: threadId(params.senderUserId, params.recipientUserId),
    senderUserId: params.senderUserId,
    recipientUserId: params.recipientUserId,
    body,
    deliveredBody: params.deliveredBody?.trim() || undefined,
    subject,
    senderEmail: params.senderEmail,
    recipientEmail: params.recipientEmail,
    createdAt: new Date().toISOString(),
  };
  messages.push(msg);
  return msg;
}

/** Send internal platform mail to any registered UR member by email address. */
export function sendPlatformMail(params: {
  senderUserId: string;
  senderEmail: string;
  senderName: string;
  toEmail: string;
  subject: string;
  body: string;
}): DirectMessage {
  const toUserId = resolveUserIdByEmail(params.toEmail);
  if (!toUserId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No UR member found with that email. They need a UR Platform account first.",
    });
  }
  if (toUserId === params.senderUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot email yourself." });
  }

  const subject = params.subject.trim().slice(0, 120) || "Hello from UR Internet Center";

  return sendDirectMessage({
    senderUserId: params.senderUserId,
    recipientUserId: toUserId,
    body: params.body,
    subject,
    senderEmail: params.senderEmail.toLowerCase().trim(),
    recipientEmail: params.toEmail.toLowerCase().trim(),
    requireFriend: false,
  });
}

function presentMessageForViewer(userId: string, msg: DirectMessage): DirectMessage {
  if (msg.recipientUserId === userId && msg.deliveredBody) {
    return { ...msg, body: msg.deliveredBody };
  }
  return msg;
}

export function listInboxMail(userId: string, limit = 50): DirectMessage[] {
  return messages
    .filter((m) => m.recipientUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((m) => presentMessageForViewer(userId, m));
}

export function listSentMail(userId: string, limit = 50): DirectMessage[] {
  return messages
    .filter((m) => m.senderUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function markMailRead(params: { userId: string; messageId: string }): DirectMessage {
  const msg = messages.find((m) => m.id === params.messageId);
  if (!msg || msg.recipientUserId !== params.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
  }
  msg.readAt = new Date().toISOString();
  return msg;
}

export function countUnreadMail(userId: string): number {
  return messages.filter((m) => m.recipientUserId === userId && !m.readAt).length;
}

export function listDirectMessages(params: {
  userId: string;
  withUserId: string;
  limit?: number;
}): DirectMessage[] {
  const tid = threadId(params.userId, params.withUserId);
  return messages
    .filter((m) => m.threadId === tid)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-(params.limit ?? 100))
    .map((m) => presentMessageForViewer(params.userId, m));
}

export function listMessageThreads(userId: string): Array<{
  withUserId: string;
  lastMessage: DirectMessage;
  unreadCount: number;
}> {
  const byPeer = new Map<string, DirectMessage[]>();
  for (const m of messages) {
    if (m.senderUserId !== userId && m.recipientUserId !== userId) continue;
    const peer = m.senderUserId === userId ? m.recipientUserId : m.senderUserId;
    const list = byPeer.get(peer) ?? [];
    list.push(m);
    byPeer.set(peer, list);
  }
  return [...byPeer.entries()]
    .map(([withUserId, msgs]) => {
      const sorted = msgs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const unreadCount = msgs.filter(
        (m) => m.recipientUserId === userId && !m.readAt,
      ).length;
      return {
        withUserId,
        lastMessage: presentMessageForViewer(userId, sorted[0]!),
        unreadCount,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );
}

export function subscribeToCreator(params: {
  subscriberUserId: string;
  creatorUserId: string;
  creatorName: string;
  creatorSlug?: string;
  rideAlongWithAi?: boolean;
}): CreatorSubscription {
  if (params.subscriberUserId === params.creatorUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot subscribe to yourself." });
  }
  const key = subKey(params.subscriberUserId, params.creatorUserId);
  const existing = subscriptions.get(key);
  if (existing) {
    existing.rideAlongWithAi = params.rideAlongWithAi ?? existing.rideAlongWithAi;
    existing.notifyLiveClasses = true;
    subscriptions.set(key, existing);
    return existing;
  }
  const sub: CreatorSubscription = {
    id: randomUUID(),
    subscriberUserId: params.subscriberUserId,
    creatorUserId: params.creatorUserId,
    creatorName: params.creatorName,
    creatorSlug: params.creatorSlug,
    notifyLiveClasses: true,
    rideAlongWithAi: params.rideAlongWithAi ?? false,
    subscribedAt: new Date().toISOString(),
  };
  subscriptions.set(key, sub);
  return sub;
}

export function unsubscribeFromCreator(params: {
  subscriberUserId: string;
  creatorUserId: string;
}): boolean {
  return subscriptions.delete(subKey(params.subscriberUserId, params.creatorUserId));
}

export function listCreatorSubscriptions(userId: string): CreatorSubscription[] {
  return [...subscriptions.values()].filter((s) => s.subscriberUserId === userId);
}

export function listCreatorSubscribers(creatorUserId: string): CreatorSubscription[] {
  return [...subscriptions.values()].filter((s) => s.creatorUserId === creatorUserId);
}

export function setRideAlongPreference(params: {
  subscriberUserId: string;
  creatorUserId: string;
  rideAlongWithAi: boolean;
}): CreatorSubscription {
  const key = subKey(params.subscriberUserId, params.creatorUserId);
  const sub = subscriptions.get(key);
  if (!sub) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Subscribe to this creator first." });
  }
  sub.rideAlongWithAi = params.rideAlongWithAi;
  subscriptions.set(key, sub);
  return sub;
}

export function getSocialDashboard(userId: string) {
  return {
    friends: listFriends(userId),
    pendingRequests: listPendingFriendRequests(userId),
    subscriptions: listCreatorSubscriptions(userId),
    subscribers: listCreatorSubscribers(userId),
    threads: listMessageThreads(userId),
    unreadMailCount: countUnreadMail(userId),
  };
}
