/**
 * Stamps & Loyalty Points System
 * Manages in-app currency, loyalty rewards, and gamification
 */

export interface StampPackage {
  packageId: string;
  stampsAmount: number;
  price: number; // USD
  loyaltyPointsBonus: number;
  description: string;
}

export interface UserStamps {
  userId: string;
  totalStamps: number;
  stampsUsed: number;
  availableStamps: number;
  lastPurchaseDate?: Date;
  purchaseHistory: StampPurchase[];
}

export interface StampPurchase {
  purchaseId: string;
  userId: string;
  packageId: string;
  stampsAmount: number;
  price: number;
  loyaltyPointsEarned: number;
  purchaseDate: Date;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface UserLoyaltyPoints {
  userId: string;
  totalLoyaltyPoints: number;
  availableLoyaltyPoints: number;
  pointsUsed: number;
  pointsExpired: number;
  lastUpdated: Date;
  pointsHistory: LoyaltyPointsTransaction[];
}

export interface LoyaltyPointsTransaction {
  transactionId: string;
  userId: string;
  pointsAmount: number;
  transactionType: 'purchase' | 'daily_bonus' | 'subscription' | 'drawing_win' | 'drawing_entry' | 'redemption' | 'expiration';
  description: string;
  relatedId?: string; // purchaseId, drawingId, etc.
  transactionDate: Date;
  expirationDate?: Date;
}

export interface DailyBonus {
  bonusId: string;
  userId: string;
  bonusDate: Date;
  stampsBonus: number;
  loyaltyPointsBonus: number;
  revealTicketReward?: RevealTicketReward;
  claimed: boolean;
  claimedAt?: Date;
}

export interface RevealTicketReward {
  ticketId: string;
  loyaltyPointsReward: number;
  usageDuration: string; // "1 day at use", "2 week at use", etc.
  revealedAt?: Date;
}

export interface SubscriptionLoyaltyReward {
  rewardId: string;
  subscriptionType: 'day' | 'week' | 'month';
  loyaltyPointsReward: number;
  description: string;
}

export interface WeeklyDrawing {
  drawingId: string;
  drawingDate: Date;
  entryFee: number; // 100 LP
  participants: string[]; // userIds
  winner?: string;
  jackpot: number;
  prizePool: number;
  status: 'open' | 'closed' | 'drawn' | 'completed';
  createdAt: Date;
  drawnAt?: Date;
}

export interface DrawingEntry {
  entryId: string;
  drawingId: string;
  userId: string;
  entryDate: Date;
  entryFeeAmount: number;
  status: 'active' | 'won' | 'lost';
}

export interface AIServiceAccess {
  accessId: string;
  userId: string;
  aiCreatorId: string;
  aiCreatorName: string;
  accessStartDate: Date;
  accessEndDate: Date;
  costInStamps?: number;
  costInLoyaltyPoints?: number;
  redemptionType: 'stamps' | 'loyalty_points';
  status: 'active' | 'expired';
}

export interface UserAIServiceAccess {
  userId: string;
  currentAccess?: AIServiceAccess;
  accessHistory: AIServiceAccess[];
}

class StampsLoyaltySystem {
  private stampPackages: Map<string, StampPackage> = new Map();
  private userStamps: Map<string, UserStamps> = new Map();
  private userLoyaltyPoints: Map<string, UserLoyaltyPoints> = new Map();
  private dailyBonuses: Map<string, DailyBonus> = new Map();
  private subscriptionRewards: Map<string, SubscriptionLoyaltyReward> = new Map();
  private weeklyDrawings: WeeklyDrawing[] = [];
  private drawingEntries: DrawingEntry[] = [];
  private userAIServiceAccess: Map<string, UserAIServiceAccess> = new Map();
  private aiServiceAccesses: AIServiceAccess[] = [];

  // AI Service Access Constants
  private readonly AI_SERVICE_STAMPS_COST = 6;
  private readonly AI_SERVICE_LOYALTY_POINTS_COST = 2400;
  private readonly AI_SERVICE_DURATION_HOURS = 24;

