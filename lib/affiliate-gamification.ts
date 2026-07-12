/**
 * Affiliate Performance Gamification System
 * Leaderboards, badges, and rewards for AI creators
 */

export interface AICreatorAffiliateBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  earnedAt?: Date;
}

export interface AICreatorLeaderboardEntry {
  aiCreatorId: string;
  aiName: string;
  specialty: string;
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  averageOrderValue: number;
  rank: number;
  badges: AICreatorAffiliateBadge[];
}

export interface AffiliateReward {
  id: string;
  name: string;
  description: string;
  type: 'bonus' | 'badge' | 'feature' | 'promotion';
  value: number;
  requirement: string;
  isActive: boolean;
}

export interface AICreatorAffiliateStats {
  aiCreatorId: string;
  totalRevenue: number;
  monthlyRevenue: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  averageOrderValue: number;
  rank: number;
  level: number;
  points: number;
  badges: AICreatorAffiliateBadge[];
  nextBadge?: AICreatorAffiliateBadge;
}

export class AffiliateGamificationSystem {
  private leaderboard: Map<string, AICreatorLeaderboardEntry> = new Map();
  private badges: Map<string, AICreatorAffiliateBadge[]> = new Map();
  private rewards: Map<string, AffiliateReward> = new Map();
  private stats: Map<string, AICreatorAffiliateStats> = new Map();

  constructor() {
    this.initializeBadges();
    this.initializeRewards();
  }

  /**
   * Initialize default badges
   */
  private initializeBadges(): void {
    const defaultBadges = [
      {
        id: 'first_sale',
        name: 'First Sale',
        description: 'Earned your first affiliate sale',
        icon: '🎉',
        requirement: '1 conversion',
      },
      {
        id: 'hundred_clicks',
        name: 'Click Master',
        description: 'Reached 100 affiliate link clicks',
        icon: '👆',
        requirement: '100 clicks',
      },
      {
        id: 'thousand_revenue',
        name: 'Revenue Rockstar',
        description: 'Generated $1,000 in affiliate revenue',
        icon: '💰',
        requirement: '$1,000 revenue',
      },
      {
        id: 'ten_percent_conversion',
        name: 'Conversion King',
        description: 'Achieved 10% conversion rate',
        icon: '👑',
        requirement: '10% conversion rate',
      },
      {
        id: 'top_ten',
        name: 'Top 10 Creator',
        description: 'Ranked in top 10 affiliate earners',
        icon: '🏆',
        requirement: 'Top 10 rank',
      },
      {
        id: 'top_three',
        name: 'Elite Affiliate',
        description: 'Ranked in top 3 affiliate earners',
        icon: '⭐',
        requirement: 'Top 3 rank',
      },
      {
        id: 'monthly_champion',
        name: 'Monthly Champion',
        description: 'Highest affiliate revenue this month',
        icon: '🥇',
        requirement: 'Highest monthly revenue',
      },
      {
        id: 'consistency',
        name: 'Consistent Performer',
        description: 'Earned affiliate revenue for 30 consecutive days',
        icon: '📈',
        requirement: '30 day streak',
      },
    ];

    defaultBadges.forEach(badge => {
      this.badges.set(badge.id, [badge as AICreatorAffiliateBadge]);
    });
  }

  /**
   * Initialize default rewards
   */
  private initializeRewards(): void {
    const defaultRewards = [
      {
        id: 'bonus_100',
        name: '$100 Bonus',
        description: 'Earn $100 bonus when reaching $1,000 revenue',
        type: 'bonus' as const,
        value: 100,
        requirement: '$1,000 revenue',
        isActive: true,
      },
      {
        id: 'bonus_500',
        name: '$500 Bonus',
        description: 'Earn $500 bonus when reaching $5,000 revenue',
        type: 'bonus' as const,
        value: 500,
        requirement: '$5,000 revenue',
        isActive: true,
      },
      {
        id: 'featured_badge',
        name: 'Featured Creator',
        description: 'Get featured on homepage as top affiliate earner',
        type: 'feature' as const,
        value: 0,
        requirement: 'Top 3 rank',
        isActive: true,
      },
      {
        id: 'custom_promotion',
        name: 'Custom Promotion',
        description: 'Get custom promotional materials for your top products',
        type: 'promotion' as const,
        value: 0,
        requirement: 'Top 10 rank',
        isActive: true,
      },
    ];

    defaultRewards.forEach(reward => {
      this.rewards.set(reward.id, reward);
    });
  }

  /**
   * Update leaderboard entry
   */
  updateLeaderboardEntry(
    aiCreatorId: string,
    data: {
      aiName: string;
      specialty: string;
      totalRevenue: number;
      totalClicks: number;
      totalConversions: number;
    }
  ): void {
    const entry: AICreatorLeaderboardEntry = {
      aiCreatorId,
      aiName: data.aiName,
      specialty: data.specialty,
      totalRevenue: data.totalRevenue,
      totalClicks: data.totalClicks,
      totalConversions: data.totalConversions,
      averageOrderValue: data.totalConversions > 0 ? data.totalRevenue / data.totalConversions : 0,
      rank: 0,
      badges: this.badges.get(aiCreatorId) || [],
    };

    this.leaderboard.set(aiCreatorId, entry);
    this.updateRanks();
  }

