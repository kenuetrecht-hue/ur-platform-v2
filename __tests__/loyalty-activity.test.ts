import { describe, it, expect, beforeEach } from "vitest";
import {
  awardSocialPostPoints,
  awardJoinCreatorPoints,
  awardAiSubscriptionPurchasePoints,
  redeemLoyaltyReward,
  _clearLoyaltyActivityForTests,
} from "../server/_core/loyalty-activity-service";
import {
  claimDailySignIn,
  getLoyaltyAccount,
  _clearLoyaltyStreakForTests,
} from "../server/_core/loyalty-streak-service";
import { getLoyaltyEvents } from "../server/_core/loyalty-tracking-service";
import { getCreditBalance } from "../server/_core/usage-credits-service";
import { getTalkMillisecondsRemaining, _clearTalkTimeForTests } from "../server/_core/ai-talk-time-tracker";
import {
  LOYALTY_ACTIVITY_EARN,
  LOYALTY_REDEMPTION_CATALOG,
  LOYALTY_WELCOME_BONUS_POINTS,
  getDailySignInPointsForStreak,
} from "../lib/loyalty-program-config";

function grantEnoughPoints(userId: string, target: number): void {
  while (getLoyaltyAccount(userId).totalPoints < target) {
    awardAiSubscriptionPurchasePoints({
      userId,
      creatorId: "ai-wellness-001",
      plan: "month",
    });
  }
}

describe("loyalty activity service", () => {
  const userId = "loyalty-activity-user";

  beforeEach(() => {
    _clearLoyaltyStreakForTests();
    _clearLoyaltyActivityForTests();
    _clearTalkTimeForTests();
  });

  it("awards social post points up to daily cap", async () => {
    await claimDailySignIn(userId);
    const start = LOYALTY_WELCOME_BONUS_POINTS + getDailySignInPointsForStreak(1);

    for (let i = 0; i < LOYALTY_ACTIVITY_EARN.socialPostDailyCap; i++) {
      const r = awardSocialPostPoints(userId);
      expect(r.awarded).toBe(true);
      expect(r.points).toBe(LOYALTY_ACTIVITY_EARN.socialPost);
    }

    const capped = awardSocialPostPoints(userId);
    expect(capped.awarded).toBe(false);
    expect(capped.reason).toContain("cap");

    const expected =
      start +
      LOYALTY_ACTIVITY_EARN.socialPost * LOYALTY_ACTIVITY_EARN.socialPostDailyCap;
    expect(capped.balanceAfter).toBe(expected);
  });

  it("awards join creator once per creator", () => {
    const first = awardJoinCreatorPoints({
      userId,
      creatorUserId: "creator-abc",
      creatorName: "Test Creator",
    });
    expect(first.awarded).toBe(true);
    expect(first.points).toBe(LOYALTY_ACTIVITY_EARN.joinCreatorOnce);

    const second = awardJoinCreatorPoints({
      userId,
      creatorUserId: "creator-abc",
      creatorName: "Test Creator",
    });
    expect(second.awarded).toBe(false);
  });

  it("awards AI subscription purchase points by plan", () => {
    const month = awardAiSubscriptionPurchasePoints({
      userId,
      creatorId: "ai-wellness-001",
      plan: "month",
    });
    expect(month.points).toBe(LOYALTY_ACTIVITY_EARN.aiSubscription.month);
    expect(
      getLoyaltyEvents(userId, 10).events.some((e) => e.eventType === "activity_ai_subscription"),
    ).toBe(true);
  });

  it("redeems image credit and deducts points", async () => {
    await claimDailySignIn(userId);
    const offer = LOYALTY_REDEMPTION_CATALOG.find((r) => r.id === "image_1")!;
    grantEnoughPoints(userId, offer.pointsCost);

    const before = getLoyaltyAccount(userId).totalPoints;
    expect(before).toBeGreaterThanOrEqual(offer.pointsCost);

    const result = redeemLoyaltyReward({
      userId,
      rewardId: "image_1",
    });
    expect(result.pointsSpent).toBe(offer.pointsCost);
    expect(result.youReceive).toContain("Imagen");
    expect(getLoyaltyAccount(userId).totalPoints).toBe(before - offer.pointsCost);

    const balance = getCreditBalance(userId, "images-imagen");
    expect(balance.remaining).toBeGreaterThanOrEqual(1);
  });

  it("redeems 250 LP for 1 talk minute", async () => {
    await claimDailySignIn(userId);
    const offer = LOYALTY_REDEMPTION_CATALOG.find((r) => r.id === "talk_1")!;
    grantEnoughPoints(userId, offer.pointsCost);
    const result = redeemLoyaltyReward({ userId, rewardId: "talk_1" });
    expect(result.pointsSpent).toBe(250);
    expect(getTalkMillisecondsRemaining(userId)).toBe(60_000);
  });

  it("redeems 500 LP for 2 talk minutes", async () => {
    await claimDailySignIn(userId);
    const offer = LOYALTY_REDEMPTION_CATALOG.find((r) => r.id === "talk_2")!;
    grantEnoughPoints(userId, offer.pointsCost);
    redeemLoyaltyReward({ userId, rewardId: "talk_2" });
    expect(getTalkMillisecondsRemaining(userId)).toBe(120_000);
  });

  it("requires creator for text redemption", async () => {
    await claimDailySignIn(userId);
    expect(() =>
      redeemLoyaltyReward({
        userId,
        rewardId: "text_1",
      }),
    ).toThrow(/Choose an AI specialist/);
  });
});
