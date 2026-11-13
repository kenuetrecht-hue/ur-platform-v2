/**
 * Creator live feeds.
 * Free: any signed-in member with the link can watch.
 * Paid: the link opens a ticket wall.
 * Co-host links let up to four guests join the interview without paying.
 */

import { randomBytes, randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { sanitizeUserText } from "./input-sanitize";
import { assertIceCandidate, assertSecureSessionDescription } from "./call-media-guard";

export const LIVE_FEED_MAX_COHOSTS = 4;
export const LIVE_FEED_MIN_PRICE_CENTS = 100;
export const LIVE_FEED_MAX_PRICE_CENTS = 20_000;
export const LIVE_FEED_PRODUCT = "live_feed";

export type LiveFeedAccess = "free" | "paid";
export type LiveFeedRole = "host" | "cohost" | "viewer";

export type LiveFeed = {
  id: string;
  hostUserId: string;
  hostName: string;
  title: string;
  access: LiveFeedAccess;
  priceCents: number;
  status: "live" | "ended";
  createdAt: string;
};

type Seat = {
  feedId: string;
  userId: string;
  name: string;
  role: LiveFeedRole;
};

type CoHostInvite = {
  token: string;
  feedId: string;
  redeemedByUserId?: string;
  createdAt: string;
};

type PairSignal = {
  offer?: string;
  answer?: string;
  ice: Array<{ fromUserId: string; candidate: string }>;
};

const feeds = new Map<string, LiveFeed>();
const seats = new Map<string, Seat>();
const invites = new Map<string, CoHostInvite>();
const signals = new Map<string, PairSignal>();

function seatKey(feedId: string, userId: string): string {
  return `${feedId}:${userId}`;
}

function pairKey(feedId: string, a: string, b: string): string {
  return a < b ? `${feedId}:${a}:${b}` : `${feedId}:${b}:${a}`;
}

export function _resetLiveFeedsForTests(): void {
  feeds.clear();
  seats.clear();
  invites.clear();
  signals.clear();
}

function requireFeed(feedId: string): LiveFeed {
  const feed = feeds.get(feedId);
  if (!feed) throw new TRPCError({ code: "NOT_FOUND", message: "Live feed not found." });
  return feed;
}

function putSeat(seat: Seat): void {
  seats.set(seatKey(seat.feedId, seat.userId), seat);
}

export function getLiveFeed(feedId: string): LiveFeed | null {
  return feeds.get(feedId) ?? null;
}

export function liveFeedRole(feedId: string, userId: string): LiveFeedRole | null {
  return seats.get(seatKey(feedId, userId))?.role ?? null;
}

export function listLiveFeedCohosts(feedId: string): Array<{ userId: string; name: string }> {
  return [...seats.values()]
    .filter((seat) => seat.feedId === feedId && seat.role === "cohost")
    .map((seat) => ({ userId: seat.userId, name: seat.name }));
}

export function listLiveFeedSpeakers(feedId: string): Array<{ userId: string; name: string; role: LiveFeedRole }> {
  return [...seats.values()]
    .filter((seat) => seat.feedId === feedId && (seat.role === "host" || seat.role === "cohost"))
    .map((seat) => ({ userId: seat.userId, name: seat.name, role: seat.role }));
}

export function startLiveFeed(params: {
  hostUserId: string;
  hostName: string;
  title: string;
  access: LiveFeedAccess;
  priceCents?: number;
}): LiveFeed {
  const title = sanitizeUserText(params.title, 80) || "Live feed";
  const hostName = sanitizeUserText(params.hostName, 40) || "Creator";
  const priceCents =
    params.access === "paid" ? Math.round(params.priceCents ?? 0) : 0;
  if (params.access === "paid") {
    if (priceCents < LIVE_FEED_MIN_PRICE_CENTS || priceCents > LIVE_FEED_MAX_PRICE_CENTS) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A paid live feed costs from $1.00 to $200.00.",
      });
    }
  }
  for (const existing of feeds.values()) {
    if (existing.hostUserId === params.hostUserId && existing.access === params.access && existing.status === "live") {
      existing.status = "ended";
      feeds.set(existing.id, existing);
    }
  }
  const feed: LiveFeed = {
    id: randomUUID(),
    hostUserId: params.hostUserId,
    hostName,
    title,
    access: params.access,
    priceCents,
    status: "live",
    createdAt: new Date().toISOString(),
  };
  feeds.set(feed.id, feed);
  putSeat({ feedId: feed.id, userId: params.hostUserId, name: hostName, role: "host" });
  return feed;
}

export function endLiveFeed(params: { feedId: string; hostUserId: string }): LiveFeed {
  const feed = requireFeed(params.feedId);
  if (feed.hostUserId !== params.hostUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the host can end this live feed." });
  }
  feed.status = "ended";
  feeds.set(feed.id, feed);
  return feed;
}

