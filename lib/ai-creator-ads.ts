/**
 * AI Creator Ad Management Service
 * Manages ads for AI creators and tracks performance
 */

import { aiCreatorSystem, AICreatorAd } from './ai-creator-system';

export interface AdCampaign {
  id: string;
  aiCreatorId: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: 'profile' | 'content' | 'sidebar';
  startDate: Date;
  endDate?: Date;
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  cpm: number; // Cost per thousand impressions
  status: 'active' | 'paused' | 'ended';
}

export interface AdPerformanceReport {
  campaignId: string;
  totalImpressions: number;
  totalClicks: number;
  clickThroughRate: number;
  totalSpent: number;
  costPerClick: number;
  costPerThousand: number;
  revenue: number;
  roi: number;
  topPerformingAd: AICreatorAd | null;
}

export class AICreatorAdService {
  private campaigns: Map<string, AdCampaign> = new Map();

  /**
   * Create ad campaign for AI creator
   */
  createAdCampaign(
    aiCreatorId: string,
    campaign: Omit<AdCampaign, 'id' | 'aiCreatorId' | 'spent' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cpm' | 'status'>
  ): AdCampaign {
    const newCampaign: AdCampaign = {
      ...campaign,
      aiCreatorId,
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spent: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      status: 'active',
    };

    this.campaigns.set(newCampaign.id, newCampaign);

    // Add to AI creator system
    aiCreatorSystem.addAd(aiCreatorId, {
      aiCreatorId,
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.imageUrl,
      targetUrl: campaign.targetUrl,
      placement: campaign.placement,
      isActive: true,
      impressions: 0,
      clicks: 0,
      revenue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return newCampaign;
  }

  /**
   * Get ad campaign
   */
  getAdCampaign(campaignId: string): AdCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all ad campaigns for AI creator
   */
  getAICreatorAdCampaigns(aiCreatorId: string): AdCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.aiCreatorId === aiCreatorId);
  }

  /**
   * Update ad campaign performance
   */
  updateAdCampaignPerformance(
    campaignId: string,
    impressions: number,
    clicks: number,
    spent: number
  ): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.impressions += impressions;
      campaign.clicks += clicks;
      campaign.spent += spent;
      campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
      campaign.cpc = campaign.clicks > 0 ? campaign.spent / campaign.clicks : 0;
      campaign.cpm = campaign.impressions > 0 ? (campaign.spent / campaign.impressions) * 1000 : 0;

      // Check if budget exceeded
      if (campaign.spent >= campaign.totalBudget) {
        campaign.status = 'ended';
      }
    }
  }

  /**
   * Pause ad campaign
   */
  pauseAdCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'paused';
    }
  }

  /**
   * Resume ad campaign
   */
  resumeAdCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign && campaign.status === 'paused') {
      campaign.status = 'active';
    }
  }

  /**
   * Get ad performance report
   */
  getAdPerformanceReport(aiCreatorId: string): AdPerformanceReport[] {
    const campaigns = this.getAICreatorAdCampaigns(aiCreatorId);
    const ads = aiCreatorSystem.getAICreatorAds(aiCreatorId);

    return campaigns.map(campaign => {
      const totalImpressions = campaign.impressions;
      const totalClicks = campaign.clicks;
      const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const totalSpent = campaign.spent;
      const costPerClick = totalClicks > 0 ? totalSpent / totalClicks : 0;
      const costPerThousand = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
      const revenue = (totalImpressions * 0.5 + totalClicks * 2) / 100; // Revenue model
      const roi = totalSpent > 0 ? ((revenue - totalSpent) / totalSpent) * 100 : 0;

      const topPerformingAd = ads
        .filter(ad => ad.createdAt >= (campaign.startDate || new Date()))
        .reduce((prev, current) => (prev.clicks > current.clicks ? prev : current), ads[0] || null);

      return {
        campaignId: campaign.id,
        totalImpressions,
        totalClicks,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        totalSpent,
        costPerClick: Math.round(costPerClick * 100) / 100,
        costPerThousand: Math.round(costPerThousand * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        topPerformingAd,
      };
    });
  }

  /**
   * Get ad recommendations
   */
  getAdRecommendations(aiCreatorId: string): {
    recommendation: string;
    reason: string;
    expectedImprovement: number;
  }[] {
    const campaigns = this.getAICreatorAdCampaigns(aiCreatorId);
    const recommendations: {
      recommendation: string;
      reason: string;
      expectedImprovement: number;
    }[] = [];

    campaigns.forEach(campaign => {
      if (campaign.ctr < 1) {
        recommendations.push({
          recommendation: 'Improve ad creative',
          reason: `CTR is ${campaign.ctr.toFixed(2)}%, below industry average of 2%`,
          expectedImprovement: 50,
        });
      }

      if (campaign.cpc > 5) {
        recommendations.push({
          recommendation: 'Optimize targeting',
          reason: `CPC is $${campaign.cpc.toFixed(2)}, consider narrowing audience`,
          expectedImprovement: 30,
        });
      }

      if (campaign.spent < campaign.totalBudget * 0.5) {
        recommendations.push({
          recommendation: 'Increase daily budget',
          reason: 'Campaign is underutilizing budget allocation',
          expectedImprovement: 25,
        });
      }
    });

    return recommendations;
  }

  /**
   * Get total ad revenue for AI creator
   */
  getTotalAdRevenue(aiCreatorId: string): number {
    const ads = aiCreatorSystem.getAICreatorAds(aiCreatorId);
    return ads.reduce((sum, ad) => sum + ad.revenue, 0);
  }

  /**
   * Get ad placement recommendations
   */
  getAdPlacementRecommendations(aiCreatorId: string): {
    placement: 'profile' | 'content' | 'sidebar';
    performance: number;
    recommendation: string;
  }[] {
    const ads = aiCreatorSystem.getAICreatorAds(aiCreatorId);

    const placements: { [key: string]: { clicks: number; impressions: number } } = {
      profile: { clicks: 0, impressions: 0 },
      content: { clicks: 0, impressions: 0 },
      sidebar: { clicks: 0, impressions: 0 },
    };

    ads.forEach(ad => {
      if (placements[ad.placement]) {
        placements[ad.placement].clicks += ad.clicks;
        placements[ad.placement].impressions += ad.impressions;
      }
    });

    return Object.entries(placements).map(([placement, data]) => {
      const performance = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      let recommendation = 'Maintain current strategy';

      if (performance > 3) {
        recommendation = 'Increase budget for this placement';
      } else if (performance < 0.5) {
        recommendation = 'Consider reducing or pausing ads in this placement';
      }

      return {
        placement: placement as 'profile' | 'content' | 'sidebar',
        performance: Math.round(performance * 100) / 100,
        recommendation,
      };
    });
  }
}

// Export singleton instance
export const aiCreatorAdService = new AICreatorAdService();
