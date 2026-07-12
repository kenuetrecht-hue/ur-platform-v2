/**
 * Enhanced Creator Analytics Service
 * Comprehensive analytics for multi-format content creators
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type ContentFormat = "video" | "audio" | "text" | "image" | "3d";

export interface ContentMetrics {
  contentId: string;
  format: ContentFormat;
  title: string;
  views: number;
  engagements: number;
  shares: number;
  comments: number;
  likes: number;
  downloads: number;
  completionRate: number;
  avgWatchTime: number;
  revenue: number;
  publishedAt: number;
}

export interface AudienceSegment {
  ageGroup: string;
  gender: string;
  location: string;
  interests: string[];
  count: number;
}

export interface EngagementTrend {
  date: string;
  views: number;
  engagements: number;
  revenue: number;
}

export interface CreatorAnalytics {
  creatorId: string;
  totalViews: number;
  totalEngagements: number;
  totalRevenue: number;
  contentCount: number;
  averageEngagementRate: number;
  followerCount: number;
  followerGrowthRate: number;
  topContent: ContentMetrics[];
  audienceSegments: AudienceSegment[];
  engagementTrends: EngagementTrend[];
  byFormat: Record<ContentFormat, { count: number; views: number; revenue: number }>;
  lastUpdated: number;
}

export interface PerformanceInsight {
  type: "opportunity" | "warning" | "success";
  title: string;
  description: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
}

// ============================================================================
// CREATOR ANALYTICS SERVICE
// ============================================================================

class CreatorAnalyticsService {
  private analytics: Map<string, CreatorAnalytics> = new Map();
  private contentMetrics: Map<string, ContentMetrics> = new Map();
  private engagementData: Map<string, EngagementTrend[]> = new Map();

  /**
   * Track content view
   */
  trackView(creatorId: string, contentId: string): void {
    const metrics = this.contentMetrics.get(contentId);
    if (metrics) {
      metrics.views++;
    }
  }

  /**
   * Track engagement
   */
  trackEngagement(creatorId: string, contentId: string, type: "like" | "comment" | "share" | "download"): void {
    const metrics = this.contentMetrics.get(contentId);
    if (!metrics) return;

    metrics.engagements++;

    switch (type) {
      case "like":
        metrics.likes++;
        break;
      case "comment":
        metrics.comments++;
        break;
      case "share":
        metrics.shares++;
        break;
      case "download":
        metrics.downloads++;
        break;
    }
  }

  /**
   * Record content metrics
   */
  recordContentMetrics(metrics: ContentMetrics): void {
    this.contentMetrics.set(metrics.contentId, metrics);
  }

  /**
   * Get content metrics
   */
  getContentMetrics(contentId: string): ContentMetrics | undefined {
    return this.contentMetrics.get(contentId);
  }

  /**
   * Get creator analytics
   */
  getCreatorAnalytics(creatorId: string): CreatorAnalytics | undefined {
    return this.analytics.get(creatorId);
  }

  /**
   * Calculate creator analytics
   */
  calculateAnalytics(creatorId: string): CreatorAnalytics {
    const creatorContents = Array.from(this.contentMetrics.values()).filter((m) => {
      // Assume contentId structure includes creatorId or we track it separately
      // For now, we'll collect all metrics and calculate
      return true;
    });

    const totalViews = creatorContents.reduce((sum, m) => sum + m.views, 0);
    const totalEngagements = creatorContents.reduce((sum, m) => sum + m.engagements, 0);
    const totalRevenue = creatorContents.reduce((sum, m) => sum + m.revenue, 0);

    const byFormat: Record<ContentFormat, { count: number; views: number; revenue: number }> = {
      video: { count: 0, views: 0, revenue: 0 },
      audio: { count: 0, views: 0, revenue: 0 },
      text: { count: 0, views: 0, revenue: 0 },
      image: { count: 0, views: 0, revenue: 0 },
      "3d": { count: 0, views: 0, revenue: 0 },
    };

    creatorContents.forEach((m) => {
      if (byFormat[m.format]) {
        byFormat[m.format].count++;
        byFormat[m.format].views += m.views;
        byFormat[m.format].revenue += m.revenue;
      }
    });

    const topContent = creatorContents.sort((a, b) => b.views - a.views).slice(0, 5);

    const analytics: CreatorAnalytics = {
      creatorId,
      totalViews,
      totalEngagements,
      totalRevenue,
      contentCount: creatorContents.length,
      averageEngagementRate: creatorContents.length > 0 ? totalEngagements / creatorContents.length / Math.max(totalViews, 1) : 0,
      followerCount: 0,
      followerGrowthRate: 0,
      topContent,
      audienceSegments: [],
      engagementTrends: this.engagementData.get(creatorId) || [],
      byFormat,
      lastUpdated: Date.now(),
    };

    this.analytics.set(creatorId, analytics);
    return analytics;
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(creatorId: string): PerformanceInsight[] {
    const analytics = this.calculateAnalytics(creatorId);
    const insights: PerformanceInsight[] = [];

    // Check engagement rate
    if (analytics.averageEngagementRate < 0.01) {
      insights.push({
        type: "warning",
        title: "Low Engagement Rate",
        description: `Your average engagement rate is ${(analytics.averageEngagementRate * 100).toFixed(2)}%`,
        recommendation: "Try posting more frequently and engage with your audience in comments",
        impact: "high",
      });
    } else if (analytics.averageEngagementRate > 0.05) {
      insights.push({
        type: "success",
        title: "Excellent Engagement",
        description: `Your engagement rate of ${(analytics.averageEngagementRate * 100).toFixed(2)}% is above average`,
        recommendation: "Keep creating content in this style - it resonates with your audience",
        impact: "high",
      });
    }

    // Check content diversity
    const formats = Object.values(analytics.byFormat).filter((f) => f.count > 0);
    if (formats.length < 2) {
      insights.push({
        type: "opportunity",
        title: "Expand Content Formats",
        description: "You're only using one content format",
        recommendation: `Try creating content in other formats like ${this.getUnusedFormats(analytics).join(", ")}`,
        impact: "medium",
      });
    }

    // Check revenue
    if (analytics.totalRevenue === 0 && analytics.contentCount > 5) {
      insights.push({
        type: "opportunity",
        title: "Monetization Opportunity",
        description: "You have substantial content but no revenue yet",
        recommendation: "Enable monetization features and consider premium content offerings",
        impact: "high",
      });
    }

    // Check top content
    if (analytics.topContent.length > 0) {
      const topContentFormat = analytics.topContent[0].format;
      insights.push({
        type: "success",
        title: `${topContentFormat.charAt(0).toUpperCase() + topContentFormat.slice(1)} Content Performs Best`,
        description: `Your top content is in ${topContentFormat} format with ${analytics.topContent[0].views} views`,
        recommendation: `Focus on creating more ${topContentFormat} content to capitalize on this success`,
        impact: "medium",
      });
    }

    return insights;
  }

  /**
   * Get unused formats
   */
  private getUnusedFormats(analytics: CreatorAnalytics): string[] {
    const formats: ContentFormat[] = ["video", "audio", "text", "image", "3d"];
    return formats.filter((f) => analytics.byFormat[f].count === 0);
  }

  /**
   * Get content performance comparison
   */
  getContentComparison(creatorId: string): { format: ContentFormat; avgViews: number; avgEngagementRate: number }[] {
    const analytics = this.calculateAnalytics(creatorId);
    const comparison: { format: ContentFormat; avgViews: number; avgEngagementRate: number }[] = [];

    Object.entries(analytics.byFormat).forEach(([format, stats]) => {
      if (stats.count > 0) {
        comparison.push({
          format: format as ContentFormat,
          avgViews: stats.views / stats.count,
          avgEngagementRate: stats.count > 0 ? (stats.revenue / stats.count) * 0.01 : 0,
        });
      }
    });

    return comparison.sort((a, b) => b.avgViews - a.avgViews);
  }

  /**
   * Get optimal posting times
   */
  getOptimalPostingTimes(creatorId: string): { day: string; hour: number; avgEngagement: number }[] {
    // This would typically analyze historical data
    // For now, returning mock optimal times
    return [
      { day: "Monday", hour: 9, avgEngagement: 0.08 },
      { day: "Wednesday", hour: 14, avgEngagement: 0.12 },
      { day: "Friday", hour: 18, avgEngagement: 0.15 },
    ];
  }

  /**
   * Get revenue breakdown
   */
  getRevenueBreakdown(creatorId: string): { source: string; amount: number; percentage: number }[] {
    const analytics = this.calculateAnalytics(creatorId);
    const total = analytics.totalRevenue || 1;

    return [
      { source: "Direct Sales", amount: total * 0.5, percentage: 50 },
      { source: "Subscriptions", amount: total * 0.3, percentage: 30 },
      { source: "Ads", amount: total * 0.15, percentage: 15 },
      { source: "Affiliate", amount: total * 0.05, percentage: 5 },
    ];
  }

  /**
   * Get growth metrics
   */
  getGrowthMetrics(creatorId: string): {
    viewsGrowth: number;
    engagementGrowth: number;
    revenueGrowth: number;
    followerGrowth: number;
  } {
    // This would compare with previous period
    // For now, returning mock growth data
    return {
      viewsGrowth: 15.5,
      engagementGrowth: 8.2,
      revenueGrowth: 22.1,
      followerGrowth: 12.3,
    };
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.analytics.clear();
    this.contentMetrics.clear();
    this.engagementData.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let analyticsInstance: CreatorAnalyticsService | null = null;

export function getCreatorAnalytics(): CreatorAnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new CreatorAnalyticsService();
  }
  return analyticsInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCreatorAnalytics(): void {
  if (analyticsInstance) {
    analyticsInstance.reset();
  }
  analyticsInstance = null;
}

export default CreatorAnalyticsService;
