/**
 * Content Creator Discount & Pricing System
 * 
 * Content creators get:
 * 1. Free personal AI Assistant (problem-solving, photo analysis, critical thinking)
 * 2. Premium AI Assistant ($9.99/week) - adds AI coordination in 3D workspace
 * 3. 25% discount on all other AI subscriptions
 */

export interface CreatorPricing {
  personalAI: {
    tier: "free" | "premium";
    price: number;
    period: string;
    features: string[];
  };
  aiSubscriptionDiscount: number; // 25%
}

export interface AISubscriptionPrice {
  daily: number;
  weekly: number;
  monthly: number;
  perStamp: number;
}

export interface CreatorDiscountedPrice extends AISubscriptionPrice {
  originalDaily: number;
  originalWeekly: number;
  originalMonthly: number;
  originalPerStamp: number;
  discountPercentage: number;
}

/**
 * Creator Pricing Structure
 */
export const CREATOR_PRICING: CreatorPricing = {
  personalAI: {
    tier: "free",
    price: 0,
    period: "always",
    features: [
      "Problem-solving assistance",
      "Critical thinking support",
      "Photo analysis",
      "Content creation help",
      "Stress relief partner",
      "Learning & memory",
      "Web surfing for content ideas",
    ],
  },
  aiSubscriptionDiscount: 0.25, // 25% off
};

/**
 * Premium AI Assistant for Content Creators
 * Allows coordination of all other AIs in 3D workspace
 */
export const PREMIUM_AI_ASSISTANT: AISubscriptionPrice = {
  daily: 2.99,
  weekly: 9.99,
  monthly: 29.99,
  perStamp: 15,
};

/**
 * Apply 25% discount to AI subscription prices
 */
export function applyCreatorDiscount(
  originalPrice: AISubscriptionPrice
): CreatorDiscountedPrice {
  const discountPercentage = 25;
  const discountMultiplier = 1 - discountPercentage / 100;

  return {
    originalDaily: originalPrice.daily,
    originalWeekly: originalPrice.weekly,
    originalMonthly: originalPrice.monthly,
    originalPerStamp: originalPrice.perStamp,
    daily: Math.round(originalPrice.daily * discountMultiplier * 100) / 100,
    weekly: Math.round(originalPrice.weekly * discountMultiplier * 100) / 100,
    monthly: Math.round(originalPrice.monthly * discountMultiplier * 100) / 100,
    perStamp: Math.round(originalPrice.perStamp * discountMultiplier),
    discountPercentage,
  };
}

/**
 * Get pricing for a creator
 */
export function getCreatorPricing(
  aiSubscriptionPrice: AISubscriptionPrice,
  isContentCreator: boolean
): AISubscriptionPrice | CreatorDiscountedPrice {
  if (!isContentCreator) {
    return aiSubscriptionPrice;
  }
  return applyCreatorDiscount(aiSubscriptionPrice);
}

/**
 * Calculate savings for content creator
 */
export function calculateCreatorSavings(
  originalPrice: AISubscriptionPrice
): Record<string, number> {
  const discounted = applyCreatorDiscount(originalPrice);
  return {
    dailySavings: Math.round((originalPrice.daily - discounted.daily) * 100) / 100,
    weeklySavings: Math.round((originalPrice.weekly - discounted.weekly) * 100) / 100,
    monthlySavings: Math.round((originalPrice.monthly - discounted.monthly) * 100) / 100,
    stampSavings: originalPrice.perStamp - discounted.perStamp,
  };
}

/**
 * Example pricing for all AIs with creator discount
 */
export const AI_PRICING_EXAMPLES = {
  standard: {
    daily: 2.99,
    weekly: 9.99,
    monthly: 24.99,
    perStamp: 6,
  },
  premium: {
    daily: 9.99,
    weekly: 29.99,
    monthly: 79.99,
    perStamp: 15,
  },
  basic: {
    daily: 0,
    weekly: 4.99,
    monthly: 9.99,
    perStamp: 2,
  },
};

/**
 * Show pricing comparison for creators
 */
export function showPricingComparison(aiName: string, originalPrice: AISubscriptionPrice) {
  const discounted = applyCreatorDiscount(originalPrice);
  const savings = calculateCreatorSavings(originalPrice);

  return {
    aiName,
    regularUser: {
      daily: `$${originalPrice.daily.toFixed(2)}`,
      weekly: `$${originalPrice.weekly.toFixed(2)}`,
      monthly: `$${originalPrice.monthly.toFixed(2)}`,
      perStamp: `${originalPrice.perStamp} stamps`,
    },
    contentCreator: {
      daily: `$${discounted.daily.toFixed(2)}`,
      weekly: `$${discounted.weekly.toFixed(2)}`,
      monthly: `$${discounted.monthly.toFixed(2)}`,
      perStamp: `${discounted.perStamp} stamps`,
    },
    savings: {
      daily: `Save $${savings.dailySavings.toFixed(2)}`,
      weekly: `Save $${savings.weeklySavings.toFixed(2)}`,
      monthly: `Save $${savings.monthlySavings.toFixed(2)}`,
      perStamp: `Save ${savings.stampSavings} stamps`,
    },
    discountPercentage: "25% OFF",
  };
}
