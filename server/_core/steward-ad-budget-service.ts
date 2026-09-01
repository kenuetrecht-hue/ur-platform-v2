/**
 * Enforces the owner's $2/day · $60/month Business Steward advertising budget.
 * Indiana local calendar (not UTC) so "today" matches the LLC's day.
 */

import { TRPCError } from "@trpc/server";
import {
  formatUsdFromCents,
  isStewardAdBudgetCreator,
  STEWARD_AD_BUDGET_CENTS_PER_DAY,
  STEWARD_AD_BUDGET_CENTS_PER_MONTH,
  STEWARD_AD_COST_CENTS,
  type StewardAdAction,
} from "../../lib/steward-ad-budget";

const INDIANA_TZ = "America/Indiana/Indianapolis";

type SpendBuckets = {
  dayKey: string;
  monthKey: string;
  dayCents: number;
  monthCents: number;
};

const spend: SpendBuckets = {
  dayKey: "",
  monthKey: "",
  dayCents: 0,
  monthCents: 0,
};

function indianaDateParts(now = new Date()): { dayKey: string; monthKey: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INDIANA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return { dayKey: `${year}-${month}-${day}`, monthKey: `${year}-${month}` };
}

function rollForward(now = new Date()): void {
  const { dayKey, monthKey } = indianaDateParts(now);
  if (spend.dayKey !== dayKey) {
    spend.dayKey = dayKey;
    spend.dayCents = 0;
  }
  if (spend.monthKey !== monthKey) {
    spend.monthKey = monthKey;
    spend.monthCents = 0;
  }
}

function costCents(actions: StewardAdAction[]): number {
  return actions.reduce((sum, action) => sum + STEWARD_AD_COST_CENTS[action], 0);
}

export function getStewardAdBudgetStatus(now = new Date()) {
  rollForward(now);
  const dayRemainingCents = Math.max(0, STEWARD_AD_BUDGET_CENTS_PER_DAY - spend.dayCents);
  const monthRemainingCents = Math.max(0, STEWARD_AD_BUDGET_CENTS_PER_MONTH - spend.monthCents);
  return {
    dayKey: spend.dayKey,
    monthKey: spend.monthKey,
    dayLimitCents: STEWARD_AD_BUDGET_CENTS_PER_DAY,
    monthLimitCents: STEWARD_AD_BUDGET_CENTS_PER_MONTH,
    dayUsedCents: spend.dayCents,
    monthUsedCents: spend.monthCents,
    dayRemainingCents,
    monthRemainingCents,
    dayUsedUsd: formatUsdFromCents(spend.dayCents),
    dayLimitUsd: formatUsdFromCents(STEWARD_AD_BUDGET_CENTS_PER_DAY),
    monthUsedUsd: formatUsdFromCents(spend.monthCents),
    monthLimitUsd: formatUsdFromCents(STEWARD_AD_BUDGET_CENTS_PER_MONTH),
    exhausted: dayRemainingCents <= 0 || monthRemainingCents <= 0,
  };
}

function budgetExceededMessage(status: ReturnType<typeof getStewardAdBudgetStatus>): string {
  if (status.monthRemainingCents <= 0) {
    return `This month's ${status.monthLimitUsd} Business Steward advertising budget is used. It resets on the 1st (Indiana time). Stick to notes until then, or raise the cap after the site is earning.`;
  }
  return `Today's ${status.dayLimitUsd} Business Steward advertising budget is used. It resets at midnight Indiana time. You still have ${status.monthUsedUsd} of ${status.monthLimitUsd} used this month.`;
}

export function assertStewardAdBudgetAffordable(params: {
  creatorId: string;
  actions: StewardAdAction[];
  now?: Date;
}): void {
  if (!isStewardAdBudgetCreator(params.creatorId) || params.actions.length === 0) return;
  rollForward(params.now);
  const needed = costCents(params.actions);
  const status = getStewardAdBudgetStatus(params.now);
  if (needed > status.dayRemainingCents || needed > status.monthRemainingCents) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: budgetExceededMessage(status),
    });
  }
}

export function assertAndConsumeStewardAdBudget(params: {
  creatorId: string;
  actions: StewardAdAction[];
  now?: Date;
}): ReturnType<typeof getStewardAdBudgetStatus> {
  if (!isStewardAdBudgetCreator(params.creatorId) || params.actions.length === 0) {
    return getStewardAdBudgetStatus(params.now);
  }

  assertStewardAdBudgetAffordable(params);
  spend.dayCents += costCents(params.actions);
  spend.monthCents += costCents(params.actions);
  return getStewardAdBudgetStatus(params.now);
}

export function _resetStewardAdBudgetForTests(): void {
  spend.dayKey = "";
  spend.monthKey = "";
  spend.dayCents = 0;
  spend.monthCents = 0;
}

export function _setStewardAdBudgetForTests(params: { dayCents?: number; monthCents?: number }): void {
  rollForward();
  if (params.dayCents != null) spend.dayCents = params.dayCents;
  if (params.monthCents != null) spend.monthCents = params.monthCents;
}
