/**
 * Loyalty Points & Sticker System Rules
 * Comprehensive system for earning, using, and tracking loyalty points and stickers
 */

import { TierName } from './store';

// ==================== TYPES ====================

export type PointEarningSource = 
  | 'daily_login'
  | 'follow_creator'
  | 'tip_creator'
  | 'sticker_purchase'
  | 'referral'
  | 'creator_reward'
  | 'login_streak'
  | 'first_purchase'
  | 'sticker_usage'
  | 'sticker_reaction'
  | 'sticker_gift'
  | 'collection_complete'
  | 'leaderboard_bonus'
  | 'sticker_trade';

export type PointUsageType = 
  | 'sticker_pack_purchase'
  | 'premium_feature'
  | 'tip_boost'
  | 'priority_message'
  | 'exclusive_content'
  | 'tier_boost'
  | 'ad_free';

export interface PointEarningRule {
  source: PointEarningSource;
  basePoints: number;
  description: string;
  tierMultiplier?: Record<TierName, number>;
  conditions?: string;
}

export interface PointUsageRule {
  type: PointUsageType;
  costInPoints: number;
  description: string;
  duration?: string;
  tierDiscount?: Record<TierName, number>;
  conditions?: string;
}

export interface StickerPack {
  id: string;
  price: number; // in dollars
  stickers: number;
  loyaltyPoints: number;
  stars: number;
  description: string;
}

export interface StickerUsageReward {
  action: string;
  pointsEarned: number;
  description: string;
  frequency?: string;
}

export interface LoyaltyStats {
  totalPointsEarned: number;
  totalPointsSpent: number;
  currentPoints: number;
  pointsExpiring?: number;
  expirationDate?: string;
  monthlyPointsEarned: number;
  monthlyPointsCap: number;
  monthlyPointsRemaining: number;
}

// ==================== LOYALTY POINTS EARNING RULES ====================

export const POINT_EARNING_RULES: Record<PointEarningSource, PointEarningRule> = {
  daily_login: {
    source: 'daily_login',
    basePoints: 5,
    description: 'Bonus for logging in daily',
    tierMultiplier: {
      Bronze: 1.0,
      Silver: 1.2,
      Gold: 1.5,
      Platinum: 2.0,
    },
    conditions: 'One per day, resets at midnight UTC',
  },
  follow_creator: {
    source: 'follow_creator',
    basePoints: 10,
    description: 'Points earned when following a creator',
    tierMultiplier: {
      Bronze: 1.0,
      Silver: 1.1,
      Gold: 1.2,
      Platinum: 1.5,
    },
    conditions: 'Varies by creator tier (Bronze: 10, Silver: 20, Gold: 35, Platinum: 50)',
  },
  tip_creator: {
    source: 'tip_creator',
    basePoints: 1,
    description: '1 point per $1 tipped to creators',
    tierMultiplier: {
      Bronze: 1.0,
      Silver: 1.1,
      Gold: 1.2,
      Platinum: 1.5,
    },
  },
  sticker_purchase: {
    source: 'sticker_purchase',
    basePoints: 1,
    description: 'Points equal to sticker pack price (e.g., $10 pack = 10 points)',
    tierMultiplier: {
      Bronze: 1.0,
      Silver: 1.15,
      Gold: 1.25,
      Platinum: 1.5,
    },
  },
  referral: {
    source: 'referral',
    basePoints: 50,
    description: 'Bonus for successful friend referral',
    conditions: 'Friend must complete signup and first purchase',
  },
  creator_reward: {
    source: 'creator_reward',
    basePoints: 0,
    description: 'Custom rewards set by creators for engagement',
    conditions: 'Varies by creator (5-100 points)',
  },
  login_streak: {
    source: 'login_streak',
    basePoints: 5,
    description: 'Extra bonus for 7-day login streak',
    conditions: 'Awarded on day 7, resets if streak breaks',
  },
  first_purchase: {
    source: 'first_purchase',
    basePoints: 25,
    description: 'One-time bonus on first sticker purchase',
    conditions: 'Only awarded once per account',
  },
  sticker_usage: {
    source: 'sticker_usage',
    basePoints: 1,
    description: 'Points earned when using stickers in chat',
    conditions: 'Per sticker used (max 5 per message)',
  },
  sticker_reaction: {
    source: 'sticker_reaction',
    basePoints: 2,
    description: 'Points earned when reacting to posts with stickers',
    conditions: 'Per reaction',
  },
  sticker_gift: {
    source: 'sticker_gift',
    basePoints: 5,
    description: 'Points earned when gifting sticker pack to creator',
    tierMultiplier: {
      Bronze: 1.0,
      Silver: 1.1,
      Gold: 1.2,
      Platinum: 1.5,
    },
    conditions: 'Varies by pack size (5-20 points)',
  },
  collection_complete: {
    source: 'collection_complete',
    basePoints: 50,
    description: 'Bonus for completing sticker collection in a tier',
    conditions: 'One per tier, special badge awarded',
  },
  leaderboard_bonus: {
    source: 'leaderboard_bonus',
    basePoints: 100,
    description: 'Monthly bonus for top 10 sticker users',
    conditions: '1st: 100pts, 2nd: 75pts, 3rd: 50pts, 4-10: 25pts',
  },
  sticker_trade: {
    source: 'sticker_trade',
    basePoints: 3,
    description: 'Points earned when trading stickers with other users',
    conditions: 'Per trade completed',
  },
};