  constructor() {
    this.initializeStampPackages();
    this.initializeSubscriptionRewards();
  }

  /**
   * Initialize stamp packages
   */
  private initializeStampPackages(): void {
    const packages: StampPackage[] = [
      { packageId: 'pkg_10', stampsAmount: 10, price: 4.99, loyaltyPointsBonus: 100, description: '10 Stamps' },
      { packageId: 'pkg_25', stampsAmount: 25, price: 9.99, loyaltyPointsBonus: 200, description: '25 Stamps' },
      { packageId: 'pkg_50', stampsAmount: 50, price: 14.99, loyaltyPointsBonus: 300, description: '50 Stamps' },
      { packageId: 'pkg_100', stampsAmount: 100, price: 19.99, loyaltyPointsBonus: 400, description: '100 Stamps' },
    ];

    for (const pkg of packages) {
      this.stampPackages.set(pkg.packageId, pkg);
    }
  }

  /**
   * Initialize subscription loyalty rewards
   */
  private initializeSubscriptionRewards(): void {
    const rewards: SubscriptionLoyaltyReward[] = [
      { rewardId: 'sub_day', subscriptionType: 'day', loyaltyPointsReward: 25, description: 'Daily Subscription' },
      { rewardId: 'sub_week', subscriptionType: 'week', loyaltyPointsReward: 100, description: 'Weekly Subscription' },
      { rewardId: 'sub_month', subscriptionType: 'month', loyaltyPointsReward: 250, description: 'Monthly Subscription' },
    ];

    for (const reward of rewards) {
      this.subscriptionRewards.set(reward.rewardId, reward);
    }
  }

  /**
   * Get available stamp packages
   */
  getStampPackages(): StampPackage[] {
    return Array.from(this.stampPackages.values());
  }

  /**
   * Purchase stamps
   */
  purchaseStamps(userId: string, packageId: string, paymentMethod: string): StampPurchase {
    const pkg = this.stampPackages.get(packageId);

    if (!pkg) {
      throw new Error(`Stamp package not found: ${packageId}`);
    }

    // Initialize user stamps if needed
    if (!this.userStamps.has(userId)) {
      this.userStamps.set(userId, {
        userId,
        totalStamps: 0,
        stampsUsed: 0,
        availableStamps: 0,
        purchaseHistory: [],
      });
    }

    const purchase: StampPurchase = {
      purchaseId: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      packageId,
      stampsAmount: pkg.stampsAmount,
      price: pkg.price,
      loyaltyPointsEarned: pkg.loyaltyPointsBonus,
      purchaseDate: new Date(),
      paymentMethod,
      status: 'completed',
    };

    // Update user stamps
    const userStamps = this.userStamps.get(userId)!;
    userStamps.totalStamps += pkg.stampsAmount;
    userStamps.availableStamps += pkg.stampsAmount;
    userStamps.lastPurchaseDate = new Date();
    userStamps.purchaseHistory.push(purchase);

    // Add loyalty points
    this.addLoyaltyPoints(userId, pkg.loyaltyPointsBonus, 'purchase', `Purchased ${pkg.stampsAmount} stamps`, purchase.purchaseId);

    return purchase;
  }

  /**
   * Use stamps
   */
  useStamps(userId: string, stampsAmount: number, reason: string): { success: boolean; message: string; remainingStamps: number } {
    const userStamps = this.userStamps.get(userId);

    if (!userStamps) {
      return {
        success: false,
        message: 'User has no stamps',
        remainingStamps: 0,
      };
    }

    if (userStamps.availableStamps < stampsAmount) {
      return {
        success: false,
        message: `Insufficient stamps. Available: ${userStamps.availableStamps}`,
        remainingStamps: userStamps.availableStamps,
      };
    }

    userStamps.availableStamps -= stampsAmount;
    userStamps.stampsUsed += stampsAmount;

    return {
      success: true,
      message: `Used ${stampsAmount} stamps for ${reason}`,
      remainingStamps: userStamps.availableStamps,
    };
  }

