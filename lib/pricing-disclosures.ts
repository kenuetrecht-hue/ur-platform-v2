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
  computeLotExpiresAt,
  formatTalkExpiryDate,
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
  buildCreditProductPlainPricing,
  type PlainProductPricing,
} from "./pricing-transparency";
import {
  CREDIT_PRODUCTS,
  resolveCreditPurchase,
  type CreditProductId,
  type BillingPeriod,
} from "./usage-caps-catalog";
import { formatUsd } from "./ai-subscription-pricing";
import {
  LIVE_CLASS_PURCHASE_RULES,
  LIVE_CLASS_SCHEDULING_RULES_SUMMARY,
  LIVE_CLASS_NO_REFUND_AFTER_LOCKIN_SUMMARY,
  LIVE_CLASS_BACKOUT_RULE_SUMMARY,
  LIVE_CLASS_FILL_WINDOW_RULE_SUMMARY,
  LIVE_CLASS_PATIENCE_GRACE_RULE_SUMMARY,
} from "./live-class-scheduling-policy";
import { CLASS_REPLAY_PURCHASE_RULES } from "./class-replay-policy";
import {
  AI_PURCHASE_NO_REFUND_POLICY,
  CREATOR_TRANSACTION_DISCLAIMER,
  HARASSMENT_ENFORCEMENT_POLICY,
  TERMS_CHECKOUT_ACKNOWLEDGMENT,
  TERMS_BILLING_ENTITY,
} from "./platform-terms-of-use";
import {
  CARTOON_STUDIO_BILLING_NOTES,
  CARTOON_STUDIO_NO_REFUND_POLICY,
  getCartoonStudioTier,
  quoteCartoonStudio,
  type CartoonStudioTierId,
} from "./cartoon-studio-pricing";
import {
  CARTOON_CREATOR_BILLING_NOTES,
  CARTOON_CREATOR_NO_REFUND_POLICY,
  CARTOON_CREATOR_PLAN_DAYS,
  getCartoonCreatorPlan,
  quoteCartoonCreatorPlan,
  type CartoonCreatorPlanId,
} from "./cartoon-creator-pricing";
import {
  getMusicStudioPlan,
  MUSIC_STUDIO_BILLING_NOTES,
  MUSIC_STUDIO_NO_REFUND_POLICY,
  quoteMusicStudio,
  type MusicStudioPlanId,
} from "./music-studio-pricing";

export type PurchaseSummaryLine = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type PurchasePricing = ReturnType<typeof calculateCustomerCheckout>;

export type PurchaseSummary = {
  productType: "ai_subscription" | "ai_talk" | "workspace_3d" | "workspace_3d_addon" | "live_class" | "class_replay" | "usage_credit" | "cartoon_studio" | "cartoon_creator" | "music_studio";
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

const BILLING_ENTITY = TERMS_BILLING_ENTITY;
const AI_DISCLOSURE =
  "You are subscribing to access an artificial intelligence (AI) specialist. AI responses are generated automatically and may contain errors. This is not human professional advice.";

const AI_PURCHASE_TERMS_NOTES = [
  AI_PURCHASE_NO_REFUND_POLICY,
  TERMS_CHECKOUT_ACKNOWLEDGMENT,
  HARASSMENT_ENFORCEMENT_POLICY,
];

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
      `Taxes and fees shown for ${pricing.stateName} (${stateCode}). UR Platform LLC collects and remits applicable sales tax.`,
    );
  }
  if (pricing.stateTaxNotes) {
    notes.push(pricing.stateTaxNotes);
  }
  notes.push("The Stripe processing fee is added to your total — UR Platform LLC receives the service subtotal plus tax.");
  return notes;
}

