/**
 * Checkout agreement copy — what they pay, what they get, how long it lasts.
 * The checked box is saved with this version so a later dispute has a record.
 */

import type { AiTalkPackId } from "./ai-talk-pricing";
import { formatTalkPrice, getAiTalkPack } from "./ai-talk-pricing";
import {
  AI_TALK_MAX_UNUSED_MINUTES,
  AI_TALK_STOCKPILE_DISCLOSURE,
  TALK_PURCHASE_RULES_VERSION,
  getTalkLotExpiryDays,
} from "./ai-talk-time-policy";
import type { AiSubscriptionPlan } from "./ai-subscription-pricing";
import {
  AI_SUBSCRIPTION_PLAN_DAYS,
  formatUsd,
  getPlatformPassPriceCents,
} from "./ai-subscription-pricing";
import { getMessageAllowance } from "./ai-usage-allowances";

export type DigitalPurchaseAgreement = {
  version: string;
  title: string;
  rules: string[];
  checkboxLabel: string;
};

export const TEXT_PASS_RULES_VERSION = "text-pass-rules-v1-2026-09-07";

export function buildTalkPurchaseAgreement(
  packId: AiTalkPackId,
  priceCents?: number,
): DigitalPurchaseAgreement {
  const pack = getAiTalkPack(packId);
  const days = getTalkLotExpiryDays(packId);
  const pay = formatTalkPrice(priceCents ?? pack.priceCents);
  const rules = [
    `You pay ${pay} for this Talk Time pack (tax and card fee are added at checkout).`,
    `You get exactly ${pack.totalMinutes} minutes of Hear / video talk — the AI speaking back to you. This is not the text pass.`,
    `Talk (the microphone that prints your words) uses your text-pass messages, not these minutes.`,
    `This purchase lasts ${days} days from the moment you pay. Each pack has its own clock.`,
    `If minutes are left after ${days} days, they are gone. No rollover. No refund.`,
    `You cannot hold more than ${AI_TALK_MAX_UNUSED_MINUTES.toLocaleString("en-US")} unused minutes at one time. ${AI_TALK_STOCKPILE_DISCLOSURE}`,
    `Minutes are used only while you are connected and the AI is speaking. Disconnect pauses the clock.`,
    `Digital product. Final sale. No refunds if you change your mind, do not use the time, or the time expires.`,
  ];
  return {
    version: TALK_PURCHASE_RULES_VERSION,
    title: `${pack.label} — what you are buying`,
    rules,
    checkboxLabel:
      `I have read these Talk Time rules. I pay ${pay} for ${pack.totalMinutes.toLocaleString("en-US")} minutes. ` +
      `I must use them within ${days} days or I lose what is left. ` +
      `I cannot stockpile more than ${AI_TALK_MAX_UNUSED_MINUTES.toLocaleString("en-US")} unused minutes. ` +
      `No refunds. This check is saved and timestamped.`,
  };
}

const TEXT_PASS_LABEL: Record<AiSubscriptionPlan, string> = {
  day: "24-hour text pass",
  week: "Weekly text pass",
  month: "Monthly text pass",
};

export function serializePurchaseAgreement(agreement: DigitalPurchaseAgreement): string {
  return [agreement.version, agreement.title, ...agreement.rules, agreement.checkboxLabel].join("\n");
}

export function buildTextPassPurchaseAgreement(
  plan: AiSubscriptionPlan,
  priceCents?: number,
): DigitalPurchaseAgreement {
  const days = AI_SUBSCRIPTION_PLAN_DAYS[plan];
  const pay = formatUsd(priceCents ?? getPlatformPassPriceCents(plan));
  const messages = getMessageAllowance(plan, "standard");
  const lasts =
    plan === "day" ? "24 hours" : plan === "week" ? "7 days" : "30 days";
  const rules = [
    `You pay ${pay} for the ${TEXT_PASS_LABEL[plan]} (tax and card fee are added at checkout).`,
    `You get ${messages} text messages with every UR specialist, one AI at a time, for ${lasts} (${days} day${days === 1 ? "" : "s"} from purchase).`,
    `Typed chat = 1 message. Microphone print = 1 message. Send after the mic = 1 more message. Learn = 5. Hive = 3. Photo = 2.`,
    `Hear (the AI speaking back) is not included. That is Talk Time, sold separately.`,
    `When the ${lasts} end, leftover messages are gone. No rollover. No refund.`,
    `When the ${messages} messages are used up, chat stops until you buy another pass.`,
    `Digital product. Final sale. No refunds if you change your mind or do not use the messages.`,
  ];
  return {
    version: TEXT_PASS_RULES_VERSION,
    title: `${TEXT_PASS_LABEL[plan]} — what you are buying`,
    rules,
    checkboxLabel:
      `I have read these text-pass rules. I pay ${pay} for ${messages} messages lasting ${lasts}. ` +
      `Mic print uses a message. Hear is not included. Unused messages die when the pass ends. ` +
      `No refunds. This check is saved and timestamped.`,
  };
}
