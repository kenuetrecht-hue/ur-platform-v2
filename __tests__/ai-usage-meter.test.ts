import { describe, it, expect, beforeEach } from "vitest";
import {
  getMessageAllowance,
  HIVE_MESSAGE_MULTIPLIER,
  LEARN_MESSAGE_MULTIPLIER,
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
  it("uses owner-approved caps per tier", () => {
    expect(getMessageAllowance("month", "standard")).toBe(350);
    expect(getMessageAllowance("month", "premium")).toBe(220);
    expect(getMessageAllowance("month", "professional")).toBe(200);
  });

  it("daily plan includes 35 standard messages", () => {
    expect(getMessageAllowance("day", "standard")).toBe(35);
  });

  it("learn mode counts as 5 messages", () => {
    expect(LEARN_MESSAGE_MULTIPLIER).toBe(5);
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

    for (let i = 0; i < 35; i++) {
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
    ).toThrow(/limit reached|Upgrade for more/);
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

    for (let i = 0; i < 32; i++) {
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
    ).toThrow(/limit reached|Upgrade for more/);

    expect(HIVE_MESSAGE_MULTIPLIER).toBe(3);
  });
});
