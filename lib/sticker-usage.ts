/**
 * Sticker Usage & Tracking Service
 * Handles sticker usage in chats, reactions, gifting, trading, and leaderboards
 */

import { loyaltyRulesService } from './loyalty-rules-service';

// ==================== TYPES ====================

export interface StickerUsageEvent {
  id: string;
  userId: string;
  type: 'chat_message' | 'post_reaction' | 'creator_gift' | 'trade' | 'collection_complete';
  stickerCount: number;
  pointsEarned: number;
  timestamp: Date;
  metadata?: {
    conversationId?: string;
    postId?: string;
    creatorId?: string;
    tradedWithUserId?: string;
    collectionTier?: string;
  };
}

export interface UserStickerUsage {
  userId: string;
  totalStickersUsed: number;
  totalPointsFromStickers: number;
  usageEvents: StickerUsageEvent[];
  monthlyUsageCount: number;
  leaderboardRank?: number;
  collectionCompletions: string[]; // array of completed tier IDs
}

export interface StickerLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userPhoto: string;
  stickersUsed: number;
  pointsEarned: number;
  monthlyBonus: number;
}

export interface StickerCollection {
  userId: string;
  tierName: string;
  totalStickersInTier: number;
  collectedStickers: number;
  percentageComplete: number;
  isComplete: boolean;
  completedDate?: Date;
  badge?: string;
}

export interface StickerTrade {
  id: string;
  initiatorId: string;
  recipientId: string;
  initiatorStickers: string[]; // sticker IDs
  recipientStickers: string[]; // sticker IDs
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: Date;
  completedAt?: Date;
  pointsEarned: number;
}

// ==================== SERVICE ====================

class StickerUsageService {
  private usageEvents: StickerUsageEvent[] = [];
  private userUsageStats: Map<string, UserStickerUsage> = new Map();
  private leaderboard: StickerLeaderboardEntry[] = [];
  private trades: StickerTrade[] = [];
  private collections: Map<string, StickerCollection[]> = new Map();

  constructor() {
    this.initializeDemoData();
  }

  /**
   * Initialize with demo data
   */
  private initializeDemoData(): void {
    // Initialize demo user usage stats
    this.userUsageStats.set('user_1', {
      userId: 'user_1',
      totalStickersUsed: 45,
      totalPointsFromStickers: 120,
      usageEvents: [],
      monthlyUsageCount: 12,
      leaderboardRank: 3,
      collectionCompletions: ['tier_1', 'tier_2'],
    });
  }

  /**
   * Record sticker usage in chat message
   */
  async recordChatUsage(
    userId: string,
    conversationId: string,
    stickerCount: number
  ): Promise<{ success: boolean; pointsEarned: number; error?: string }> {
    if (stickerCount < 1 || stickerCount > 5) {
      return {
        success: false,
        pointsEarned: 0,
        error: 'Can only use 1-5 stickers per message',
      };
    }

    try {
      // Calculate points (1 point per sticker)
      const pointsEarned = stickerCount;

      // Create usage event
      const event: StickerUsageEvent = {
        id: `stk_usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'chat_message',
        stickerCount,
        pointsEarned,
        timestamp: new Date(),
        metadata: { conversationId },
      };

      this.usageEvents.push(event);
      this.updateUserStats(userId, event);

      return {
        success: true,
        pointsEarned,
      };
    } catch (error) {
      console.error('Error recording chat usage:', error);
      return {
        success: false,
        pointsEarned: 0,
        error: error instanceof Error ? error.message : 'Failed to record sticker usage',
      };
    }
  }

  /**
   * Record sticker reaction to post
   */
  async recordReactionUsage(
    userId: string,
    postId: string
  ): Promise<{ success: boolean; pointsEarned: number; error?: string }> {
    try {
      // Calculate points (2 points per reaction)
      const pointsEarned = 2;

      const event: StickerUsageEvent = {
        id: `stk_reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'post_reaction',
        stickerCount: 1,
        pointsEarned,
        timestamp: new Date(),
        metadata: { postId },
      };

      this.usageEvents.push(event);
      this.updateUserStats(userId, event);

      return {
        success: true,
        pointsEarned,
      };
    } catch (error) {
      console.error('Error recording reaction:', error);
      return {
        success: false,
        pointsEarned: 0,
        error: error instanceof Error ? error.message : 'Failed to record reaction',
      };
    }
  }