  /**
   * Get user stamps
   */
  getUserStamps(userId: string): UserStamps | undefined {
    return this.userStamps.get(userId);
  }

  /**
   * Add loyalty points
   */
  addLoyaltyPoints(userId: string, pointsAmount: number, transactionType: string, description: string, relatedId?: string): LoyaltyPointsTransaction {
    // Initialize user loyalty points if needed
    if (!this.userLoyaltyPoints.has(userId)) {
      this.userLoyaltyPoints.set(userId, {
        userId,
        totalLoyaltyPoints: 0,
        availableLoyaltyPoints: 0,
        pointsUsed: 0,
        pointsExpired: 0,
        lastUpdated: new Date(),
        pointsHistory: [],
      });
    }

    const transaction: LoyaltyPointsTransaction = {
      transactionId: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pointsAmount,
      transactionType: transactionType as any,
      description,
      relatedId,
      transactionDate: new Date(),
    };

    const userLP = this.userLoyaltyPoints.get(userId)!;
    userLP.totalLoyaltyPoints += pointsAmount;
    userLP.availableLoyaltyPoints += pointsAmount;
    userLP.lastUpdated = new Date();
    userLP.pointsHistory.push(transaction);

    return transaction;
  }

  /**
   * Use loyalty points
   */
  useLoyaltyPoints(userId: string, pointsAmount: number, reason: string): { success: boolean; message: string; remainingPoints: number } {
    const userLP = this.userLoyaltyPoints.get(userId);

    if (!userLP) {
      return {
        success: false,
        message: 'User has no loyalty points',
        remainingPoints: 0,
      };
    }

    if (userLP.availableLoyaltyPoints < pointsAmount) {
      return {
        success: false,
        message: `Insufficient loyalty points. Available: ${userLP.availableLoyaltyPoints}`,
        remainingPoints: userLP.availableLoyaltyPoints,
      };
    }

    userLP.availableLoyaltyPoints -= pointsAmount;
    userLP.pointsUsed += pointsAmount;

    const transaction: LoyaltyPointsTransaction = {
      transactionId: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pointsAmount,
      transactionType: 'redemption',
      description: reason,
      transactionDate: new Date(),
    };

    userLP.pointsHistory.push(transaction);

    return {
      success: true,
      message: `Used ${pointsAmount} loyalty points for ${reason}`,
      remainingPoints: userLP.availableLoyaltyPoints,
    };
  }

  /**
   * Get user loyalty points
   */
  getUserLoyaltyPoints(userId: string): UserLoyaltyPoints | undefined {
    return this.userLoyaltyPoints.get(userId);
  }

  /**
   * Claim daily bonus
   */
  claimDailyBonus(userId: string): DailyBonus {
    const today = new Date();
    const bonusId = `bonus_${userId}_${today.toDateString()}`;

    // Check if already claimed today
    if (this.dailyBonuses.has(bonusId)) {
      throw new Error('Daily bonus already claimed today');
    }

    // Generate reveal ticket reward
    const revealTicketOptions = [
      { loyaltyPointsReward: 100, usageDuration: '1 day at use' },
      { loyaltyPointsReward: 200, usageDuration: '2 week at use' },
      { loyaltyPointsReward: 300, usageDuration: '3 week at use' },
      { loyaltyPointsReward: 400, usageDuration: '4 week at use' },
      { loyaltyPointsReward: 500, usageDuration: '5 week at use' },
    ];

    const randomReward = revealTicketOptions[Math.floor(Math.random() * revealTicketOptions.length)];

    const bonus: DailyBonus = {
      bonusId,
      userId,
      bonusDate: today,
      stampsBonus: 0,
      loyaltyPointsBonus: 200, // Daily stamp bonus
      revealTicketReward: {
        ticketId: `ticket_${Date.now()}`,
        loyaltyPointsReward: randomReward.loyaltyPointsReward,
        usageDuration: randomReward.usageDuration,
      },
      claimed: true,
      claimedAt: new Date(),
    };

    this.dailyBonuses.set(bonusId, bonus);

    // Add loyalty points
    this.addLoyaltyPoints(userId, bonus.loyaltyPointsBonus, 'daily_bonus', 'Daily stamp bonus');

    return bonus;
  }

