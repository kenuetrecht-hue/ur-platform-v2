import {
  OWNER_CHAT_UNLIMITED_MONTHLY_CENTS,
  sumMonthPlatformRevenueCents,
} from "../../lib/owner-ops-auto-speak";
import { subscriptionRevenueCentsThisMonth } from "./ai-subscription-service";
import { listAllTransactions } from "./transaction-ledger-service";

let revenueOverrideCents: number | null = null;

function monthRevenueCents(now: Date): number {
  if (revenueOverrideCents != null) return revenueOverrideCents;
  return (
    sumMonthPlatformRevenueCents(listAllTransactions(), now) + subscriptionRevenueCentsThisMonth(now)
  );
}

export function getOwnerOpsAutoSpeakStatus(now = new Date()) {
  const revenueCents = monthRevenueCents(now);
  return {
    /** Replies the owner sends are spoken. The owner is not stopped after a daily count. */
    autoSpeak: true as const,
    unlimited: true as const,
    revenueCents,
    thresholdCents: OWNER_CHAT_UNLIMITED_MONTHLY_CENTS,
    dailyCap: null,
    dailyUsed: 0,
    dailyRemaining: null,
  };
}

/** The platform owner can keep talking. Member caps live in the usage meter. */
export function assertOwnerChatAllowed(_now = new Date()): void {
  return;
}

/** Owner chats are not counted against a daily cap. */
export function recordOwnerChat(_now = new Date()): void {
  return;
}

export function _resetOwnerChatAllowanceForTests(): void {
  revenueOverrideCents = null;
}

export function _forceOwnerChatRevenueForTests(cents: number | null): void {
  revenueOverrideCents = cents;
}
