/**
 * Affiliate Referral Service
 * Manages affiliate program for UR platform
 * - $5 bonus per creator after 5th referral
 * - Payment only after creator's promotional period ends
 * - Payment only after creator's 4th transaction (when UR starts charging)
 */

export interface AffiliateUser {
  userId: string;
  username: string;
  email: string;
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number; // Referrals after 5th (eligible for payment)
  totalEarnings: number;
  pendingEarnings: number; // Earnings waiting for promo period to end
  paidEarnings: number;
  createdAt: Date;
  lastReferralAt?: Date;
}

export interface ReferralRecord {
  referralId: string;
  affiliateUserId: string;
  referredCreatorId: string;
  referredCreatorName: string;
  referralCode: string;
  referralDate: Date;
  referralNumber: number; // 1st, 2nd, 3rd, etc.
  isQualified: boolean; // True if referral number > 5
  status: 'pending' | 'promo_active' | 'eligible_for_payment' | 'paid' | 'cancelled';
  bonusAmount: number; // $5 if qualified
  paymentDate?: Date;
  notes: string;
}

export interface CreatorPromoStatus {
  creatorId: string;
  affiliateUserId: string;
  referralId: string;
  promoStartDate: Date;
  promoEndDate: Date; // 24 hours after start
  promoActive: boolean;
  freeTransactionsRemaining: number; // 0-3
  totalTransactions: number;
  urStartsChargingAt: number; // 4th transaction
  urHasStartedCharging: boolean;
  firstChargeableTransactionDate?: Date;
}

class AffiliateReferralService {
  private affiliateUsers: Map<string, AffiliateUser> = new Map();
  private referralRecords: ReferralRecord[] = [];
  private creatorPromoStatus: Map<string, CreatorPromoStatus> = new Map();
  private referralCodeMap: Map<string, string> = new Map(); // referralCode -> userId

  /**
   * Create new affiliate user
   */
  createAffiliateUser(userId: string, username: string, email: string): AffiliateUser {
    const referralCode = this.generateReferralCode(userId);

    const affiliateUser: AffiliateUser = {
      userId,
      username,
      email,
      referralCode,
      totalReferrals: 0,
      qualifiedReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      createdAt: new Date(),
    };

    this.affiliateUsers.set(userId, affiliateUser);
    this.referralCodeMap.set(referralCode, userId);

    return affiliateUser;
  }

