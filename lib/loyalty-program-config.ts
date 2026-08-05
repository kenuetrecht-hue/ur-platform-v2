/**
 * UR loyalty program — tunable rules (adjust as revenue grows).
 *
 * Design goals:
 * - Daily sign-in earns points; miss a day → streak resets (not point balance).
 * - Welcome bonus gets users started; redemption stays expensive vs subscriptions.
 * - Streak milestones grant small free TEXT-only message bundles — capped API cost.
 * - No voice/video via loyalty points (paid Talk Time / subscriptions only).
 */

/** One-time welcome bonus on first ever sign-in */
export const LOYALTY_WELCOME_BONUS_POINTS = 1000;

/** Points every sign-in after welcome (same on day 1 and after streak reset) */
export const LOYALTY_DAILY_SIGN_IN_POINTS = 50;

/** Cost per simple text chat message paid with loyalty points */
export const LOYALTY_POINTS_PER_TEXT_MESSAGE = 500;

/** Loyalty points cannot buy learn mode or hive — subscribers only */
export const LOYALTY_ALLOWS_LEARN_OR_HIVE = false;

/** Streak milestone → free text messages on one AI specialist (user picks when unlocked) */
export const LOYALTY_STREAK_MILESTONES: ReadonlyArray<{
  day: number;
  freeTextMessages: number;
  label: string;
}> = [
  { day: 5, freeTextMessages: 10, label: "5-day streak — 10 free text messages" },
  { day: 10, freeTextMessages: 25, label: "10-day streak — 25 free text messages" },
  { day: 20, freeTextMessages: 40, label: "20-day streak — 40 free text messages" },
  { day: 30, freeTextMessages: 60, label: "30-day streak — 60 free text messages" },
];

/** Max free messages redeemable from a single milestone claim */
export const LOYALTY_MAX_FREE_MESSAGES_PER_MILESTONE = 60;

/**
 * Rough economics note (standard tier ~$0.008/msg API):
 * - 500 LP/message ≈ 12+ daily sign-ins per message → pushes users to paid plans.
 * - 10 free msgs ≈ $0.08 max API cost — acceptable acquisition cost.
 */

export type LoyaltyProgramSummary = {
  welcomeBonusPoints: number;
  dailySignInPoints: number;
  pointsPerTextMessage: number;
  streakMilestones: typeof LOYALTY_STREAK_MILESTONES;
  textOnlyNote: string;
};

export function getLoyaltyProgramSummary(): LoyaltyProgramSummary {
  return {
    welcomeBonusPoints: LOYALTY_WELCOME_BONUS_POINTS,
    dailySignInPoints: LOYALTY_DAILY_SIGN_IN_POINTS,
    pointsPerTextMessage: LOYALTY_POINTS_PER_TEXT_MESSAGE,
    streakMilestones: LOYALTY_STREAK_MILESTONES,
    textOnlyNote:
      "Loyalty chat is text-only and simple — no learn mode, hive, or voice/video. Subscribe for full access.",
  };
}

export function getMilestoneForStreak(streakDays: number) {
  return LOYALTY_STREAK_MILESTONES.filter((m) => m.day === streakDays)[0] ?? null;
}

/** Valid milestone day values for API input validation */
export const LOYALTY_MILESTONE_DAYS = LOYALTY_STREAK_MILESTONES.map((m) => m.day) as readonly number[];

export function isValidMilestoneDay(day: number): boolean {
  return LOYALTY_MILESTONE_DAYS.includes(day);
}

export const LOYALTY_MAX_ACTIVITY_EVENTS_STORED = 500;
export const LOYALTY_MAX_SIGN_IN_RECORDS_STORED = 400;

export function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function previousUtcDateKey(date = new Date()): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateKey(d);
}
