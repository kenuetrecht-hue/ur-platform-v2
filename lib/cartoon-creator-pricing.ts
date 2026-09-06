/**
 * Cartoon Me Creator Platform — prepaid 30-day add-on for enrolled creators.
 *
 * This is voice + cartoon stand-in (and hosting), not a live Veo restyle of every camera frame.
 * Cost floor: 4¢/min live stand-in + $2 host, so UR never sells below bandwidth/support.
 * Priced as a platform fee a $3.99/mo creator can cover with a handful of fans.
 * Never $5.00. Tax and Stripe are paid by the creator. No refunds.
 */

import { formatUsd } from "./ai-subscription-pricing";
import { IN_APP_ONLY_SUBTOTAL_CENTS } from "./payment-channel-policy";
import { AI_PURCHASE_NO_REFUND_POLICY } from "./platform-terms-of-use";

export const CARTOON_CREATOR_PLAN_DAYS = 30;
export const CARTOON_LIVE_COST_PER_MINUTE_CENTS = 4;
export const CARTOON_HOST_COST_FLOOR_CENTS = 200;
export const CARTOON_CREATOR_MIN_GROSS_MARGIN_CENTS = 800;
export const FAN_PRICE_CENTS = 399;

export type CartoonCreatorPlanId = "channel" | "studio" | "network";

export type CartoonCreatorPlan = {
  id: CartoonCreatorPlanId;
  label: string;
  badge: string;
  priceCents: number;
  liveMinutes: number;
  usedFor: string;
  youGet: string[];
  difference: string;
  costExplained: string;
  fansToCover: number;
};

export const CARTOON_CREATOR_PLANS: readonly CartoonCreatorPlan[] = [
  {
    id: "channel",
    label: "Creator Channel",
    badge: "Affordable",
    priceCents: 4999,
    liveMinutes: 12 * 60,
    usedFor:
      "A growing creator who wants Cartoon Me on their page and about one live class a week without paying Network prices.",
    youGet: [
      "Host the cartoons you already prepaid to render",
      "720 minutes of Cartoon Me live (voice in, cartoon stand-in out) for 30 days",
      "Your audience sees Cartoon Me — not your real camera face",
    ],
    difference:
      "Channel is the cheap platform rung. Studio buys more live hours. Network is the expensive rung for a large channel.",
    costExplained:
      "$49.99 for 30 days. About 13 fans at $3.99/month cover this whole plan. UR's floor is 4¢ per live minute plus hosting so this is never sold at a loss. Tax and Stripe on top, paid by you.",
    fansToCover: 13,
  },
  {
    id: "studio",
    label: "Creator Studio",
    badge: "Mid",
    priceCents: 14999,
    liveMinutes: 40 * 60,
    usedFor:
      "A working creator with a regular live calendar. More Cartoon Me hours than Channel, less than Network.",
    youGet: [
      "Everything in Creator Channel",
      "2,400 minutes of Cartoon Me live for 30 days (about 40 hours)",
      "Same cartoon stand-in on hosted videos and live classes",
    ],
    difference:
      "Studio sits in the middle. You pay more than Channel because you buy more live minutes. Network is for a big roster.",
    costExplained:
      "$149.99 for 30 days. About 38 fans at $3.99/month cover it. A 200,000-fan $3.99 channel is about $798,000/month — this plan is a rounding error. Tax and Stripe on top, paid by you.",
    fansToCover: 38,
  },
  {
    id: "network",
    label: "Creator Network",
    badge: "Expensive · platform",
    priceCents: 39999,
    liveMinutes: 120 * 60,
    usedFor:
      "A large creator (tens or hundreds of thousands of $3.99 fans) who wants Cartoon Me on as a house tool.",
    youGet: [
      "Everything in Creator Studio",
      "7,200 minutes of Cartoon Me live for 30 days (about 120 hours)",
      "Hosted cartoon library for the month",
    ],
    difference:
      "Network is the expensive platform plan. It costs more because it covers a full month of heavy live use. It is still cheap next to $3.99 × 200,000 fans.",
    costExplained:
      "$399.99 for 30 days. About 101 fans at $3.99/month cover it. 200,000 × $3.99 is about $798,000/month; 300,000 is about $1.2 million. You can afford this if that is your channel. UR's floor stays under the price so Kenneth does not lose money. Tax and Stripe on top, paid by you.",
    fansToCover: 101,
  },
] as const;

