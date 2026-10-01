import { describe, expect, it, beforeEach } from "vitest";
import { CREATOR_SOCIAL_PUSH_PLANS } from "../lib/creator-social-push-pricing";
import {
  _resetCreatorSocialPushForTests,
  assertCreatorSocialPush,
  getCreatorSocialPushStatus,
  grantCreatorSocialPush,
  recordCreatorSocialPush,
} from "../server/_core/creator-social-push-service";
import { fulfillPlatformPurchase } from "../server/_core/platform-purchase-fulfillment";

describe("creator social push pricing", () => {
  it("keeps a profit on every plan when the daily cap is used all month", () => {
    for (const plan of CREATOR_SOCIAL_PUSH_PLANS) {
      expect(plan.keepsCents).toBeGreaterThan(0);
      expect(plan.subtotalCents).toBeGreaterThan(plan.reserveCents);
      expect(plan.maxPosts).toBe(plan.dailyCap * plan.days);
    }
    expect(CREATOR_SOCIAL_PUSH_PLANS.map((plan) => plan.subtotalCents)).toEqual([699, 1699, 2999]);
    expect(CREATOR_SOCIAL_PUSH_PLANS.map((plan) => plan.dailyCap)).toEqual([3, 8, 15]);
  });
});

describe("creator social push allowance", () => {
  beforeEach(() => {
    _resetCreatorSocialPushForTests();
  });

  it("blocks a creator until a plan is paid", () => {
    expect(() => assertCreatorSocialPush("creator-1", false)).toThrow(/Buy a social push plan/i);
  });

  it("lets the owner post without a plan", () => {
    expect(() => assertCreatorSocialPush("owner", true)).not.toThrow();
    expect(getCreatorSocialPushStatus("owner", true).complimentary).toBe(true);
  });

  it("caps starter at 3 a day and raises the cap after an upgrade", () => {
    grantCreatorSocialPush({ userId: "creator-1", planId: "starter" });
    for (let i = 0; i < 3; i += 1) {
      assertCreatorSocialPush("creator-1", false);
      recordCreatorSocialPush("creator-1", false);
    }
    expect(() => assertCreatorSocialPush("creator-1", false)).toThrow(/3 social posts today/i);
    grantCreatorSocialPush({ userId: "creator-1", planId: "plus" });
    expect(getCreatorSocialPushStatus("creator-1").remainingToday).toBe(5);
    assertCreatorSocialPush("creator-1", false);
  });

  it("grants the plan from a paid Stripe webhook", () => {
    const result = fulfillPlatformPurchase({
      kind: "creator_social_push",
      userId: "creator-2",
      planId: "studio",
      priceCents: "2999",
    });
    expect(result).toEqual({ handled: true, ignored: false });
    expect(getCreatorSocialPushStatus("creator-2").dailyCap).toBe(15);
  });
});
