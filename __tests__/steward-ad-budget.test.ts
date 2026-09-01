import { describe, expect, it, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  STEWARD_AD_BUDGET_CENTS_PER_DAY,
  STEWARD_AD_BUDGET_CENTS_PER_MONTH,
  STEWARD_AD_BUDGET_USD_PER_DAY,
  STEWARD_AD_BUDGET_USD_PER_MONTH,
  STEWARD_AD_COST_CENTS,
  isStewardAdBudgetCreator,
} from "../lib/steward-ad-budget";
import {
  assertAndConsumeStewardAdBudget,
  getStewardAdBudgetStatus,
  _resetStewardAdBudgetForTests,
  _setStewardAdBudgetForTests,
} from "../server/_core/steward-ad-budget-service";

const STEWARD = "platform-business-steward-ai";

describe("Business Steward launch ad budget", () => {
  beforeEach(() => {
    _resetStewardAdBudgetForTests();
  });

  it("locks $2/day and $60/month", () => {
    expect(STEWARD_AD_BUDGET_USD_PER_DAY).toBe(2);
    expect(STEWARD_AD_BUDGET_USD_PER_MONTH).toBe(60);
    expect(STEWARD_AD_BUDGET_CENTS_PER_DAY).toBe(200);
    expect(STEWARD_AD_BUDGET_CENTS_PER_MONTH).toBe(6000);
    expect(isStewardAdBudgetCreator(STEWARD)).toBe(true);
    expect(isStewardAdBudgetCreator("ai-marketing-001")).toBe(false);
  });

  it("does not meter other AIs", () => {
    const status = assertAndConsumeStewardAdBudget({
      creatorId: "ai-marketing-001",
      actions: ["chat", "image"],
    });
    expect(status.dayUsedCents).toBe(0);
  });

  it("tracks text and stills against the daily cap", () => {
    assertAndConsumeStewardAdBudget({ creatorId: STEWARD, actions: ["chat"] });
    assertAndConsumeStewardAdBudget({ creatorId: STEWARD, actions: ["image"] });
    const status = getStewardAdBudgetStatus();
    expect(status.dayUsedCents).toBe(STEWARD_AD_COST_CENTS.chat + STEWARD_AD_COST_CENTS.image);
    expect(status.exhausted).toBe(false);
  });

  it("stops when today's $2 is used", () => {
    _setStewardAdBudgetForTests({ dayCents: STEWARD_AD_BUDGET_CENTS_PER_DAY });
    expect(() =>
      assertAndConsumeStewardAdBudget({ creatorId: STEWARD, actions: ["chat"] }),
    ).toThrow(TRPCError);
    try {
      assertAndConsumeStewardAdBudget({ creatorId: STEWARD, actions: ["chat"] });
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).message).toMatch(/Today's \$2\.00/);
    }
  });

  it("stops when this month's $60 is used", () => {
    _setStewardAdBudgetForTests({ monthCents: STEWARD_AD_BUDGET_CENTS_PER_MONTH });
    try {
      assertAndConsumeStewardAdBudget({ creatorId: STEWARD, actions: ["image"] });
      throw new Error("expected budget error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).message).toMatch(/This month's \$60\.00/);
    }
  });
});
