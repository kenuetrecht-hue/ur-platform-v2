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
};

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
  return {
    followerCount: listCreatorFollowers(creatorUserId).length,
    paidSubscriberCount: listCreatorPaidSubscribers(creatorUserId).length,
  };
}

export function getCreatorAudienceLedger(creatorUserId: string) {
  const followers = listCreatorFollowers(creatorUserId);
  const paidSubscribers = listCreatorPaidSubscribers(creatorUserId);
  return {
    followerCount: followers.length,
    paidSubscriberCount: paidSubscribers.length,
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
}): CreatorAudienceCounts {
  persistAudience = false;
  const followers = Math.max(0, Math.floor(params.followerCount));
  const paid = Math.max(0, Math.floor(params.paidSubscriberCount));
  const now = new Date().toISOString();
  for (let i = 0; i < followers; i++) {
    const followerUserId = `${params.creatorUserId}-fan-${i}`;
    follows.set(followKey(followerUserId, params.creatorUserId), {
      followerUserId,
      creatorUserId: params.creatorUserId,
      followedAt: now,
    });
  }
  for (let i = 0; i < paid; i++) {
    const subscriberUserId = `${params.creatorUserId}-paid-${i}`;
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
