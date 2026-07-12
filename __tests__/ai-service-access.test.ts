/**
 * AI Service Access System Tests
 * Tests for 6 stamps or 2,400 LP = 24-hour access to any AI creator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { stampsLoyaltySystem, AI_SERVICE_STAMPS_COST, AI_SERVICE_LOYALTY_POINTS_COST, AI_SERVICE_DURATION_HOURS } from '../lib/stamps-loyalty-system';

describe('AI Service Access System', () => {
  let testUserId: string;
  const aiCreatorId = 'ai-wellness-001';
  const aiCreatorName = 'AI Wellness Coach';

  beforeEach(() => {
    // Use unique user ID for each test to avoid state pollution
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });

  describe('Redeem Stamps for AI Service', () => {
    it('should redeem 6 stamps for 24-hour AI service access', () => {
      // Purchase stamps first
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');

      // Redeem stamps for AI service
      const access = stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);

      expect(access).toBeDefined();
      expect(access.userId).toBe(testUserId);
      expect(access.aiCreatorId).toBe(aiCreatorId);
      expect(access.aiCreatorName).toBe(aiCreatorName);
      expect(access.costInStamps).toBe(AI_SERVICE_STAMPS_COST);
      expect(access.redemptionType).toBe('stamps');
      expect(access.status).toBe('active');
      expect(access.accessStartDate).toBeDefined();
      expect(access.accessEndDate).toBeDefined();
    });

    it('should deduct 6 stamps from user balance', () => {
      // Purchase 10 stamps
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      const userStampsBefore = stampsLoyaltySystem.getUserStamps(testUserId);
      const availableBefore = userStampsBefore.availableStamps;

      // Redeem 6 stamps
      stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);
      const userStampsAfter = stampsLoyaltySystem.getUserStamps(testUserId);

      expect(userStampsAfter.availableStamps).toBe(availableBefore - AI_SERVICE_STAMPS_COST);
      expect(userStampsAfter.stampsUsed).toBe(AI_SERVICE_STAMPS_COST);
    });

    it('should fail if user has insufficient stamps', () => {
      expect(() => {
        stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);
      }).toThrow('Insufficient stamps');
    });

    it('should set correct 24-hour expiration time', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      const beforeTime = new Date();
      const access = stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);
      const afterTime = new Date();

      const expectedEndTime = new Date(beforeTime.getTime() + AI_SERVICE_DURATION_HOURS * 60 * 60 * 1000);
      const actualEndTime = access.accessEndDate;

      // Allow 1 second tolerance for test execution time
      expect(actualEndTime.getTime()).toBeGreaterThanOrEqual(expectedEndTime.getTime() - 1000);
      expect(actualEndTime.getTime()).toBeLessThanOrEqual(expectedEndTime.getTime() + 1000);
    });

    it('should log transaction in loyalty points history', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      const lpBefore = stampsLoyaltySystem.getUserLoyaltyPoints(testUserId);

      stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);
      const lpAfter = stampsLoyaltySystem.getUserLoyaltyPoints(testUserId);

      // Should have a redemption transaction
      const redemptionTxn = lpAfter.pointsHistory.find(t => t.transactionType === 'redemption');
      expect(redemptionTxn).toBeDefined();
      expect(redemptionTxn?.description).toContain(aiCreatorName);
    });
  });

  describe('Redeem Loyalty Points for AI Service', () => {
    it('should redeem 2,400 LP for 24-hour AI service access', () => {
      // Add loyalty points first
      stampsLoyaltySystem.addLoyaltyPoints(testUserId, 2500, 'purchase', 'Test purchase');

      // Redeem LP for AI service
      const access = stampsLoyaltySystem.redeemLoyaltyPointsForAIService(testUserId, aiCreatorId, aiCreatorName);

      expect(access).toBeDefined();
      expect(access.userId).toBe(testUserId);
      expect(access.aiCreatorId).toBe(aiCreatorId);
      expect(access.aiCreatorName).toBe(aiCreatorName);
      expect(access.costInLoyaltyPoints).toBe(AI_SERVICE_LOYALTY_POINTS_COST);
      expect(access.redemptionType).toBe('loyalty_points');
      expect(access.status).toBe('active');
    });

    it('should deduct 2,400 LP from user balance', () => {
      // Add loyalty points
      stampsLoyaltySystem.addLoyaltyPoints(testUserId, 3000, 'purchase', 'Test purchase');
      const lpBefore = stampsLoyaltySystem.getUserLoyaltyPoints(testUserId);
      const availableBefore = lpBefore.availableLoyaltyPoints;

      // Redeem LP
      stampsLoyaltySystem.redeemLoyaltyPointsForAIService(testUserId, aiCreatorId, aiCreatorName);
      const lpAfter = stampsLoyaltySystem.getUserLoyaltyPoints(testUserId);

      expect(lpAfter.availableLoyaltyPoints).toBe(availableBefore - AI_SERVICE_LOYALTY_POINTS_COST);
      expect(lpAfter.pointsUsed).toBe(AI_SERVICE_LOYALTY_POINTS_COST);
    });

    it('should fail if user has insufficient loyalty points', () => {
      expect(() => {
        stampsLoyaltySystem.redeemLoyaltyPointsForAIService(testUserId, aiCreatorId, aiCreatorName);
      }).toThrow('Insufficient loyalty points');
    });

    it('should set correct 24-hour expiration time', () => {
      stampsLoyaltySystem.addLoyaltyPoints(testUserId, 2500, 'purchase', 'Test purchase');
      const beforeTime = new Date();
      const access = stampsLoyaltySystem.redeemLoyaltyPointsForAIService(testUserId, aiCreatorId, aiCreatorName);
      const afterTime = new Date();

      const expectedEndTime = new Date(beforeTime.getTime() + AI_SERVICE_DURATION_HOURS * 60 * 60 * 1000);
      const actualEndTime = access.accessEndDate;

      expect(actualEndTime.getTime()).toBeGreaterThanOrEqual(expectedEndTime.getTime() - 1000);
      expect(actualEndTime.getTime()).toBeLessThanOrEqual(expectedEndTime.getTime() + 1000);
    });
  });

  describe('Get User AI Service Access', () => {
    it('should return current active AI service access', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      const access = stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);

      const currentAccess = stampsLoyaltySystem.getUserAIServiceAccess(testUserId);

      expect(currentAccess).toBeDefined();
      expect(currentAccess?.accessId).toBe(access.accessId);
      expect(currentAccess?.aiCreatorId).toBe(aiCreatorId);
    });

    it('should return null if no active access', () => {
      const currentAccess = stampsLoyaltySystem.getUserAIServiceAccess(testUserId);
      expect(currentAccess).toBeNull();
    });

    it('should return null if access has expired', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      const access = stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);

      // Manually set end date to past
      access.accessEndDate = new Date(Date.now() - 1000);

      const currentAccess = stampsLoyaltySystem.getUserAIServiceAccess(testUserId);
      expect(currentAccess).toBeNull();
    });
  });

  describe('Check Active AI Service Access', () => {
    it('should return true if user has active access', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);

      const hasAccess = stampsLoyaltySystem.hasActiveAIServiceAccess(testUserId);
      expect(hasAccess).toBe(true);
    });

    it('should return true only for specific AI creator if specified', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');
      stampsLoyaltySystem.redeemStampsForAIService(testUserId, aiCreatorId, aiCreatorName);

      const hasAccessForSame = stampsLoyaltySystem.hasActiveAIServiceAccess(testUserId, aiCreatorId);
      expect(hasAccessForSame).toBe(true);

      const hasAccessForDifferent = stampsLoyaltySystem.hasActiveAIServiceAccess(testUserId, 'ai-fitness-001');
      expect(hasAccessForDifferent).toBe(false);
    });

    it('should return false if no active access', () => {
      const hasAccess = stampsLoyaltySystem.hasActiveAIServiceAccess(testUserId);
      expect(hasAccess).toBe(false);
    });
  });

  describe('Get AI Service Access History', () => {
    it('should return all past AI service accesses', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_25', 'stripe');

      // Create two accesses
      stampsLoyaltySystem.redeemStampsForAIService(testUserId, 'ai-wellness-001', 'AI Wellness Coach');
      stampsLoyaltySystem.redeemStampsForAIService(testUserId, 'ai-fitness-001', 'AI Fitness Trainer');

      const history = stampsLoyaltySystem.getUserAIServiceAccessHistory(testUserId);

      expect(history.length).toBe(2);
      expect(history[0].aiCreatorId).toBe('ai-wellness-001');
      expect(history[1].aiCreatorId).toBe('ai-fitness-001');
    });

    it('should return empty array if no history', () => {
      const history = stampsLoyaltySystem.getUserAIServiceAccessHistory(testUserId);
      expect(history.length).toBe(0);
    });
  });

  describe('Multiple AI Creator Access', () => {
    it('should allow user to access different AI creators sequentially', () => {
      stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_50', 'stripe');

      // Access first AI creator
      const access1 = stampsLoyaltySystem.redeemStampsForAIService(testUserId, 'ai-wellness-001', 'AI Wellness Coach');
      expect(access1.aiCreatorId).toBe('ai-wellness-001');

      // Access second AI creator
      const access2 = stampsLoyaltySystem.redeemStampsForAIService(testUserId, 'ai-fitness-001', 'AI Fitness Trainer');
      expect(access2.aiCreatorId).toBe('ai-fitness-001');

      // Current access should be the second one
      const currentAccess = stampsLoyaltySystem.getUserAIServiceAccess(testUserId);
      expect(currentAccess?.aiCreatorId).toBe('ai-fitness-001');

      // History should have both
      const history = stampsLoyaltySystem.getUserAIServiceAccessHistory(testUserId);
      expect(history.length).toBe(2);
    });
  });

  describe('Pricing Validation', () => {
    it('should enforce $4.99 minimum for stamp packages', () => {
      const packages = stampsLoyaltySystem.getStampPackages();
      const minPackage = packages.reduce((min, pkg) => pkg.price < min.price ? pkg : min);

      expect(minPackage.price).toBe(4.99);
    });

    it('should verify 6 stamps cost constant', () => {
      expect(AI_SERVICE_STAMPS_COST).toBe(6);
    });

    it('should verify 2,400 LP cost constant', () => {
      expect(AI_SERVICE_LOYALTY_POINTS_COST).toBe(2400);
    });

    it('should verify 24-hour duration constant', () => {
      expect(AI_SERVICE_DURATION_HOURS).toBe(24);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should integrate with stamp purchase system', () => {
      const purchase = stampsLoyaltySystem.purchaseStamps(testUserId, 'pkg_10', 'stripe');

      expect(purchase.stampsAmount).toBe(10);
      expect(purchase.price).toBe(4.99);

      const userStamps = stampsLoyaltySystem.getUserStamps(testUserId);
      expect(userStamps.totalStamps).toBeGreaterThanOrEqual(10);
      expect(userStamps.availableStamps).toBeGreaterThanOrEqual(10);
    });

    it('should integrate with loyalty points system', () => {
      const addedPoints = 2500;
      stampsLoyaltySystem.addLoyaltyPoints(testUserId, addedPoints, 'purchase', 'Test');
      const lp = stampsLoyaltySystem.getUserLoyaltyPoints(testUserId);

      expect(lp.availableLoyaltyPoints).toBeGreaterThanOrEqual(addedPoints);

      const lpBefore = lp.availableLoyaltyPoints;
      stampsLoyaltySystem.redeemLoyaltyPointsForAIService(testUserId, aiCreatorId, aiCreatorName);
      const lpAfter = stampsLoyaltySystem.getUserLoyaltyPoints(testUserId);

      expect(lpAfter.availableLoyaltyPoints).toBe(lpBefore - AI_SERVICE_LOYALTY_POINTS_COST);
    });
  });
});
