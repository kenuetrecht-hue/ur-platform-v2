/**
 * UR Studio Pro — prepaid music desk.
 * Not Avid Pro Tools. Web Audio mixer / export / vocal take on our site and app.
 * Compute cost is near zero (no Suno/Udio). Price cheap, keep ~all of the subtotal.
 * Never $5.00 (that checkout is mobile in-app only). Tax and Stripe on top.
 */

import { formatUsd } from "./ai-subscription-pricing";
import { IN_APP_ONLY_SUBTOTAL_CENTS } from "./payment-channel-policy";
import { AI_PURCHASE_NO_REFUND_POLICY } from "./platform-terms-of-use";

export const MUSIC_STUDIO_WEB_PATH = "/music-studio" as const;

export type MusicStudioPlanId = "session" | "month" | "year";

export type MusicStudioPlan = {
  id: MusicStudioPlanId;
  label: string;
  badge: string;
  days: number;
  subtotalCents: number;
  exports: number;
  vocalTakes: number;
  youGet: string[];
  costExplained: string;
};

export const MUSIC_STUDIO_PLANS: readonly MusicStudioPlan[] = [
  {
    id: "session",
    label: "Session Pro",
    badge: "Day pass",
    days: 1,
    subtotalCents: 299,
    exports: 3,
    vocalTakes: 2,
    youGet: [
      "8-track mixer (volume, pan, mute, solo)",
      "32-step grid and extra kit voices",
      "Reverb, delay, and filter",
      "3 WAV exports and 2 vocal takes",
    ],
    costExplained: "One cheap day on the Pro desk. UR keeps the subtotal; tax and card fee are added on top.",
  },
  {
    id: "month",
    label: "Month Pro",
    badge: "Best for regulars",
    days: 30,
    subtotalCents: 999,
    exports: 20,
    vocalTakes: 15,
    youGet: [
      "Everything in Session Pro for 30 days",
      "20 WAV exports and 15 vocal takes",
      "Collab on shared beats with your own Pro desk",
    ],
    costExplained: "A coffee-range month. No film-engine bill — the mixer runs in the browser.",
  },
  {
    id: "year",
    label: "Year Pro",
    badge: "Cheapest per day",
    days: 365,
    subtotalCents: 7999,
    exports: 200,
    vocalTakes: 120,
    youGet: [
      "Pro desk all year",
      "200 WAV exports and 120 vocal takes",
      "Same Musician + Songwriter desks included with the room",
    ],
    costExplained: "About 22¢/day. Priced to stay cheap for members and still profit for UR.",
  },
] as const;

export const MUSIC_STUDIO_NO_REFUND_POLICY =
  "Music Studio Pro has no return policy. Payment is final. No refunds because you wanted Avid Pro Tools, a different mix, or a generated hit song.";

export const MUSIC_STUDIO_PAY_FIRST_RULE =
  "You pay before the Pro mixer, extra tracks, effects, export, and vocal take unlock.";

export const MUSIC_STUDIO_PRICING_SUMMARY =
  "UR Studio Pro (web checkout, not Avid Pro Tools): Session $2.99 / 1 day · Month $9.99 / 30 days · Year $79.99 / 365 days. Tax and Stripe on top. No refunds.";

export const MUSIC_STUDIO_BILLING_NOTES = [
  MUSIC_STUDIO_PRICING_SUMMARY,
  MUSIC_STUDIO_PAY_FIRST_RULE,
  MUSIC_STUDIO_NO_REFUND_POLICY,
  AI_PURCHASE_NO_REFUND_POLICY,
  "This is UR's own web/app studio desk. It is not a license to Avid Pro Tools, Ableton, Logic, or Suno.",
] as const;

export function getMusicStudioPlan(planId: MusicStudioPlanId): MusicStudioPlan {
  const plan = MUSIC_STUDIO_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Unknown Music Studio plan");
  return plan;
}

export function quoteMusicStudio(planId: MusicStudioPlanId): {
  planId: MusicStudioPlanId;
  sku: string;
  label: string;
  days: number;
  subtotalCents: number;
  subtotalDisplay: string;
  exports: number;
  vocalTakes: number;
} {
  const plan = getMusicStudioPlan(planId);
  if (plan.subtotalCents === IN_APP_ONLY_SUBTOTAL_CENTS) {
    throw new Error("Music Studio must not use the $5 in-app checkout.");
  }
  return {
    planId: plan.id,
    sku: `music-studio-${plan.id}`,
    label: plan.label,
    days: plan.days,
    subtotalCents: plan.subtotalCents,
    subtotalDisplay: formatUsd(plan.subtotalCents),
    exports: plan.exports,
    vocalTakes: plan.vocalTakes,
  };
}