  /**
   * Update ranks based on revenue
   */
  private updateRanks(): void {
    const sorted = Array.from(this.leaderboard.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    sorted.forEach((entry, index) => {
      entry.rank = index + 1;
    });
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 10): AICreatorLeaderboardEntry[] {
    return Array.from(this.leaderboard.values())
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit);
  }

  /**
   * Get AI creator rank
   */
  getAICreatorRank(aiCreatorId: string): number {
    const entry = this.leaderboard.get(aiCreatorId);
    return entry?.rank || 0;
  }

  /**
   * Award badge to AI creator
   */
  awardBadge(aiCreatorId: string, badgeId: string): void {
    const badge = Array.from(this.badges.values())
      .flat()
      .find(b => b.id === badgeId);

    if (badge && !this.badges.get(aiCreatorId)?.some(b => b.id === badgeId)) {
      const badgeWithDate = {
        ...badge,
        earnedAt: new Date(),
      };

      if (!this.badges.has(aiCreatorId)) {
        this.badges.set(aiCreatorId, []);
      }
      this.badges.get(aiCreatorId)!.push(badgeWithDate);

      // Update leaderboard
      const entry = this.leaderboard.get(aiCreatorId);
      if (entry) {
        entry.badges = this.badges.get(aiCreatorId) || [];
      }
    }
  }

  /**
   * Check and award badges based on performance
   */
  checkAndAwardBadges(aiCreatorId: string, stats: AICreatorAffiliateStats): void {
    // First sale badge
    if (stats.totalConversions >= 1) {
      this.awardBadge(aiCreatorId, 'first_sale');
    }

    // Click master badge
    if (stats.totalClicks >= 100) {
      this.awardBadge(aiCreatorId, 'hundred_clicks');
    }

    // Revenue rockstar badge
    if (stats.totalRevenue >= 1000) {
      this.awardBadge(aiCreatorId, 'thousand_revenue');
    }

    // Conversion king badge
    if (stats.conversionRate >= 10) {
      this.awardBadge(aiCreatorId, 'ten_percent_conversion');
    }

    // Top 10 badge
    if (stats.rank <= 10) {
      this.awardBadge(aiCreatorId, 'top_ten');
    }

    // Top 3 badge
    if (stats.rank <= 3) {
      this.awardBadge(aiCreatorId, 'top_three');
    }

    // Monthly champion badge
    if (stats.rank === 1) {
      this.awardBadge(aiCreatorId, 'monthly_champion');
    }
  }

  /**
   * Get AI creator stats
   */
  getAICreatorStats(aiCreatorId: string): AICreatorAffiliateStats | undefined {
    return this.stats.get(aiCreatorId);
  }

  /**
   * Update AI creator stats
   */
  updateAICreatorStats(
    aiCreatorId: string,
    data: Omit<AICreatorAffiliateStats, 'nextBadge'>
  ): void {
    this.stats.set(aiCreatorId, data);
    this.checkAndAwardBadges(aiCreatorId, data);
  }

  /**
   * Get available rewards for AI creator
   */
  getAvailableRewards(aiCreatorId: string): AffiliateReward[] {
    const stats = this.stats.get(aiCreatorId);
    if (!stats) return [];

    const rewards: AffiliateReward[] = [];

    for (const reward of this.rewards.values()) {
      if (reward.isActive) {
        // Check if reward requirement is met
        if (reward.requirement.includes('$') && stats.totalRevenue >= parseInt(reward.requirement)) {
          rewards.push(reward);
        } else if (reward.requirement.includes('rank') && stats.rank <= 10) {
          rewards.push(reward);
        }
      }
    }

    return rewards;
  }

  /**
   * Get next milestone for AI creator
   */
  getNextMilestone(aiCreatorId: string): {
    milestone: string;
    currentValue: number;
    targetValue: number;
    progress: number;
  } | null {
    const stats = this.stats.get(aiCreatorId);
    if (!stats) return null;

    const milestones = [
      { name: 'Revenue Goal', current: stats.totalRevenue, target: 1000 },
      { name: 'Clicks Goal', current: stats.totalClicks, target: 100 },
      { name: 'Conversions Goal', current: stats.totalConversions, target: 10 },
    ];

    const nextMilestone = milestones.find(m => m.current < m.target);
    if (!nextMilestone) return null;

    return {
      milestone: nextMilestone.name,
      currentValue: nextMilestone.current,
      targetValue: nextMilestone.target,
      progress: Math.round((nextMilestone.current / nextMilestone.target) * 100),
    };
  }

  /**
   * Get gamification summary
   */
  getGamificationSummary(): {
    totalAICreators: number;
    topCreator: AICreatorLeaderboardEntry | null;
    totalBadgesAwarded: number;
    totalRewards: number;
    leaderboard: AICreatorLeaderboardEntry[];
  } {
    const leaderboard = this.getLeaderboard(10);
    const topCreator = leaderboard[0] || null;
    let totalBadgesAwarded = 0;

    for (const badges of this.badges.values()) {
      totalBadgesAwarded += badges.filter(b => b.earnedAt).length;
    }

    return {
      totalAICreators: this.leaderboard.size,
      topCreator,
      totalBadgesAwarded,
      totalRewards: this.rewards.size,
      leaderboard,
    };
  }
}

// Export singleton instance
export const affiliateGamificationSystem = new AffiliateGamificationSystem();