  /**
   * Record sticker gift to creator
   */
  async recordCreatorGift(
    userId: string,
    creatorId: string,
    stickerCount: number
  ): Promise<{ success: boolean; pointsEarned: number; error?: string }> {
    if (stickerCount < 5 || stickerCount > 100) {
      return {
        success: false,
        pointsEarned: 0,
        error: 'Sticker gift must be 5-100 stickers',
      };
    }

    try {
      // Calculate points (5-20 based on pack size)
      let pointsEarned = 5;
      if (stickerCount >= 100) pointsEarned = 20;
      else if (stickerCount >= 60) pointsEarned = 15;
      else if (stickerCount >= 45) pointsEarned = 12;
      else if (stickerCount >= 30) pointsEarned = 10;
      else if (stickerCount >= 15) pointsEarned = 7;

      const event: StickerUsageEvent = {
        id: `stk_gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'creator_gift',
        stickerCount,
        pointsEarned,
        timestamp: new Date(),
        metadata: { creatorId },
      };

      this.usageEvents.push(event);
      this.updateUserStats(userId, event);

      return {
        success: true,
        pointsEarned,
      };
    } catch (error) {
      console.error('Error recording creator gift:', error);
      return {
        success: false,
        pointsEarned: 0,
        error: error instanceof Error ? error.message : 'Failed to record gift',
      };
    }
  }

  /**
   * Initiate sticker trade between users
   */
  async initiateTrade(
    initiatorId: string,
    recipientId: string,
    initiatorStickers: string[],
    recipientStickers: string[]
  ): Promise<{ success: boolean; tradeId?: string; error?: string }> {
    if (initiatorStickers.length === 0 || recipientStickers.length === 0) {
      return {
        success: false,
        error: 'Both parties must offer at least one sticker',
      };
    }

    try {
      const trade: StickerTrade = {
        id: `stk_trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        initiatorId,
        recipientId,
        initiatorStickers,
        recipientStickers,
        status: 'pending',
        createdAt: new Date(),
        pointsEarned: 3,
      };

      this.trades.push(trade);

      return {
        success: true,
        tradeId: trade.id,
      };
    } catch (error) {
      console.error('Error initiating trade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate trade',
      };
    }
  }

  /**
   * Accept sticker trade
   */
  async acceptTrade(
    tradeId: string,
    recipientId: string
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    try {
      const trade = this.trades.find(t => t.id === tradeId);
      if (!trade) {
        return {
          success: false,
          error: 'Trade not found',
        };
      }

      if (trade.recipientId !== recipientId) {
        return {
          success: false,
          error: 'You are not the recipient of this trade',
        };
      }

      if (trade.status !== 'pending') {
        return {
          success: false,
          error: `Trade is already ${trade.status}`,
        };
      }

      // Mark trade as completed
      trade.status = 'completed';
      trade.completedAt = new Date();

      // Record usage events for both parties
      const initiatorEvent: StickerUsageEvent = {
        id: `stk_trade_init_${Date.now()}`,
        userId: trade.initiatorId,
        type: 'trade',
        stickerCount: trade.initiatorStickers.length,
        pointsEarned: 3,
        timestamp: new Date(),
        metadata: { tradedWithUserId: recipientId },
      };

      const recipientEvent: StickerUsageEvent = {
        id: `stk_trade_recv_${Date.now()}`,
        userId: recipientId,
        type: 'trade',
        stickerCount: trade.recipientStickers.length,
        pointsEarned: 3,
        timestamp: new Date(),
        metadata: { tradedWithUserId: trade.initiatorId },
      };

      this.usageEvents.push(initiatorEvent, recipientEvent);
      this.updateUserStats(trade.initiatorId, initiatorEvent);
      this.updateUserStats(recipientId, recipientEvent);

      return {
        success: true,
        pointsEarned: 3,
      };
    } catch (error) {
      console.error('Error accepting trade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept trade',
      };
    }
  }

  /**
   * Record collection completion
   */
  async recordCollectionCompletion(
    userId: string,
    tierName: string
  ): Promise<{ success: boolean; pointsEarned: number; error?: string }> {
    try {
      const pointsEarned = 50;

      const event: StickerUsageEvent = {
        id: `stk_collection_${Date.now()}`,
        userId,
        type: 'collection_complete',
        stickerCount: 0,
        pointsEarned,
        timestamp: new Date(),
        metadata: { collectionTier: tierName },
      };

      this.usageEvents.push(event);
      this.updateUserStats(userId, event);

      // Add to collection completions
      const stats = this.userUsageStats.get(userId);
      if (stats && !stats.collectionCompletions.includes(tierName)) {
        stats.collectionCompletions.push(tierName);
      }

      return {
        success: true,
        pointsEarned,
      };
    } catch (error) {
      console.error('Error recording collection completion:', error);
      return {
        success: false,
        pointsEarned: 0,
        error: error instanceof Error ? error.message : 'Failed to record completion',
      };
    }
  }