  /**
   * Generate unique referral code
   */
  private generateReferralCode(userId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REF_${userId.substr(0, 3)}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Register creator referral
   */
  registerCreatorReferral(affiliateUserId: string, creatorId: string, creatorName: string, referralCode: string): ReferralRecord {
    const affiliateUser = this.affiliateUsers.get(affiliateUserId);

    if (!affiliateUser) {
      throw new Error(`Affiliate user not found: ${affiliateUserId}`);
    }

    if (affiliateUser.referralCode !== referralCode) {
      throw new Error(`Invalid referral code for user: ${affiliateUserId}`);
    }

    const referralNumber = affiliateUser.totalReferrals + 1;
    const isQualified = referralNumber > 5;

    const referralRecord: ReferralRecord = {
      referralId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateUserId,
      referredCreatorId: creatorId,
      referredCreatorName: creatorName,
      referralCode,
      referralDate: new Date(),
      referralNumber,
      isQualified,
      status: 'pending',
      bonusAmount: isQualified ? 5 : 0,
      notes: `Referral #${referralNumber} - ${isQualified ? 'Qualified for $5 bonus' : 'Not yet qualified (need 5+ referrals)'}`,
    };

    // Update affiliate user
    affiliateUser.totalReferrals = referralNumber;
    if (isQualified) {
      affiliateUser.qualifiedReferrals++;
      affiliateUser.pendingEarnings += 5;
    }
    affiliateUser.lastReferralAt = new Date();

    // Store referral record
    this.referralRecords.push(referralRecord);

    // Initialize creator promo status
    this.initializeCreatorPromoStatus(creatorId, affiliateUserId, referralRecord.referralId);

    return referralRecord;
  }

  /**
   * Initialize creator promo status (24 hours free + 3 free transactions)
   */
  private initializeCreatorPromoStatus(creatorId: string, affiliateUserId: string, referralId: string): void {
    const promoStartDate = new Date();
    const promoEndDate = new Date(promoStartDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

    const promoStatus: CreatorPromoStatus = {
      creatorId,
      affiliateUserId,
      referralId,
      promoStartDate,
      promoEndDate,
      promoActive: true,
      freeTransactionsRemaining: 3,
      totalTransactions: 0,
      urStartsChargingAt: 4,
      urHasStartedCharging: false,
    };

    this.creatorPromoStatus.set(creatorId, promoStatus);
  }

  /**
   * Track creator transaction
   */
  trackCreatorTransaction(creatorId: string, transactionAmount: number): { isChargeable: boolean; urCut: number; creatorEarnings: number } {
    const promoStatus = this.creatorPromoStatus.get(creatorId);

    if (!promoStatus) {
      throw new Error(`Creator promo status not found: ${creatorId}`);
    }

    promoStatus.totalTransactions++;

    // Check if promo period has ended
    const now = new Date();
    if (now > promoStatus.promoEndDate) {
      promoStatus.promoActive = false;
    }

    // Determine if transaction is chargeable
    let isChargeable = false;
    let urCut = 0;
    let creatorEarnings = transactionAmount;

    if (promoStatus.promoActive && promoStatus.freeTransactionsRemaining > 0) {
      // Free transaction during promo period
      isChargeable = false;
      promoStatus.freeTransactionsRemaining--;
      creatorEarnings = transactionAmount;
    } else if (!promoStatus.promoActive || promoStatus.totalTransactions > 3) {
      // Chargeable transaction (after promo or after 3 free transactions)
      isChargeable = true;
      urCut = transactionAmount * 0.15; // 15% cut for UR
      creatorEarnings = transactionAmount - urCut;

      if (!promoStatus.urHasStartedCharging) {
        promoStatus.urHasStartedCharging = true;
        promoStatus.firstChargeableTransactionDate = new Date();

        // Now affiliate can be paid
        this.makeAffiliatePaymentEligible(promoStatus.affiliateUserId, promoStatus.referralId);
      }
    }

    return {
      isChargeable,
      urCut,
      creatorEarnings,
    };
  }

  /**
   * Make affiliate payment eligible (after creator's 4th transaction)
   */
  private makeAffiliatePaymentEligible(affiliateUserId: string, referralId: string): void {
    const referralRecord = this.referralRecords.find(r => r.referralId === referralId);

    if (referralRecord && referralRecord.isQualified) {
      referralRecord.status = 'eligible_for_payment';

      // Update affiliate user
      const affiliateUser = this.affiliateUsers.get(affiliateUserId);
      if (affiliateUser) {
        // Move from pending to eligible (will be paid later)
        // Keep in pendingEarnings until actually paid
      }
    }
  }

  /**
   * Process affiliate payment
   */
  processAffiliatePayment(affiliateUserId: string, referralId: string): { success: boolean; amount: number; message: string } {
    const referralRecord = this.referralRecords.find(r => r.referralId === referralId);

    if (!referralRecord) {
      return {
        success: false,
        amount: 0,
        message: 'Referral record not found',
      };
    }

    if (referralRecord.status !== 'eligible_for_payment') {
      return {
        success: false,
        amount: 0,
        message: `Cannot pay referral with status: ${referralRecord.status}`,
      };
    }

    // Process payment
    referralRecord.status = 'paid';
    referralRecord.paymentDate = new Date();

    const affiliateUser = this.affiliateUsers.get(affiliateUserId);
    if (affiliateUser) {
      affiliateUser.pendingEarnings -= referralRecord.bonusAmount;
      affiliateUser.paidEarnings += referralRecord.bonusAmount;
      affiliateUser.totalEarnings += referralRecord.bonusAmount;
    }

    return {
      success: true,
      amount: referralRecord.bonusAmount,
      message: `Affiliate payment of $${referralRecord.bonusAmount} processed successfully`,
    };
  }

  /**
   * Get affiliate user by ID
   */
  getAffiliateUser(userId: string): AffiliateUser | undefined {
    return this.affiliateUsers.get(userId);
  }

  /**
   * Get affiliate user by referral code
   */
  getAffiliateUserByCode(referralCode: string): AffiliateUser | undefined {
    const userId = this.referralCodeMap.get(referralCode);
    return userId ? this.affiliateUsers.get(userId) : undefined;
  }

  /**
   * Get referral records for affiliate
   */
  getAffiliateReferrals(affiliateUserId: string): ReferralRecord[] {
    return this.referralRecords.filter(r => r.affiliateUserId === affiliateUserId);
  }

  /**
   * Get referral record by ID
   */
  getReferralRecord(referralId: string): ReferralRecord | undefined {
    return this.referralRecords.find(r => r.referralId === referralId);
  }

  /**
   * Get creator promo status
   */
  getCreatorPromoStatus(creatorId: string): CreatorPromoStatus | undefined {
    return this.creatorPromoStatus.get(creatorId);
  }

  /**
   * Get affiliate earnings summary
   */
  getAffiliateEarningsSummary(affiliateUserId: string): {
    totalReferrals: number;
    qualifiedReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    eligibleForPayment: number;
  } {
    const affiliateUser = this.affiliateUsers.get(affiliateUserId);

    if (!affiliateUser) {
      return {
        totalReferrals: 0,
        qualifiedReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        eligibleForPayment: 0,
      };
    }

    const referrals = this.getAffiliateReferrals(affiliateUserId);
    const eligibleForPayment = referrals.filter(r => r.status === 'eligible_for_payment').length;

    return {
      totalReferrals: affiliateUser.totalReferrals,
      qualifiedReferrals: affiliateUser.qualifiedReferrals,
      totalEarnings: affiliateUser.totalEarnings,
      pendingEarnings: affiliateUser.pendingEarnings,
      paidEarnings: affiliateUser.paidEarnings,
      eligibleForPayment,
    };
  }

  /**
   * Get all referrals in system
   */
  getAllReferrals(): ReferralRecord[] {
    return [...this.referralRecords];
  }

  /**
   * Get referrals by status
   */
  getReferralsByStatus(status: string): ReferralRecord[] {
    return this.referralRecords.filter(r => r.status === status);
  }

  /**
   * Get affiliate statistics
   */
  getAffiliateStatistics(): {
    totalAffiliates: number;
    totalReferrals: number;
    totalQualifiedReferrals: number;
    totalPendingEarnings: number;
    totalPaidEarnings: number;
    averageEarningsPerAffiliate: number;
  } {
    const affiliates = Array.from(this.affiliateUsers.values());
    const totalAffiliates = affiliates.length;
    const totalReferrals = affiliates.reduce((sum, a) => sum + a.totalReferrals, 0);
    const totalQualifiedReferrals = affiliates.reduce((sum, a) => sum + a.qualifiedReferrals, 0);
    const totalPendingEarnings = affiliates.reduce((sum, a) => sum + a.pendingEarnings, 0);
    const totalPaidEarnings = affiliates.reduce((sum, a) => sum + a.paidEarnings, 0);
    const averageEarningsPerAffiliate = totalAffiliates > 0 ? totalPaidEarnings / totalAffiliates : 0;

    return {
      totalAffiliates,
      totalReferrals,
      totalQualifiedReferrals,
      totalPendingEarnings,
      totalPaidEarnings,
      averageEarningsPerAffiliate: Math.round(averageEarningsPerAffiliate * 100) / 100,
    };
  }

  /**
   * Validate referral eligibility
   */
  validateReferralEligibility(affiliateUserId: string): { canRefer: boolean; reason: string } {
    const affiliateUser = this.affiliateUsers.get(affiliateUserId);

    if (!affiliateUser) {
      return {
        canRefer: false,
        reason: 'Affiliate user not found',
      };
    }

    return {
      canRefer: true,
      reason: 'User can refer creators',
    };
  }

  /**
   * Generate affiliate dashboard data
   */
  generateAffiliateDashboard(affiliateUserId: string): {
    user: AffiliateUser | undefined;
    earnings: any;
    referrals: ReferralRecord[];
    statistics: any;
  } {
    const user = this.getAffiliateUser(affiliateUserId);
    const earnings = this.getAffiliateEarningsSummary(affiliateUserId);
    const referrals = this.getAffiliateReferrals(affiliateUserId);
    const statistics = this.getAffiliateStatistics();

    return {
      user,
      earnings,
      referrals,
      statistics,
    };
  }
}

export const affiliateReferralService = new AffiliateReferralService();
