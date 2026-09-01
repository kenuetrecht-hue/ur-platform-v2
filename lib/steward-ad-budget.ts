/**
 * Owner launch advertising budget for Business Steward AI.
 * Caps estimated Google / ElevenLabs cost at $2/day and $60/month
 * until the site is earning. Not a member price — LLC API spend only.
 */

import { EST_COST_PER_CREDIT_UNIT, EST_COST_PER_MESSAGE, EST_COST_PER_TALK_MINUTE_USD } from "./platform-economics";
import { LEARN_MODE_MESSAGE_UNITS } from "./usage-caps-catalog";

export const BUSINESS_STEWARD_AI_ID = "platform-business-steward-ai";

/** Launch ad budget the owner asked to lock in. */
export const STEWARD_AD_BUDGET_USD_PER_DAY = 2;
export const STEWARD_AD_BUDGET_USD_PER_MONTH = 60;

export const STEWARD_AD_BUDGET_CENTS_PER_DAY = STEWARD_AD_BUDGET_USD_PER_DAY * 100;
export const STEWARD_AD_BUDGET_CENTS_PER_MONTH = STEWARD_AD_BUDGET_USD_PER_MONTH * 100;

export type StewardAdAction =
  | "chat"
  | "learn"
  | "image"
  | "vision"
  | "search"
  | "hive"
  | "voice_minute";

/** Conservative cents (rounded up) so the cap stops before the real API bill. */
export const STEWARD_AD_COST_CENTS: Record<StewardAdAction, number> = {
  chat: Math.max(1, Math.ceil(EST_COST_PER_MESSAGE.standard * 100)),
  learn: Math.max(1, Math.ceil(EST_COST_PER_MESSAGE.standard * LEARN_MODE_MESSAGE_UNITS * 100)),
  image: Math.max(1, Math.ceil(EST_COST_PER_CREDIT_UNIT["images-imagen"] * 100)),
  vision: Math.max(1, Math.ceil(EST_COST_PER_CREDIT_UNIT["images-vision"] * 100)),
  search: Math.max(1, Math.ceil(EST_COST_PER_CREDIT_UNIT["search-web"] * 100)),
  hive: Math.max(1, Math.ceil(EST_COST_PER_CREDIT_UNIT["hive-consult"] * 100)),
  voice_minute: Math.max(1, Math.ceil(EST_COST_PER_TALK_MINUTE_USD * 100)),
};

export function isStewardAdBudgetCreator(creatorId: string): boolean {
  return creatorId === BUSINESS_STEWARD_AI_ID;
}

export function stewardAdActionCostCents(action: StewardAdAction, units = 1): number {
  return STEWARD_AD_COST_CENTS[action] * Math.max(1, units);
}

export function sumStewardAdActionsCents(actions: StewardAdAction[]): number {
  return actions.reduce((sum, action) => sum + STEWARD_AD_COST_CENTS[action], 0);
}

export function formatUsdFromCents(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}
