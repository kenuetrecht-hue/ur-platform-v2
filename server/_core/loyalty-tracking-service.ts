/**
 * Append-only loyalty audit ledger + sign-in history.
 * Server-side only — user-scoped reads enforced at router layer.
 */

import { createHash, randomUUID } from "crypto";
import type {
  LoyaltyAuditContext,
  LoyaltyDashboard,
  LoyaltySignInRecord,
  LoyaltyTrackingEvent,
  LoyaltyTrackingEventType,
} from "../../lib/loyalty-tracking-types";
import {
  LOYALTY_MAX_ACTIVITY_EVENTS_STORED,
  LOYALTY_MAX_SIGN_IN_RECORDS_STORED,
} from "../../lib/loyalty-program-config";
import type { LoyaltyAccount, FreeTextGrant } from "../../lib/loyalty-tracking-types";

const eventsByUser = new Map<string, LoyaltyTrackingEvent[]>();
const signInsByUser = new Map<string, LoyaltySignInRecord[]>();
/** Owner-only security audit — IP fingerprints, not exposed to users */
const securityAuditByUser = new Map<
  string,
  Array<{ eventId: string; ipFingerprint: string; requestId?: string; at: string }>
>();

export function fingerprintIp(ip: string): string {
  return createHash("sha256").update(`ur-loyalty:${ip}`).digest("hex").slice(0, 16);
}

function trimLedger<T>(list: T[], max: number): T[] {
  if (list.length <= max) return list;
  return list.slice(list.length - max);
}

export function recordLoyaltyEvent(params: {
  userId: string;
  eventType: LoyaltyTrackingEventType;
  pointsDelta: number;
  balanceAfter: number;
  streakDays: number;
  signInDate?: string | null;
  description: string;
  creatorId?: string;
  milestoneDay?: number;
  messagesCount?: number;
  audit?: LoyaltyAuditContext;
}): LoyaltyTrackingEvent {
  const event: LoyaltyTrackingEvent = {
    id: `lpe-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    eventType: params.eventType,
    pointsDelta: params.pointsDelta,
    balanceAfter: params.balanceAfter,
    streakDays: params.streakDays,
    signInDate: params.signInDate ?? null,
    description: params.description.slice(0, 280),
    creatorId: params.creatorId,
    milestoneDay: params.milestoneDay,
    messagesCount: params.messagesCount,
    requestId: params.audit?.requestId,
    createdAt: new Date().toISOString(),
  };

  const list = eventsByUser.get(params.userId) ?? [];
  list.push(event);
  eventsByUser.set(params.userId, trimLedger(list, LOYALTY_MAX_ACTIVITY_EVENTS_STORED));

  if (params.audit?.ipFingerprint) {
    const sec = securityAuditByUser.get(params.userId) ?? [];
    sec.push({
      eventId: event.id,
      ipFingerprint: params.audit.ipFingerprint,
      requestId: params.audit.requestId,
      at: event.createdAt,
    });
    securityAuditByUser.set(params.userId, trimLedger(sec, LOYALTY_MAX_ACTIVITY_EVENTS_STORED));
  }

  return event;
}

export function recordSignIn(params: {
  userId: string;
  signInDate: string;
  pointsEarned: number;
  welcomeBonusIncluded: number;
  streakDaysAfter: number;
  streakWasReset: boolean;
  milestoneUnlockedDay: number | null;
  audit?: LoyaltyAuditContext;
}): LoyaltySignInRecord {
  const record: LoyaltySignInRecord = {
    id: `lps-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    signInDate: params.signInDate,
    pointsEarned: params.pointsEarned,
    welcomeBonusIncluded: params.welcomeBonusIncluded,
    streakDaysAfter: params.streakDaysAfter,
    streakWasReset: params.streakWasReset,
    milestoneUnlockedDay: params.milestoneUnlockedDay,
    requestId: params.audit?.requestId,
    createdAt: new Date().toISOString(),
  };

  const list = signInsByUser.get(params.userId) ?? [];
  list.push(record);
  signInsByUser.set(params.userId, trimLedger(list, LOYALTY_MAX_SIGN_IN_RECORDS_STORED));
  return record;
}

export function getLoyaltyEvents(
  userId: string,
  limit = 50,
  offset = 0,
): { events: LoyaltyTrackingEvent[]; total: number } {
  const all = [...(eventsByUser.get(userId) ?? [])].reverse();
  return {
    events: all.slice(offset, offset + limit),
    total: all.length,
  };
}

export function getLoyaltySignIns(
  userId: string,
  limit = 30,
  offset = 0,
): { signIns: LoyaltySignInRecord[]; total: number } {
  const all = [...(signInsByUser.get(userId) ?? [])].reverse();
  return {
    signIns: all.slice(offset, offset + limit),
    total: all.length,
  };
}

export function buildLoyaltyDashboard(params: {
  account: LoyaltyAccount;
  freeGrants: FreeTextGrant[];
  claimedToday: boolean;
}): LoyaltyDashboard {
  const { account, freeGrants, claimedToday } = params;
  const recentEvents = getLoyaltyEvents(account.userId, 20).events;
  const recentSignIns = getLoyaltySignIns(account.userId, 14).signIns;

  return {
    account: {
      totalPoints: account.totalPoints,
      totalPointsEarned: account.totalPointsEarned,
      totalPointsSpent: account.totalPointsSpent,
      totalSignIns: account.totalSignIns,
      currentStreakDays: account.currentStreakDays,
      longestStreakDays: account.longestStreakDays,
      lastSignInDate: account.lastSignInDate,
      welcomeBonusClaimed: account.welcomeBonusClaimed,
      milestonesClaimed: account.milestonesClaimed,
      claimedToday,
    },
    recentEvents,
    recentSignIns,
    freeMessageGrants: freeGrants.map((g) => ({
      id: g.id,
      creatorId: g.creatorId,
      messagesGranted: g.messagesGranted,
      messagesUsed: g.messagesUsed,
      messagesRemaining: Math.max(0, g.messagesGranted - g.messagesUsed),
      milestoneDay: g.milestoneDay,
      expiresAt: g.expiresAt,
      active: g.active,
    })),
  };
}

/** Owner fraud review — never expose to end users */
export function getSecurityAuditForUser(userId: string, limit = 50) {
  return (securityAuditByUser.get(userId) ?? []).slice(-limit).reverse();
}

export function _clearLoyaltyTrackingForTests(): void {
  eventsByUser.clear();
  signInsByUser.clear();
  securityAuditByUser.clear();
}
