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
import {
  getRequiredPaymentChannel,
  getPaymentChannelLabel,
  PAYMENT_CHANNEL_POLICY_SUMMARY,
} from "./payment-channel-policy";
import {
  AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
  AI_TALK_METERING_DISCLOSURE,
  getTalkPackPurchaseDisclosures,
  minutesToMilliseconds,
} from "./ai-talk-time-policy";
import {
  AI_METERING_PAYBACK_PROTECTION,
  AI_METERING_RESUME_DISCLOSURE,
  AI_TEXT_METERING_DISCLOSURE,
  AI_VOICE_METERING_DISCLOSURE,
} from "./ai-metering-policy";
import {
  getWorkspace3dConcurrentSlots,
  getWorkspace3dPlanLabel,
  getWorkspace3dPlanPriceCents,
  WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
  WORKSPACE_3D_PLAN_DAYS,
  type Workspace3dPlanId,
} from "./workspace-3d-pricing";
import {
  LIVE_CLASS_PURCHASE_RULES,
  LIVE_CLASS_SCHEDULING_RULES_SUMMARY,
  LIVE_CLASS_NO_REFUND_AFTER_LOCKIN_SUMMARY,
  LIVE_CLASS_BACKOUT_RULE_SUMMARY,
  LIVE_CLASS_FILL_WINDOW_RULE_SUMMARY,
  LIVE_CLASS_PATIENCE_GRACE_RULE_SUMMARY,
} from "./live-class-scheduling-policy";
import type { LiveClassPricingTier } from "./live-class-pricing-policy";

export type PurchaseSummaryLine = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type PurchasePricing = ReturnType<typeof calculateCustomerCheckout>;