export function buildSubscriptionPurchaseSummary(params: {
  creatorId: string;
  creatorName: string;
  plan: AiSubscriptionPlan;
  tier: AiPriceTier;
  tierLabel: string;
  stateCode?: UsStateCode | null;
  priceCents?: number;
}): PurchaseSummary {
  const priceCents = params.priceCents ?? getPlanPriceCents(params.creatorId, params.plan);
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
    title: `UR text pass — all specialists`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Specialist access",
        value: `Text chat & learn mode with every UR specialist for ${planLabel} — one AI at a time (you can start from ${params.creatorName})`,
      },
      {
        label: "Messages included",
        value: `${allowance.messagesIncluded} messages (${params.tierLabel} tier)`,
        emphasis: true,
      },
      {
        label: "Web search included",
        value: `${allowance.webSearchesIncludedPerDay} searches per day while your text plan is active`,
      },
      {
        label: "Message usage",
        value: `Normal chat = 1 msg · Learn/chapter = ${LEARN_MESSAGE_MULTIPLIER} msgs · Hive consult = ${HIVE_MESSAGE_MULTIPLIER} msgs · Photo upload = 2 msgs (or vision credits)`,
      },
      {
        label: "Access period",
        value: `Active for ${days} day${days === 1 ? "" : "s"} from purchase`,
      },
      {
        label: "Concurrent AIs",
        value: "1 specialist at a time included — switch anytime. Extra slot required for Hive / Town Hall",
      },
    ],
    notIncluded: [
      "Voice & video talk (buy Talk Time separately — priced per minute)",
      "Logo/creative images (Imagen) — separate image credit packs",
      "TechBuilder/GameForge code runs — separate run credits",
      "Book/song/script chapters — separate chapter credits",
      "Unlimited messages — your allowance is capped as shown above",
      "Talking to more than one AI at the same time (Hive / Town Hall) — buy an extra concurrent slot",
    ],
    importantNotes: [
      "When your message allowance runs out, chat pauses until you renew or upgrade.",
      AI_TEXT_METERING_DISCLOSURE,
      AI_METERING_PAYBACK_PROTECTION,
      "AI subscriptions must be purchased through your web browser — not in the mobile app.",
      ...AI_PURCHASE_TERMS_NOTES,
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
  priceCents?: number,
): PurchaseSummary {
  const pack = getAiTalkPack(packId);
  const liveCents = priceCents ?? pack.priceCents;
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(liveCents, stateCode, "one-time");
  const channel = getRequiredPaymentChannel(liveCents);

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
        value: `30 days of purchase — use by ${formatTalkExpiryDate(computeLotExpiresAt(Date.now()))} or you lose what isn't used`,
        emphasis: true,
      },
      {
        label: "If unused after 30 days",
        value: "Unused minutes are forfeited automatically. No rollover. No refunds. Each purchase has its own use-by date.",
        emphasis: true,
      },
    ],
    notIncluded: [
      "Text chat subscription (buy a specialist plan separately)",
      "Rollover — expired minutes are forfeited. You lose what isn't used.",
    ],
    importantNotes: [
      ...getTalkPackPurchaseDisclosures(packId),
      AI_VOICE_METERING_DISCLOSURE,
      AI_METERING_RESUME_DISCLOSURE,
      AI_TEXT_METERING_DISCLOSURE,
      AI_METERING_PAYBACK_PROTECTION,
      AI_PURCHASE_NO_REFUND_POLICY,
      `Checkout via ${getPaymentChannelLabel(channel)}.`,
      PAYMENT_CHANNEL_POLICY_SUMMARY,
      ...stateTaxNotes(stateCode ?? null, pricing),
      "Each new purchase starts its own 30-day expiry window.",
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildUsageCreditPurchaseSummary(params: {
  productId: CreditProductId;
  period?: BillingPeriod;
  addonId?: string;
  stateCode?: UsStateCode | null;
  priceCents?: number;
}): PurchaseSummary | null {
  const resolved = resolveCreditPurchase({
    productId: params.productId,
    period: params.period,
    addonId: params.addonId,
  });
  if (!resolved) return null;

  const plain = buildCreditProductPlainPricing(params.productId);
  const product = CREDIT_PRODUCTS[params.productId];
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    params.priceCents ?? resolved.priceCents,
    params.stateCode,
    params.addonId ? "one-time top-up" : "one-time",
  );

  const planPlain = params.addonId
    ? plain.addons?.find((a) => a.label === resolved.label)
    : plain.plans.find((p) => p.period === params.period);

  return {
    productType: "usage_credit",
    title: plain.feature,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Credits included",
        value: `${resolved.included} ${product.unit}`,
        emphasis: true,
      },
      {
        label: "Valid for",
        value: `${resolved.durationDays} day${resolved.durationDays === 1 ? "" : "s"} from purchase`,
      },
      {
        label: "Daily fair-use cap",
        value: `Max ${product.dailyHardCap} ${product.unit} per day — protects platform costs`,
      },
      {
        label: "Plain summary",
        value: planPlain?.payReceiveLine ?? resolved.label,
      },
    ],
    notIncluded: [
      "Text chat subscription (buy a specialist text plan if you also need messaging)",
      "Unlimited daily use — daily cap applies even on monthly packs",
    ],
    importantNotes: [
      "Credits are consumed when you generate images, run code, analyze photos, etc.",
      "When credits run out, you'll see upgrade options with exact prices and quantities.",
      "AI subscriptions must be purchased through your web browser — not in the mobile app.",
      ...AI_PURCHASE_TERMS_NOTES,
      ...stateTaxNotes(params.stateCode ?? null, pricing),
    ],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildWorkspace3dPurchaseSummary(params: {
  planId: Workspace3dPlanId;
  stateCode?: UsStateCode | null;
  priceCents?: number;
}): PurchaseSummary {
  const priceCents = params.priceCents ?? getWorkspace3dPlanPriceCents(params.planId);
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
  priceCents = WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
): PurchaseSummary {
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    priceCents,
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
      "Pay-per-view replay (sold separately after the class if the host publishes it)",
      "Refunds after the 1 hour 30 minute lock-in (except automatic cancellation when a group minimum is not met 1 hour before start)",
    ],
    importantNotes,
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildClassReplayPurchaseSummary(params: {
  title: string;
  creatorName: string;
  durationMinutes: number;
  priceCents: number;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    params.priceCents,
    params.stateCode,
    "one-time replay",
  );
  return {
    productType: "class_replay",
    title: `${params.creatorName} — ${params.title}`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      {
        label: "Pay-per-view replay",
        value: `Watch the ${params.durationMinutes}-minute class you missed, on your schedule.`,
        emphasis: true,
      },
      {
        label: "Live ticket holders",
        value: "If you already bought a live seat for this class, replay is included.",
      },
    ],
    notIncluded: [
      "A live seat in a future class",
      "Download or copy rights to resell the recording",
    ],
    importantNotes: [...CLASS_REPLAY_PURCHASE_RULES, ...stateTaxNotes(params.stateCode ?? null, pricing)],
    aiDisclosure: AI_DISCLOSURE,
    billingEntity: BILLING_ENTITY,
  };
}

