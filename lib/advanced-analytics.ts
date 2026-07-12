/**
 * Advanced Analytics Dashboard Service
 * Provides detailed metrics and insights for creators
 */

export interface AnalyticsMetric {
  date: Date;
  value: number;
  label: string;
}

export interface CreatorAnalytics {
  id: string;
  creatorId: string;
  totalEarnings: number;
  totalViews: number;
  totalEngagement: number;
  averageEngagementRate: number;
  topContent: string[];
  audienceDemographics: Record<string, number>;
  trafficSources: Record<string, number>;
  conversionRate: number;
  retentionRate: number;
  growthRate: number;
  updatedAt: Date;
}

export interface DailyMetric {
  date: Date;
  earnings: number;
  views: number;
  engagement: number;
  conversions: number;
}

export interface AnalyticsReport {
  id: string;
  creatorId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  metrics: DailyMetric[];
  summary: CreatorAnalytics;
  trends: Record<string, number[]>;
  recommendations: string[];
  generatedAt: Date;
}

export class AdvancedAnalytics {
  private analytics: Map<string, CreatorAnalytics> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private dailyMetrics: Map<string, DailyMetric[]> = new Map();

  /**
   * Initialize analytics for a creator
   */
  initializeAnalytics(creatorId: string): CreatorAnalytics {
    const analytics: CreatorAnalytics = {
      id: `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorId,
      totalEarnings: 0,
      totalViews: 0,
      totalEngagement: 0,
      averageEngagementRate: 0,
      topContent: [],
      audienceDemographics: {},
      trafficSources: {},
      conversionRate: 0,
      retentionRate: 0,
      growthRate: 0,
      updatedAt: new Date(),
    };

    this.analytics.set(creatorId, analytics);
    this.dailyMetrics.set(creatorId, []);
    return analytics;
  }

  /**
   * Record daily metrics
   */
  recordDailyMetric(creatorId: string, metric: DailyMetric): void {
    const metrics = this.dailyMetrics.get(creatorId) || [];
    metrics.push(metric);
    this.dailyMetrics.set(creatorId, metrics);

    // Update analytics
    const analytics = this.analytics.get(creatorId);
    if (analytics) {
      analytics.totalEarnings += metric.earnings;
      analytics.totalViews += metric.views;
      analytics.totalEngagement += metric.engagement;
      analytics.updatedAt = new Date();
    }
  }

  /**
   * Get creator analytics
   */
  getAnalytics(creatorId: string): CreatorAnalytics | undefined {
    return this.analytics.get(creatorId);
  }

  /**
   * Calculate engagement rate
   */
  calculateEngagementRate(creatorId: string): number {
    const analytics = this.analytics.get(creatorId);
    if (!analytics || analytics.totalViews === 0) return 0;
    return (analytics.totalEngagement / analytics.totalViews) * 100;
  }

  /**
   * Calculate conversion rate
   */
  calculateConversionRate(creatorId: string): number {
    const metrics = this.dailyMetrics.get(creatorId) || [];
    if (metrics.length === 0) return 0;

    const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
    const totalViews = metrics.reduce((sum, m) => sum + m.views, 0);

    return totalViews === 0 ? 0 : (totalConversions / totalViews) * 100;
  }

  /**
   * Calculate retention rate
   */
  calculateRetentionRate(creatorId: string): number {
    const metrics = this.dailyMetrics.get(creatorId) || [];
    if (metrics.length < 2) return 0;

    const firstDayEngagement = metrics[0].engagement;
    const lastDayEngagement = metrics[metrics.length - 1].engagement;

    if (firstDayEngagement === 0) return 0;
    return (lastDayEngagement / firstDayEngagement) * 100;
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(creatorId: string): number {
    const metrics = this.dailyMetrics.get(creatorId) || [];
    if (metrics.length < 2) return 0;

    const firstDayViews = metrics[0].views;
    const lastDayViews = metrics[metrics.length - 1].views;

    if (firstDayViews === 0) return 0;
    return ((lastDayViews - firstDayViews) / firstDayViews) * 100;
  }

  /**
   * Generate analytics report
   */
  generateReport(creatorId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): AnalyticsReport {
    const metrics = this.dailyMetrics.get(creatorId) || [];
    const analytics = this.analytics.get(creatorId);

    if (!analytics) {
      throw new Error(`Analytics not found for creator ${creatorId}`);
    }

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredMetrics = metrics.filter((m) => m.date >= startDate && m.date <= now);

    // Calculate trends
    const trends: Record<string, number[]> = {
      earnings: filteredMetrics.map((m) => m.earnings),
      views: filteredMetrics.map((m) => m.views),
      engagement: filteredMetrics.map((m) => m.engagement),
    };

    // Generate recommendations
    const recommendations: string[] = [];
    const engagementRate = this.calculateEngagementRate(creatorId);
    const conversionRate = this.calculateConversionRate(creatorId);
    const growthRate = this.calculateGrowthRate(creatorId);

    if (engagementRate < 5) {
      recommendations.push('Increase engagement by creating more interactive content');
    }
    if (conversionRate < 2) {
      recommendations.push('Improve conversion rate by optimizing your call-to-action');
    }
    if (growthRate < 10) {
      recommendations.push('Focus on audience growth through cross-promotion');
    }

    const report: AnalyticsReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorId,
      period,
      startDate,
      endDate: now,
      metrics: filteredMetrics,
      summary: analytics,
      trends,
      recommendations,
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Get report
   */
  getReport(reportId: string): AnalyticsReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get all reports for a creator
   */
  getCreatorReports(creatorId: string): AnalyticsReport[] {
    return Array.from(this.reports.values()).filter((r) => r.creatorId === creatorId);
  }

  /**
   * Get audience demographics
   */
  getAudienceDemographics(creatorId: string): Record<string, number> {
    const analytics = this.analytics.get(creatorId);
    return analytics?.audienceDemographics || {};
  }

  /**
   * Update audience demographics
   */
  updateAudienceDemographics(creatorId: string, demographics: Record<string, number>): void {
    const analytics = this.analytics.get(creatorId);
    if (analytics) {
      analytics.audienceDemographics = demographics;
      analytics.updatedAt = new Date();
    }
  }

  /**
   * Get traffic sources
   */
  getTrafficSources(creatorId: string): Record<string, number> {
    const analytics = this.analytics.get(creatorId);
    return analytics?.trafficSources || {};
  }

  /**
   * Update traffic sources
   */
  updateTrafficSources(creatorId: string, sources: Record<string, number>): void {
    const analytics = this.analytics.get(creatorId);
    if (analytics) {
      analytics.trafficSources = sources;
      analytics.updatedAt = new Date();
    }
  }

  /**
   * Get all analytics
   */
  getAllAnalytics(): CreatorAnalytics[] {
    return Array.from(this.analytics.values());
  }
}