export const CARTOON_CREATOR_NO_REFUND_POLICY =
  "Cartoon Me Creator Platform has no return policy. You must be happy with what you receive. " +
  "Unused live minutes expire after 30 days. No refunds, no rollover cash, no chargebacks for taste or because you did not go live.";

export const CARTOON_CREATOR_PAY_FIRST_RULE =
  "You pay before Cartoon Me hosting or live minutes unlock. We do not turn the creator tools on until checkout is complete.";

export const CARTOON_CREATOR_PRICING_SUMMARY =
  "Cartoon Me Creator Platform (web checkout, 30 days): Channel $49.99 = 12 live hours. " +
  "Studio $149.99 = 40 live hours. Network $399.99 = 120 live hours. Hosting included. " +
  "This is voice + cartoon stand-in, not a live Hollywood restyle. Tax and Stripe on top. No refunds.";

export function isCartoonCreatorPlanId(value: string): value is CartoonCreatorPlanId {
  return value === "channel" || value === "studio" || value === "network";
}

export function getCartoonCreatorPlan(planId: CartoonCreatorPlanId): CartoonCreatorPlan {
  const plan = CARTOON_CREATOR_PLANS.find((item) => item.id === planId);
  if (!plan) throw new Error("Unknown Cartoon Me creator plan.");
  return plan;
}

export function cartoonCreatorCostFloorCents(planId: CartoonCreatorPlanId): number {
  const plan = getCartoonCreatorPlan(planId);
  return CARTOON_HOST_COST_FLOOR_CENTS + plan.liveMinutes * CARTOON_LIVE_COST_PER_MINUTE_CENTS;
}

export type CartoonCreatorQuote = {
  planId: CartoonCreatorPlanId;
  label: string;
  liveMinutes: number;
  subtotalCents: number;
  subtotalDisplay: string;
  costFloorCents: number;
  platformNetCents: number;
  fansToCover: number;
  sku: string;
  expiresInDays: number;
};

export function quoteCartoonCreatorPlan(planId: CartoonCreatorPlanId): CartoonCreatorQuote {
  const plan = getCartoonCreatorPlan(planId);
  if (plan.priceCents === IN_APP_ONLY_SUBTOTAL_CENTS) {
    throw new Error("Cartoon Me creator plans cannot use the $5.00 in-app price.");
  }
  const floor = cartoonCreatorCostFloorCents(planId);
  if (plan.priceCents < floor + CARTOON_CREATOR_MIN_GROSS_MARGIN_CENTS) {
    throw new Error("Cartoon Me creator quote fell below the profit floor.");
  }
  return {
    planId,
    label: plan.label,
    liveMinutes: plan.liveMinutes,
    subtotalCents: plan.priceCents,
    subtotalDisplay: formatUsd(plan.priceCents),
    costFloorCents: floor,
    platformNetCents: plan.priceCents - floor,
    fansToCover: plan.fansToCover,
    sku: `cartoon.creator.${planId}`,
    expiresInDays: CARTOON_CREATOR_PLAN_DAYS,
  };
}

export const CARTOON_CREATOR_BILLING_NOTES = [
  CARTOON_CREATOR_PAY_FIRST_RULE,
  CARTOON_CREATOR_NO_REFUND_POLICY,
  AI_PURCHASE_NO_REFUND_POLICY,
  "Three platform plans: Channel (affordable) · Studio (mid) · Network (expensive). That is the whole ladder.",
  "Cartoon Me live is your voice with a cartoon stand-in. It is not a live film-engine restyle of every camera frame. That restyle is not sold as a live feed — it would lose money.",
  "Each prepaid cartoon clip (Draft / Lite / Mid / Cinema / Premiere) is a separate checkout. This plan unlocks hosting and live minutes.",
  `A $3.99/month fan: Channel ≈ ${CARTOON_CREATOR_PLANS[0]!.fansToCover} fans · Studio ≈ ${CARTOON_CREATOR_PLANS[1]!.fansToCover} fans · Network ≈ ${CARTOON_CREATOR_PLANS[2]!.fansToCover} fans.`,
  "You pay the service subtotal, then your state's sales tax, then Stripe's 2.9% + $0.30. UR does not eat tax or card fees.",
  "Checkout is on the website (not a $5.00 in-app purchase).",
] as const;
