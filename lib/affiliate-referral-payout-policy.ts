/**
 * Affiliate $5 referral fee — one rule, used by server payouts and public copy.
 *
 * During the first 30 launch days, everyone who joins gets 24 hours of free service.
 * The referrer is not paid $5 until:
 *   1. that free 24 hours has finished, and
 *   2. the referred content creator then completes five transactions
 *      that happen after those 24 hours.
 * Sales during the free 24 hours do not count. Referring someone during
 * those first 24 hours does not start the five-transaction count early.
 */

import {
  getLaunchDate,
  getLaunchWindowEnd,
  LAUNCH_SIGNUP_WINDOW_DAYS,
} from "@/lib/launch-promotion-config";

export const AFFILIATE_REFERRAL_BONUS_CENTS = 500;
export const AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS = 5;
export const CREATOR_FREE_SERVICE_HOURS = 24;

export const AFFILIATE_REFERRAL_PAYOUT_RULE =
  "You earn $5.00 only after a referred content creator finishes their first 24 hours of free service, then completes five transactions. Sales during those first 24 hours do not count. This 24-hour free window is for people who join in the first 30 days of launch. If you refer a creator during those first 24 hours, the five-transaction count still waits until that free day is over.";

export const AFFILIATE_REFERRAL_PAYOUT_RULE_SHORT =
  "$5 after their free 24 hours, then 5 later sales — not during the first day.";

export function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

export function creatorJoinedDuringLaunchWindow(params: {
  enrolledAt: Date;
  launchDate?: Date;
}): boolean {
  const launchDate = params.launchDate ?? getLaunchDate();
  const windowEnd = getLaunchWindowEnd(launchDate);
  return params.enrolledAt.getTime() <= windowEnd.getTime();
}

/** End of the 24-hour free window, or null if they joined after the 30-day launch. */
export function resolveCreatorFreeServiceEnd(params: {
  enrolledAt: Date;
  launchDate?: Date;
}): Date | null {
  if (!creatorJoinedDuringLaunchWindow(params)) return null;
  return new Date(params.enrolledAt.getTime() + hoursToMs(CREATOR_FREE_SERVICE_HOURS));
}

export function isCreatorFreeServiceActive(params: {
  freeServiceEndsAt: Date | null;
  now: Date;
}): boolean {
  if (!params.freeServiceEndsAt) return false;
  return params.now.getTime() < params.freeServiceEndsAt.getTime();
}

export function shouldCountTowardAffiliatePayout(params: {
  freeServiceEndsAt: Date | null;
  transactionAt: Date;
}): boolean {
  if (!params.freeServiceEndsAt) return true;
  return params.transactionAt.getTime() >= params.freeServiceEndsAt.getTime();
}

export function canPayAffiliateReferralBonus(params: {
  alreadyPaid: boolean;
  freeServiceEndsAt: Date | null;
  qualifyingTransactionCount: number;
  now: Date;
}): boolean {
  if (params.alreadyPaid) return false;
  if (isCreatorFreeServiceActive({ freeServiceEndsAt: params.freeServiceEndsAt, now: params.now })) {
    return false;
  }
  return params.qualifyingTransactionCount >= AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS;
}

export function remainingQualifyingTransactions(qualifyingTransactionCount: number): number {
  return Math.max(0, AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS - qualifyingTransactionCount);
}

export function describeAffiliateReferralProgress(params: {
  freeServiceEndsAt: Date | null;
  now: Date;
  qualifyingTransactionCount: number;
  bonusPaid: boolean;
}): string {
  if (params.bonusPaid) {
    return "$5.00 referral fee paid after the free 24 hours and five later transactions.";
  }
  if (isCreatorFreeServiceActive({ freeServiceEndsAt: params.freeServiceEndsAt, now: params.now })) {
    return "Waiting for the creator's first 24 free hours to finish. Sales during that window do not count toward the five transactions.";
  }
  const left = remainingQualifyingTransactions(params.qualifyingTransactionCount);
  if (left > 0) {
    return `${params.qualifyingTransactionCount} of ${AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS} qualifying transactions after the free 24 hours. ${left} more before the $5 referral fee.`;
  }
  return "Five qualifying transactions after the free 24 hours are complete. The $5 referral fee is due.";
}

export function getAffiliateReferralProgramInfo() {
  return {
    affiliateBonusUsd: (AFFILIATE_REFERRAL_BONUS_CENTS / 100).toFixed(2),
    payoutAfterTransactions: AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS,
    freeServiceHours: CREATOR_FREE_SERVICE_HOURS,
    launchWindowDays: LAUNCH_SIGNUP_WINDOW_DAYS,
    rule: AFFILIATE_REFERRAL_PAYOUT_RULE,
    ruleShort: AFFILIATE_REFERRAL_PAYOUT_RULE_SHORT,
  };
}