export function buildCartoonStudioPurchaseSummary(params: {
  tierId: CartoonStudioTierId;
  seconds: number;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const quote = quoteCartoonStudio(params.tierId, params.seconds);
  const tier = getCartoonStudioTier(params.tierId);
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    quote.subtotalCents,
    params.stateCode,
    `${quote.billedSeconds} seconds prepaid`,
  );
  const channel = getRequiredPaymentChannel(quote.subtotalCents);
  return {
    productType: "cartoon_studio",
    title: `${tier.label} — ${quote.billedSeconds} seconds`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      { label: "Plan", value: `${tier.label} (${tier.badge})` },
      { label: "Prepaid length", value: `${quote.billedSeconds} seconds` },
      { label: "Rate", value: quote.rateDisplay },
      { label: "Service subtotal", value: quote.subtotalDisplay },
      { label: "Used for", value: tier.usedFor },
      { label: "What you get", value: tier.youGet.join(" · ") },
    ],
    notIncluded: [
      params.tierId === "draft"
        ? "Film-engine seconds — buy Lite, Mid, Cinema, or Premiere if you want motion film"
        : params.tierId === "premiere"
          ? "A Hollywood movie, unlimited length, or a second 4K render without paying again"
          : "A higher engine on this receipt — buy the next plan up if you want sharper film",
      "Refunds, replacements, or a redo because you dislike the result",
      "A 5-minute Hollywood movie or a ToonBee twin",
    ],
    importantNotes: [
      ...CARTOON_STUDIO_BILLING_NOTES,
      `Difference: ${tier.difference}`,
      `What this cost is for: ${tier.costExplained}`,
      CARTOON_STUDIO_NO_REFUND_POLICY,
      `Checkout: ${getPaymentChannelLabel(channel)}. ${PAYMENT_CHANNEL_POLICY_SUMMARY}`,
      ...stateTaxNotes(params.stateCode ?? null, pricing),
    ],
    aiDisclosure:
      "Cartoon Studio uses AI to write a storyboard. Output can be wrong, silly, or not what you imagined. You pay first and accept the result. This is not human professional advice.",
    billingEntity: BILLING_ENTITY,
  };
}