export type PurchaseSummary = {
  productType: "ai_subscription" | "ai_talk" | "workspace_3d" | "workspace_3d_addon" | "live_class";
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
      AI_TEXT_METERING_DISCLOSURE,
      AI_METERING_PAYBACK_PROTECTION,
      "AI subscriptions must be purchased through your web browser — not in the mobile app.",
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
  const channel = getRequiredPaymentChannel(pack.priceCents);

  return {
    productType: "ai_talk",
    title: "AI Talk Time — Voice & Video",
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Talk time included",
        value: `${pack.totalMinutes} minutes (${minutesToMilliseconds(pack.totalMinutes).toLocaleString()} ms) of AI speech`,
        emphasis: true,
      },
      {
        label: "Works with",
        value: "Any UR AI specialist — voice read-aloud & video talk",
      },
      {
        label: "Metering",
        value: "Billed only while connected and playing — pauses on disconnect, resumes at the same position",
      },
      {
        label: "Must use within",
        value: "30 days of purchase — unused time expires automatically",
        emphasis: true,
      },
    ],
    notIncluded: [
      "Text chat subscription (buy a specialist plan separately)",
      "Rollover — expired minutes are forfeited",
    ],
    importantNotes: [
      ...getTalkPackPurchaseDisclosures(packId),
      AI_VOICE_METERING_DISCLOSURE,
      AI_METERING_RESUME_DISCLOSURE,
      AI_TEXT_METERING_DISCLOSURE,
      AI_METERING_PAYBACK_PROTECTION,
      `Checkout via ${getPaymentChannelLabel(channel)}.`,
      PAYMENT_CHANNEL_POLICY_SUMMARY,
      ...stateTaxNotes(stateCode ?? null, pricing),
      "Each new purchase starts its own 30-day expiry window.",
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildWorkspace3dPurchaseSummary(params: {
  planId: Workspace3dPlanId;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const priceCents = getWorkspace3dPlanPriceCents(params.planId);
  const slots = getWorkspace3dConcurrentSlots(params.planId);
  const days = WORKSPACE_3D_PLAN_DAYS[params.planId];
  const planLabel = getWorkspace3dPlanLabel(params.planId);
  const durationNote =
    params.planId === "day_pass" ? "one-time, 24 hours" : `one-time, ${days} days`;
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    priceCents,
    params.stateCode,
    durationNote,
  );

  return {
    productType: "workspace_3d",
    title: `3D Workspace — ${planLabel}`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Workspace access",
        value: "Babylon viewport, design layers, STL upload, blueprint panel, print export",
      },
      {
        label: "Concurrent AI slots",
        value: `${slots} specialist${slots === 1 ? "" : "s"} active in the lab at once`,
        emphasis: true,
      },
      {
        label: "Access period",
        value:
          params.planId === "day_pass"
            ? "Active for 24 hours from purchase"
            : `Active for ${days} days from purchase`,
      },
    ],
    notIncluded: [
      "Per-specialist text chat (buy each AI's day/week/month plan separately)",
      "Voice talk-back (buy Talk Time packs separately)",
      "Unlimited concurrent AIs beyond your slot count",
    ],
    importantNotes: [
      "Workspace plans must be purchased through your web browser — not in the mobile app.",
      "Each active AI in the lab still needs its own text subscription for chat messages.",
      ...stateTaxNotes(params.stateCode ?? null, pricing),
      "No auto-renew unless you choose it at checkout.",
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildWorkspace3dExtraSlotPurchaseSummary(
  stateCode?: UsStateCode | null,
): PurchaseSummary {
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
    stateCode,
    "one-time, 30 days (matches active workspace plan)",
  );

  return {
    productType: "workspace_3d_addon",
    title: "3D Workspace — Extra AI Slot",
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Additional slot",
        value: "+1 concurrent AI specialist in your workspace session",
        emphasis: true,
      },
      {
        label: "Requires",
        value: "An active Solo, Pro, or Studio workspace plan (not Day Pass alone for renewal)",
      },
    ],
    notIncluded: [
      "Workspace base access without an active workspace plan",
      "Specialist text chat or voice talk time",
    ],
    importantNotes: [
      "Extra slots stack on your current workspace plan until it expires.",
      "Web browser checkout required.",
      ...stateTaxNotes(stateCode ?? null, pricing),
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildLiveClassPurchaseSummary(params: {
  sessionTitle: string;
  creatorName: string;
  durationMinutes: number;
  priceCentsPerMinute: number;
  ticketSubtotalCents: number;
  minAttendeesToStart: number;
  pricingTier: LiveClassPricingTier;
  refundsOnUnderfill: boolean;
  ticketOnlyMinimum: boolean;
  startsAt: string;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const startLabel = new Date(params.startsAt).toLocaleString();
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    params.ticketSubtotalCents,
    params.stateCode,
    "one-time ticket",
  );
  const rateUsd = (params.priceCentsPerMinute / 100).toFixed(2);
  const importantNotes = [...LIVE_CLASS_PURCHASE_RULES];

  if (params.pricingTier === "group_appointment") {
    importantNotes.unshift(LIVE_CLASS_PATIENCE_GRACE_RULE_SUMMARY);
    importantNotes.unshift(
      `Group appointment: ${params.minAttendeesToStart}+ paid signups required by 1 hour before ${startLabel}. If the minimum is never met, everyone is refunded. If you reach ${params.minAttendeesToStart} and only the last seat opens, the remaining ${params.minAttendeesToStart - 1} who wait still get the class.`,
    );
  } else if (params.minAttendeesToStart > 1) {
    importantNotes.unshift(
      `This class needs at least ${params.minAttendeesToStart} ${params.ticketOnlyMinimum ? "paid signups" : "registrations"} before it can run.`,
    );
  }

  importantNotes.unshift(LIVE_CLASS_NO_REFUND_AFTER_LOCKIN_SUMMARY);
  importantNotes.unshift(LIVE_CLASS_FILL_WINDOW_RULE_SUMMARY);
  importantNotes.unshift(LIVE_CLASS_BACKOUT_RULE_SUMMARY);
  importantNotes.unshift(LIVE_CLASS_SCHEDULING_RULES_SUMMARY);
  importantNotes.push(...stateTaxNotes(params.stateCode ?? null, pricing));

  return {
    productType: "live_class",
    title: `${params.creatorName} — ${params.sessionTitle}`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Live class ticket",
        value: `${params.durationMinutes} minutes with ${params.creatorName} at $${rateUsd}/min`,
        emphasis: true,
      },
      {
        label: "Seat lock",
        value:
          "Back out with a full refund until 1 hour 30 minutes before start. After that your seat is locked and you must attend.",
        emphasis: true,
      },
      {
        label: "Fill window",
        value:
          "From 1 hour 30 minutes to 1 hour before start, seats are locked but new sign-ups can join to fill open spots.",
      },
      {
        label: "Scheduled start",
        value: startLabel,
      },
      {
        label: "Lobby opens",
        value: "15 minutes before start (once the class is confirmed)",
      },
    ],
    notIncluded: [
      "Text chat subscription (buy separately if needed)",
      "Recording or replay unless the host announces it",
      "Refunds after the 1 hour 30 minute lock-in (except automatic cancellation when a group minimum is not met 1 hour before start)",
    ],
    importantNotes,
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
