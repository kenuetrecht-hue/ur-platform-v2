/**
 * Promotional Banner System
 * Manages 30-day launch promotion with tier tracking and gamification
 */

export interface PromotionalTier {
  tier: 1 | 2 | 3;
  name: string;
  creatorRange: string;
  joined: number;
  capacity: number;
  earningsPercentage: number;
  durationDays: number;
  benefits: string[];
  color: string;
  medal: string;
}

export interface PromotionalState {
  isActive: boolean;
  launchDate: Date;
  endDate: Date;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  tiers: PromotionalTier[];
  totalCreatorsJoined: number;
  totalSpotsAvailable: number;
  totalSpotsRemaining: number;
  progressPercentage: number;
}

/**
 * Initialize promotional system
 * Launch date should be set when the app goes live
 */
export function initializePromotionalSystem(launchDate: Date = new Date()): PromotionalState {
  const endDate = new Date(launchDate);
  endDate.setDate(endDate.getDate() + 30);

  const tiers: PromotionalTier[] = [
    {
      tier: 1,
      name: "Tier 1: Founding Creators",
      creatorRange: "1-100",
      joined: 0, // Will be updated from database
      capacity: 100,
      earningsPercentage: 92.5,
      durationDays: 180,
      benefits: [
        "92.5% earnings for 180 days",
        "100% earnings for first 24 hours",
        "1 free ticket each week for LIFE",
        "Monthly drawing: 24-hour 100% earnings prize",
      ],
      color: "#FFD700", // Gold
      medal: "🥇",
    },
    {
      tier: 2,
      name: "Tier 2: Early Adopters",
      creatorRange: "101-200",
      joined: 0,
      capacity: 100,
      earningsPercentage: 94,
      durationDays: 90,
      benefits: [
        "94% earnings for 90 days",
        "100% earnings for first 24 hours",
        "Standard promotional benefits",
      ],
      color: "#C0C0C0", // Silver
      medal: "🥈",
    },
    {
      tier: 3,
      name: "Tier 3: Growing Community",
      creatorRange: "201-300",
      joined: 0,
      capacity: 100,
      earningsPercentage: 92.5,
      durationDays: 30,
      benefits: [
        "92.5% earnings for 30 days",
        "100% earnings for first 24 hours",
        "Standard promotional benefits",
      ],
      color: "#CD7F32", // Bronze
      medal: "🥉",
    }
  ];

  return {
    isActive: true,
    launchDate,
    endDate,
    daysRemaining: 30,
    hoursRemaining: 0,
    minutesRemaining: 0,
    tiers,
    totalCreatorsJoined: 0,
    totalSpotsAvailable: 300,
    totalSpotsRemaining: 300,
    progressPercentage: 0,
  };
}

/**
 * Update promotional state with current time and creator counts
 */
export function updatePromotionalState(
  state: PromotionalState,
  creatorCounts: { tier1: number; tier2: number; tier3: number }
): PromotionalState {
  const now = new Date();
  const timeRemaining = state.endDate.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return {
      ...state,
      isActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
    };
  }

  const totalMs = state.endDate.getTime() - state.launchDate.getTime();
  const elapsedMs = now.getTime() - state.launchDate.getTime();
  const progressPercentage = Math.min(100, (elapsedMs / totalMs) * 100);

  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const updatedTiers = state.tiers.map((tier) => {
    const joined = tier.tier === 1 ? creatorCounts.tier1 : tier.tier === 2 ? creatorCounts.tier2 : creatorCounts.tier3;
    return {
      ...tier,
      joined: Math.min(joined, tier.capacity),
    };
  });

  const totalCreatorsJoined = creatorCounts.tier1 + creatorCounts.tier2 + creatorCounts.tier3;
  const totalSpotsRemaining = Math.max(0, 300 - totalCreatorsJoined);

  return {
    ...state,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    tiers: updatedTiers,
    totalCreatorsJoined,
    totalSpotsRemaining,
    progressPercentage,
  };
}

/**
 * Get tier for a creator based on join order
 */
export function getCreatorTier(creatorJoinPosition: number): 1 | 2 | 3 {
  if (creatorJoinPosition <= 100) return 1;
  if (creatorJoinPosition <= 200) return 2;
  return 3;
}

/**
 * Check if promotion is still active
 */
export function isPromotionActive(endDate: Date): boolean {
  return new Date() < endDate;
}

/**
 * Format countdown for display
 */
export function formatCountdown(days: number, hours: number, minutes: number): string {
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1:
      return "#FFD700"; // Gold
    case 2:
      return "#C0C0C0"; // Silver
    case 3:
      return "#CD7F32"; // Bronze
    default:
      return "#808080"; // Gray
  }
}

/**
 * Get tier medal emoji
 */
export function getTierMedal(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "🎖️";
  }
}

/**
 * Calculate urgency level based on remaining spots
 */
export function getUrgencyLevel(spotsRemaining: number, totalSpots: number = 300): "low" | "medium" | "high" {
  const percentageRemaining = (spotsRemaining / totalSpots) * 100;
  if (percentageRemaining > 50) return "low";
  if (percentageRemaining > 20) return "medium";
  return "high";
}

/**
 * Get urgency message based on remaining spots
 */
export function getUrgencyMessage(spotsRemaining: number): string {
  if (spotsRemaining > 200) {
    return "🚀 Join now and get exclusive benefits!";
  }
  if (spotsRemaining > 100) {
    return "⚡ Limited spots! Join before they're gone!";
  }
  if (spotsRemaining > 50) {
    return "🔥 Only 50+ spots left! Hurry!";
  }
  if (spotsRemaining > 0) {
    return "🚨 Almost full! Last chance to join!";
  }
  return "✅ All tiers filled! Thank you for your interest!";
}
