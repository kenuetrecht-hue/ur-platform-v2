/**
 * Loyalty Points & Sticker System Tests
 * Comprehensive test suite for loyalty earning, usage, and sticker mechanics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import loyaltyRules, {
  calculatePointsEarned,
  calculatePointUsageCost,
  getMonthlyPointsCap,
  getDailyLoginBonus,
  getStickerPackDetails,
  calculateStickerRewards,
  canEarnPoints,
  getPointsExpiringWarning,
} from '../lib/loyalty-rules';
import { stickerUsageService } from '../lib/sticker-usage';

describe('Loyalty Points System', () => {
  describe('Point Earning Rules', () => {
    it('should calculate daily login bonus based on tier', () => {
      expect(calculatePointsEarned('daily_login', 0, 'Bronze')).toBe(5);
      expect(calculatePointsEarned('daily_login', 0, 'Silver')).toBe(6); // 5 * 1.2
      expect(calculatePointsEarned('daily_login', 0, 'Gold')).toBe(7); // 5 * 1.5 (rounded)
      expect(calculatePointsEarned('daily_login', 0, 'Platinum')).toBe(10); // 5 * 2.0
    });

    it('should calculate follow creator points based on tier', () => {
      expect(calculatePointsEarned('follow_creator', 0, 'Bronze')).toBe(10);
      expect(calculatePointsEarned('follow_creator', 0, 'Silver')).toBe(11); // 10 * 1.1
      expect(calculatePointsEarned('follow_creator', 0, 'Gold')).toBe(12); // 10 * 1.2
      expect(calculatePointsEarned('follow_creator', 0, 'Platinum')).toBe(15); // 10 * 1.5
    });

    it('should calculate tip points (1 point per $1)', () => {
      expect(calculatePointsEarned('tip_creator', 10, 'Bronze')).toBe(10);
      expect(calculatePointsEarned('tip_creator', 10, 'Silver')).toBe(11); // 10 * 1.1
      expect(calculatePointsEarned('tip_creator', 50, 'Platinum')).toBe(75); // 50 * 1.5
    });

    it('should calculate sticker purchase points', () => {
      expect(calculatePointsEarned('sticker_purchase', 10, 'Bronze')).toBe(10);
      expect(calculatePointsEarned('sticker_purchase', 10, 'Silver')).toBe(11); // 10 * 1.15
      expect(calculatePointsEarned('sticker_purchase', 25, 'Platinum')).toBe(37); // 25 * 1.5
    });

    it('should award referral bonus', () => {
      expect(calculatePointsEarned('referral', 0, 'Bronze')).toBe(50);
      expect(calculatePointsEarned('referral', 0, 'Platinum')).toBe(50); // No multiplier
    });

    it('should award login streak bonus', () => {
      expect(calculatePointsEarned('login_streak', 0, 'Bronze')).toBe(5);
      expect(calculatePointsEarned('login_streak', 0, 'Platinum')).toBe(5); // No multiplier
    });

    it('should award first purchase bonus', () => {
      expect(calculatePointsEarned('first_purchase', 0, 'Bronze')).toBe(25);
    });

    it('should award sticker usage points', () => {
      expect(calculatePointsEarned('sticker_usage', 0, 'Bronze')).toBe(1);
      expect(calculatePointsEarned('sticker_usage', 0, 'Platinum')).toBe(1);
    });

    it('should award sticker reaction points', () => {
      expect(calculatePointsEarned('sticker_reaction', 0, 'Bronze')).toBe(2);
    });

    it('should award sticker gift points', () => {
      expect(calculatePointsEarned('sticker_gift', 0, 'Bronze')).toBe(5);
      expect(calculatePointsEarned('sticker_gift', 0, 'Platinum')).toBe(7); // 5 * 1.5
    });

    it('should award collection completion bonus', () => {
      expect(calculatePointsEarned('collection_complete', 0, 'Bronze')).toBe(50);
    });

    it('should award leaderboard bonus', () => {
      expect(calculatePointsEarned('leaderboard_bonus', 0, 'Bronze')).toBe(100);
    });

    it('should award sticker trade points', () => {
      expect(calculatePointsEarned('sticker_trade', 0, 'Bronze')).toBe(3);
    });
  });

  describe('Point Usage Rules', () => {
    it('should calculate sticker pack redemption cost', () => {
      expect(calculatePointUsageCost('sticker_pack_purchase', 'Bronze')).toBe(100);
      expect(calculatePointUsageCost('sticker_pack_purchase', 'Silver')).toBe(90); // 100 * 0.9
      expect(calculatePointUsageCost('sticker_pack_purchase', 'Gold')).toBe(85); // 100 * 0.85
      expect(calculatePointUsageCost('sticker_pack_purchase', 'Platinum')).toBe(75); // 100 * 0.75
    });

    it('should calculate premium feature cost', () => {
      expect(calculatePointUsageCost('premium_feature', 'Bronze')).toBe(50);
    });

    it('should calculate tip boost cost', () => {
      expect(calculatePointUsageCost('tip_boost', 'Bronze')).toBe(25);
    });

    it('should calculate priority message cost', () => {
      expect(calculatePointUsageCost('priority_message', 'Bronze')).toBe(10);
    });

    it('should calculate exclusive content cost', () => {
      expect(calculatePointUsageCost('exclusive_content', 'Bronze')).toBe(75);
    });

    it('should calculate tier boost cost', () => {
      expect(calculatePointUsageCost('tier_boost', 'Bronze')).toBe(100);
    });

    it('should calculate ad-free cost', () => {
      expect(calculatePointUsageCost('ad_free', 'Bronze')).toBe(150);
    });
  });

  describe('Tier System', () => {
    it('should return correct daily bonus for each tier', () => {
      expect(getDailyLoginBonus('Bronze')).toBe(5);
      expect(getDailyLoginBonus('Silver')).toBe(10);
      expect(getDailyLoginBonus('Gold')).toBe(15);
      expect(getDailyLoginBonus('Platinum')).toBe(25);
    });

    it('should return correct monthly cap for each tier', () => {
      expect(getMonthlyPointsCap('Bronze')).toBe(500);
      expect(getMonthlyPointsCap('Silver')).toBe(500);
      expect(getMonthlyPointsCap('Gold')).toBe(500);
      expect(getMonthlyPointsCap('Platinum')).toBe(750);
    });
  });

  describe('Point Validation', () => {
    it('should validate monthly point cap', () => {
      expect(canEarnPoints(450, 50, 'Bronze')).toBe(true);
      expect(canEarnPoints(450, 51, 'Bronze')).toBe(false);
      expect(canEarnPoints(700, 50, 'Platinum')).toBe(true);
      expect(canEarnPoints(700, 51, 'Platinum')).toBe(false);
    });

    it('should prevent earning over monthly cap', () => {
      expect(canEarnPoints(500, 1, 'Bronze')).toBe(false);
      expect(canEarnPoints(750, 1, 'Platinum')).toBe(false);
    });
  });

  describe('Point Expiration', () => {
    it('should warn when points are expiring', () => {
      // Points earned 12 months and 1 day ago (1 day after expiration started)
      // So we need to set it to 11.9 months ago to be within 30 days of expiration
      const almostExpired = new Date();
      almostExpired.setDate(almostExpired.getDate() - 345); // ~11.5 months
      
      const result = getPointsExpiringWarning(almostExpired, 12);
      expect(result.isExpiring).toBe(true);
      expect(result.daysUntilExpiration).toBeLessThanOrEqual(30);
    });

    it('should not warn when points are not expiring soon', () => {
      // Points earned today (12 months until expiration)
      const today = new Date();
      const result = getPointsExpiringWarning(today, 12);
      expect(result.isExpiring).toBe(false);
      expect(result.daysUntilExpiration).toBeGreaterThan(30);
    });
  });
});

describe('Sticker System', () => {
  describe('Sticker Packs', () => {
    it('should return correct sticker pack details', () => {
      const pack1 = getStickerPackDetails('pack_1');
      expect(pack1).toBeDefined();
      expect(pack1?.price).toBe(1);
      expect(pack1?.stickers).toBe(2);
      expect(pack1?.loyaltyPoints).toBe(10);
      expect(pack1?.stars).toBe(1);
    });

    it('should return all sticker pack tiers', () => {
      expect(getStickerPackDetails('pack_1')).toBeDefined();
      expect(getStickerPackDetails('pack_5')).toBeDefined();
      expect(getStickerPackDetails('pack_10')).toBeDefined();
      expect(getStickerPackDetails('pack_15')).toBeDefined();
      expect(getStickerPackDetails('pack_20')).toBeDefined();
      expect(getStickerPackDetails('pack_25')).toBeDefined();
    });

    it('should calculate sticker rewards correctly', () => {
      const rewards10 = calculateStickerRewards('pack_10');
      expect(rewards10).toEqual({
        stickers: 30,
        points: 30,
        stars: 5,
      });

      const rewards25 = calculateStickerRewards('pack_25');
      expect(rewards25).toEqual({
        stickers: 100,
        points: 100,
        stars: 15,
      });
    });

    it('should return null for invalid pack', () => {
      expect(calculateStickerRewards('invalid_pack')).toBeNull();
    });
  });

  describe('Sticker Usage Tracking', () => {
    beforeEach(() => {
      // Reset service state
      stickerUsageService.getGlobalStatistics();
    });

    it('should record chat sticker usage', async () => {
      const result = await stickerUsageService.recordChatUsage('user_1', 'conv_1', 3);
      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(3);
    });

    it('should prevent invalid sticker counts', async () => {
      const result1 = await stickerUsageService.recordChatUsage('user_1', 'conv_1', 0);
      expect(result1.success).toBe(false);

      const result2 = await stickerUsageService.recordChatUsage('user_1', 'conv_1', 6);
      expect(result2.success).toBe(false);
    });

    it('should record sticker reactions', async () => {
      const result = await stickerUsageService.recordReactionUsage('user_1', 'post_1');
      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(2);
    });

    it('should record creator gifts', async () => {
      const result = await stickerUsageService.recordCreatorGift('user_1', 'creator_1', 30);
      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should prevent invalid gift amounts', async () => {
      const result1 = await stickerUsageService.recordCreatorGift('user_1', 'creator_1', 3);
      expect(result1.success).toBe(false);

      const result2 = await stickerUsageService.recordCreatorGift('user_1', 'creator_1', 101);
      expect(result2.success).toBe(false);
    });

    it('should record collection completion', async () => {
      const result = await stickerUsageService.recordCollectionCompletion('user_1', 'tier_1');
      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(50);
    });

    it('should track user statistics', () => {
      const stats = stickerUsageService.getUserStats('user_1');
      expect(stats).toBeDefined();
      expect(stats?.userId).toBe('user_1');
    });

    it('should generate monthly leaderboard', () => {
      const leaderboard = stickerUsageService.getMonthlyLeaderboard(10);
      expect(Array.isArray(leaderboard)).toBe(true);
    });

    it('should calculate global statistics', () => {
      const stats = stickerUsageService.getGlobalStatistics();
      expect(stats.totalStickersUsed).toBeGreaterThanOrEqual(0);
      expect(stats.totalPointsEarned).toBeGreaterThanOrEqual(0);
      expect(stats.totalTrades).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sticker Trading', () => {
    it('should initiate sticker trade', async () => {
      const result = await stickerUsageService.initiateTrade(
        'user_1',
        'user_2',
        ['stk_1', 'stk_2'],
        ['stk_3', 'stk_4']
      );
      expect(result.success).toBe(true);
      expect(result.tradeId).toBeDefined();
    });

    it('should prevent empty trades', async () => {
      const result = await stickerUsageService.initiateTrade(
        'user_1',
        'user_2',
        [],
        ['stk_1']
      );
      expect(result.success).toBe(false);
    });

    it('should accept sticker trade', async () => {
      const initiateResult = await stickerUsageService.initiateTrade(
        'user_1',
        'user_2',
        ['stk_1'],
        ['stk_2']
      );

      if (initiateResult.success && initiateResult.tradeId) {
        const acceptResult = await stickerUsageService.acceptTrade(
          initiateResult.tradeId,
          'user_2'
        );
        expect(acceptResult.success).toBe(true);
        expect(acceptResult.pointsEarned).toBe(3);
      }
    });
  });

  describe('Sticker Collections', () => {
    it('should update collection progress', () => {
      stickerUsageService.updateCollectionProgress('user_1', 'tier_1', 5, 10);
      const collections = stickerUsageService.getUserCollections('user_1');
      
      const collection = collections.find(c => c.tierName === 'tier_1');
      expect(collection).toBeDefined();
      expect(collection?.collectedStickers).toBe(5);
      expect(collection?.percentageComplete).toBe(50);
      expect(collection?.isComplete).toBe(false);
    });

    it('should mark collection as complete', () => {
      stickerUsageService.updateCollectionProgress('user_1', 'tier_2', 10, 10);
      const collections = stickerUsageService.getUserCollections('user_1');
      
      const collection = collections.find(c => c.tierName === 'tier_2');
      expect(collection?.isComplete).toBe(true);
      expect(collection?.completedDate).toBeDefined();
      expect(collection?.badge).toBe('tier_2_complete');
    });
  });
});

describe('Integration Tests', () => {
  it('should calculate complete earning scenario', () => {
    // User at Bronze tier earns from multiple sources
    const dailyLogin = calculatePointsEarned('daily_login', 0, 'Bronze');
    const tip = calculatePointsEarned('tip_creator', 50, 'Bronze');
    const stickerPurchase = calculatePointsEarned('sticker_purchase', 10, 'Bronze');
    
    const totalEarned = dailyLogin + tip + stickerPurchase;
    expect(totalEarned).toBe(5 + 50 + 10);
  });

  it('should calculate tier upgrade scenario', () => {
    // User earns enough to move from Bronze to Silver
    const pointsNeeded = 100;
    const dailyBonus = getDailyLoginBonus('Bronze');
    const daysNeeded = Math.ceil(pointsNeeded / dailyBonus);
    
    expect(daysNeeded).toBe(20); // 100 / 5 = 20 days
  });

  it('should calculate redemption scenario', () => {
    // User at Gold tier redeems sticker pack
    const cost = calculatePointUsageCost('sticker_pack_purchase', 'Gold');
    expect(cost).toBe(85); // 100 * 0.85 (15% discount)
    
    // User has 200 points, can afford 2 packs
    const pointsAvailable = 200;
    const packsAffordable = Math.floor(pointsAvailable / cost);
    expect(packsAffordable).toBe(2);
  });

  it('should track complete sticker purchase flow', async () => {
    // User purchases sticker pack and uses stickers
    const packRewards = calculateStickerRewards('pack_10');
    expect(packRewards?.points).toBe(30);
    expect(packRewards?.stickers).toBe(30);
    expect(packRewards?.stars).toBe(5);
    
    // User uses stickers in chat
    const chatResult = await stickerUsageService.recordChatUsage('user_1', 'conv_1', 5);
    expect(chatResult.pointsEarned).toBe(5);
    
    // Total points from purchase + usage
    const totalPoints = (packRewards?.points || 0) + chatResult.pointsEarned;
    expect(totalPoints).toBe(35);
  });
});
