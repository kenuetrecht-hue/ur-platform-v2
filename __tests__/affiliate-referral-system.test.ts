import { describe, it, expect, beforeEach } from 'vitest';
import { affiliateReferralService } from '@/lib/affiliate-referral-service';

describe('Affiliate Referral System', () => {
  beforeEach(() => {
    // Reset service state
    (affiliateReferralService as any).affiliateUsers.clear();
    (affiliateReferralService as any).referralRecords = [];
    (affiliateReferralService as any).creatorPromoStatus.clear();
    (affiliateReferralService as any).referralCodeMap.clear();
  });

  describe('Affiliate User Management', () => {
    it('should create a new affiliate user', () => {
      const user = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');

      expect(user.userId).toBe('user1');
      expect(user.username).toBe('TestAffiliate');
      expect(user.email).toBe('test@example.com');
      expect(user.referralCode).toBeDefined();
      expect(user.totalReferrals).toBe(0);
      expect(user.qualifiedReferrals).toBe(0);
      expect(user.totalEarnings).toBe(0);
    });

    it('should retrieve affiliate user by ID', () => {
      affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');
      const user = affiliateReferralService.getAffiliateUser('user1');

      expect(user).toBeDefined();
      expect(user?.username).toBe('TestAffiliate');
    });

    it('should retrieve affiliate user by referral code', () => {
      const created = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');
      const user = affiliateReferralService.getAffiliateUserByCode(created.referralCode);

      expect(user).toBeDefined();
      expect(user?.userId).toBe('user1');
    });
  });

  describe('Creator Referral Registration', () => {
    it('should register first referral (not qualified)', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');
      const referral = affiliateReferralService.registerCreatorReferral(
        'user1',
        'creator1',
        'Creator One',
        affiliate.referralCode
      );

      expect(referral.referralNumber).toBe(1);
      expect(referral.isQualified).toBe(false);
      expect(referral.bonusAmount).toBe(0);
      expect(referral.status).toBe('pending');
    });

    it('should register multiple referrals and qualify after 5th', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');

      // Register 5 referrals (not qualified)
      for (let i = 1; i <= 5; i++) {
        const referral = affiliateReferralService.registerCreatorReferral(
          'user1',
          `creator${i}`,
          `Creator ${i}`,
          affiliate.referralCode
        );
        expect(referral.isQualified).toBe(false);
      }

      // 6th referral should be qualified
      const qualifiedReferral = affiliateReferralService.registerCreatorReferral(
        'user1',
        'creator6',
        'Creator Six',
        affiliate.referralCode
      );

      expect(qualifiedReferral.referralNumber).toBe(6);
      expect(qualifiedReferral.isQualified).toBe(true);
      expect(qualifiedReferral.bonusAmount).toBe(5);

      const updatedAffiliate = affiliateReferralService.getAffiliateUser('user1');
      expect(updatedAffiliate?.totalReferrals).toBe(6);
      expect(updatedAffiliate?.qualifiedReferrals).toBe(1);
      expect(updatedAffiliate?.pendingEarnings).toBe(5);
    });

    it('should initialize creator promo status on referral', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');
      affiliateReferralService.registerCreatorReferral('user1', 'creator1', 'Creator One', affiliate.referralCode);

      const promoStatus = affiliateReferralService.getCreatorPromoStatus('creator1');

      expect(promoStatus).toBeDefined();
      expect(promoStatus?.promoActive).toBe(true);
      expect(promoStatus?.freeTransactionsRemaining).toBe(3);
      expect(promoStatus?.totalTransactions).toBe(0);
      expect(promoStatus?.urHasStartedCharging).toBe(false);
    });
  });

  describe('Creator Transaction Tracking', () => {
    beforeEach(() => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');
      affiliateReferralService.registerCreatorReferral('user1', 'creator1', 'Creator One', affiliate.referralCode);
    });

    it('should track free transactions during promo period', () => {
      const result1 = affiliateReferralService.trackCreatorTransaction('creator1', 100);
      expect(result1.isChargeable).toBe(false);
      expect(result1.urCut).toBe(0);
      expect(result1.creatorEarnings).toBe(100);

      const result2 = affiliateReferralService.trackCreatorTransaction('creator1', 100);
      expect(result2.isChargeable).toBe(false);

      const result3 = affiliateReferralService.trackCreatorTransaction('creator1', 100);
      expect(result3.isChargeable).toBe(false);

      const promoStatus = affiliateReferralService.getCreatorPromoStatus('creator1');
      expect(promoStatus?.freeTransactionsRemaining).toBe(0);
    });

    it('should charge 15% on 4th transaction (after 3 free)', () => {
      // First 3 transactions are free
      affiliateReferralService.trackCreatorTransaction('creator1', 100);
      affiliateReferralService.trackCreatorTransaction('creator1', 100);
      affiliateReferralService.trackCreatorTransaction('creator1', 100);

      // 4th transaction should be chargeable
      const result4 = affiliateReferralService.trackCreatorTransaction('creator1', 100);

      expect(result4.isChargeable).toBe(true);
      expect(result4.urCut).toBe(15); // 15% of 100
      expect(result4.creatorEarnings).toBe(85);

      const promoStatus = affiliateReferralService.getCreatorPromoStatus('creator1');
      expect(promoStatus?.urHasStartedCharging).toBe(true);
    });

    it('should make affiliate eligible for payment after creator charges', () => {
      // Register qualified referral
      const affiliate = affiliateReferralService.getAffiliateUser('user1');
      for (let i = 2; i <= 6; i++) {
        affiliateReferralService.registerCreatorReferral('user1', `creator${i}`, `Creator ${i}`, affiliate!.referralCode);
      }

      // Get the 6th referral (qualified)
      const referrals = affiliateReferralService.getAffiliateReferrals('user1');
      const qualifiedReferral = referrals.find(r => r.isQualified);

      // Simulate creator transactions
      const creatorId = qualifiedReferral!.referredCreatorId;
      affiliateReferralService.trackCreatorTransaction(creatorId, 100);
      affiliateReferralService.trackCreatorTransaction(creatorId, 100);
      affiliateReferralService.trackCreatorTransaction(creatorId, 100);
      affiliateReferralService.trackCreatorTransaction(creatorId, 100); // 4th - triggers payment eligibility

      // Check if referral is now eligible for payment
      const updatedReferral = affiliateReferralService.getReferralRecord(qualifiedReferral!.referralId);
      expect(updatedReferral?.status).toBe('eligible_for_payment');
    });
  });

  describe('Affiliate Payment Processing', () => {
    it('should process affiliate payment', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');

      // Create qualified referral
      for (let i = 1; i <= 6; i++) {
        affiliateReferralService.registerCreatorReferral('user1', `creator${i}`, `Creator ${i}`, affiliate.referralCode);
      }

      const referrals = affiliateReferralService.getAffiliateReferrals('user1');
      const qualifiedReferral = referrals.find(r => r.isQualified)!;

      // Simulate creator transactions to make payment eligible
      const creatorId = qualifiedReferral.referredCreatorId;
      for (let i = 0; i < 4; i++) {
        affiliateReferralService.trackCreatorTransaction(creatorId, 100);
      }

      // Process payment
      const paymentResult = affiliateReferralService.processAffiliatePayment('user1', qualifiedReferral.referralId);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.amount).toBe(5);

      // Verify affiliate earnings updated
      const earnings = affiliateReferralService.getAffiliateEarningsSummary('user1');
      expect(earnings.paidEarnings).toBe(5);
      expect(earnings.pendingEarnings).toBe(0);
    });

    it('should not process payment for non-qualified referral', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');
      const referral = affiliateReferralService.registerCreatorReferral('user1', 'creator1', 'Creator One', affiliate.referralCode);

      const paymentResult = affiliateReferralService.processAffiliatePayment('user1', referral.referralId);

      expect(paymentResult.success).toBe(false);
      expect(paymentResult.message).toContain('Cannot pay referral');
    });
  });

  describe('Affiliate Earnings Summary', () => {
    it('should calculate earnings summary correctly', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');

      // Register 6 referrals
      for (let i = 1; i <= 6; i++) {
        affiliateReferralService.registerCreatorReferral('user1', `creator${i}`, `Creator ${i}`, affiliate.referralCode);
      }

      const earnings = affiliateReferralService.getAffiliateEarningsSummary('user1');

      expect(earnings.totalReferrals).toBe(6);
      expect(earnings.qualifiedReferrals).toBe(1);
      expect(earnings.pendingEarnings).toBe(5);
      expect(earnings.paidEarnings).toBe(0);
    });
  });

  describe('Affiliate Statistics', () => {
    it('should generate affiliate statistics', () => {
      const affiliate1 = affiliateReferralService.createAffiliateUser('user1', 'Affiliate1', 'aff1@example.com');
      const affiliate2 = affiliateReferralService.createAffiliateUser('user2', 'Affiliate2', 'aff2@example.com');

      // Register referrals for affiliate1
      for (let i = 1; i <= 6; i++) {
        affiliateReferralService.registerCreatorReferral('user1', `creator${i}`, `Creator ${i}`, affiliate1.referralCode);
      }

      // Register referrals for affiliate2
      for (let i = 7; i <= 12; i++) {
        affiliateReferralService.registerCreatorReferral('user2', `creator${i}`, `Creator ${i}`, affiliate2.referralCode);
      }

      const stats = affiliateReferralService.getAffiliateStatistics();

      expect(stats.totalAffiliates).toBe(2);
      expect(stats.totalReferrals).toBe(12);
      expect(stats.totalQualifiedReferrals).toBe(2);
      expect(stats.totalPendingEarnings).toBe(10);
    });
  });

  describe('Referral Validation', () => {
    it('should validate referral eligibility', () => {
      affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');

      const validation = affiliateReferralService.validateReferralEligibility('user1');

      expect(validation.canRefer).toBe(true);
      expect(validation.reason).toContain('can refer');
    });
  });

  describe('Affiliate Dashboard', () => {
    it('should generate affiliate dashboard data', () => {
      const affiliate = affiliateReferralService.createAffiliateUser('user1', 'TestAffiliate', 'test@example.com');

      for (let i = 1; i <= 6; i++) {
        affiliateReferralService.registerCreatorReferral('user1', `creator${i}`, `Creator ${i}`, affiliate.referralCode);
      }

      const dashboard = affiliateReferralService.generateAffiliateDashboard('user1');

      expect(dashboard.user).toBeDefined();
      expect(dashboard.earnings).toBeDefined();
      expect(dashboard.referrals.length).toBe(6);
      expect(dashboard.statistics).toBeDefined();
    });
  });
});
