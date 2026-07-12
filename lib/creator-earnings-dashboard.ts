/**
 * Creator Earnings Dashboard Service
 * Provides comprehensive earnings tracking and payout history for creators
 */

export interface DailyEarningsRecord {
  date: Date;
  amount: number;
  sources: {
    subscriptions: number;
    tips: number;
    affiliates: number;
    ads: number;
    other: number;
  };
}

export interface CreatorEarningsSummary {
  creatorId: string;
  totalEarnings: number;
  totalPayouts: number;
  pendingBalance: number;
  thisMonthEarnings: number;
  thisWeekEarnings: number;
  todayEarnings: number;
  averageDailyEarnings: number;
  highestEarningDay: DailyEarningsRecord | null;
  lowestEarningDay: DailyEarningsRecord | null;
}

export interface PayoutHistoryEntry {
  id: string;
  date: Date;
  amount: number;
  creatorShare: number; // 85%
  platformShare: number; // 15%
  status: "completed" | "pending" | "failed";
  bankAccount: string;
}

export interface EarningsChart {
  labels: string[];
  data: number[];
  period: "day" | "week" | "month" | "year";
}

/**
 * Creator Earnings Dashboard Service
 */
export class CreatorEarningsDashboard {
  private dailyRecords: Map<string, DailyEarningsRecord[]> = new Map();
  private payoutHistory: Map<string, PayoutHistoryEntry[]> = new Map();
  private creatorSummaries: Map<string, CreatorEarningsSummary> = new Map();

  /**
   * Initialize creator earnings tracking
   */
  initializeCreator(creatorId: string): CreatorEarningsSummary {
    const summary: CreatorEarningsSummary = {
      creatorId,
      totalEarnings: 0,
      totalPayouts: 0,
      pendingBalance: 0,
      thisMonthEarnings: 0,
      thisWeekEarnings: 0,
      todayEarnings: 0,
      averageDailyEarnings: 0,
      highestEarningDay: null,
      lowestEarningDay: null,
    };

    this.creatorSummaries.set(creatorId, summary);
    this.dailyRecords.set(creatorId, []);
    this.payoutHistory.set(creatorId, []);

    return summary;
  }

  /**
   * Add earnings for creator
   */
  addEarnings(
    creatorId: string,
    amount: number,
    source: keyof DailyEarningsRecord["sources"] = "other"
  ): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let records = this.dailyRecords.get(creatorId) || [];
    let todayRecord = records.find(
      (r) => new Date(r.date).getTime() === today.getTime()
    );

    if (!todayRecord) {
      todayRecord = {
        date: today,
        amount: 0,
        sources: {
          subscriptions: 0,
          tips: 0,
          affiliates: 0,
          ads: 0,
          other: 0,
        },
      };
      records.push(todayRecord);
    }

    todayRecord.amount += amount;
    todayRecord.sources[source] += amount;

