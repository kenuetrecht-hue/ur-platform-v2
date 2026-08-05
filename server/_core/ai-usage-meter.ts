/**
 * Enforces per-subscription message allowances so API cost stays within plan revenue.
 */

import { TRPCError } from "@trpc/server";
import {
  getMessageAllowance,
  getMembershipMessageAllowance,
  HIVE_MESSAGE_MULTIPLIER,
  LEARN_MESSAGE_MULTIPLIER,
} from "../../lib/ai-usage-allowances";
import { getAiPriceTier, type AiSubscriptionPlan } from "../../lib/ai-subscription-pricing";
import {
  getActiveAiSubscription,
  incrementSubscriptionMessageUsage,
} from "./ai-subscription-service";
import { getAccessStatus } from "./access-entitlements";
import {
  consumeLoyaltyTextMessage,
  getFreeTextMessagesRemaining,
  getLoyaltyAccount,
  hasLoyaltyTextAccess,
} from "./loyalty-streak-service";
import { LOYALTY_ALLOWS_LEARN_OR_HIVE, LOYALTY_POINTS_PER_TEXT_MESSAGE } from "../../lib/loyalty-program-config";

export type UsageConsumeParams = {
  userId: string;
  email?: string | null;
  creatorId: string;
  isPlatformOwner: boolean;
  /** Hive consult counts as 3 messages */
  useHive?: boolean;
  /** Learn / long-form counts as 2 */
  isLearnMode?: boolean;
};

export type UsageStatus = {
  messagesIncluded: number;
  messagesUsed: number;
  messagesRemaining: number;
  source: "ai_subscription" | "membership" | "owner_grant" | "owner" | "loyalty" | "none";
};

const membershipUsageStore = new Map<string, { used: number; periodKey: string }>();

function membershipPeriodKey(userId: string, plan: string, expiresAt: string): string {
  return `${userId}:${plan}:${expiresAt.slice(0, 10)}`;
}

function messageUnits(params: { useHive?: boolean; isLearnMode?: boolean }): number {
  if (params.useHive) return HIVE_MESSAGE_MULTIPLIER;
  if (params.isLearnMode) return LEARN_MESSAGE_MULTIPLIER;
  return 1;
}

export function getAiUsageStatus(params: {
  userId: string;
  email?: string | null;
  creatorId: string;
  isPlatformOwner: boolean;
}): UsageStatus {
  if (params.isPlatformOwner) {
    return {
      messagesIncluded: 999_999,
      messagesUsed: 0,
      messagesRemaining: 999_999,
      source: "owner",
    };
  }

  const sub = getActiveAiSubscription(params.userId, params.creatorId);
  if (sub) {
    const remaining = Math.max(0, sub.messagesIncluded - sub.messagesUsed);
    return {
      messagesIncluded: sub.messagesIncluded,
      messagesUsed: sub.messagesUsed,
      messagesRemaining: remaining,
      source: "ai_subscription",
    };
  }

  const access = getAccessStatus({
    userId: params.userId,
    email: params.email,
    isPlatformOwner: false,
  });

  if (access.source === "owner_grant") {
    return {
      messagesIncluded: 500,
      messagesUsed: 0,
      messagesRemaining: 500,
      source: "owner_grant",
    };
  }

  if (access.source === "membership" && access.membershipPlan) {
    const included = getMembershipMessageAllowance(
      access.membershipPlan as "day" | "week" | "month" | "year",
    );
    const periodKey = membershipPeriodKey(
      params.userId,
      access.membershipPlan,
      access.membershipExpiresAt ?? "",
    );
    const bucket = membershipUsageStore.get(`${periodKey}:${params.creatorId}`);
    const used = bucket?.periodKey === periodKey ? bucket.used : 0;
    return {
      messagesIncluded: included,
      messagesUsed: used,
      messagesRemaining: Math.max(0, included - used),
      source: "membership",
    };
  }

  const freeLoyalty = getFreeTextMessagesRemaining(params.userId, params.creatorId);
  const loyaltyAccount = getLoyaltyAccount(params.userId);
  const lpMessages = Math.floor(loyaltyAccount.totalPoints / LOYALTY_POINTS_PER_TEXT_MESSAGE);
  const loyaltyIncluded = freeLoyalty + lpMessages;
  if (loyaltyIncluded > 0) {
    return {
      messagesIncluded: loyaltyIncluded,
      messagesUsed: 0,
      messagesRemaining: loyaltyIncluded,
      source: "loyalty",
    };
  }

  return {
    messagesIncluded: 0,
    messagesUsed: 0,
    messagesRemaining: 0,
    source: "none",
  };
}

/** Throws if allowance exhausted; increments usage counter on success. */
export function assertAndConsumeAiUsage(params: UsageConsumeParams): UsageStatus {
  if (params.isPlatformOwner) {
    return getAiUsageStatus(params);
  }

  const units = messageUnits(params);
  const sub = getActiveAiSubscription(params.userId, params.creatorId);

  if (sub) {
    if (sub.messagesUsed + units > sub.messagesIncluded) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Message limit reached (${sub.messagesIncluded} included on your ${sub.plan} plan). Renew or upgrade to continue chatting.`,
      });
    }
    incrementSubscriptionMessageUsage(params.userId, params.creatorId, units);
    return getAiUsageStatus(params);
  }

  const access = getAccessStatus({
    userId: params.userId,
    email: params.email,
    isPlatformOwner: false,
  });

  if (access.source === "owner_grant") {
    return getAiUsageStatus(params);
  }

  if (access.source === "membership" && access.membershipPlan) {
    const included = getMembershipMessageAllowance(
      access.membershipPlan as "day" | "week" | "month" | "year",
    );
    const periodKey = membershipPeriodKey(
      params.userId,
      access.membershipPlan,
      access.membershipExpiresAt ?? "",
    );
    const storeKey = `${periodKey}:${params.creatorId}`;
    let bucket = membershipUsageStore.get(storeKey);
    if (!bucket || bucket.periodKey !== periodKey) {
      bucket = { used: 0, periodKey };
    }
    if (bucket.used + units > included) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Message limit reached (${included} included on your membership). Upgrade your plan to continue.`,
      });
    }
    bucket.used += units;
    membershipUsageStore.set(storeKey, bucket);
    return getAiUsageStatus(params);
  }

  if (params.useHive || params.isLearnMode) {
    if (!LOYALTY_ALLOWS_LEARN_OR_HIVE) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Learn mode and hive consults require a paid subscription.",
      });
    }
  }

  if (hasLoyaltyTextAccess(params.userId, params.creatorId)) {
    consumeLoyaltyTextMessage({
      userId: params.userId,
      creatorId: params.creatorId,
      units,
    });
    return getAiUsageStatus(params);
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Subscribe to this AI specialist to start chatting.",
  });
}

export function _clearUsageMeterForTests(): void {
  membershipUsageStore.clear();
}
