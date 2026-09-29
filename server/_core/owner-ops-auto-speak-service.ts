import { TRPCError } from "@trpc/server";
import {
  OWNER_CHAT_DAILY_CAP,
  OWNER_CHAT_UNLIMITED_MONTHLY_CENTS,
  ownerChatIsUnlimited,
  sumMonthPlatformRevenueCents,
} from "../../lib/owner-ops-auto-speak";
import { subscriptionRevenueCentsThisMonth } from "./ai-subscription-service";
import { listAllTransactions } from "./transaction-ledger-service";

const INDIANA_TZ = "America/Indiana/Indianapolis";

type DayBucket = { dayKey: string; used: number };

const day: DayBucket = { dayKey: "", used: 0 };
let revenueOverrideCents: number | null = null;

function indianaDayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INDIANA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const date = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${date}`;
}

function rollDay(now = new Date()): void {
  const dayKey = indianaDayKey(now);
  if (day.dayKey !== dayKey) {
    day.dayKey = dayKey;
    day.used = 0;
  }
}

function monthRevenueCents(now: Date): number {
  if (revenueOverrideCents != null) return revenueOverrideCents;
  return (
    sumMonthPlatformRevenueCents(listAllTransactions(), now) + subscriptionRevenueCentsThisMonth(now)
  );
}

export function getOwnerOpsAutoSpeakStatus(now = new Date()) {
  rollDay(now);
  const revenueCents = monthRevenueCents(now);
  const unlimited = ownerChatIsUnlimited(revenueCents);
  const dailyUsed = unlimited ? 0 : day.used;
  const dailyRemaining = unlimited ? null : Math.max(0, OWNER_CHAT_DAILY_CAP - dailyUsed);
  return {
    /** Replies the owner is allowed to send are spoken. The $10,000 voice lock is gone. */
    autoSpeak: true as const,
    unlimited,
    revenueCents,
    thresholdCents: OWNER_CHAT_UNLIMITED_MONTHLY_CENTS,
    dailyCap: unlimited ? null : OWNER_CHAT_DAILY_CAP,
    dailyUsed,
    dailyRemaining,
  };
}

function allowanceMessage(): string {
  const usd = (OWNER_CHAT_UNLIMITED_MONTHLY_CENTS / 100).toLocaleString("en-US");
  return `Today's ${OWNER_CHAT_DAILY_CAP} owner chats are used. That limit resets at midnight Indiana time. It comes off once the site makes $${usd} this month, so constant chatting does not run the bill while the site is not earning.`;
}

/** Refuse another owner AI chat once today's cap is used and revenue is under the mark. */
export function assertOwnerChatAllowed(now = new Date()): void {
  const status = getOwnerOpsAutoSpeakStatus(now);
  if (status.unlimited) return;
  if (status.dailyUsed >= OWNER_CHAT_DAILY_CAP) {
    throw new TRPCError({ code: "FORBIDDEN", message: allowanceMessage() });
  }
}

/** Count one successful owner AI chat toward today's cap. No-op once revenue lifts the cap. */
export function recordOwnerChat(now = new Date()): void {
  const status = getOwnerOpsAutoSpeakStatus(now);
  if (status.unlimited) return;
  day.used += 1;
}

export function _resetOwnerChatAllowanceForTests(): void {
  day.dayKey = "";
  day.used = 0;
  revenueOverrideCents = null;
}

export function _forceOwnerChatRevenueForTests(cents: number | null): void {
  revenueOverrideCents = cents;
}
