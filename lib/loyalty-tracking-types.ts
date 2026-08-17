/**
 * Loyalty tracking event types — append-only audit ledger.
 */

export type LoyaltyAccount = {
  userId: string;
  totalPoints: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  totalSignIns: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastSignInDate: string | null;
  welcomeBonusClaimed: boolean;
  milestonesClaimed: number[];
  /** UTC date when the current consecutive streak started (day 1) */
  currentStreakStartDate: string | null;
  /** Paid AI subscription purchased during the current streak window */
  paidAiPurchaseDuringCurrentStreak: boolean;
  /** Free 1-day AI reward claimed for the current 30-day streak cycle */
  streak30FreeDayClaimed: boolean;
  createdAt: string;
};

export type FreeTextGrant = {
  id: string;
  userId: string;
  creatorId: string;
  messagesGranted: number;
  messagesUsed: number;
  source: "streak_milestone" | "loyalty_redemption";
  milestoneDay?: number;
  grantedAt: string;
  expiresAt: string;
  active: boolean;
};

export type LoyaltyTrackingEventType =
  | "welcome_bonus"
  | "daily_sign_in"
  | "streak_reset"
  | "milestone_pending"
  | "milestone_claimed"
  | "points_spent_chat"
  | "free_message_used"
  | "sign_in_duplicate_blocked"
  | "activity_social_post"
  | "activity_join_creator"
  | "activity_ai_subscription"
  | "activity_creator_subscription"
  | "points_redeemed"
  | "streak_30_free_day_pending"
  | "streak_30_free_day_claimed";

export type LoyaltyTrackingEvent = {
  id: string;
  userId: string;
  eventType: LoyaltyTrackingEventType;
  /** Positive = earned, negative = spent */
  pointsDelta: number;
  balanceAfter: number;
  streakDays: number;
  signInDate: string | null;
  description: string;
  creatorId?: string;
  milestoneDay?: number;
  messagesCount?: number;
  requestId?: string;
  createdAt: string;
};

export type LoyaltySignInRecord = {
  id: string;
  userId: string;
  signInDate: string;
  pointsEarned: number;
  welcomeBonusIncluded: number;
  streakDaysAfter: number;
  streakWasReset: boolean;
  milestoneUnlockedDay: number | null;
  requestId?: string;
  createdAt: string;
};

export type LoyaltyAuditContext = {
  requestId?: string;
  /** Stored server-side only in owner audit — never returned to clients */
  ipFingerprint?: string;
};

export type LoyaltyDashboard = {
  account: {
    totalPoints: number;
    totalPointsEarned: number;
    totalPointsSpent: number;
    totalSignIns: number;
    currentStreakDays: number;
    longestStreakDays: number;
    lastSignInDate: string | null;
    welcomeBonusClaimed: boolean;
    milestonesClaimed: number[];
    claimedToday: boolean;
    currentStreakStartDate: string | null;
    paidAiPurchaseDuringCurrentStreak: boolean;
    streak30FreeDayClaimed: boolean;
    streak30FreeDayEligible: boolean;
    todayDailySignInPoints: number;
    nextDailySignInPoints: number;
  };
  recentEvents: LoyaltyTrackingEvent[];
  recentSignIns: LoyaltySignInRecord[];
  freeMessageGrants: Array<{
    id: string;
    creatorId: string;
    messagesGranted: number;
    messagesUsed: number;
    messagesRemaining: number;
    milestoneDay: number;
    expiresAt: string;
    active: boolean;
  }>;
};
