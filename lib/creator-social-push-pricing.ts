/**
 * Paid cross-posting for content creators.
 * Posts go out on the social accounts UR Platform already linked.
 * A basic member post on UR itself is free and is not this product.
 *
 * Cost reserve: 5¢ per send. Ayrshare bills a monthly plan, not a per-post
 * invoice. The reserve is what we set aside so a creator who uses the whole
 * daily cap still leaves UR a profit if sending later costs more.
 * Stripe’s 2.9% + $0.30 and sales tax are added on the card, so they are
 * not taken out of the prices below.
 * None of these prices is $5.00 (that amount is reserved for in-app checkout).
 */

import { formatUsd } from "./ai-subscription-pricing";

export const CREATOR_SOCIAL_PUSH_COST_CENTS_PER_POST = 5;
export const CREATOR_SOCIAL_PUSH_DAYS = 30;

export type CreatorSocialPushPlanId = "starter" | "plus" | "studio";

export type CreatorSocialPushPlan = {
  id: CreatorSocialPushPlanId;
  label: string;
  days: number;
  dailyCap: number;
  subtotalCents: number;
  priceDisplay: string;
  maxPosts: number;
  reserveCents: number;
  keepsCents: number;
};

function plan(
  id: CreatorSocialPushPlanId,
  label: string,
  dailyCap: number,
  subtotalCents: number,
): CreatorSocialPushPlan {
  const maxPosts = dailyCap * CREATOR_SOCIAL_PUSH_DAYS;
  const reserveCents = maxPosts * CREATOR_SOCIAL_PUSH_COST_CENTS_PER_POST;
  return {
    id,
    label,
    days: CREATOR_SOCIAL_PUSH_DAYS,
    dailyCap,
    subtotalCents,
    priceDisplay: formatUsd(subtotalCents),
    maxPosts,
    reserveCents,
    keepsCents: subtotalCents - reserveCents,
  };
}

export const CREATOR_SOCIAL_PUSH_PLANS: readonly CreatorSocialPushPlan[] = [
  plan("starter", "Starter", 3, 699),
  plan("plus", "Plus", 8, 1699),
  plan("studio", "Studio", 15, 2999),
];

export function getCreatorSocialPushPlan(planId: string): CreatorSocialPushPlan | null {
  return CREATOR_SOCIAL_PUSH_PLANS.find((row) => row.id === planId) ?? null;
}