  /**
   * Reveal daily ticket
   */
  revealDailyTicket(userId: string, bonusId: string): { success: boolean; loyaltyPointsReward: number; message: string } {
    const bonus = this.dailyBonuses.get(bonusId);

    if (!bonus) {
      return {
        success: false,
        loyaltyPointsReward: 0,
        message: 'Bonus not found',
      };
    }

    if (bonus.revealTicketReward?.revealedAt) {
      return {
        success: false,
        loyaltyPointsReward: 0,
        message: 'Ticket already revealed',
      };
    }

    const reward = bonus.revealTicketReward!;
    reward.revealedAt = new Date();

    // Add loyalty points from reveal
    this.addLoyaltyPoints(userId, reward.loyaltyPointsReward, 'daily_bonus', `Revealed daily ticket: ${reward.loyaltyPointsReward} LP (${reward.usageDuration})`);

    return {
      success: true,
      loyaltyPointsReward: reward.loyaltyPointsReward,
      message: `Revealed ${reward.loyaltyPointsReward} LP! (${reward.usageDuration})`,
    };
  }

  /**
   * Add subscription loyalty reward
   */
  addSubscriptionReward(userId: string, subscriptionType: 'day' | 'week' | 'month'): LoyaltyPointsTransaction {
    const rewardKey = `sub_${subscriptionType}`;
    const reward = this.subscriptionRewards.get(rewardKey);

    if (!reward) {
      throw new Error(`Subscription reward not found: ${rewardKey}`);
    }

    return this.addLoyaltyPoints(userId, reward.loyaltyPointsReward, 'subscription', `${subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)} subscription reward`);
  }

  /**
   * Create weekly drawing
   */
  createWeeklyDrawing(): WeeklyDrawing {
    const drawing: WeeklyDrawing = {
      drawingId: `drawing_${Date.now()}`,
      drawingDate: new Date(),
      entryFee: 100, // 100 LP
      participants: [],
      jackpot: 0,
      prizePool: 0,
      status: 'open',
      createdAt: new Date(),
    };

    this.weeklyDrawings.push(drawing);

    return drawing;
  }

  /**
   * Enter weekly drawing
   */
  enterWeeklyDrawing(userId: string, drawingId: string): { success: boolean; message: string; remainingPoints: number } {
    const drawing = this.weeklyDrawings.find(d => d.drawingId === drawingId);

    if (!drawing) {
      return {
        success: false,
        message: 'Drawing not found',
        remainingPoints: 0,
      };
    }

    if (drawing.status !== 'open') {
      return {
        success: false,
        message: `Drawing is ${drawing.status}`,
        remainingPoints: 0,
      };
    }

    // Deduct entry fee
    const lpResult = this.useLoyaltyPoints(userId, drawing.entryFee, 'Weekly drawing entry');

    if (!lpResult.success) {
      return {
        success: false,
        message: lpResult.message,
        remainingPoints: lpResult.remainingPoints,
      };
    }

    // Add entry
    const entry: DrawingEntry = {
      entryId: `entry_${Date.now()}`,
      drawingId,
      userId,
      entryDate: new Date(),
      entryFeeAmount: drawing.entryFee,
      status: 'active',
    };

    this.drawingEntries.push(entry);
    drawing.participants.push(userId);
    drawing.prizePool += drawing.entryFee;

    return {
      success: true,
      message: `Entered weekly drawing! Prize pool: ${drawing.prizePool} LP`,
      remainingPoints: lpResult.remainingPoints,
    };
  }

