/**
 * Daily sign-in streaks, loyalty balances, and capped free-text rewards.
 * All mutations write to the append-only tracking ledger.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  LOYALTY_WELCOME_BONUS_POINTS,
  LOYALTY_POINTS_PER_TEXT_MESSAGE,
  LOYALTY_STREAK_MILESTONES,
  LOYALTY_STREAK_30_FREE_DAY,
  getDailySignInPointsForStreak,
  getMilestoneForStreak,
  utcDateKey,
  previousUtcDateKey,
  isValidMilestoneDay,
} from "../../lib/loyalty-program-config";
import type { LoyaltyAccount, FreeTextGrant, LoyaltyAuditContext } from "../../lib/loyalty-tracking-types";
import {
  recordLoyaltyEvent,
  recordSignIn,
  buildLoyaltyDashboard,
  getLoyaltyEvents,
  _clearLoyaltyTrackingForTests,
} from "./loyalty-tracking-service";

export type { LoyaltyAccount, FreeTextGrant };

const accounts = new Map<string, LoyaltyAccount>();
const freeTextGrants = new Map<string, FreeTextGrant>();
const claimLocks = new Map<string, Promise<unknown>>();

function assertUserId(userId: string): void {
  if (!/^\d+$/.test(userId) && !/^[\w-]{1,64}$/.test(userId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid user." });
  }
}

function getOrCreateAccount(userId: string): LoyaltyAccount {
  assertUserId(userId);
  let account = accounts.get(userId);
  if (!account) {
    account = {
      userId,
      totalPoints: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      totalSignIns: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastSignInDate: null,
      welcomeBonusClaimed: false,
      milestonesClaimed: [],
      currentStreakStartDate: null,
      paidAiPurchaseDuringCurrentStreak: false,
      streak30FreeDayClaimed: false,
      createdAt: new Date().toISOString(),
    };
    accounts.set(userId, account);
  }
  return account;
}

function addPoints(account: LoyaltyAccount, amount: number): void {
  if (amount <= 0) return;
  account.totalPoints += amount;
  account.totalPointsEarned += amount;
}

function spendPoints(account: LoyaltyAccount, amount: number): boolean {
  if (amount <= 0 || account.totalPoints < amount) return false;
  account.totalPoints -= amount;
  account.totalPointsSpent += amount;
  return true;
}

async function withClaimLock<T>(userId: string, fn: () => T): Promise<T> {
  const prev = claimLocks.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  claimLocks.set(userId, prev.then(() => gate));
  await prev;
  try {
    return fn();
  } finally {
    release();
    if (claimLocks.get(userId) === gate) {
      claimLocks.delete(userId);
    }
  }
}

export type DailySignInResult = {
  alreadyClaimedToday: boolean;
  pointsAwardedToday: number;
  welcomeBonusAwarded: number;
  totalPoints: number;
  currentStreakDays: number;
  longestStreakDays: number;
  totalSignIns: number;
  milestoneUnlocked: (typeof LOYALTY_STREAK_MILESTONES)[number] | null;
  nextMilestone: (typeof LOYALTY_STREAK_MILESTONES)[number] | null;
  streakWasReset: boolean;
};

export async function claimDailySignIn(
  userId: string,
  audit?: LoyaltyAuditContext,
): Promise<DailySignInResult> {
  return withClaimLock(userId, () => {
    const account = getOrCreateAccount(userId);
    const today = utcDateKey();

    if (account.lastSignInDate === today) {
      recordLoyaltyEvent({
        userId,
        eventType: "sign_in_duplicate_blocked",
        pointsDelta: 0,
        balanceAfter: account.totalPoints,
        streakDays: account.currentStreakDays,
        signInDate: today,
        description: "Duplicate daily sign-in blocked",
        audit,
      });
      return buildSignInResponse(account, {
        alreadyClaimedToday: true,
        pointsAwardedToday: 0,
        welcomeBonusAwarded: 0,
        milestoneUnlocked: null,
        streakWasReset: false,
      });
    }

    let welcomeBonusAwarded = 0;
    if (!account.welcomeBonusClaimed) {
      welcomeBonusAwarded = LOYALTY_WELCOME_BONUS_POINTS;
      addPoints(account, welcomeBonusAwarded);
      account.welcomeBonusClaimed = true;
      recordLoyaltyEvent({
        userId,
        eventType: "welcome_bonus",
        pointsDelta: welcomeBonusAwarded,
        balanceAfter: account.totalPoints,
        streakDays: account.currentStreakDays,
        signInDate: today,
        description: `Welcome bonus — ${welcomeBonusAwarded} loyalty points`,
        audit,
      });
    }

    const yesterday = previousUtcDateKey();
    let streakWasReset = false;
    if (account.lastSignInDate === yesterday) {
      account.currentStreakDays += 1;
    } else if (account.lastSignInDate != null) {
      streakWasReset = true;
      recordLoyaltyEvent({
        userId,
        eventType: "streak_reset",
        pointsDelta: 0,
        balanceAfter: account.totalPoints,
        streakDays: 1,
        signInDate: today,
        description: "Streak reset — missed a day",
        audit,
      });
      account.currentStreakDays = 1;
      account.currentStreakStartDate = today;
      account.paidAiPurchaseDuringCurrentStreak = false;
      account.streak30FreeDayClaimed = false;
    } else {
      account.currentStreakDays = 1;
      account.currentStreakStartDate = today;
      account.paidAiPurchaseDuringCurrentStreak = false;
      account.streak30FreeDayClaimed = false;
    }

    if (account.currentStreakStartDate == null) {
      account.currentStreakStartDate = today;
    }

    account.longestStreakDays = Math.max(account.longestStreakDays, account.currentStreakDays);
    account.lastSignInDate = today;
    account.totalSignIns += 1;

    const dailyPoints = getDailySignInPointsForStreak(account.currentStreakDays);
    addPoints(account, dailyPoints);
    recordLoyaltyEvent({
      userId,
      eventType: "daily_sign_in",
      pointsDelta: dailyPoints,
      balanceAfter: account.totalPoints,
      streakDays: account.currentStreakDays,
      signInDate: today,
      description: `Daily sign-in — +${dailyPoints} LP (${account.currentStreakDays}-day streak)`,
      audit,
    });

    const milestone = getMilestoneForStreak(account.currentStreakDays);
    const milestoneUnlocked =
      milestone && !account.milestonesClaimed.includes(milestone.day) ? milestone : null;

    if (milestoneUnlocked) {
      recordLoyaltyEvent({
        userId,
        eventType: "milestone_pending",
        pointsDelta: 0,
        balanceAfter: account.totalPoints,
        streakDays: account.currentStreakDays,
        signInDate: today,
        milestoneDay: milestoneUnlocked.day,
        description: milestoneUnlocked.label,
        audit,
      });
    }

    const streak30Eligible =
      account.currentStreakDays >= LOYALTY_STREAK_30_FREE_DAY.requiredStreakDays &&
      account.paidAiPurchaseDuringCurrentStreak &&
      !account.streak30FreeDayClaimed;

    if (streak30Eligible) {
      recordLoyaltyEvent({
        userId,
        eventType: "streak_30_free_day_pending",
        pointsDelta: 0,
        balanceAfter: account.totalPoints,
        streakDays: account.currentStreakDays,
        signInDate: today,
        description: LOYALTY_STREAK_30_FREE_DAY.label,
        audit,
      });
    }

    recordSignIn({
      userId,
      signInDate: today,
      pointsEarned: dailyPoints,
      welcomeBonusIncluded: welcomeBonusAwarded,
      streakDaysAfter: account.currentStreakDays,
      streakWasReset,
      milestoneUnlockedDay: milestoneUnlocked?.day ?? null,
      audit,
    });

    accounts.set(userId, account);

    return buildSignInResponse(account, {
      alreadyClaimedToday: false,
      pointsAwardedToday: dailyPoints + welcomeBonusAwarded,
      welcomeBonusAwarded,
      milestoneUnlocked,
      streakWasReset,
    });
  });
}

function buildSignInResponse(
  account: LoyaltyAccount,
  extra: {
    alreadyClaimedToday: boolean;
    pointsAwardedToday: number;
    welcomeBonusAwarded: number;
    milestoneUnlocked: (typeof LOYALTY_STREAK_MILESTONES)[number] | null;
    streakWasReset: boolean;
  },
): DailySignInResult {
  const nextMilestone =
    LOYALTY_STREAK_MILESTONES.find(
      (m) => m.day > account.currentStreakDays && !account.milestonesClaimed.includes(m.day),
    ) ?? null;

  return {
    ...extra,
    totalPoints: account.totalPoints,
    currentStreakDays: account.currentStreakDays,
    longestStreakDays: account.longestStreakDays,
    totalSignIns: account.totalSignIns,
    nextMilestone,
  };
}

export function claimStreakMilestoneReward(params: {
  userId: string;
  creatorId: string;
  milestoneDay: number;
  audit?: LoyaltyAuditContext;
}): FreeTextGrant {
  assertUserId(params.userId);
  if (!isValidMilestoneDay(params.milestoneDay)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid milestone day." });
  }

  const account = getOrCreateAccount(params.userId);
  const milestone = LOYALTY_STREAK_MILESTONES.find((m) => m.day === params.milestoneDay);
  if (!milestone) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown streak milestone." });
  }
  if (account.currentStreakDays < milestone.day) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Reach a ${milestone.day}-day streak to unlock this reward.`,
    });
  }
  if (account.milestonesClaimed.includes(milestone.day)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This milestone was already claimed." });
  }

  account.milestonesClaimed.push(milestone.day);
  accounts.set(params.userId, account);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const grant: FreeTextGrant = {
    id: `lp-free-${randomUUID().slice(0, 10)}`,
    userId: params.userId,
    creatorId: params.creatorId,
    messagesGranted: milestone.freeTextMessages,
    messagesUsed: 0,
    source: "streak_milestone",
    milestoneDay: milestone.day,
    grantedAt: new Date().toISOString(),
    expiresAt,
    active: true,
  };
  freeTextGrants.set(grant.id, grant);

  recordLoyaltyEvent({
    userId: params.userId,
    eventType: "milestone_claimed",
    pointsDelta: 0,
    balanceAfter: account.totalPoints,
    streakDays: account.currentStreakDays,
    creatorId: params.creatorId,
    milestoneDay: milestone.day,
    messagesCount: milestone.freeTextMessages,
    description: `Claimed ${milestone.freeTextMessages} free text messages on ${params.creatorId}`,
    audit: params.audit,
  });

  return grant;
}

export function getLoyaltyAccount(userId: string): LoyaltyAccount {
  return getOrCreateAccount(userId);
}

export function hasClaimedToday(userId: string): boolean {
  const account = accounts.get(userId);
  return account?.lastSignInDate === utcDateKey();
}

export function getAllFreeTextGrantsForUser(userId: string): FreeTextGrant[] {
  return Array.from(freeTextGrants.values()).filter((g) => g.userId === userId);
}

export function getActiveFreeTextGrants(userId: string, creatorId: string): FreeTextGrant[] {
  const now = Date.now();
  return Array.from(freeTextGrants.values()).filter(
    (g) =>
      g.userId === userId &&
      g.creatorId === creatorId &&
      g.active &&
      g.messagesUsed < g.messagesGranted &&
      new Date(g.expiresAt).getTime() > now,
  );
}

export function getFreeTextMessagesRemaining(userId: string, creatorId: string): number {
  return getActiveFreeTextGrants(userId, creatorId).reduce(
    (sum, g) => sum + (g.messagesGranted - g.messagesUsed),
    0,
  );
}

export function consumeLoyaltyTextMessage(params: {
  userId: string;
  creatorId: string;
  units?: number;
  audit?: LoyaltyAuditContext;
}): { source: "free_grant" | "loyalty_points"; pointsSpent: number; messagesConsumed: number } {
  const units = params.units ?? 1;
  if (units < 1 || units > 10) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid message count." });
  }

  const account = getOrCreateAccount(params.userId);
  let remaining = units;
  let pointsSpent = 0;
  let freeUsed = 0;

  for (const grant of getActiveFreeTextGrants(params.userId, params.creatorId)) {
    if (remaining <= 0) break;
    const available = grant.messagesGranted - grant.messagesUsed;
    const use = Math.min(available, remaining);
    grant.messagesUsed += use;
    remaining -= use;
    freeUsed += use;
    freeTextGrants.set(grant.id, grant);
    if (grant.messagesUsed >= grant.messagesGranted) {
      grant.active = false;
    }
    if (use > 0) {
      recordLoyaltyEvent({
        userId: params.userId,
        eventType: "free_message_used",
        pointsDelta: 0,
        balanceAfter: account.totalPoints,
        streakDays: account.currentStreakDays,
        creatorId: params.creatorId,
        messagesCount: use,
        description: `Used ${use} free loyalty text message(s)`,
        audit: params.audit,
      });
    }
  }

  if (remaining > 0) {
    const cost = remaining * LOYALTY_POINTS_PER_TEXT_MESSAGE;
    if (!spendPoints(account, cost)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Not enough loyalty points. Need ${cost} LP for ${remaining} message(s). Subscribe for better value.`,
      });
    }
    pointsSpent = cost;
    accounts.set(params.userId, account);
    recordLoyaltyEvent({
      userId: params.userId,
      eventType: "points_spent_chat",
      pointsDelta: -cost,
      balanceAfter: account.totalPoints,
      streakDays: account.currentStreakDays,
      creatorId: params.creatorId,
      messagesCount: remaining,
      description: `Spent ${cost} LP for ${remaining} text message(s)`,
      audit: params.audit,
    });
  }

  return {
    source:
      freeUsed > 0 && pointsSpent === 0
        ? "free_grant"
        : pointsSpent > 0
          ? "loyalty_points"
          : "free_grant",
    pointsSpent,
    messagesConsumed: units,
  };
}

export function hasLoyaltyTextAccess(userId: string, creatorId: string): boolean {
  const account = getOrCreateAccount(userId);
  return (
    getFreeTextMessagesRemaining(userId, creatorId) > 0 ||
    account.totalPoints >= LOYALTY_POINTS_PER_TEXT_MESSAGE
  );
}

export function getLoyaltyDashboardForUser(userId: string) {
  const account = getOrCreateAccount(userId);
  const claimedToday = hasClaimedToday(userId);
  return buildLoyaltyDashboard({
    account,
    freeGrants: getAllFreeTextGrantsForUser(userId),
    claimedToday,
    streak30FreeDayEligible: isStreak30FreeDayEligibleAccount(account),
    todayDailySignInPoints: claimedToday
      ? getDailySignInPointsForStreak(account.currentStreakDays)
      : getDailySignInPointsForStreak(
          account.lastSignInDate == null ? 1 : account.currentStreakDays + 1,
        ),
    nextDailySignInPoints: getDailySignInPointsForStreak(account.currentStreakDays + 1),
  });
}

export function isStreak30FreeDayEligible(userId: string): boolean {
  return isStreak30FreeDayEligibleAccount(getOrCreateAccount(userId));
}

function isStreak30FreeDayEligibleAccount(account: LoyaltyAccount): boolean {
  return (
    account.currentStreakDays >= LOYALTY_STREAK_30_FREE_DAY.requiredStreakDays &&
    account.paidAiPurchaseDuringCurrentStreak &&
    !account.streak30FreeDayClaimed
  );
}

/** Call when user completes a paid AI subscription checkout during an active streak. */
export function markPaidAiPurchaseDuringStreak(userId: string): void {
  const account = getOrCreateAccount(userId);
  if (account.currentStreakDays < 1 || !account.currentStreakStartDate) return;
  account.paidAiPurchaseDuringCurrentStreak = true;
  accounts.set(userId, account);
}

