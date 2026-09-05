/**
 * Hard-coded audience ledger for content creators.
 * Follow / paid subscribe are fan-only. Creators cannot change counts.
 */

import { TRPCError } from "@trpc/server";
import {
  deleteCreatorFollow,
  deletePaidChannelSub,
  persistCreatorFollow,
  persistPaidChannelSub,
} from "./creator-audience-persistence";
import {
  FOUNDING_AUDIENCE_BOOST_FOLLOWERS_REQUIRED,
  FOUNDING_AUDIENCE_BOOST_PAID_SUBSCRIBERS_REQUIRED,
  FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED,
  FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED,
} from "../../lib/founding-audience-year-discount";
import { getLaunchWindowEnd } from "../../lib/launch-promotion-config";

export type CreatorFollow = {
  followerUserId: string;
  creatorUserId: string;
  followedAt: string;
};

export type CreatorPaidSubscription = {
  subscriberUserId: string;
  creatorUserId: string;
  subscribedAt: string;
};

export type CreatorAudienceCounts = {
  followerCount: number;
  paidSubscriberCount: number;
  freeFollowerCount: number;
  uniquePeopleCount: number;
};

export type QualifyingFoundingAudienceCounts = {
  freeFollowerCount: number;
  paidSubscriberCount: number;
  uniquePeopleCount: number;
  twoThousandReachedAt: string | null;
  fourThousandReachedAt: string | null;
};

function nthTimestamp(dates: number[], n: number): number | null {
  if (n < 1 || dates.length < n) return null;
  const sorted = [...dates].sort((a, b) => a - b);
  return sorted[n - 1]!;
}

function laterMs(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.max(a, b);
}

function msToIso(ms: number | null): string | null {
  return ms == null ? null : new Date(ms).toISOString();
}

const follows = new Map<string, CreatorFollow>();
const paidSubs = new Map<string, CreatorPaidSubscription>();
let persistAudience = true;

function followKey(followerUserId: string, creatorUserId: string): string {
  return `${followerUserId}:${creatorUserId}`;
}

function paidKey(subscriberUserId: string, creatorUserId: string): string {
  return `${subscriberUserId}:${creatorUserId}`;
}

export function _resetCreatorAudienceForTests(): void {
  follows.clear();
  paidSubs.clear();
  persistAudience = false;
}

export function restoreCreatorAudienceFromPersistence(data: {
  follows: CreatorFollow[];
  paidSubs: CreatorPaidSubscription[];
}): void {
  persistAudience = true;
  follows.clear();
  paidSubs.clear();
  for (const follow of data.follows) {
    follows.set(followKey(follow.followerUserId, follow.creatorUserId), follow);
  }
  for (const sub of data.paidSubs) {
    paidSubs.set(paidKey(sub.subscriberUserId, sub.creatorUserId), sub);
  }
}

export function followCreatorChannel(params: {
  followerUserId: string;
  creatorUserId: string;
}): CreatorFollow {
  if (params.followerUserId === params.creatorUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow yourself." });
  }
  const key = followKey(params.followerUserId, params.creatorUserId);
  const existing = follows.get(key);
  if (existing) return existing;
  const record: CreatorFollow = {
    followerUserId: params.followerUserId,
    creatorUserId: params.creatorUserId,
    followedAt: new Date().toISOString(),
  };
  follows.set(key, record);
  if (persistAudience) void persistCreatorFollow(record);
  return record;
}

export function unfollowCreatorChannel(params: {
  followerUserId: string;
  creatorUserId: string;
}): boolean {
  if (paidSubs.has(paidKey(params.followerUserId, params.creatorUserId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cancel your paid subscription before unfollowing.",
    });
  }
  const removed = follows.delete(followKey(params.followerUserId, params.creatorUserId));
  if (removed && persistAudience) {
    void deleteCreatorFollow(params.followerUserId, params.creatorUserId);
  }
  return removed;
}

export function startPaidChannelSubscription(params: {
  subscriberUserId: string;
  creatorUserId: string;
}): CreatorPaidSubscription {
  if (params.subscriberUserId === params.creatorUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot subscribe to yourself." });
  }
  followCreatorChannel({
    followerUserId: params.subscriberUserId,
    creatorUserId: params.creatorUserId,
  });
  const key = paidKey(params.subscriberUserId, params.creatorUserId);
  const existing = paidSubs.get(key);
  if (existing) return existing;
  const record: CreatorPaidSubscription = {
    subscriberUserId: params.subscriberUserId,
    creatorUserId: params.creatorUserId,
    subscribedAt: new Date().toISOString(),
  };
  paidSubs.set(key, record);
  if (persistAudience) void persistPaidChannelSub(record);
  return record;
}

export function cancelPaidChannelSubscription(params: {
  subscriberUserId: string;
  creatorUserId: string;
}): boolean {
  const removed = paidSubs.delete(paidKey(params.subscriberUserId, params.creatorUserId));
  if (removed && persistAudience) {
    void deletePaidChannelSub(params.subscriberUserId, params.creatorUserId);
  }
  return removed;
}

export function isFollowingCreator(followerUserId: string, creatorUserId: string): boolean {
  return follows.has(followKey(followerUserId, creatorUserId));
}

export function hasPaidChannelSubscription(subscriberUserId: string, creatorUserId: string): boolean {
  return paidSubs.has(paidKey(subscriberUserId, creatorUserId));
}