// ==================== LOYALTY POINTS USAGE RULES ====================

export const POINT_USAGE_RULES: Record<PointUsageType, PointUsageRule> = {
  sticker_pack_purchase: {
    type: 'sticker_pack_purchase',
    costInPoints: 100,
    description: 'Redeem 100 points for $1 sticker pack equivalent',
    tierDiscount: {
      Bronze: 0,
      Silver: 0.1,
      Gold: 0.15,
      Platinum: 0.25,
    },
  },
  premium_feature: {
    type: 'premium_feature',
    costInPoints: 50,
    description: 'Unlock premium features (advanced analytics, custom branding)',
    duration: '30 days',
  },
  tip_boost: {
    type: 'tip_boost',
    costInPoints: 25,
    description: 'Double the impact of your next tip (appears as 2x in creator earnings)',
    duration: 'Single use',
  },
  priority_message: {
    type: 'priority_message',
    costInPoints: 10,
    description: 'Prioritize your message in creator inbox',
    duration: 'Single use',
  },
  exclusive_content: {
    type: 'exclusive_content',
    costInPoints: 75,
    description: 'Access limited/exclusive content from creators',
    duration: '7 days',
  },
  tier_boost: {
    type: 'tier_boost',
    costInPoints: 100,
    description: 'Instantly advance to next tier (one-time use)',
    conditions: 'Cannot exceed Platinum tier',
  },
  ad_free: {
    type: 'ad_free',
    costInPoints: 150,
    description: 'Ad-free experience across the platform',
    duration: '30 days',
  },
};

// ==================== STICKER PACKS & REWARDS ====================

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'pack_1',
    price: 1,
    stickers: 2,
    loyaltyPoints: 10,
    stars: 1,
    description: 'Starter Pack - Basic stickers to get started. Every purchase helps build UR!',
  },
  {
    id: 'pack_5',
    price: 5,
    stickers: 15,
    loyaltyPoints: 15,
    stars: 3,
    description: 'Essentials - Better quality stickers. Your support builds UR stronger!',
  },
  {
    id: 'pack_10',
    price: 10,
    stickers: 30,
    loyaltyPoints: 30,
    stars: 5,
    description: 'Popular Pack - High-quality stickers loved by our community. 100% proceeds go to UR!',
  },
  {
    id: 'pack_15',
    price: 15,
    stickers: 45,
    loyaltyPoints: 45,
    stars: 7,
    description: 'Premium Pack - Premium quality stickers with exclusive designs. Help us grow!',
  },
  {
    id: 'pack_20',
    price: 20,
    stickers: 60,
    loyaltyPoints: 60,
    stars: 10,
    description: 'Mega Pack - Top-notch stickers with premium artwork. Thank you for supporting UR!',
  },
  {
    id: 'pack_25',
    price: 25,
    stickers: 100,
    loyaltyPoints: 100,
    stars: 15,
    description: 'Ultimate Pack - Ultra-premium exclusive sticker collection. All proceeds fuel UR development!',
  },
];

// ==================== STICKER USAGE REWARDS ====================

export const STICKER_USAGE_REWARDS: StickerUsageReward[] = [
  {
    action: 'Send sticker in chat',
    pointsEarned: 1,
    description: 'Per sticker used (max 5 per message)',
    frequency: 'Unlimited',
  },
  {
    action: 'React with sticker to post',
    pointsEarned: 2,
    description: 'Per sticker reaction',
    frequency: 'Unlimited',
  },
  {
    action: 'Gift sticker pack to creator',
    pointsEarned: 5,
    description: 'Base reward (varies by pack size: 5-20 points)',
    frequency: 'Unlimited',
  },
  {
    action: 'Complete sticker collection',
    pointsEarned: 50,
    description: 'Collect all stickers in a tier',
    frequency: 'Once per tier',
  },
  {
    action: 'Monthly leaderboard top 10',
    pointsEarned: 100,
    description: '1st place (2nd: 75, 3rd: 50, 4-10: 25)',
    frequency: 'Monthly',
  },
  {
    action: 'Trade stickers with user',
    pointsEarned: 3,
    description: 'Per successful trade',
    frequency: 'Unlimited',
  },
  {
    action: 'Share sticker gallery on social',
    pointsEarned: 10,
    description: 'When sharing profile sticker collection',
    frequency: 'Once per day',
  },
];

// ==================== TIER BENEFITS ====================