export function listHostLiveFeeds(hostUserId: string): LiveFeed[] {
  return [...feeds.values()]
    .filter((feed) => feed.hostUserId === hostUserId && feed.status === "live")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function hasPaidSeat(feedId: string, userId: string): boolean {
  const seat = seats.get(seatKey(feedId, userId));
  return seat?.role === "viewer" || seat?.role === "host" || seat?.role === "cohost";
}

export function grantLiveFeedTicket(params: { feedId: string; userId: string; priceCents: number; name?: string }): boolean {
  const feed = feeds.get(params.feedId);
  if (!feed || feed.access !== "paid") return false;
  if (feed.priceCents !== params.priceCents) return false;
  if (params.userId === feed.hostUserId) return false;
  const existing = seats.get(seatKey(params.feedId, params.userId));
  if (existing?.role === "cohost" || existing?.role === "host") return true;
  putSeat({
    feedId: params.feedId,
    userId: params.userId,
    name: sanitizeUserText(params.name ?? "Viewer", 40) || "Viewer",
    role: "viewer",
  });
  return true;
}

export function enterLiveFeed(params: { feedId: string; userId: string; name: string }): {
  feed: LiveFeed;
  role: LiveFeedRole | null;
  canWatch: boolean;
  needsPayment: boolean;
} {
  const feed = requireFeed(params.feedId);
  const name = sanitizeUserText(params.name, 40) || "Member";
  const role = liveFeedRole(params.feedId, params.userId);
  if (feed.status === "ended") {
    return { feed, role, canWatch: role === "host", needsPayment: false };
  }
  if (role === "host" || role === "cohost") {
    return { feed, role, canWatch: true, needsPayment: false };
  }
  if (feed.access === "free") {
    putSeat({ feedId: feed.id, userId: params.userId, name, role: "viewer" });
    return { feed, role: "viewer", canWatch: true, needsPayment: false };
  }
  if (hasPaidSeat(params.feedId, params.userId)) {
    return { feed, role: "viewer", canWatch: true, needsPayment: false };
  }
  return { feed, role: null, canWatch: false, needsPayment: true };
}

export function createCoHostInvite(params: { feedId: string; hostUserId: string }): { token: string; seatsLeft: number } {
  const feed = requireFeed(params.feedId);
  if (feed.hostUserId !== params.hostUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the host can invite a co-host." });
  }
  if (feed.status !== "live") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This live feed has ended." });
  }
  const taken = listLiveFeedCohosts(feed.id).length;
  if (taken >= LIVE_FEED_MAX_COHOSTS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This live feed already has 4 co-hosts.",
    });
  }
  const token = randomBytes(18).toString("hex");
  invites.set(token, { token, feedId: feed.id, createdAt: new Date().toISOString() });
  return { token, seatsLeft: LIVE_FEED_MAX_COHOSTS - taken };
}

export function redeemCoHostInvite(params: { token: string; userId: string; name: string }): {
  feedId: string;
  role: "cohost";
} {
  const token = params.token.trim();
  const invite = invites.get(token);
  if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "This co-host link is not valid." });
  const feed = requireFeed(invite.feedId);
  if (feed.status !== "live") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This live feed has ended." });
  }
  if (params.userId === feed.hostUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You are already the host." });
  }
  if (invite.redeemedByUserId && invite.redeemedByUserId !== params.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This co-host link was already used." });
  }
  const existing = seats.get(seatKey(feed.id, params.userId));
  if (existing?.role === "cohost") {
    return { feedId: feed.id, role: "cohost" };
  }
  if (listLiveFeedCohosts(feed.id).length >= LIVE_FEED_MAX_COHOSTS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This live feed already has 4 co-hosts." });
  }
  invite.redeemedByUserId = params.userId;
  invites.set(token, invite);
  putSeat({
    feedId: feed.id,
    userId: params.userId,
    name: sanitizeUserText(params.name, 40) || "Co-host",
    role: "cohost",
  });
  return { feedId: feed.id, role: "cohost" };
}

export function assertCanWatchLiveFeed(feedId: string, userId: string): LiveFeed {
  const feed = requireFeed(feedId);
  const entered = enterLiveFeed({ feedId, userId, name: "Member" });
  if (!entered.canWatch) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        feed.access === "paid"
          ? "This is a paid live feed. Pay the ticket to come inside."
          : "This live feed is not open.",
    });
  }
  return feed;
}

export function postInterviewSignal(params: {
  feedId: string;
  userId: string;
  peerUserId: string;
  kind: "offer" | "answer" | "ice";
  payload: string;
}): { ok: true } {
  const feed = requireFeed(params.feedId);
  if (feed.status !== "live") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This live feed has ended." });
  }
  const speakers = new Set(listLiveFeedSpeakers(params.feedId).map((speaker) => speaker.userId));
  if (!speakers.has(params.userId) || !speakers.has(params.peerUserId) || params.userId === params.peerUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the host and co-hosts can join the interview." });
  }
  const key = pairKey(params.feedId, params.userId, params.peerUserId);
  const row = signals.get(key) ?? { ice: [] };
  if (params.kind === "offer") {
    if (!(params.userId < params.peerUserId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Call setup was rejected." });
    }
    row.offer = assertSecureSessionDescription(params.payload, "offer");
  } else if (params.kind === "answer") {
    if (!(params.userId > params.peerUserId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Call setup was rejected." });
    }
    row.answer = assertSecureSessionDescription(params.payload, "answer");
  } else {
    const candidate = assertIceCandidate(params.payload);
    row.ice.push({ fromUserId: params.userId, candidate });
    if (row.ice.length > 30) row.ice.splice(0, row.ice.length - 30);
  }
  signals.set(key, row);
  return { ok: true };
}

export function listInterviewSignals(params: { feedId: string; userId: string }): Array<{
  peerUserId: string;
  offer?: string;
  answer?: string;
  ice: Array<{ fromUserId: string; candidate: string }>;
}> {
  assertCanWatchLiveFeed(params.feedId, params.userId);
  const speakers = listLiveFeedSpeakers(params.feedId);
  if (!speakers.some((speaker) => speaker.userId === params.userId)) return [];
  return speakers
    .filter((speaker) => speaker.userId !== params.userId)
    .map((speaker) => {
      const row = signals.get(pairKey(params.feedId, params.userId, speaker.userId));
      return {
        peerUserId: speaker.userId,
        offer: row?.offer,
        answer: row?.answer,
        ice: row?.ice ?? [],
      };
    });
}
