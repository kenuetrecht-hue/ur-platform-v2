/**
 * AI Creator Affiliate Link Management System
 * Allows AI Creators to push affiliate links and earn revenue for the app
 */

export interface AffiliateLink {
  id: string;
  aiCreatorId: string;
  productName: string;
  productUrl: string;
  affiliateUrl: string;
  category: string;
  description: string;
  commissionRate: number; // percentage
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliatePush {
  id: string;
  aiCreatorId: string;
  affiliateLinkId: string;
  pushType: 'recommendation' | 'promotion' | 'featured' | 'sponsored';
  message: string;
  timestamp: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface AffiliatePerformance {
  linkId: string;
  productName: string;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  clickThroughRate: number;
  averageOrderValue: number;
}

export class AIAffiliateSystem {
  private affiliateLinks: Map<string, AffiliateLink[]> = new Map();
  private affiliatePushes: Map<string, AffiliatePush[]> = new Map();
  private appEarnings: Map<string, number> = new Map();

  /**
   * Add affiliate link for AI creator
   */
  addAffiliateLink(
    aiCreatorId: string,
    link: Omit<AffiliateLink, 'id' | 'createdAt' | 'updatedAt'>
  ): AffiliateLink {
    const newLink: AffiliateLink = {
      ...link,
      id: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!this.affiliateLinks.has(aiCreatorId)) {
      this.affiliateLinks.set(aiCreatorId, []);
    }
    this.affiliateLinks.get(aiCreatorId)!.push(newLink);

    return newLink;
  }

  /**
   * Get all affiliate links for AI creator
   */
  getAffiliateLinks(aiCreatorId: string): AffiliateLink[] {
    return this.affiliateLinks.get(aiCreatorId) || [];
  }

  /**
   * Get active affiliate links for AI creator
   */
  getActiveAffiliateLinks(aiCreatorId: string): AffiliateLink[] {
    return (this.affiliateLinks.get(aiCreatorId) || []).filter(link => link.isActive);
  }

  /**
   * Get affiliate link by ID
   */
  getAffiliateLink(linkId: string): AffiliateLink | undefined {
    for (const links of this.affiliateLinks.values()) {
      const link = links.find(l => l.id === linkId);
      if (link) return link;
    }
    return undefined;
  }

  /**
   * Deactivate affiliate link
   */
  deactivateAffiliateLink(linkId: string): void {
    for (const links of this.affiliateLinks.values()) {
      const link = links.find(l => l.id === linkId);
      if (link) {
        link.isActive = false;
        link.updatedAt = new Date();
      }
    }
  }

  /**
   * AI Creator pushes affiliate link
   */
  pushAffiliateLink(
    aiCreatorId: string,
    affiliateLinkId: string,
    pushType: 'recommendation' | 'promotion' | 'featured' | 'sponsored',
    message: string
  ): AffiliatePush {
    const push: AffiliatePush = {
      id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      aiCreatorId,
      affiliateLinkId,
      pushType,
      message,
      timestamp: new Date(),
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };

    if (!this.affiliatePushes.has(aiCreatorId)) {
      this.affiliatePushes.set(aiCreatorId, []);
    }
    this.affiliatePushes.get(aiCreatorId)!.push(push);

    return push;
  }

  /**
   * Record affiliate link performance
   */
  recordAffiliatePerformance(
    pushId: string,
    impressions: number,
    clicks: number,
    conversions: number,
    revenue: number
  ): void {
    for (const pushes of this.affiliatePushes.values()) {
      const push = pushes.find(p => p.id === pushId);
      if (push) {
        push.impressions += impressions;
        push.clicks += clicks;
        push.conversions += conversions;
        push.revenue += revenue;

        // Add to app earnings
        const currentEarnings = this.appEarnings.get('total') || 0;
        this.appEarnings.set('total', currentEarnings + revenue);
      }
    }
  }

  /**
   * Get affiliate performance for a link
   */
  getAffiliateLinkPerformance(linkId: string): AffiliatePerformance | null {
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalRevenue = 0;
    let linkName = '';

    for (const pushes of this.affiliatePushes.values()) {
      const relatedPushes = pushes.filter(p => p.affiliateLinkId === linkId);
      relatedPushes.forEach(push => {
        totalImpressions += push.impressions;
        totalClicks += push.clicks;
        totalConversions += push.conversions;
        totalRevenue += push.revenue;
      });
    }

    const link = this.getAffiliateLink(linkId);
    if (!link) return null;

    linkName = link.productName;

    const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const averageOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

    return {
      linkId,
      productName: linkName,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    };
  }

  /**
   * Get all affiliate performance metrics
   */
  getAllAffiliatePerformance(): AffiliatePerformance[] {
    const performances: AffiliatePerformance[] = [];
    const allLinks = new Set<string>();

    for (const links of this.affiliateLinks.values()) {
      links.forEach(link => allLinks.add(link.id));
    }

    allLinks.forEach(linkId => {
      const performance = this.getAffiliateLinkPerformance(linkId);
      if (performance) {
        performances.push(performance);
      }
    });

    return performances;
  }

  /**
   * Get AI creator affiliate performance
   */
  getAICreatorAffiliatePerformance(aiCreatorId: string): {
    totalLinks: number;
    activeLinks: number;
    totalPushes: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    averageCTR: number;
    averageConversionRate: number;
  } {
    const links = this.getAffiliateLinks(aiCreatorId);
    const pushes = this.affiliatePushes.get(aiCreatorId) || [];

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    pushes.forEach(push => {
      totalImpressions += push.impressions;
      totalClicks += push.clicks;
      totalConversions += push.conversions;
      totalRevenue += push.revenue;
    });

    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalLinks: links.length,
      activeLinks: links.filter(l => l.isActive).length,
      totalPushes: pushes.length,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      averageCTR: Math.round(averageCTR * 100) / 100,
      averageConversionRate: Math.round(averageConversionRate * 100) / 100,
    };
  }

  /**
   * Get top performing affiliate links
   */
  getTopPerformingLinks(limit: number = 10): AffiliatePerformance[] {
    return this.getAllAffiliatePerformance()
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  /**
   * Get total app earnings from affiliate links
   */
  getTotalAppEarnings(): number {
    return this.appEarnings.get('total') || 0;
  }

  /**
   * Get app earnings by AI creator
   */
  getAppEarningsByAICreator(aiCreatorId: string): number {
    const pushes = this.affiliatePushes.get(aiCreatorId) || [];
    return pushes.reduce((sum, push) => sum + push.revenue, 0);
  }

  /**
   * Get affiliate link recommendations for AI creator
   */
  getAffiliateLinkRecommendations(aiCreatorId: string): {
    recommendation: string;
    reason: string;
    expectedRevenue: number;
  }[] {
    const performance = this.getAICreatorAffiliatePerformance(aiCreatorId);
    const recommendations: {
      recommendation: string;
      reason: string;
      expectedRevenue: number;
    }[] = [];

    if (performance.totalLinks < 5) {
      recommendations.push({
        recommendation: 'Add more affiliate links',
        reason: `Currently promoting ${performance.totalLinks} products. Diversify to increase revenue potential.`,
        expectedRevenue: 500,
      });
    }

    if (performance.averageCTR < 2) {
      recommendations.push({
        recommendation: 'Improve link placement and messaging',
        reason: `CTR is ${performance.averageCTR.toFixed(2)}%. Optimize call-to-action and positioning.`,
        expectedRevenue: 300,
      });
    }

    if (performance.totalPushes < 10) {
      recommendations.push({
        recommendation: 'Increase affiliate link promotions',
        reason: `Only ${performance.totalPushes} pushes. More frequent promotions can boost revenue.`,
        expectedRevenue: 400,
      });
    }

    if (performance.averageConversionRate < 1) {
      recommendations.push({
        recommendation: 'Focus on high-converting products',
        reason: `Conversion rate is ${performance.averageConversionRate.toFixed(2)}%. Promote products with better fit.`,
        expectedRevenue: 250,
      });
    }

    return recommendations;
  }

  /**
   * Get app dashboard summary
   */
  getAppAffiliateDashboard(): {
    totalAffiliateLinks: number;
    totalAIPushes: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    averageCTR: number;
    averageConversionRate: number;
    topLinks: AffiliatePerformance[];
  } {
    const allPerformance = this.getAllAffiliatePerformance();
    const totalLinks = Array.from(this.affiliateLinks.values()).reduce((sum, links) => sum + links.length, 0);
    const totalPushes = Array.from(this.affiliatePushes.values()).reduce((sum, pushes) => sum + pushes.length, 0);

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    allPerformance.forEach(perf => {
      totalImpressions += perf.totalImpressions;
      totalClicks += perf.totalClicks;
      totalConversions += perf.totalConversions;
    });

    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalAffiliateLinks: totalLinks,
      totalAIPushes: totalPushes,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalEarnings: this.getTotalAppEarnings(),
      averageCTR: Math.round(averageCTR * 100) / 100,
      averageConversionRate: Math.round(averageConversionRate * 100) / 100,
      topLinks: this.getTopPerformingLinks(5),
    };
  }
}

// Export singleton instance
export const aiAffiliateSystem = new AIAffiliateSystem();
