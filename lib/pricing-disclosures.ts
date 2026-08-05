/**
 * Customer-facing purchase disclosures — plain language for what you pay vs. what you get.
 */

import type { AiSubscriptionPlan, AiPriceTier } from "./ai-subscription-pricing";
import {
  getPlanPriceCents,
  AI_SUBSCRIPTION_PLAN_DAYS,
} from "./ai-subscription-pricing";
import { getUsageAllowanceQuote, HIVE_MESSAGE_MULTIPLIER, LEARN_MESSAGE_MULTIPLIER } from "./ai-usage-allowances";
import { getAiTalkPack, type AiTalkPackId } from "./ai-talk-pricing";
import { calculateCustomerCheckout } from "./stripe-checkout-pricing";
import type { UsStateCode } from "./us-state-taxes";

export type PurchaseSummaryLine = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type PurchasePricing = ReturnType<typeof calculateCustomerCheckout>;

export type PurchaseSummary = {
  productType: "ai_subscription" | "ai_talk";
  title: string;
  /** Itemized price — subtotal + tax + Stripe fee = total */
  pricing: PurchasePricing;
  youPay: PurchaseSummaryLine;
  priceBreakdown: PurchaseSummaryLine[];
  youReceive: PurchaseSummaryLine[];
  notIncluded: string[];
  importantNotes: string[];
  aiDisclosure: string;
  billingEntity: string;
};

const BILLING_ENTITY = "UR LLC";
const AI_DISCLOSURE =
  "You are subscribing to access an artificial intelligence (AI) specialist. AI responses are generated automatically and may contain errors. This is not human professional advice.";

function buildPricingBlock(
  subtotalCents: number,
  stateCode: UsStateCode | null | undefined,
  planDurationNote?: string,
): {
  pricing: PurchasePricing;
  youPay: PurchaseSummaryLine;
  priceBreakdown: PurchaseSummaryLine[];
} {
  const checkout = calculateCustomerCheckout(subtotalCents, stateCode);
  const priceBreakdown: PurchaseSummaryLine[] = [
    { label: "Service subtotal", value: checkout.subtotalDisplay },
  ];

  if (checkout.stateName) {
    if (checkout.salesTaxCents > 0) {
      priceBreakdown.push({
        label: `${checkout.salesTaxLabel} (${checkout.salesTaxRateDisplay})`,
        value: checkout.salesTaxDisplay,
      });
    } else {
      priceBreakdown.push({
        label: `${checkout.stateName} sales tax`,
        value: "$0.00 — not applicable for digital access in your state",
      });
    }
    if (checkout.stateFeeCents > 0 && checkout.stateFeeLabel) {
      priceBreakdown.push({
        label: checkout.stateFeeLabel,
        value: checkout.stateFeeDisplay,
      });
    }
  } else {
    priceBreakdown.push({
      label: "State taxes & fees",
      value: "Select your billing state to calculate",
    });
  }

  priceBreakdown.push({
    label: "Stripe processing fee",
    value: `${checkout.stripeFeeDisplay} — ${checkout.stripeFeeExplanation}`,
  });
  priceBreakdown.push({ label: "Total you pay", value: checkout.totalDisplay, emphasis: true });

  return {
    pricing: checkout,
    youPay: {
      label: "Total charged today",
      value: `${checkout.totalDisplay}${planDurationNote ? ` (${planDurationNote})` : ""}`,
      emphasis: true,
    },
    priceBreakdown,
  };
}

function stateTaxNotes(stateCode: UsStateCode | null | undefined, pricing: PurchasePricing): string[] {
  const notes: string[] = [];
  if (!stateCode) {
    notes.push("Select your billing state to see accurate taxes and fees for your location.");
    return notes;
  }
  if (pricing.stateName) {
    notes.push(
      `Taxes and fees shown for ${pricing.stateName} (${stateCode}). UR LLC collects and remits applicable sales tax.`,
    );
  }
  if (pricing.stateTaxNotes) {
    notes.push(pricing.stateTaxNotes);
  }
  notes.push("The Stripe processing fee is added to your total — UR LLC receives the service subtotal plus tax.");
  return notes;
}

