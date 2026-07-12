/**
 * Real-Time Leaderboards Service
 * Tracks and displays rankings for creators, AI creators, and top users
 */

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  image?: string;
  score: number;
  change: number; // -5 to +5 (rank change from last period)
  badge?: 'gold' | 'silver' | 'bronze';
  metadata?: Record<string, any>;
}

export interface Leaderboard {
  type: 'creators' | 'ai_creators' | 'loyalty_users' | 'tippers';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  lastUpdated: Date;
}

class LeaderboardsService {
  private leaderboards: Map<string, Leaderboard> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize leaderboards service
   */
  constructor() {
    this.initializeLeaderboards();
  }

  /**
   * Initialize all leaderboards
   */
  private initializeLeaderboards() {
    const types: Array<'creators' | 'ai_creators' | 'loyalty_users' | 'tippers'> = [
      'creators',
      'ai_creators',
      'loyalty_users',
      'tippers',
    ];
    const periods: Array<'daily' | 'weekly' | 'monthly' | 'all_time'> = [
      'daily',
      'weekly',
      'monthly',
      'all_time',
    ];

    for (const type of types) {
      for (const period of periods) {
        const key = `${type}_${period}`;
        this.leaderboards.set(key, {
          type,
          period,
          entries: [],
          lastUpdated: new Date(),
        });
      }
    }

    // Start real-time updates
    this.startRealtimeUpdates();
  }

  /**
   * Start real-time leaderboard updates
   */
  private startRealtimeUpdates() {
    // Update daily leaderboards every 5 minutes
    const dailyInterval = setInterval(() => {
      this.updateLeaderboard('creators', 'daily');
      this.updateLeaderboard('ai_creators', 'daily');
      this.updateLeaderboard('loyalty_users', 'daily');
      this.updateLeaderboard('tippers', 'daily');
    }, 5 * 60 * 1000);

    // Update weekly leaderboards every hour
    const weeklyInterval = setInterval(() => {
      this.updateLeaderboard('creators', 'weekly');
      this.updateLeaderboard('ai_creators', 'weekly');
      this.updateLeaderboard('loyalty_users', 'weekly');
      this.updateLeaderboard('tippers', 'weekly');
    }, 60 * 60 * 1000);

    // Update monthly leaderboards every 6 hours
    const monthlyInterval = setInterval(() => {
      this.updateLeaderboard('creators', 'monthly');
      this.updateLeaderboard('ai_creators', 'monthly');
      this.updateLeaderboard('loyalty_users', 'monthly');
      this.updateLeaderboard('tippers', 'monthly');
    }, 6 * 60 * 60 * 1000);

    this.updateIntervals.set('daily', dailyInterval as unknown as NodeJS.Timeout);
    this.updateIntervals.set('weekly', weeklyInterval as unknown as NodeJS.Timeout);
    this.updateIntervals.set('monthly', monthlyInterval as unknown as NodeJS.Timeout);
  }

  /**
   * Update leaderboard with fresh data
   */
  private async updateLeaderboard(
    type: 'creators' | 'ai_creators' | 'loyalty_users' | 'tippers',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ) {
    try {
      const key = `${type}_${period}`;
      const entries = await this.fetchLeaderboardData(type, period);

      // Sort by score descending
      entries.sort((a, b) => b.score - a.score);

      // Assign ranks and badges
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
        if (index === 0) entry.badge = 'gold';
        else if (index === 1) entry.badge = 'silver';
        else if (index === 2) entry.badge = 'bronze';
      });

