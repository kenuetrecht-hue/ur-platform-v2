import { describe, it, expect, beforeEach } from "vitest";
import {
  claimDailySignIn,
  claimStreakMilestoneReward,
  consumeLoyaltyTextMessage,
  getFreeTextMessagesRemaining,
  getLoyaltyAccount,
  getLoyaltyDashboardForUser,
  _clearLoyaltyStreakForTests,
} from "../server/_core/loyalty-streak-service";
import { getLoyaltyEvents, getLoyaltySignIns } from "../server/_core/loyalty-tracking-service";
import {
  LOYALTY_DAILY_SIGN_IN_POINTS,
  LOYALTY_POINTS_PER_TEXT_MESSAGE,
  LOYALTY_WELCOME_BONUS_POINTS,
  previousUtcDateKey,
} from "../lib/loyalty-program-config";

describe("loyalty streak service", () => {
  const userId = "loyalty-user-1";

  beforeEach(() => {
    _clearLoyaltyStreakForTests();
  });

  it("awards welcome bonus + first daily points on first sign-in", async () => {
    const result = await claimDailySignIn(userId);
    expect(result.welcomeBonusAwarded).toBe(LOYALTY_WELCOME_BONUS_POINTS);
    expect(result.pointsAwardedToday).toBe(LOYALTY_DAILY_SIGN_IN_POINTS);
    expect(result.totalPoints).toBe(LOYALTY_WELCOME_BONUS_POINTS + LOYALTY_DAILY_SIGN_IN_POINTS);
    expect(result.currentStreakDays).toBe(1);
  });

  it("does not double-claim on same day", async () => {
    await claimDailySignIn(userId);
    const again = await claimDailySignIn(userId);
    expect(again.alreadyClaimedToday).toBe(true);
    expect(again.pointsAwardedToday).toBe(0);
    const events = getLoyaltyEvents(userId, 10).events;
    expect(events.some((e) => e.eventType === "sign_in_duplicate_blocked")).toBe(true);
  });

  it("continues streak on consecutive days and unlocks day 5", async () => {
    await claimDailySignIn(userId);
    const account = getLoyaltyAccount(userId);
    account.lastSignInDate = previousUtcDateKey();
    account.currentStreakDays = 4;

    const day5 = await claimDailySignIn(userId);
    expect(day5.currentStreakDays).toBe(5);
    expect(day5.milestoneUnlocked?.day).toBe(5);
    expect(getLoyaltySignIns(userId, 10).signIns).toHaveLength(2);
  });

  it("resets streak after missed day", async () => {
    await claimDailySignIn(userId);
    const account = getLoyaltyAccount(userId);
    account.lastSignInDate = "2026-01-01";
    account.currentStreakDays = 9;

    const afterMiss = await claimDailySignIn(userId);
    expect(afterMiss.currentStreakDays).toBe(1);
    expect(afterMiss.streakWasReset).toBe(true);
    expect(getLoyaltyEvents(userId, 20).events.some((e) => e.eventType === "streak_reset")).toBe(
      true,
    );
  });

  it("uses free milestone messages before spending LP", async () => {
    await claimDailySignIn(userId);
    getLoyaltyAccount(userId).currentStreakDays = 5;
    claimStreakMilestoneReward({
      userId,
      creatorId: "ai-wellness-001",
      milestoneDay: 5,
    });

    expect(getFreeTextMessagesRemaining(userId, "ai-wellness-001")).toBe(10);
    consumeLoyaltyTextMessage({ userId, creatorId: "ai-wellness-001", units: 1 });
    expect(getFreeTextMessagesRemaining(userId, "ai-wellness-001")).toBe(9);
    expect(getLoyaltyEvents(userId, 20).events.some((e) => e.eventType === "free_message_used")).toBe(
      true,
    );
  });

  it("charges 500 LP per message after free grants are used", async () => {
    await claimDailySignIn(userId);
    const before = getLoyaltyAccount(userId).totalPoints;
    consumeLoyaltyTextMessage({ userId, creatorId: "ai-wellness-001", units: 1 });
    expect(getLoyaltyAccount(userId).totalPoints).toBe(before - LOYALTY_POINTS_PER_TEXT_MESSAGE);
    expect(getLoyaltyEvents(userId, 10).events.some((e) => e.eventType === "points_spent_chat")).toBe(
      true,
    );
  });

  it("builds dashboard with activity and sign-in log", async () => {
    await claimDailySignIn(userId);
    const dashboard = getLoyaltyDashboardForUser(userId);
    expect(dashboard.recentEvents.length).toBeGreaterThan(0);
    expect(dashboard.recentSignIns.length).toBe(1);
    expect(dashboard.account.claimedToday).toBe(true);
  });
});

describe("loyalty-program-config", () => {
  it("keeps redemption expensive vs daily earn rate", () => {
    expect(LOYALTY_POINTS_PER_TEXT_MESSAGE / LOYALTY_DAILY_SIGN_IN_POINTS).toBeGreaterThanOrEqual(10);
  });
});