export function buildSubscriptionPurchaseSummary(params: {
  creatorId: string;
  creatorName: string;
  plan: AiSubscriptionPlan;
  tier: AiPriceTier;
  tierLabel: string;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const priceCents = getPlanPriceCents(params.creatorId, params.plan);
  const allowance = getUsageAllowanceQuote(params.plan, params.tier);
  const days = AI_SUBSCRIPTION_PLAN_DAYS[params.plan];
  const planLabel =
    params.plan === "day" ? "1 day" : params.plan === "week" ? "7 days" : "30 days";
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    priceCents,
    params.stateCode,
    `one-time, ${planLabel}`,
  );

  return {
    productType: "ai_subscription",
    title: `${params.creatorName} — Text Access`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Specialist access",
        value: `Text chat & learn mode with ${params.creatorName} for ${planLabel}`,
      },
      {
        label: "Messages included",
        value: `${allowance.messagesIncluded} messages (${params.tierLabel} tier)`,
        emphasis: true,
      },
      {
        label: "Message usage",
        value: `Normal chat = 1 msg · Learn = ${LEARN_MESSAGE_MULTIPLIER} msgs · Hive consult = ${HIVE_MESSAGE_MULTIPLIER} msgs`,
      },
      {
        label: "Access period",
        value: `Active for ${days} day${days === 1 ? "" : "s"} from purchase`,
      },
    ],
    notIncluded: [
      "Voice & video talk (buy a Talk Time pack separately)",
      "Unlimited messages — allowance applies",
      "Other AI specialists (this plan is for this specialist only)",
    ],
    importantNotes: [
      "When your message allowance runs out, chat pauses until you renew or upgrade.",
      ...stateTaxNotes(params.stateCode ?? null, pricing),
      "No auto-renew unless you choose it at checkout.",
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildTalkPurchaseSummary(
  packId: AiTalkPackId,
  stateCode?: UsStateCode | null,
): PurchaseSummary {
  const pack = getAiTalkPack(packId);
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(pack.priceCents, stateCode, "one-time");

  return {
    productType: "ai_talk",
    title: "AI Talk Time — Voice & Video",
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Talk minutes",
        value: `${pack.totalMinutes} minutes total (${pack.billedMinutes} purchased + ${pack.bonusMinutes} bonus)`,
        emphasis: true,
      },
      {
        label: "Works with",
        value: "Any UR AI specialist — voice read-aloud & video talk",
      },
      {
        label: "Usage rate",
        value: "1 minute deducted per voice playback or video session start",
      },
      {
        label: "Validity",
        value: "Minutes expire 30 days after purchase if unused",
      },
    ],
    notIncluded: [
      "Text chat subscription (buy a specialist plan separately)",
      "Unlimited talk — minutes are deducted as you use them",
    ],
    importantNotes: [
      "Unused minutes do not roll over after the 30-day expiry.",
      ...stateTaxNotes(stateCode ?? null, pricing),
      "Buying again adds minutes to your balance.",
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function formatPurchaseReceiptMessage(summary: PurchaseSummary): string {
  const lines = [
    summary.title,
    `Service: ${summary.pricing.subtotalDisplay}`,
    summary.pricing.salesTaxCents > 0
      ? `${summary.pricing.salesTaxLabel}: ${summary.pricing.salesTaxDisplay}`
      : summary.pricing.stateName
        ? `${summary.pricing.stateName} tax: $0.00`
        : null,
    summary.pricing.stateFeeCents > 0 && summary.pricing.stateFeeLabel
      ? `${summary.pricing.stateFeeLabel}: ${summary.pricing.stateFeeDisplay}`
      : null,
    `Stripe fee: ${summary.pricing.stripeFeeDisplay}`,
    `${summary.youPay.label}: ${summary.youPay.value}`,
    ...summary.youReceive.map((r) => `${r.label}: ${r.value}`),
  ].filter(Boolean) as string[];
  return lines.join(" · ");
}
