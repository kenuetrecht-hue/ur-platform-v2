/**
 * UR loyalty program — tunable rules (adjust as revenue grows).
 *
 * Design goals:
 * - Daily sign-in earns points; miss a day → streak resets (not point balance).
 * - Welcome bonus on first sign-in; redemption stays expensive vs paid plans.
 * - Activity rewards for engagement (posts, follows, paid subs) with caps.
 * - Streak milestones grant small free TEXT-only message bundles.
 * - Voice via loyalty costs more than cash Talk Time (250 LP / 1 min, 500 LP / 2 min).
 */

/** One-time welcome bonus on first ever sign-in */
export const LOYALTY_WELCOME_BONUS_POINTS = 500;

/** Base daily sign-in LP — every consecutive day adds streak bonus on top */
export const LOYALTY_DAILY_SIGN_IN_BASE = 100;

/** @deprecated Use LOYALTY_DAILY_SIGN_IN_BASE — kept for existing imports */
export const LOYALTY_DAILY_SIGN_IN_POINTS = LOYALTY_DAILY_SIGN_IN_BASE;

/** Extra LP per streak day: day 1 = +10, day 2 = +20, day 30 = +300 */
export const LOYALTY_STREAK_BONUS_PER_DAY = 10;

/** 30-day streak + paid AI purchase during that streak → free 1-day AI subscription */
export const LOYALTY_STREAK_30_FREE_DAY = {
  requiredStreakDays: 30,
  label: "30-day streak + paid AI — free 1-day subscription",
} as const;

/** Daily sign-in LP for streak day N: 100 + (N × 10). Day 1 = 110, day 30 = 400. */
export function getDailySignInPointsForStreak(streakDays: number): number {
  if (streakDays <= 0) return LOYALTY_DAILY_SIGN_IN_BASE;
  return LOYALTY_DAILY_SIGN_IN_BASE + streakDays * LOYALTY_STREAK_BONUS_PER_DAY;
}

/** Preview LP for the next sign-in given current streak state. */
export function getNextDailySignInPoints(params: {
  currentStreakDays: number;
  claimedToday: boolean;
}): number {
  const streakAfterNextClaim = params.claimedToday
    ? params.currentStreakDays + 1
    : Math.max(1, params.currentStreakDays === 0 ? 1 : params.currentStreakDays + 1);
  return getDailySignInPointsForStreak(streakAfterNextClaim);
}

/** Cost per simple text chat message paid with loyalty points */
export const LOYALTY_POINTS_PER_TEXT_MESSAGE = 500;

/** Loyalty points cannot buy learn mode or hive — subscribers only */
export const LOYALTY_ALLOWS_LEARN_OR_HIVE = false;

/** Points earned for activity — free engagement rewards */
export const LOYALTY_ACTIVITY_EARN = {
  /** First time joining / subscribing to a human content creator on UR */
  joinCreatorOnce: 150,
  /** Each public social feed post (capped per day) */
  socialPost: 25,
  /** Max feed posts that earn LP per UTC day */
  socialPostDailyCap: 4,
  /** AI specialist text subscription purchase (per checkout) */
  aiSubscription: {
    day: 75,
    week: 250,
    month: 800,
  } as const,
  /** Human creator paid monthly membership — when creator billing is active */
  creatorMonthlySubscription: 300,
} as const;

export type LoyaltyRedemptionId =
  | "text_1"
  | "text_3"
  | "talk_1"
  | "talk_2"
  | "image_1"
  | "vision_1"
  | "search_5"
  | "hive_1"
  | "chapter_1";

export const LOYALTY_REDEMPTION_IDS = [
  "text_1",
  "text_3",
  "talk_1",
  "talk_2",
  "image_1",
  "vision_1",
  "search_5",
  "hive_1",
  "chapter_1",
] as const satisfies readonly LoyaltyRedemptionId[];

/** 250 LP = 1 talk minute — worse than cash ($1 = 5 min). */
export const LOYALTY_POINTS_PER_TALK_MINUTE = 250;

export type LoyaltyRedemptionOffer = {
  id: LoyaltyRedemptionId;
  label: string;
  pointsCost: number;
  youReceive: string;
  /** Plain comparison vs paying cash */
  valueNote: string;
  /** Maps to usage credit product when applicable */
  creditProductId?: string;
  creditIncluded?: number;
  freeTextMessages?: number;
  talkMinutes?: number;
};

/**
 * Redemption is intentionally expensive — LP are free, so ~5–40 daily sign-ins
 * per reward keeps API cost below paid plan revenue.
 */
