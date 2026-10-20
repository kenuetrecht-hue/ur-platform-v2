/**
 * Free text taste. Caps are the bill limit while the site is not earning.
 * 5 short replies per person per day, 10 model calls per day for the whole site,
 * 100 model calls per month for the whole site. Photos, hive, and learn stay paid.
 */

import { PLATFORM_PASS_CENTS, formatUsd } from "./ai-subscription-pricing";

export const FREE_TASTE_PER_USER_PER_DAY = 5;
export const FREE_TASTE_SITE_PER_DAY = 10;
export const FREE_TASTE_SITE_PER_MONTH = 100;
export const FREE_TASTE_MAX_INPUT_CHARS = 280;
export const FREE_TASTE_MAX_OUTPUT_TOKENS = 80;

const OWNER_ONLY_AI_IDS = new Set([
  "platform-doctor-ai",
  "platform-administration-ai",
  "platform-security-ai",
  "platform-business-steward-ai",
  "platform-world-director-ai",
]);

const NOT_FREE_TASTE_AI_IDS = new Set([
  ...OWNER_ONLY_AI_IDS,
  "affiliate-associate",
  "store-manager",
]);

export function canUseFreeTaste(creatorId: string): boolean {
  return creatorId.trim().length > 0 && !NOT_FREE_TASTE_AI_IDS.has(creatorId);
}

export function freeTasteDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function freeTasteMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function freeTasteDecision(input: {
  userUsed: number;
  siteUsed: number;
  monthUsed: number;
}): { ok: true } | { ok: false; message: string } {
  const pass = `${formatUsd(PLATFORM_PASS_CENTS.day)} for a day, ${formatUsd(PLATFORM_PASS_CENTS.week)} for a week, or ${formatUsd(PLATFORM_PASS_CENTS.month)} for a month`;
  if (input.monthUsed >= FREE_TASTE_SITE_PER_MONTH) {
    return {
      ok: false,
      message: `This month's free messages are used, so the model bill stays small. A text pass (${pass}) opens your own messages.`,
    };
  }
  if (input.siteUsed >= FREE_TASTE_SITE_PER_DAY) {
    return {
      ok: false,
      message: `Today's free messages for the whole site are used, so UR does not run up a bill. A text pass (${pass}) opens your own messages.`,
    };
  }
  if (input.userUsed >= FREE_TASTE_PER_USER_PER_DAY) {
    return {
      ok: false,
      message: `Your ${FREE_TASTE_PER_USER_PER_DAY} free messages for today are used. A text pass is ${formatUsd(PLATFORM_PASS_CENTS.day)} for 35 messages.`,
    };
  }
  return { ok: true };
}

export const FREE_TASTE_SHORT_REPLY_RULE =
  "This reply is a free short taste. Answer in 4 sentences or fewer. Do not call tools, search the web, or ask for a photo.";