export function markStreak30FreeDayClaimed(
  userId: string,
  creatorId: string,
  audit?: LoyaltyAuditContext,
): void {
  const account = getOrCreateAccount(userId);
  account.streak30FreeDayClaimed = true;
  accounts.set(userId, account);
  recordLoyaltyEvent({
    userId,
    eventType: "streak_30_free_day_claimed",
    pointsDelta: 0,
    balanceAfter: account.totalPoints,
    streakDays: account.currentStreakDays,
    signInDate: utcDateKey(),
    creatorId,
    description: `Claimed free 1-day AI subscription — ${creatorId}`,
    audit,
  });
}

export function _clearLoyaltyStreakForTests(): void {
  accounts.clear();
  freeTextGrants.clear();
  claimLocks.clear();
  _clearLoyaltyTrackingForTests();
}

/** Free text from loyalty redemption (not streak milestone). */
export function grantLoyaltyFreeTextMessages(params: {
  userId: string;
  creatorId: string;
  messages: number;
  sourceLabel: string;
}): FreeTextGrant {
  assertUserId(params.userId);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const grant: FreeTextGrant = {
    id: `lp-free-${randomUUID().slice(0, 10)}`,
    userId: params.userId,
    creatorId: params.creatorId,
    messagesGranted: params.messages,
    messagesUsed: 0,
    source: "loyalty_redemption",
    grantedAt: new Date().toISOString(),
    expiresAt,
    active: true,
  };
  freeTextGrants.set(grant.id, grant);
  const account = getOrCreateAccount(params.userId);
  recordLoyaltyEvent({
    userId: params.userId,
    eventType: "milestone_claimed",
    pointsDelta: 0,
    balanceAfter: account.totalPoints,
    streakDays: account.currentStreakDays,
    creatorId: params.creatorId,
    messagesCount: params.messages,
    description: `Loyalty redemption — ${params.messages} text message(s): ${params.sourceLabel}`,
  });
  return grant;
}