    this.dailyRecords.set(creatorId, records);
    this.updateSummary(creatorId);
  }

  /**
   * Record payout
   */
  recordPayout(
    creatorId: string,
    amount: number,
    status: "completed" | "pending" | "failed" = "completed"
  ): PayoutHistoryEntry {
    const entry: PayoutHistoryEntry = {
      id: `payout_${creatorId}_${Date.now()}`,
      date: new Date(),
      amount,
      creatorShare: amount * 0.85,
      platformShare: amount * 0.15,
      status,
      bankAccount: "****1234", // Masked for privacy
    };

    let history = this.payoutHistory.get(creatorId) || [];
    history.push(entry);
    this.payoutHistory.set(creatorId, history);

    this.updateSummary(creatorId);
    return entry;
  }

  /**
   * Update creator summary
   */
  private updateSummary(creatorId: string): void {
    const summary = this.creatorSummaries.get(creatorId);
    if (!summary) return;

    const records = this.dailyRecords.get(creatorId) || [];
    const history = this.payoutHistory.get(creatorId) || [];

    // Calculate totals
    summary.totalEarnings = records.reduce((sum, r) => sum + r.amount, 0);
    summary.totalPayouts = history
      .filter((h) => h.status === "completed")
      .reduce((sum, h) => sum + h.amount, 0);
    summary.pendingBalance = summary.totalEarnings - summary.totalPayouts;

    // Calculate period earnings
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    summary.thisMonthEarnings = records
      .filter((r) => new Date(r.date) >= thisMonthStart)
      .reduce((sum, r) => sum + r.amount, 0);

    summary.thisWeekEarnings = records
      .filter((r) => new Date(r.date) >= thisWeekStart)
      .reduce((sum, r) => sum + r.amount, 0);

    summary.todayEarnings = records
      .filter((r) => new Date(r.date).getTime() === todayStart.getTime())
      .reduce((sum, r) => sum + r.amount, 0);

    // Calculate average daily earnings
    summary.averageDailyEarnings =
      records.length > 0 ? summary.totalEarnings / records.length : 0;

    // Find highest and lowest earning days
    if (records.length > 0) {
      summary.highestEarningDay = records.reduce((max, r) =>
        r.amount > max.amount ? r : max
      );
      summary.lowestEarningDay = records.reduce((min, r) =>
        r.amount < min.amount ? r : min
      );
    }
  }

  /**
   * Get creator earnings summary
   */
  getSummary(creatorId: string): CreatorEarningsSummary | null {
    return this.creatorSummaries.get(creatorId) || null;
  }

  /**
   * Get payout history
   */
  getPayoutHistory(creatorId: string, limit: number = 30): PayoutHistoryEntry[] {
    const history = this.payoutHistory.get(creatorId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Get earnings chart data
   */
  getEarningsChart(
    creatorId: string,
    period: "day" | "week" | "month" | "year" = "month"
  ): EarningsChart {
    const records = this.dailyRecords.get(creatorId) || [];
    const chart: EarningsChart = {
      labels: [],
      data: [],
      period,
    };

    if (period === "day") {
      // Last 24 hours by hour
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i);
        const hourStr = hour.getHours().toString().padStart(2, "0") + ":00";
        chart.labels.push(hourStr);
        chart.data.push(0); // Would need hourly data
      }
    } else if (period === "week") {
      // Last 7 days
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        day.setHours(0, 0, 0, 0);

        const dayStr = day.toLocaleDateString("en-US", {
          weekday: "short",
        });
        chart.labels.push(dayStr);

        const dayEarnings = records
          .filter((r) => new Date(r.date).getTime() === day.getTime())
          .reduce((sum, r) => sum + r.amount, 0);
        chart.data.push(dayEarnings);
      }
    } else if (period === "month") {
      // Last 30 days
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        day.setHours(0, 0, 0, 0);

        const dayStr = day.getDate().toString();
        chart.labels.push(dayStr);

        const dayEarnings = records
          .filter((r) => new Date(r.date).getTime() === day.getTime())
          .reduce((sum, r) => sum + r.amount, 0);
        chart.data.push(dayEarnings);
      }
    } else if (period === "year") {
      // Last 12 months
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now);
        month.setMonth(now.getMonth() - i);

        const monthStr = month.toLocaleDateString("en-US", { month: "short" });
        chart.labels.push(monthStr);

        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const monthEarnings = records
          .filter(
            (r) =>
              new Date(r.date) >= monthStart && new Date(r.date) <= monthEnd
          )
          .reduce((sum, r) => sum + r.amount, 0);
        chart.data.push(monthEarnings);
      }
    }

    return chart;
  }

  /**
   * Get earnings breakdown by source
   */
  getEarningsBreakdown(creatorId: string): {
    subscriptions: number;
    tips: number;
    affiliates: number;
    ads: number;
    other: number;
  } {
    const records = this.dailyRecords.get(creatorId) || [];
    const breakdown = {
      subscriptions: 0,
      tips: 0,
      affiliates: 0,
      ads: 0,
      other: 0,
    };

    records.forEach((record) => {
      breakdown.subscriptions += record.sources.subscriptions;
      breakdown.tips += record.sources.tips;
      breakdown.affiliates += record.sources.affiliates;
      breakdown.ads += record.sources.ads;
      breakdown.other += record.sources.other;
    });

    return breakdown;
  }

  /**
   * Get daily earnings for specific date
   */
  getDailyEarnings(creatorId: string, date: Date): DailyEarningsRecord | null {
    const records = this.dailyRecords.get(creatorId) || [];
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return (
      records.find((r) => new Date(r.date).getTime() === targetDate.getTime()) ||
      null
    );
  }

  /**
   * Get pending payouts
   */
  getPendingPayouts(creatorId: string): PayoutHistoryEntry[] {
    const history = this.payoutHistory.get(creatorId) || [];
    return history.filter((h) => h.status === "pending");
  }

  /**
   * Get failed payouts
   */
  getFailedPayouts(creatorId: string): PayoutHistoryEntry[] {
    const history = this.payoutHistory.get(creatorId) || [];
    return history.filter((h) => h.status === "failed");
  }

  /**
   * Calculate projected monthly earnings
   */
  getProjectedMonthlyEarnings(creatorId: string): number {
    const summary = this.creatorSummaries.get(creatorId);
    if (!summary || summary.averageDailyEarnings === 0) return 0;

    return summary.averageDailyEarnings * 30;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.dailyRecords.clear();
    this.payoutHistory.clear();
    this.creatorSummaries.clear();
  }
}

// Export singleton instance
export const creatorEarningsDashboard = new CreatorEarningsDashboard();
