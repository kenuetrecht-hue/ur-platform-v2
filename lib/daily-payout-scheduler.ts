/**
 * Daily Payout Scheduler Service
 * Handles 24-hour creator payouts at 9 AM via Stripe Connect
 * 85% to creators, 15% to UR platform
 */

export interface CreatorEarnings {
  creatorId: string;
  dailyEarnings: number;
  totalEarnings: number;
  lastPayoutDate?: Date;
  nextPayoutDate: Date;
  stripeConnectId: string;
  bankAccountId: string;
}

export interface PayoutRecord {
  id: string;
  creatorId: string;
  amount: number;
  creatorShare: number; // 85%
  platformShare: number; // 15%
  payoutDate: Date;
  status: "pending" | "processing" | "completed" | "failed";
  stripeTransferId?: string;
  errorMessage?: string;
}

export interface PayoutSchedule {
  timezone: string;
  payoutHour: number; // 0-23 (9 = 9 AM)
  payoutMinute: number; // 0-59
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
}

/**
 * Daily Payout Scheduler
 */
export class DailyPayoutScheduler {
  private creatorEarnings: Map<string, CreatorEarnings> = new Map();
  private payoutHistory: PayoutRecord[] = [];
  private schedule: PayoutSchedule;
  private schedulerInterval?: NodeJS.Timeout;

  constructor(timezone: string = "UTC", payoutHour: number = 9) {
    this.schedule = {
      timezone,
      payoutHour,
      payoutMinute: 0,
      enabled: true,
      nextRun: this.calculateNextPayoutTime(),
    };
  }

