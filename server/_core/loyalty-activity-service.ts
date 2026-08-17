/**
 * Award loyalty points for app activities (posts, follows, subscriptions).
 */

import { TRPCError } from "@trpc/server";
import {
  LOYALTY_ACTIVITY_EARN,
  utcDateKey,
  type LoyaltyRedemptionId,
  getRedemptionOffer,
} from "../../lib/loyalty-program-config";
import type { LoyaltyAuditContext } from "../../lib/loyalty-tracking-types";
import {
  getLoyaltyAccount,
  grantLoyaltyFreeTextMessages,
} from "./loyalty-streak-service";
import { recordLoyaltyEvent } from "./loyalty-tracking-service";
import { grantLoyaltyCreditLot } from "./usage-credits-service";
import type { CreditProductId } from "../../lib/usage-caps-catalog";

/** userId → set of one-time claim keys */
const onceClaims = new Map<string, Set<string>>();
/** userId:activity:date → count */
const dailyActivityCounts = new Map<string, number>();

function claimKey(userId: string, key: string): boolean {
  let set = onceClaims.get(userId);
  if (!set) {
    set = new Set();
    onceClaims.set(userId, set);
  }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

function dailyCount(userId: string, activity: string): number {
  const k = `${userId}:${activity}:${utcDateKey()}`;
  return dailyActivityCounts.get(k) ?? 0;
}

function incrementDaily(userId: string, activity: string): void {
  const k = `${userId}:${activity}:${utcDateKey()}`;
  dailyActivityCounts.set(k, (dailyActivityCounts.get(k) ?? 0) + 1);
}

export type AwardResult = {
  awarded: boolean;
  points: number;
  balanceAfter: number;
  reason?: string;
};

function awardPointsInternal(params: {
  userId: string;
  points: number;
  eventType: string;
  description: string;
  audit?: LoyaltyAuditContext;
  creatorId?: string;
}): AwardResult {
  if (params.points <= 0) {
    return { awarded: false, points: 0, balanceAfter: getLoyaltyAccount(params.userId).totalPoints };
  }

  const account = getLoyaltyAccount(params.userId);
  account.totalPoints += params.points;
  account.totalPointsEarned += params.points;

  recordLoyaltyEvent({
    userId: params.userId,
    eventType: params.eventType as import("../../lib/loyalty-tracking-types").LoyaltyTrackingEventType,
    pointsDelta: params.points,
    balanceAfter: account.totalPoints,
    streakDays: account.currentStreakDays,
    signInDate: utcDateKey(),
    description: params.description,
    creatorId: params.creatorId,
    audit: params.audit,
  });

  return {
    awarded: true,
    points: params.points,
    balanceAfter: account.totalPoints,
  };
}

export function awardSocialPostPoints(
  userId: string,
  audit?: LoyaltyAuditContext,
): AwardResult {
  const count = dailyCount(userId, "social_post");
  if (count >= LOYALTY_ACTIVITY_EARN.socialPostDailyCap) {
    return {
      awarded: false,
      points: 0,
      balanceAfter: getLoyaltyAccount(userId).totalPoints,
      reason: "Daily post reward cap reached",
    };
  }
  incrementDaily(userId, "social_post");
  return awardPointsInternal({
    userId,
    points: LOYALTY_ACTIVITY_EARN.socialPost,
    eventType: "activity_social_post",
    description: `Social post — +${LOYALTY_ACTIVITY_EARN.socialPost} LP`,
    audit,
  });
}

export function awardJoinCreatorPoints(params: {
  userId: string;
  creatorUserId: string;
  creatorName: string;
  audit?: LoyaltyAuditContext;
}): AwardResult {
  const key = `join_creator:${params.creatorUserId}`;
  if (!claimKey(params.userId, key)) {
    return {
      awarded: false,
      points: 0,
      balanceAfter: getLoyaltyAccount(params.userId).totalPoints,
      reason: "Already rewarded for this creator",
    };
  }
  return awardPointsInternal({
    userId: params.userId,
    points: LOYALTY_ACTIVITY_EARN.joinCreatorOnce,
    eventType: "activity_join_creator",
    description: `Joined ${params.creatorName} — +${LOYALTY_ACTIVITY_EARN.joinCreatorOnce} LP`,
    audit: params.audit,
  });
}

export function awardAiSubscriptionPurchasePoints(params: {
  userId: string;
  creatorId: string;
  plan: "day" | "week" | "month";
  audit?: LoyaltyAuditContext;
}): AwardResult {
  const points = LOYALTY_ACTIVITY_EARN.aiSubscription[params.plan];
  return awardPointsInternal({
    userId: params.userId,
    points,
    eventType: "activity_ai_subscription",
    description: `AI ${params.plan} subscription — +${points} LP`,
    creatorId: params.creatorId,
    audit: params.audit,
  });
}

export function redeemLoyaltyReward(params: {
  userId: string;
  rewardId: LoyaltyRedemptionId;
  creatorId?: string;
  audit?: LoyaltyAuditContext;
}): {
  ok: true;
  pointsSpent: number;
  balanceAfter: number;
  youReceive: string;
} {
  const offer = getRedemptionOffer(params.rewardId);
  if (!offer) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown reward." });
  }

  const account = getLoyaltyAccount(params.userId);
  if (account.totalPoints < offer.pointsCost) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Need ${offer.pointsCost} LP — you have ${account.totalPoints}. Keep signing in or subscribe for better value.`,
    });
  }

  account.totalPoints -= offer.pointsCost;
  account.totalPointsSpent += offer.pointsCost;

  if (offer.freeTextMessages && offer.freeTextMessages > 0) {
    if (!params.creatorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose an AI specialist for text message rewards.",
      });
    }
    grantLoyaltyFreeTextMessages({
      userId: params.userId,
      creatorId: params.creatorId,
      messages: offer.freeTextMessages,
      sourceLabel: offer.label,
    });
  }

  if (offer.creditProductId && offer.creditIncluded) {
    grantLoyaltyCreditLot({
      userId: params.userId,
      productId: offer.creditProductId as CreditProductId,
      included: offer.creditIncluded,
      label: `Loyalty: ${offer.label}`,
    });
  }

  recordLoyaltyEvent({
    userId: params.userId,
    eventType: "points_redeemed",
    pointsDelta: -offer.pointsCost,
    balanceAfter: account.totalPoints,
    streakDays: account.currentStreakDays,
    signInDate: utcDateKey(),
    description: `Redeemed ${offer.label} — ${offer.youReceive}`,
    creatorId: params.creatorId,
    audit: params.audit,
  });

  return {
    ok: true,
    pointsSpent: offer.pointsCost,
    balanceAfter: account.totalPoints,
    youReceive: offer.youReceive,
  };
}

export function _clearLoyaltyActivityForTests(): void {
  onceClaims.clear();
  dailyActivityCounts.clear();
}