export const TIER_BENEFITS = {
  Bronze: {
    dailyPointsBonus: 5,
    pointBonusMultiplier: 1.0,
    monthlyPointsCap: 500,
    perks: ['Standard support', 'Welcome bonus'],
  },
  Silver: {
    dailyPointsBonus: 10,
    pointBonusMultiplier: 1.2,
    monthlyPointsCap: 500,
    perks: ['5% off all tips', 'Priority support', 'Silver badge', '10% sticker discount'],
  },
  Gold: {
    dailyPointsBonus: 15,
    pointBonusMultiplier: 1.5,
    monthlyPointsCap: 500,
    perks: ['10% off all tips', 'Free monthly chat', 'Gold badge', 'Early access', '15% sticker discount'],
  },
  Platinum: {
    dailyPointsBonus: 25,
    pointBonusMultiplier: 2.0,
    monthlyPointsCap: 750,
    perks: ['15% off all tips', 'Free monthly chat', 'Platinum badge', 'VIP support', 'Exclusive contests', '25% sticker discount'],
  },
};

// ==================== POINT MECHANICS ====================

export const POINT_MECHANICS = {
  expirationMonths: 12,
  monthlyCapBase: 500,
  monthlyCapPlatinum: 750,
  streakBonusThreshold: 7,
  streakBonusPoints: 5,
  maxStickersPerMessage: 5,
  maxStickersPerReaction: 1,
  pointsPerDollarTipped: 1,
  pointsPerDollarPurchased: 1,
  referralBonusPoints: 50,
  firstPurchaseBonusPoints: 25,
  collectionCompleteBonusPoints: 50,
  leaderboardTopSpotBonus: 100,
};

// ==================== CALCULATION FUNCTIONS ====================

/**
 * Calculate points earned based on source and user tier
 */
export function calculatePointsEarned(
  source: PointEarningSource,
  baseAmount: number,
  userTier: TierName
): number {
  const rule = POINT_EARNING_RULES[source];
  if (!rule) return 0;

  let points = rule.basePoints;
  
  // Apply tier multiplier if available
  if (rule.tierMultiplier && rule.tierMultiplier[userTier]) {
    points = Math.floor(points * rule.tierMultiplier[userTier]);
  }

  // Apply base amount multiplier for sources like tips
  if (source === 'tip_creator' || source === 'sticker_purchase') {
    points = Math.floor(baseAmount * (rule.tierMultiplier?.[userTier] || 1.0));
  }

  return points;
}

/**
 * Calculate point usage cost with tier discount
 */
export function calculatePointUsageCost(
  usageType: PointUsageType,
  userTier: TierName
): number {
  const rule = POINT_USAGE_RULES[usageType];
  if (!rule) return 0;

  let cost = rule.costInPoints;
  
  // Apply tier discount if available
  if (rule.tierDiscount && rule.tierDiscount[userTier]) {
    const discount = rule.tierDiscount[userTier];
    cost = Math.floor(cost * (1 - discount));
  }

  return cost;
}

/**
 * Get monthly point cap based on tier
 */
export function getMonthlyPointsCap(userTier: TierName): number {
  return TIER_BENEFITS[userTier].monthlyPointsCap;
}

/**
 * Calculate daily login bonus based on tier
 */
export function getDailyLoginBonus(userTier: TierName): number {
  return TIER_BENEFITS[userTier].dailyPointsBonus;
}

/**
 * Get sticker pack details
 */
export function getStickerPackDetails(packId: string): StickerPack | undefined {
  return STICKER_PACKS.find(p => p.id === packId);
}

/**
 * Calculate total sticker rewards for a purchase
 */
export function calculateStickerRewards(packId: string): { stickers: number; points: number; stars: number } | null {
  const pack = getStickerPackDetails(packId);
  if (!pack) return null;

  return {
    stickers: pack.stickers,
    points: pack.loyaltyPoints,
    stars: pack.stars,
  };
}

/**
 * Validate if user can earn points (monthly cap check)
 */
export function canEarnPoints(
  currentMonthlyEarned: number,
  pointsToEarn: number,
  userTier: TierName
): boolean {
  const cap = getMonthlyPointsCap(userTier);
  return (currentMonthlyEarned + pointsToEarn) <= cap;
}

/**
 * Check if points are expiring soon
 */
export function getPointsExpiringWarning(
  lastActivityDate: Date,
  expirationMonths: number = 12
): { isExpiring: boolean; daysUntilExpiration: number } {
  const expirationDate = new Date(lastActivityDate);
  expirationDate.setMonth(expirationDate.getMonth() + expirationMonths);
  
  const today = new Date();
  const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Points are expiring if less than 30 days remain AND they haven't already expired
  const isExpiring = daysUntilExpiration > 0 && daysUntilExpiration <= 30;
  
  return {
    isExpiring,
    daysUntilExpiration: Math.max(0, daysUntilExpiration),
  };
}

export default {
  POINT_EARNING_RULES,
  POINT_USAGE_RULES,
  STICKER_PACKS,
  STICKER_USAGE_REWARDS,
  TIER_BENEFITS,
  POINT_MECHANICS,
  calculatePointsEarned,
  calculatePointUsageCost,
  getMonthlyPointsCap,
  getDailyLoginBonus,
  getStickerPackDetails,
  calculateStickerRewards,
  canEarnPoints,
  getPointsExpiringWarning,
};
