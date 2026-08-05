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
  createdAt: string;
};

export type FreeTextGrant = {
  id: string;
  userId: string;
  creatorId: string;
  messagesGranted: number;
  messagesUsed: number;
  source: "streak_milestone";
  milestoneDay: number;
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
  | "sign_in_duplicate_blocked";

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