  /**
   * Draw weekly winner
   */
  drawWeeklyWinner(drawingId: string): { success: boolean; winner?: string; prize?: number; message: string } {
    const drawing = this.weeklyDrawings.find(d => d.drawingId === drawingId);

    if (!drawing) {
      return {
        success: false,
        message: 'Drawing not found',
      };
    }

    if (drawing.participants.length === 0) {
      return {
        success: false,
        message: 'No participants in drawing',
      };
    }

    // Select random winner
    const winner = drawing.participants[Math.floor(Math.random() * drawing.participants.length)];
    drawing.winner = winner;
    drawing.jackpot = drawing.prizePool;
    drawing.status = 'drawn';
    drawing.drawnAt = new Date();

    // Add prize to winner
    this.addLoyaltyPoints(winner, drawing.jackpot, 'drawing_win', `Won weekly drawing! Prize: ${drawing.jackpot} LP`);

    // Mark entries
    for (const entry of this.drawingEntries.filter(e => e.drawingId === drawingId)) {
      entry.status = entry.userId === winner ? 'won' : 'lost';
    }

    drawing.status = 'completed';

    return {
      success: true,
      winner,
      prize: drawing.jackpot,
      message: `Winner: ${winner}! Prize: ${drawing.jackpot} LP`,
    };
  }

  /**
   * Get weekly drawing
   */
  getWeeklyDrawing(drawingId: string): WeeklyDrawing | undefined {
    return this.weeklyDrawings.find(d => d.drawingId === drawingId);
  }

  /**
   * Get user's drawing entries
   */
  getUserDrawingEntries(userId: string): DrawingEntry[] {
    return this.drawingEntries.filter(e => e.userId === userId);
  }

  /**
   * Redeem stamps for AI service access (6 stamps = 24-hour access)
   */
  redeemStampsForAIService(userId: string, aiCreatorId: string, aiCreatorName: string): AIServiceAccess {
    const userStamps = this.userStamps.get(userId);
    if (!userStamps || userStamps.availableStamps < this.AI_SERVICE_STAMPS_COST) {
      throw new Error(`Insufficient stamps. Required: ${this.AI_SERVICE_STAMPS_COST}, Available: ${userStamps?.availableStamps || 0}`);
    }

    // Deduct stamps
    userStamps.availableStamps -= this.AI_SERVICE_STAMPS_COST;
    userStamps.stampsUsed += this.AI_SERVICE_STAMPS_COST;

    // Create access record
    const now = new Date();
    const endDate = new Date(now.getTime() + this.AI_SERVICE_DURATION_HOURS * 60 * 60 * 1000);
    const access: AIServiceAccess = {
      accessId: `ai_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      aiCreatorId,
      aiCreatorName,
      accessStartDate: now,
      accessEndDate: endDate,
      costInStamps: this.AI_SERVICE_STAMPS_COST,
      redemptionType: 'stamps',
      status: 'active',
    };

    this.aiServiceAccesses.push(access);
    this.updateUserAIServiceAccess(userId, access);

    // Log transaction
    this.addLoyaltyPoints(userId, 0, 'redemption', `Redeemed ${this.AI_SERVICE_STAMPS_COST} stamps for ${aiCreatorName} AI access`, access.accessId);

    return access;
  }

  /**
   * Redeem loyalty points for AI service access (2,400 LP = 24-hour access)
   */
  redeemLoyaltyPointsForAIService(userId: string, aiCreatorId: string, aiCreatorName: string): AIServiceAccess {
    const userLP = this.userLoyaltyPoints.get(userId);
    if (!userLP || userLP.availableLoyaltyPoints < this.AI_SERVICE_LOYALTY_POINTS_COST) {
      throw new Error(`Insufficient loyalty points. Required: ${this.AI_SERVICE_LOYALTY_POINTS_COST}, Available: ${userLP?.availableLoyaltyPoints || 0}`);
    }

    // Deduct loyalty points
    userLP.availableLoyaltyPoints -= this.AI_SERVICE_LOYALTY_POINTS_COST;
    userLP.pointsUsed += this.AI_SERVICE_LOYALTY_POINTS_COST;

    // Create access record
    const now = new Date();
    const endDate = new Date(now.getTime() + this.AI_SERVICE_DURATION_HOURS * 60 * 60 * 1000);
    const access: AIServiceAccess = {
      accessId: `ai_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      aiCreatorId,
      aiCreatorName,
      accessStartDate: now,
      accessEndDate: endDate,
      costInLoyaltyPoints: this.AI_SERVICE_LOYALTY_POINTS_COST,
      redemptionType: 'loyalty_points',
      status: 'active',
    };

    this.aiServiceAccesses.push(access);
    this.updateUserAIServiceAccess(userId, access);

    // Log transaction
    const transaction: LoyaltyPointsTransaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pointsAmount: -this.AI_SERVICE_LOYALTY_POINTS_COST,
      transactionType: 'redemption',
      description: `Redeemed ${this.AI_SERVICE_LOYALTY_POINTS_COST} LP for ${aiCreatorName} AI access`,
      relatedId: access.accessId,
      transactionDate: new Date(),
    };
    userLP.pointsHistory.push(transaction);