export function buildCartoonCreatorPurchaseSummary(params: {
  planId: CartoonCreatorPlanId;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const quote = quoteCartoonCreatorPlan(params.planId);
  const plan = getCartoonCreatorPlan(params.planId);
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    quote.subtotalCents,
    params.stateCode,
    `${CARTOON_CREATOR_PLAN_DAYS} days prepaid`,
  );
  const channel = getRequiredPaymentChannel(quote.subtotalCents);
  return {
    productType: "cartoon_creator",
    title: `${plan.label} — ${CARTOON_CREATOR_PLAN_DAYS} days`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      { label: "Plan", value: `${plan.label} (${plan.badge})` },
      { label: "Cartoon Me live minutes", value: `${quote.liveMinutes.toLocaleString()} minutes` },
      { label: "Covered by $3.99 fans", value: `About ${plan.fansToCover} paying fans` },
      { label: "Used for", value: plan.usedFor },
      { label: "What you get", value: plan.youGet.join(" · ") },
    ],
    notIncluded: [
      "A live Hollywood / Veo restyle of every camera frame",
      "Prepaid Draft / Lite / Mid / Cinema / Premiere clip renders — those are a separate checkout",
      "Refunds or unused-minute cash back after 30 days",
    ],
    importantNotes: [
      ...CARTOON_CREATOR_BILLING_NOTES,
      `Difference: ${plan.difference}`,
      `What this cost is for: ${plan.costExplained}`,
      CARTOON_CREATOR_NO_REFUND_POLICY,
      `Checkout: ${getPaymentChannelLabel(channel)}. ${PAYMENT_CHANNEL_POLICY_SUMMARY}`,
      ...stateTaxNotes(params.stateCode ?? null, pricing),
    ],
    aiDisclosure:
      "Cartoon Me is a cartoon stand-in. It is not your real face, not a photoreal clone, and not human professional advice. You pay first and accept the result.",
    billingEntity: BILLING_ENTITY,
  };
}

export function buildMusicStudioPurchaseSummary(params: {
  planId: MusicStudioPlanId;
  stateCode?: UsStateCode | null;
}): PurchaseSummary {
  const quote = quoteMusicStudio(params.planId);
  const plan = getMusicStudioPlan(params.planId);
  const { pricing, youPay, priceBreakdown } = buildPricingBlock(
    quote.subtotalCents,
    params.stateCode,
    `${plan.days} day${plan.days === 1 ? "" : "s"} prepaid`,
  );
  const channel = getRequiredPaymentChannel(quote.subtotalCents);
  return {
    productType: "music_studio",
    title: `${plan.label} — ${plan.days} day${plan.days === 1 ? "" : "s"}`,
    pricing,
    youPay,
    priceBreakdown,
    youReceive: [
      { label: "Plan", value: `${plan.label} (${plan.badge})` },
      { label: "Service subtotal", value: quote.subtotalDisplay },
      { label: "WAV exports", value: String(plan.exports) },
      { label: "Vocal takes", value: String(plan.vocalTakes) },
      { label: "What you get", value: plan.youGet.join(" · ") },
    ],
    notIncluded: [
      "A license to Avid Pro Tools, Ableton Live, Logic Pro, or FL Studio",
      "Suno/Udio generated hit songs from a text prompt",
      "Refunds because you wanted a different mix",
    ],
    importantNotes: [
      ...MUSIC_STUDIO_BILLING_NOTES,
      `What this cost is for: ${plan.costExplained}`,
      MUSIC_STUDIO_NO_REFUND_POLICY,
      `Checkout: ${getPaymentChannelLabel(channel)}. ${PAYMENT_CHANNEL_POLICY_SUMMARY}`,
      ...stateTaxNotes(params.stateCode ?? null, pricing),
    ],
    aiDisclosure:
      "Musician and Songwriter are AI coaches in the same room. UR Studio Pro is our mixer/export desk, not Avid Pro Tools. AI lyrics and coaching can be wrong.",
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