export function listCreatorFollowers(creatorUserId: string): CreatorFollow[] {
  return [...follows.values()]
    .filter((f) => f.creatorUserId === creatorUserId)
    .sort((a, b) => Date.parse(b.followedAt) - Date.parse(a.followedAt));
}

export function listCreatorPaidSubscribers(creatorUserId: string): CreatorPaidSubscription[] {
  return [...paidSubs.values()]
    .filter((s) => s.creatorUserId === creatorUserId)
    .sort((a, b) => Date.parse(b.subscribedAt) - Date.parse(a.subscribedAt));
}

export function getCreatorAudienceCounts(creatorUserId: string): CreatorAudienceCounts {
  const followers = listCreatorFollowers(creatorUserId);
  const paid = listCreatorPaidSubscribers(creatorUserId);
  const paidIds = new Set(paid.map((s) => s.subscriberUserId));
  const freeFollowerCount = followers.filter((f) => !paidIds.has(f.followerUserId)).length;
  return {
    followerCount: followers.length,
    paidSubscriberCount: paid.length,
    freeFollowerCount,
    uniquePeopleCount: freeFollowerCount + paid.length,
  };
}

/** Offer counts: in-window follows/subs, and a paid person never also counts as a free follower. */
export function getQualifyingFoundingAudienceCounts(
  creatorUserId: string,
  windowEnd = getLaunchWindowEnd(),
): QualifyingFoundingAudienceCounts {
  const cutoff = windowEnd.getTime();
  const inWindowPaid = listCreatorPaidSubscribers(creatorUserId).filter(
    (s) => Date.parse(s.subscribedAt) <= cutoff,
  );
  const paidIds = new Set(inWindowPaid.map((s) => s.subscriberUserId));
  const inWindowFree = listCreatorFollowers(creatorUserId).filter(
    (f) => Date.parse(f.followedAt) <= cutoff && !paidIds.has(f.followerUserId),
  );
  const freeTimes = inWindowFree.map((f) => Date.parse(f.followedAt));
  const paidTimes = inWindowPaid.map((s) => Date.parse(s.subscribedAt));
  return {
    freeFollowerCount: inWindowFree.length,
    paidSubscriberCount: paidIds.size,
    uniquePeopleCount: inWindowFree.length + paidIds.size,
    twoThousandReachedAt: msToIso(
      laterMs(
        nthTimestamp(freeTimes, FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED),
        nthTimestamp(paidTimes, FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED),
      ),
    ),
    fourThousandReachedAt: msToIso(
      laterMs(
        nthTimestamp(freeTimes, FOUNDING_AUDIENCE_BOOST_FOLLOWERS_REQUIRED),
        nthTimestamp(paidTimes, FOUNDING_AUDIENCE_BOOST_PAID_SUBSCRIBERS_REQUIRED),
      ),
    ),
  };
}

export function getCreatorAudienceLedger(creatorUserId: string) {
  const followers = listCreatorFollowers(creatorUserId);
  const paidSubscribers = listCreatorPaidSubscribers(creatorUserId);
  const live = getCreatorAudienceCounts(creatorUserId);
  const qualifying = getQualifyingFoundingAudienceCounts(creatorUserId);
  return {
    ...live,
    qualifying,
    followers: followers.map((f) => ({
      userId: f.followerUserId,
      followedAt: f.followedAt,
    })),
    paidSubscribers: paidSubscribers.map((s) => ({
      userId: s.subscriberUserId,
      subscribedAt: s.subscribedAt,
    })),
  };
}

export function getMyCreatorAudienceStatus(params: {
  fanUserId: string;
  creatorUserId: string;
}): CreatorAudienceCounts & { following: boolean; paidSubscriber: boolean } {
  const counts = getCreatorAudienceCounts(params.creatorUserId);
  return {
    ...counts,
    following: isFollowingCreator(params.fanUserId, params.creatorUserId),
    paidSubscriber: hasPaidChannelSubscription(params.fanUserId, params.creatorUserId),
  };
}

/** Test helper — creates distinct fan IDs so counts stay relationship-backed. */
export function grantAudienceRelationshipsForTests(params: {
  creatorUserId: string;
  followerCount: number;
  paidSubscriberCount: number;
  at?: Date;
  startFollowerIndex?: number;
  startPaidIndex?: number;
}): CreatorAudienceCounts {
  persistAudience = false;
  const followers = Math.max(0, Math.floor(params.followerCount));
  const paid = Math.max(0, Math.floor(params.paidSubscriberCount));
  const followerStart = Math.max(0, Math.floor(params.startFollowerIndex ?? 0));
  const paidStart = Math.max(0, Math.floor(params.startPaidIndex ?? 0));
  const now = (params.at ?? new Date()).toISOString();
  for (let i = 0; i < followers; i++) {
    const followerUserId = `${params.creatorUserId}-fan-${followerStart + i}`;
    follows.set(followKey(followerUserId, params.creatorUserId), {
      followerUserId,
      creatorUserId: params.creatorUserId,
      followedAt: now,
    });
  }
  for (let i = 0; i < paid; i++) {
    const subscriberUserId = `${params.creatorUserId}-paid-${paidStart + i}`;
    follows.set(followKey(subscriberUserId, params.creatorUserId), {
      followerUserId: subscriberUserId,
      creatorUserId: params.creatorUserId,
      followedAt: now,
    });
    paidSubs.set(paidKey(subscriberUserId, params.creatorUserId), {
      subscriberUserId,
      creatorUserId: params.creatorUserId,
      subscribedAt: now,
    });
  }
  return getCreatorAudienceCounts(params.creatorUserId);
}