    return access;
  }

  /**
   * Update user AI service access
   */
  private updateUserAIServiceAccess(userId: string, access: AIServiceAccess): void {
    if (!this.userAIServiceAccess.has(userId)) {
      this.userAIServiceAccess.set(userId, {
        userId,
        accessHistory: [],
      });
    }

    const userAccess = this.userAIServiceAccess.get(userId)!;
    userAccess.currentAccess = access;
    userAccess.accessHistory.push(access);
  }

  /**
   * Get current AI service access for user
   */
  getUserAIServiceAccess(userId: string): AIServiceAccess | null {
    const userAccess = this.userAIServiceAccess.get(userId);
    if (!userAccess?.currentAccess) return null;

    // Check if access is still valid
    if (new Date() > userAccess.currentAccess.accessEndDate) {
      userAccess.currentAccess.status = 'expired';
      return null;
    }

    return userAccess.currentAccess;
  }

  /**
   * Get AI service access history for user
   */
  getUserAIServiceAccessHistory(userId: string): AIServiceAccess[] {
    return this.userAIServiceAccess.get(userId)?.accessHistory || [];
  }

  /**
   * Check if user has active AI service access
   */
  hasActiveAIServiceAccess(userId: string, aiCreatorId?: string): boolean {
    const access = this.getUserAIServiceAccess(userId);
    if (!access) return false;
    if (aiCreatorId && access.aiCreatorId !== aiCreatorId) return false;
    return true;
  }

  /**
   * Get system statistics
   */
  getSystemStatistics(): {
    totalStampsIssued: number;
    totalLoyaltyPointsIssued: number;
    totalUsers: number;
    totalWeeklyDrawings: number;
    totalDrawingParticipants: number;
    totalAIServiceAccesses: number;
  } {
    const totalStampsIssued = Array.from(this.userStamps.values()).reduce((sum, u) => sum + u.totalStamps, 0);
    const totalLoyaltyPointsIssued = Array.from(this.userLoyaltyPoints.values()).reduce((sum, u) => sum + u.totalLoyaltyPoints, 0);
    const totalUsers = new Set([...Array.from(this.userStamps.keys()), ...Array.from(this.userLoyaltyPoints.keys())]).size;
    const totalWeeklyDrawings = this.weeklyDrawings.length;
    const totalDrawingParticipants = new Set(this.weeklyDrawings.flatMap(d => d.participants)).size;
    const totalAIServiceAccesses = this.aiServiceAccesses.length;

    return {
      totalStampsIssued,
      totalLoyaltyPointsIssued,
      totalUsers,
      totalWeeklyDrawings,
      totalDrawingParticipants,
      totalAIServiceAccesses,
    };
  }
}

export const stampsLoyaltySystem = new StampsLoyaltySystem();

// Export AI Service constants for use in other modules
export const AI_SERVICE_STAMPS_COST = 6;
export const AI_SERVICE_LOYALTY_POINTS_COST = 2400;
export const AI_SERVICE_DURATION_HOURS = 24;
