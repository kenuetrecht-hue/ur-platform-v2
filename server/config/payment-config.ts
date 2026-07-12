/**
 * Payment Configuration
 * All prices and values are configurable here
 * Update these values to change pricing across the entire app
 */

export const paymentConfig = {
  // Stamps Configuration
  stamps: {
    // Primary bundle: 10 stamps for $4.99
    bundle: {
      stampCount: 10,
      priceInCents: 499, // $4.99
    },
    // First purchase bonus
    firstPurchaseBonus: 5, // 5 free stamps
    // Stamp value
    stampValueInCents: 50, // 1 stamp = $0.50
    // Cost to chat with AI (in stamps)
    chatCostInStamps: 2, // 2 stamps per chat
  },

  // Loyalty Points Configuration
  loyaltyPoints: {
    // Cost per individual AI chat (in loyalty points)
    chatCostInPoints: 1, // TBD - Update this value
    // Loyalty points earning rules (TBD)
    earning: {
      perReferral: 10, // TBD
      perDailyLogin: 5, // TBD
      perContentCreation: 25, // TBD
      perPurchase: 1, // TBD - 1 point per dollar spent
    },
    // Double value when no stamps available
    doubleValueMultiplier: 2,
  },

  // Membership Configuration
  memberships: {
    day: {
      name: "Day Membership",
      durationInDays: 1,
      priceInCents: 499, // $4.99 - Uses Stripe (no stamps)
      paymentMethod: "stripe", // Automatically determined by price
    },
    week: {
      name: "Week Membership",
      durationInDays: 7,
      priceInCents: 1999, // $19.99 - TBD - Update this value
      paymentMethod: "auto", // Will be determined by price logic
    },
    month: {
      name: "Month Membership",
      durationInDays: 30,
      priceInCents: 4999, // $49.99 - TBD - Update this value
      paymentMethod: "auto", // Will be determined by price logic
    },
    year: {
      name: "Year Membership",
      durationInDays: 365,
      priceInCents: 99900, // $999.00 - TBD - Update this value
      paymentMethod: "auto", // Will be determined by price logic
    },
  },

  // Payment Routing Rules
  paymentRouting: {
    // Purchases >= $4.99 use Stripe
    // Purchases < $4.99 use stamps
    stripeThresholdInCents: 499, // $4.99
  },

  // Stripe Configuration
  stripe: {
    // Stripe API keys are loaded from environment variables
    // STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
    apiVersion: "2024-06-20",
  },

  // Transaction Limits
  limits: {
    maxStampsPerPurchase: 1000,
    maxLoyaltyPointsPerChat: 100,
    maxChatsPerDay: 1000, // Prevent abuse
    maxStampPurchasesPerDay: 100,
  },

  // Refund Policy
  refunds: {
    stampRefundWindowInDays: 30,
    membershipRefundWindowInDays: 7,
    autoRefundOnCancelation: true,
  },
};

/**
 * Helper Functions
 */

export function getPaymentMethod(priceInCents: number): "stripe" | "stamps" {
  return priceInCents >= paymentConfig.paymentRouting.stripeThresholdInCents
    ? "stripe"
    : "stamps";
}

export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

export function getStampCost(priceInCents: number): number {
  return Math.ceil(priceInCents / paymentConfig.stamps.stampValueInCents);
}

export function getLoyaltyPointValue(loyaltyPoints: number, hasStamps: boolean): number {
  const baseValue = loyaltyPoints * paymentConfig.stamps.stampValueInCents;
  if (!hasStamps) {
    return baseValue * paymentConfig.loyaltyPoints.doubleValueMultiplier;
  }
  return baseValue;
}

/**
 * Configuration Update Instructions
 *
 * To update pricing:
 *
 * 1. STAMP PRICING:
 *    - Change stamps.bundle.priceInCents (in cents, e.g., 499 = $4.99)
 *    - Change stamps.stampValueInCents (value per stamp)
 *
 * 2. LOYALTY POINTS:
 *    - Change loyaltyPoints.chatCostInPoints (cost per chat)
 *    - Update earning rules in loyaltyPoints.earning
 *
 * 3. MEMBERSHIP PRICING:
 *    - Update memberships.week.priceInCents
 *    - Update memberships.month.priceInCents
 *    - Update memberships.year.priceInCents
 *    - Payment method (stripe/stamps) is automatically determined
 *
 * 4. PAYMENT ROUTING:
 *    - Change paymentRouting.stripeThresholdInCents if needed
 *
 * All changes take effect immediately across the app.
 */