  /**
   * Calculate next payout time (9 AM)
   */
  private calculateNextPayoutTime(): Date {
    const now = new Date();
    const next = new Date(now);

    // Set to 9 AM
    next.setHours(this.schedule.payoutHour, this.schedule.payoutMinute, 0, 0);

    // If 9 AM has already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Register creator for daily payouts
   */
  registerCreator(
    creatorId: string,
    stripeConnectId: string,
    bankAccountId: string
  ): CreatorEarnings {
    const earnings: CreatorEarnings = {
      creatorId,
      dailyEarnings: 0,
      totalEarnings: 0,
      nextPayoutDate: this.calculateNextPayoutTime(),
      stripeConnectId,
      bankAccountId,
    };

    this.creatorEarnings.set(creatorId, earnings);
    return earnings;
  }

  /**
   * Add earnings for creator
   */
  addEarnings(creatorId: string, amount: number): void {
    const earnings = this.creatorEarnings.get(creatorId);
    if (earnings) {
      earnings.dailyEarnings += amount;
      earnings.totalEarnings += amount;
    }
  }

  /**
   * Get creator earnings
   */
  getCreatorEarnings(creatorId: string): CreatorEarnings | null {
    return this.creatorEarnings.get(creatorId) || null;
  }

  /**
   * Process daily payouts
   */
  async processDailyPayouts(): Promise<PayoutRecord[]> {
    const payouts: PayoutRecord[] = [];
    const now = new Date();

    // Check if it's time to process payouts
    if (!this.isPayoutTime(now)) {
      return payouts;
    }

    // Process each creator's earnings
    for (const [creatorId, earnings] of this.creatorEarnings) {
      if (earnings.dailyEarnings > 0) {
        const payout = await this.createPayout(creatorId, earnings);
        payouts.push(payout);
        this.payoutHistory.push(payout);

        // Reset daily earnings
        earnings.dailyEarnings = 0;
        earnings.lastPayoutDate = now;
        earnings.nextPayoutDate = this.calculateNextPayoutTime();
      }
    }

    // Update next payout time
    this.schedule.lastRun = now;
    this.schedule.nextRun = this.calculateNextPayoutTime();

    return payouts;
  }

  /**
   * Check if it's payout time
   */
  private isPayoutTime(date: Date): boolean {
    const hour = date.getHours();
    const minute = date.getMinutes();

    return (
      hour === this.schedule.payoutHour &&
      minute === this.schedule.payoutMinute
    );
  }

  /**
   * Create payout record and transfer via Stripe
   */
  private async createPayout(
    creatorId: string,
    earnings: CreatorEarnings
  ): Promise<PayoutRecord> {
    const creatorShare = earnings.dailyEarnings * 0.85; // 85%
    const platformShare = earnings.dailyEarnings * 0.15; // 15%

    const payout: PayoutRecord = {
      id: `payout_${creatorId}_${Date.now()}`,
      creatorId,
      amount: earnings.dailyEarnings,
      creatorShare,
      platformShare,
      payoutDate: new Date(),
      status: "pending",
    };

    // In production, this would call Stripe API
    // For now, simulate the transfer
    try {
      payout.stripeTransferId = `tr_${Date.now()}`;
      payout.status = "processing";

      // Simulate Stripe transfer (in real app, use Stripe API)
      await this.simulateStripeTransfer(earnings, creatorShare);

      payout.status = "completed";
    } catch (error) {
      payout.status = "failed";
      payout.errorMessage =
        error instanceof Error ? error.message : "Unknown error";
    }

    return payout;
  }

  /**
   * Simulate Stripe transfer (replace with real Stripe API call)
   */
  private async simulateStripeTransfer(
    earnings: CreatorEarnings,
    amount: number
  ): Promise<void> {
    // In production:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // await stripe.transfers.create({
    //   amount: Math.round(amount * 100), // Convert to cents
    //   currency: 'usd',
    //   destination: earnings.stripeConnectId,
    //   description: `Daily payout for ${earnings.creatorId}`,
    // });

    return new Promise((resolve) => {
      setTimeout(() => resolve(), 100);
    });
  }

  /**
   * Start automatic daily payout scheduler
   */
  startScheduler(): void {
    if (this.schedulerInterval) {
      return; // Already running
    }

    // Check every minute if it's time to process payouts
    this.schedulerInterval = setInterval(async () => {
      const now = new Date();
      if (this.isPayoutTime(now)) {
        await this.processDailyPayouts();
      }
    }, 60000) as unknown as NodeJS.Timeout; // Check every minute
  }

  /**
   * Stop automatic scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval as unknown as number);
      this.schedulerInterval = undefined;
    }
  }

  /**
   * Get payout history
   */
  getPayoutHistory(creatorId?: string): PayoutRecord[] {
    if (creatorId) {
      return this.payoutHistory.filter((p) => p.creatorId === creatorId);
    }
    return this.payoutHistory;
  }

  /**
   * Get payout statistics
   */
  getPayoutStats(): {
    totalPayouts: number;
    totalCreatorPayouts: number;
    totalPlatformEarnings: number;
    averagePayoutAmount: number;
    successRate: number;
  } {
    const totalPayouts = this.payoutHistory.length;
    const totalCreatorPayouts = this.payoutHistory.reduce(
      (sum, p) => sum + p.creatorShare,
      0
    );
    const totalPlatformEarnings = this.payoutHistory.reduce(
      (sum, p) => sum + p.platformShare,
      0
    );
    const averagePayoutAmount =
      totalPayouts > 0
        ? this.payoutHistory.reduce((sum, p) => sum + p.amount, 0) /
          totalPayouts
        : 0;
    const successCount = this.payoutHistory.filter(
      (p) => p.status === "completed"
    ).length;
    const successRate =
      totalPayouts > 0 ? (successCount / totalPayouts) * 100 : 0;

    return {
      totalPayouts,
      totalCreatorPayouts,
      totalPlatformEarnings,
      averagePayoutAmount,
      successRate,
    };
  }

  /**
   * Get schedule info
   */
  getScheduleInfo(): PayoutSchedule {
    return this.schedule;
  }

  /**
   * Update payout time
   */
  updatePayoutTime(hour: number, minute: number = 0): void {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error("Invalid time");
    }

    this.schedule.payoutHour = hour;
    this.schedule.payoutMinute = minute;
    this.schedule.nextRun = this.calculateNextPayoutTime();
  }

  /**
   * Reset daily earnings for creator (for testing)
   */
  resetCreatorEarnings(creatorId: string): void {
    const earnings = this.creatorEarnings.get(creatorId);
    if (earnings) {
      earnings.dailyEarnings = 0;
    }
  }

  /**
   * Reset all data (for testing)
   */
  reset(): void {
    this.creatorEarnings.clear();
    this.payoutHistory = [];
    this.stopScheduler();
    this.schedule.nextRun = this.calculateNextPayoutTime();
  }
}

// Export singleton instance
export const dailyPayoutScheduler = new DailyPayoutScheduler("UTC", 9);
