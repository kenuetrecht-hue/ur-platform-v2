/**
 * Payment System Service
 * Manages loyalty points, subscriptions, and creator earnings
 */

export type SubscriptionTier = 'free' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TransactionType = 'purchase' | 'earn' | 'spend' | 'refund' | 'bonus';

export interface LoyaltyAccount {
  creatorId: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: Date;
}

export interface Subscription {
  creatorId: string;
  tier: SubscriptionTier;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  autoRenew: boolean;
  price: number;
}

export interface Transaction {
  id: string;
  creatorId: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: Date;
  reference?: string;
}

export interface StampBundle {
  id: string;
  name: string;
  stamps: number;
  price: number;
  discount: number; // percentage
  description: string;
}

export interface CreatorEarnings {
  creatorId: string;
  totalEarnings: number;
  thisMonth: number;
  thisYear: number;
  pendingPayout: number;
  lastPayout: Date | null;
}

export class PaymentSystem {
  private loyaltyAccounts: Map<string, LoyaltyAccount> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private transactions: Transaction[] = [];
  private stampBundles: Map<string, StampBundle> = new Map();
  private earnings: Map<string, CreatorEarnings> = new Map();

  // Pricing configuration
  private readonly POINTS_PER_DOLLAR = 100;
  private readonly SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
    free: 0,
    daily: 4.99,
    weekly: 19.99,
    monthly: 49.99,
    yearly: 399.99,
  };

  constructor() {
    this.initializeDefaultBundles();
  }

  /**
   * Initialize default stamp bundles
   */
  private initializeDefaultBundles(): void {
    this.stampBundles.set('small', {
      id: 'small',
      name: 'Small Bundle',
      stamps: 100,
      price: 9.99,
      discount: 0,
      description: '100 stamps for basic interactions',
    });

    this.stampBundles.set('medium', {
      id: 'medium',
      name: 'Medium Bundle',
      stamps: 500,
      price: 39.99,
      discount: 10,
      description: '500 stamps with 10% discount',
    });

    this.stampBundles.set('large', {
      id: 'large',
      name: 'Large Bundle',
      stamps: 1000,
      price: 69.99,
      discount: 20,
      description: '1000 stamps with 20% discount',
    });

    this.stampBundles.set('mega', {
      id: 'mega',
      name: 'Mega Bundle',
      stamps: 5000,
      price: 299.99,
      discount: 30,
      description: '5000 stamps with 30% discount',
    });
  }

  /**
   * Get or create loyalty account
   */
  getLoyaltyAccount(creatorId: string): LoyaltyAccount {
    if (!this.loyaltyAccounts.has(creatorId)) {
      this.loyaltyAccounts.set(creatorId, {
        creatorId,
        points: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
      });
    }
    return this.loyaltyAccounts.get(creatorId)!;
  }

  /**
   * Add loyalty points
   */
  addPoints(creatorId: string, amount: number, reason: string): boolean {
    const account = this.getLoyaltyAccount(creatorId);
    account.points += amount;
    account.totalEarned += amount;
    account.lastUpdated = new Date();

    this.recordTransaction({
      id: `txn-${Date.now()}`,
      creatorId,
      type: 'earn',
      amount,
      description: reason,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Spend loyalty points
   */
  spendPoints(creatorId: string, amount: number, reason: string): boolean {
    const account = this.getLoyaltyAccount(creatorId);
    if (account.points < amount) return false;

    account.points -= amount;
    account.totalSpent += amount;
    account.lastUpdated = new Date();

    this.recordTransaction({
      id: `txn-${Date.now()}`,
      creatorId,
      type: 'spend',
      amount,
      description: reason,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Subscribe to tier
   */
  subscribe(creatorId: string, tier: SubscriptionTier): Subscription | null {
    if (tier === 'free') {
      return {
        creatorId,
        tier,
        startDate: new Date(),
        isActive: true,
        autoRenew: false,
        price: 0,
      };
    }

    const price = this.SUBSCRIPTION_PRICES[tier];
    const subscription: Subscription = {
      creatorId,
      tier,
      startDate: new Date(),
      endDate: this.calculateEndDate(tier),
      isActive: true,
      autoRenew: true,
      price,
    };

    this.subscriptions.set(`${creatorId}-${tier}`, subscription);

    this.recordTransaction({
      id: `txn-${Date.now()}`,
      creatorId,
      type: 'purchase',
      amount: price,
      description: `Subscription: ${tier}`,
      timestamp: new Date(),
      reference: `${creatorId}-${tier}`,
    });

    return subscription;
  }

  /**
   * Calculate subscription end date
   */
  private calculateEndDate(tier: SubscriptionTier): Date {
    const now = new Date();
    switch (tier) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'yearly':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }

  /**
   * Get active subscription
   */
  getActiveSubscription(creatorId: string): Subscription | null {
    for (const subscription of this.subscriptions.values()) {
      if (
        subscription.creatorId === creatorId &&
        subscription.isActive &&
        subscription.endDate &&
        subscription.endDate > new Date()
      ) {
        return subscription;
      }
    }
    return null;
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(creatorId: string): boolean {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.creatorId === creatorId && subscription.isActive) {
        subscription.isActive = false;
        subscription.autoRenew = false;
        return true;
      }
    }
    return false;
  }

  /**
   * Purchase stamp bundle
   */
  purchaseStampBundle(creatorId: string, bundleId: string): boolean {
    const bundle = this.stampBundles.get(bundleId);
    if (!bundle) return false;

    const account = this.getLoyaltyAccount(creatorId);
    account.points += bundle.stamps;
    account.totalEarned += bundle.stamps;
    account.lastUpdated = new Date();

    this.recordTransaction({
      id: `txn-${Date.now()}`,
      creatorId,
      type: 'purchase',
      amount: bundle.price,
      description: `Stamp Bundle: ${bundle.name}`,
      timestamp: new Date(),
      reference: bundleId,
    });

    return true;
  }

  /**
   * Get stamp bundles
   */
  getStampBundles(): StampBundle[] {
    return Array.from(this.stampBundles.values());
  }

  /**
   * Record transaction
   */
  private recordTransaction(transaction: Transaction): void {
    this.transactions.push(transaction);
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(creatorId: string, limit: number = 50): Transaction[] {
    return this.transactions
      .filter((t) => t.creatorId === creatorId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get creator earnings
   */
  getCreatorEarnings(creatorId: string): CreatorEarnings {
    if (!this.earnings.has(creatorId)) {
      this.earnings.set(creatorId, {
        creatorId,
        totalEarnings: 0,
        thisMonth: 0,
        thisYear: 0,
        pendingPayout: 0,
        lastPayout: null,
      });
    }
    return this.earnings.get(creatorId)!;
  }

  /**
   * Add creator earnings (from content sales, etc.)
   */
  addCreatorEarnings(creatorId: string, amount: number): boolean {
    const earnings = this.getCreatorEarnings(creatorId);
    earnings.totalEarnings += amount;
    earnings.thisMonth += amount;
    earnings.thisYear += amount;
    earnings.pendingPayout += amount;

    this.recordTransaction({
      id: `txn-${Date.now()}`,
      creatorId,
      type: 'earn',
      amount,
      description: 'Creator earnings',
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Process payout
   */
  processPayout(creatorId: string, amount: number): boolean {
    const earnings = this.getCreatorEarnings(creatorId);
    if (earnings.pendingPayout < amount) return false;

    earnings.pendingPayout -= amount;
    earnings.lastPayout = new Date();

    this.recordTransaction({
      id: `txn-${Date.now()}`,
      creatorId,
      type: 'spend',
      amount,
      description: 'Payout processed',
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Check if creator has access to tool
   */
  hasToolAccess(creatorId: string, toolType: string): boolean {
    // First creator has full access
    if (creatorId === 'first-creator-001') return true;

    const subscription = this.getActiveSubscription(creatorId);
    const account = this.getLoyaltyAccount(creatorId);

    // Free tier has limited access
    if (!subscription) {
      return account.points >= 10; // Minimum points for free access
    }

    // Subscription tiers have full access
    return subscription.tier !== 'free';
  }

  /**
   * Charge for tool usage
   */
  chargeForUsage(creatorId: string, toolType: string, cost: number): boolean {
    // First creator is free
    if (creatorId === 'first-creator-001') return true;

    const subscription = this.getActiveSubscription(creatorId);

    // Subscription users don't pay per use
    if (subscription && subscription.tier !== 'free') return true;

    // Free users pay with points
    return this.spendPoints(creatorId, cost, `Tool usage: ${toolType}`);
  }

  /**
   * Get pricing information
   */
  getPricingInfo(): {
    subscriptions: Record<SubscriptionTier, number>;
    bundles: StampBundle[];
    pointsPerDollar: number;
  } {
    return {
      subscriptions: this.SUBSCRIPTION_PRICES,
      bundles: this.getStampBundles(),
      pointsPerDollar: this.POINTS_PER_DOLLAR,
    };
  }

  /**
   * Get account summary
   */
  getAccountSummary(creatorId: string): {
    loyaltyPoints: number;
    subscription: Subscription | null;
    earnings: CreatorEarnings;
    hasAccess: boolean;
  } {
    return {
      loyaltyPoints: this.getLoyaltyAccount(creatorId).points,
      subscription: this.getActiveSubscription(creatorId),
      earnings: this.getCreatorEarnings(creatorId),
      hasAccess: this.hasToolAccess(creatorId, 'all'),
    };
  }
}

export const paymentSystem = new PaymentSystem();