export const LOYALTY_REDEMPTION_CATALOG: LoyaltyRedemptionOffer[] = [
  {
    id: "text_1",
    label: "1 AI text message",
    pointsCost: 500,
    youReceive: "1 simple text message (any subscribed specialist)",
    valueNote: "≈5 daily sign-ins · Paid day plan ($7.99) includes 35 msgs",
    freeTextMessages: 1,
  },
  {
    id: "text_3",
    label: "3 AI text messages",
    pointsCost: 1400,
    youReceive: "3 simple text messages",
    valueNote: "≈14 daily sign-ins · Better than 3× singles",
    freeTextMessages: 3,
  },
  {
    id: "talk_1",
    label: "1 talk minute",
    pointsCost: 250,
    youReceive: "1 minute of AI voice talk-back (metered to the ms)",
    valueNote: "≈2–3 daily sign-ins · Cash is $1 for 5 min — paying is cheaper",
    talkMinutes: 1,
  },
  {
    id: "talk_2",
    label: "2 talk minutes",
    pointsCost: 500,
    youReceive: "2 minutes of AI voice talk-back (metered to the ms)",
    valueNote: "≈5 daily sign-ins · Cash $1 still buys 5 min — LP costs more",
    talkMinutes: 2,
  },
  {
    id: "image_1",
    label: "1 logo / creative image",
    pointsCost: 3000,
    youReceive: "1 Imagen image credit",
    valueNote: "≈30 daily sign-ins · Cash price $0.99–$3.99",
    creditProductId: "images-imagen",
    creditIncluded: 1,
  },
  {
    id: "vision_1",
    label: "1 photo / PDF analysis",
    pointsCost: 2000,
    youReceive: "1 vision upload credit",
    valueNote: "≈20 daily sign-ins · Cash from $2.99/day",
    creditProductId: "images-vision",
    creditIncluded: 1,
  },
  {
    id: "search_5",
    label: "5 web searches",
    pointsCost: 1500,
    youReceive: "5 web search + citation credits",
    valueNote: "≈15 daily sign-ins · Text plans include 10/day",
    creditProductId: "search-web",
    creditIncluded: 5,
  },
  {
    id: "hive_1",
    label: "1 hive consult",
    pointsCost: 2500,
    youReceive: "1 hive multi-AI session credit",
    valueNote: "≈25 daily sign-ins · Subscribers use 3 msgs each",
    creditProductId: "hive-consult",
    creditIncluded: 1,
  },
  {
    id: "chapter_1",
    label: "1 book / chapter (Learn)",
    pointsCost: 4000,
    youReceive: "1 long-form chapter credit",
    valueNote: "≈40 daily sign-ins · Cash from $5.99/day",
    creditProductId: "longform-author",
    creditIncluded: 1,
  },
];

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

export const LOYALTY_MAX_FREE_MESSAGES_PER_MILESTONE = 60;

export type LoyaltyProgramSummary = {
  welcomeBonusPoints: number;
  dailySignInPoints: number;
  streakBonusPerDay: number;
  maxDailySignInPoints: number;
  streak30FreeDay: typeof LOYALTY_STREAK_30_FREE_DAY;
  pointsPerTextMessage: number;
  activityEarn: typeof LOYALTY_ACTIVITY_EARN;
  redemptionCatalog: LoyaltyRedemptionOffer[];
  streakMilestones: typeof LOYALTY_STREAK_MILESTONES;
  textOnlyNote: string;
  competitiveNote: string;
};

export function getLoyaltyProgramSummary(): LoyaltyProgramSummary {
  return {
    welcomeBonusPoints: LOYALTY_WELCOME_BONUS_POINTS,
    dailySignInPoints: LOYALTY_DAILY_SIGN_IN_BASE,
    streakBonusPerDay: LOYALTY_STREAK_BONUS_PER_DAY,
    maxDailySignInPoints: getDailySignInPointsForStreak(LOYALTY_STREAK_30_FREE_DAY.requiredStreakDays),
    streak30FreeDay: LOYALTY_STREAK_30_FREE_DAY,
    pointsPerTextMessage: LOYALTY_POINTS_PER_TEXT_MESSAGE,
    activityEarn: LOYALTY_ACTIVITY_EARN,
    redemptionCatalog: LOYALTY_REDEMPTION_CATALOG,
    streakMilestones: LOYALTY_STREAK_MILESTONES,
    textOnlyNote:
      "Loyalty redemptions cost more than paying cash. Talk-back is 250 LP per minute (or 500 LP for 2 minutes). Paid Talk Time and subscriptions stay the better deal.",
    competitiveNote:
      "UR loyalty rewards daily habit + community action. Each consecutive sign-in day earns 100 LP + 10 LP per streak day " +
      "(day 1 = 110 LP, day 30 = 400 LP). Hit a 30-day streak and buy any AI plan during that run to unlock a free 1-day subscription. " +
      "Redemptions cost more than paying — paid plans stay the best value.",
  };
}

export function getMilestoneForStreak(streakDays: number) {
  return LOYALTY_STREAK_MILESTONES.filter((m) => m.day === streakDays)[0] ?? null;
}

export const LOYALTY_MILESTONE_DAYS = LOYALTY_STREAK_MILESTONES.map((m) => m.day) as readonly number[];

export function isValidMilestoneDay(day: number): boolean {
  return LOYALTY_MILESTONE_DAYS.includes(day);
}

export function getRedemptionOffer(id: LoyaltyRedemptionId): LoyaltyRedemptionOffer | undefined {
  return LOYALTY_REDEMPTION_CATALOG.find((r) => r.id === id);
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