      // Update leaderboard
      const leaderboard = this.leaderboards.get(key);
      if (leaderboard) {
        // Calculate rank changes
        const oldEntries = leaderboard.entries;
        entries.forEach((entry) => {
          const oldRank = oldEntries.find((e) => e.id === entry.id)?.rank ?? 999;
          entry.change = oldRank - entry.rank;
        });

        leaderboard.entries = entries;
        leaderboard.lastUpdated = new Date();
      }
    } catch (error) {
      console.error(`Error updating ${type} ${period} leaderboard:`, error);
    }
  }

  /**
   * Fetch leaderboard data from database/API
   */
  private async fetchLeaderboardData(
    type: 'creators' | 'ai_creators' | 'loyalty_users' | 'tippers',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<LeaderboardEntry[]> {
    // TODO: Fetch from API based on type and period
    // For now, return mock data

    const mockData: Record<string, LeaderboardEntry[]> = {
      creators_daily: [
        {
          rank: 1,
          id: 'creator1',
          name: 'Alex Rivera',
          score: 2450,
          change: 2,
          metadata: { revenue: 2450, subscribers: 15200 },
        },
        {
          rank: 2,
          id: 'creator2',
          name: 'Maya Chen',
          score: 2180,
          change: -1,
          metadata: { revenue: 2180, subscribers: 12800 },
        },
        {
          rank: 3,
          id: 'creator3',
          name: 'Sasha Kim',
          score: 1950,
          change: 3,
          metadata: { revenue: 1950, subscribers: 11200 },
        },
      ],
      ai_creators_daily: [
        {
          rank: 1,
          id: 'ai_crypto',
          name: 'AI Crypto Analyst',
          score: 3200,
          change: 1,
          metadata: { subscribers: 62000, revenue: 3200 },
        },
        {
          rank: 2,
          id: 'ai_news',
          name: 'AI News Daily',
          score: 2800,
          change: 2,
          metadata: { subscribers: 45000, revenue: 2800 },
        },
        {
          rank: 3,
          id: 'ai_wellness',
          name: 'AI Wellness Coach',
          score: 2400,
          change: -1,
          metadata: { subscribers: 38000, revenue: 2400 },
        },
      ],
      loyalty_users_daily: [
        {
          rank: 1,
          id: 'user1',
          name: 'John Doe',
          score: 5420,
          change: 0,
          metadata: { tier: 'Platinum', points: 5420 },
        },
        {
          rank: 2,
          id: 'user2',
          name: 'Jane Smith',
          score: 4850,
          change: 1,
          metadata: { tier: 'Gold', points: 4850 },
        },
        {
          rank: 3,
          id: 'user3',
          name: 'Bob Johnson',
          score: 4200,
          change: -1,
          metadata: { tier: 'Gold', points: 4200 },
        },
      ],
      tippers_daily: [
        {
          rank: 1,
          id: 'user4',
          name: 'Sarah Wilson',
          score: 1850,
          change: 2,
          metadata: { tips: 1850, count: 45 },
        },
        {
          rank: 2,
          id: 'user5',
          name: 'Mike Brown',
          score: 1620,
          change: 0,
          metadata: { tips: 1620, count: 38 },
        },
        {
          rank: 3,
          id: 'user6',
          name: 'Emma Davis',
          score: 1450,
          change: 1,
          metadata: { tips: 1450, count: 32 },
        },
      ],
    };

    const key = `${type}_${period}`;
    return mockData[key] || [];
  }

  /**
   * Get leaderboard by type and period
   */
  getLeaderboard(
    type: 'creators' | 'ai_creators' | 'loyalty_users' | 'tippers',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Leaderboard | null {
    const key = `${type}_${period}`;
    return this.leaderboards.get(key) || null;
  }

  /**
   * Get user rank in a leaderboard
   */
  getUserRank(
    userId: string,
    type: 'creators' | 'ai_creators' | 'loyalty_users' | 'tippers',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): LeaderboardEntry | null {
    const leaderboard = this.getLeaderboard(type, period);
    if (!leaderboard) return null;

    return leaderboard.entries.find((entry) => entry.id === userId) || null;
  }

  /**
   * Get top N entries from leaderboard
   */
  getTopEntries(
    type: 'creators' | 'ai_creators' | 'loyalty_users' | 'tippers',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time',
    limit: number = 10
  ): LeaderboardEntry[] {
    const leaderboard = this.getLeaderboard(type, period);
    if (!leaderboard) return [];

    return leaderboard.entries.slice(0, limit);
  }

  /**
   * Get all leaderboards
   */
  getAllLeaderboards(): Leaderboard[] {
    return Array.from(this.leaderboards.values());
  }

  /**
   * Destroy service and clear intervals
   */
  destroy() {
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();
    this.leaderboards.clear();
  }
}

export const leaderboardsService = new LeaderboardsService();
