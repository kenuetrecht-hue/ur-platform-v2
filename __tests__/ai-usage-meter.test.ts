import { describe, it, expect, beforeEach } from "vitest";
import {
  getMessageAllowance,
  HIVE_MESSAGE_MULTIPLIER,
} from "../lib/ai-usage-allowances";
import {
  _clearAiSubscriptionsForTests,
  purchaseAiSubscription,
} from "../server/_core/ai-subscription-service";
import {
  assertAndConsumeAiUsage,
  _clearUsageMeterForTests,
} from "../server/_core/ai-usage-meter";

describe("ai-usage-allowances", () => {
  it("includes fewer messages for premium tier", () => {
    expect(getMessageAllowance("month", "standard")).toBe(500);
    expect(getMessageAllowance("month", "premium")).toBeLessThan(500);
  });

  it("daily plan includes 45 standard messages", () => {
    expect(getMessageAllowance("day", "standard")).toBe(45);
  });
});

describe("ai-usage-meter", () => {
  beforeEach(() => {
    _clearAiSubscriptionsForTests();
    _clearUsageMeterForTests();
  });

  it("blocks chat when message allowance is exhausted", () => {
    purchaseAiSubscription({
      userId: "u1",
      userEmail: "u1@test.com",
      creatorId: "ai-wellness-001",
      plan: "day",
      billingStateCode: "FL",
    });

    for (let i = 0; i < 45; i++) {
      assertAndConsumeAiUsage({
        userId: "u1",
        creatorId: "ai-wellness-001",
        isPlatformOwner: false,
      });
    }

    expect(() =>
      assertAndConsumeAiUsage({
        userId: "u1",
        creatorId: "ai-wellness-001",
        isPlatformOwner: false,
      }),
    ).toThrow(/Message limit reached/);
  });

  it("hive consult consumes 3 messages", () => {
    purchaseAiSubscription({
      userId: "u2",
      userEmail: "u2@test.com",
      creatorId: "ai-wellness-001",
      plan: "day",
      billingStateCode: "FL",
    });

    assertAndConsumeAiUsage({
      userId: "u2",
      creatorId: "ai-wellness-001",
      isPlatformOwner: false,
      useHive: true,
    });

    for (let i = 0; i < 42; i++) {
      assertAndConsumeAiUsage({
        userId: "u2",
        creatorId: "ai-wellness-001",
        isPlatformOwner: false,
      });
    }

    expect(() =>
      assertAndConsumeAiUsage({
        userId: "u2",
        creatorId: "ai-wellness-001",
        isPlatformOwner: false,
      }),
    ).toThrow(/Message limit reached/);

    expect(HIVE_MESSAGE_MULTIPLIER).toBe(3);
  });
});