  /**
   * Get user sticker usage statistics
   */
  getUserStats(userId: string): UserStickerUsage | undefined {
    return this.userUsageStats.get(userId);
  }

  /**
   * Get monthly sticker leaderboard
   */
  getMonthlyLeaderboard(limit: number = 10): StickerLeaderboardEntry[] {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate monthly usage for each user
    const monthlyStats: Record<string, { stickersUsed: number; pointsEarned: number }> = {};

    this.usageEvents.forEach(event => {
      if (event.timestamp >= monthStart) {
        if (!monthlyStats[event.userId]) {
          monthlyStats[event.userId] = { stickersUsed: 0, pointsEarned: 0 };
        }
        monthlyStats[event.userId].stickersUsed += event.stickerCount;
        monthlyStats[event.userId].pointsEarned += event.pointsEarned;
      }
    });

    // Create leaderboard entries
    const entries = Object.entries(monthlyStats)
      .map(([userId, stats], index) => ({
        rank: index + 1,
        userId,
        userName: `User ${userId}`,
        userPhoto: `https://i.pravatar.cc/300?img=${index}`,
        stickersUsed: stats.stickersUsed,
        pointsEarned: stats.pointsEarned,
        monthlyBonus: this.calculateLeaderboardBonus(index),
      }))
      .sort((a, b) => b.stickersUsed - a.stickersUsed)
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        monthlyBonus: this.calculateLeaderboardBonus(index),
      }));

    return entries;
  }

  /**
   * Calculate leaderboard bonus points
   */
  private calculateLeaderboardBonus(rank: number): number {
    if (rank === 0) return 100; // 1st place
    if (rank === 1) return 75;  // 2nd place
    if (rank === 2) return 50;  // 3rd place
    if (rank < 10) return 25;   // 4-10 place
    return 0;
  }

  /**
   * Get user sticker collections
   */
  getUserCollections(userId: string): StickerCollection[] {
    return this.collections.get(userId) || [];
  }

  /**
   * Update user collection progress
   */
  updateCollectionProgress(
    userId: string,
    tierName: string,
    collectedCount: number,
    totalCount: number
  ): void {
    if (!this.collections.has(userId)) {
      this.collections.set(userId, []);
    }

    const collections = this.collections.get(userId)!;
    let collection = collections.find(c => c.tierName === tierName);

    if (!collection) {
      collection = {
        userId,
        tierName,
        totalStickersInTier: totalCount,
        collectedStickers: 0,
        percentageComplete: 0,
        isComplete: false,
      };
      collections.push(collection);
    }

    collection.collectedStickers = collectedCount;
    collection.percentageComplete = Math.round((collectedCount / totalCount) * 100);
    collection.isComplete = collectedCount === totalCount;

    if (collection.isComplete && !collection.completedDate) {
      collection.completedDate = new Date();
      collection.badge = `${tierName}_complete`;
    }
  }

  /**
   * Get recent usage events for a user
   */
  getRecentUsageEvents(userId: string, limit: number = 10): StickerUsageEvent[] {
    return this.usageEvents
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get total sticker usage statistics
   */
  getGlobalStatistics() {
    const totalStickersUsed = this.usageEvents.reduce((sum, e) => sum + e.stickerCount, 0);
    const totalPointsEarned = this.usageEvents.reduce((sum, e) => sum + e.pointsEarned, 0);
    const totalTrades = this.trades.filter(t => t.status === 'completed').length;
    const totalCollectionsCompleted = Array.from(this.userUsageStats.values())
      .reduce((sum, stats) => sum + stats.collectionCompletions.length, 0);

    return {
      totalStickersUsed,
      totalPointsEarned,
      totalTrades,
      totalCollectionsCompleted,
      uniqueUsers: this.userUsageStats.size,
    };
  }

  /**
   * Update user statistics
   */
  private updateUserStats(userId: string, event: StickerUsageEvent): void {
    if (!this.userUsageStats.has(userId)) {
      this.userUsageStats.set(userId, {
        userId,
        totalStickersUsed: 0,
        totalPointsFromStickers: 0,
        usageEvents: [],
        monthlyUsageCount: 0,
        collectionCompletions: [],
      });
    }

    const stats = this.userUsageStats.get(userId)!;
    stats.totalStickersUsed += event.stickerCount;
    stats.totalPointsFromStickers += event.pointsEarned;
    stats.usageEvents.push(event);
    stats.monthlyUsageCount += 1;
  }
}

// Export singleton instance
export const stickerUsageService = new StickerUsageService();

export default stickerUsageService;
