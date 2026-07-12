/**
 * Affiliate Service
 * Manages affiliate tracking IDs and generates tracking URLs
 * Reads from database configuration (not hardcoded)
 */

import { getAffiliateConfig } from './server-config';

export interface AffiliatePartner {
  id: string;
  name: string;
  trackingId: string;
  commissionRate: number; // e.g., 0.10 for 10%
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateLink {
  partner: string;
  productUrl: string;
  trackingUrl: string;
  commissionRate: number;
}

/**
 * Affiliate Service
 * Handles all affiliate-related operations
 */
export class AffiliateService {
  private config = getAffiliateConfig();

  /**
   * Get all active affiliate partners
   * In production, this would query the database
   */
  async getActivePartners(): Promise<AffiliatePartner[]> {
    // TODO: Query database for active partners
    // For now, return configured partners
    const partners: AffiliatePartner[] = [];

    if (this.config.walmart.isEnabled) {
      partners.push({
        id: 'walmart',
        name: 'Walmart',
        trackingId: this.config.walmart.trackingId,
        commissionRate: 0.04, // 4% commission
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (this.config.amazon.isEnabled) {
      partners.push({
        id: 'amazon',
        name: 'Amazon Associates',
        trackingId: this.config.amazon.associateTag,
        commissionRate: 0.03, // 3% commission
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return partners;
  }

  /**
   * Get a specific affiliate partner by ID
   */
  async getPartner(partnerId: string): Promise<AffiliatePartner | null> {
    const partners = await this.getActivePartners();
    return partners.find((p) => p.id === partnerId) || null;
  }

  /**
   * Generate a tracking URL for an affiliate link
   * Format: https://example.com?partner=walmart&tracking_id=xxx&url=encoded_product_url
   */
  generateTrackingUrl(partner: string, productUrl: string): string {
    const trackingUrl = this.config.getTrackingUrl(partner, productUrl);

    // Add UR tracking parameter
    const separator = trackingUrl.includes('?') ? '&' : '?';
    return `${trackingUrl}${separator}ur_ref=ur_creator_platform`;
  }

  /**
   * Generate an affiliate link object with all details
   */
  async generateAffiliateLink(partner: string, productUrl: string): Promise<AffiliateLink | null> {
    const partnerConfig = await this.getPartner(partner);

    if (!partnerConfig) {
      return null;
    }

    return {
      partner: partnerConfig.name,
      productUrl,
      trackingUrl: this.generateTrackingUrl(partner, productUrl),
      commissionRate: partnerConfig.commissionRate,
    };
  }

  /**
   * Parse affiliate links from text
   * Looks for patterns like [affiliate:walmart:https://...]
   */
  parseAffiliateLinks(text: string): AffiliateLink[] {
    const affiliatePattern = /\[affiliate:(\w+):([^\]]+)\]/g;
    const links: AffiliateLink[] = [];

    let match;
    while ((match = affiliatePattern.exec(text)) !== null) {
      const [, partner, productUrl] = match;
      const trackingUrl = this.generateTrackingUrl(partner, productUrl);

      links.push({
        partner,
        productUrl,
        trackingUrl,
        commissionRate: 0, // Will be populated from database
      });
    }

    return links;
  }

  /**
   * Replace affiliate link placeholders with actual tracking URLs
   * Converts [affiliate:walmart:https://...] to actual tracking URLs
   */
  async replaceAffiliateLinks(text: string): Promise<string> {
    const affiliatePattern = /\[affiliate:(\w+):([^\]]+)\]/g;
    let result = text;

    const matches = text.matchAll(affiliatePattern);
    for (const match of matches) {
      const [fullMatch, partner, productUrl] = match;
      const trackingUrl = this.generateTrackingUrl(partner, productUrl);
      result = result.replace(fullMatch, trackingUrl);
    }

    return result;
  }

  /**
   * Validate affiliate link format
   */
  isValidAffiliateLink(link: string): boolean {
    try {
      new URL(link);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get commission estimate for a sale amount
   */
  async getCommissionEstimate(partner: string, saleAmount: number): Promise<number> {
    const partnerConfig = await this.getPartner(partner);

    if (!partnerConfig) {
      return 0;
    }

    return saleAmount * partnerConfig.commissionRate;
  }

  /**
   * Track affiliate click (for analytics)
   * In production, this would log to database/analytics service
   */
  async trackAffiliateClick(partner: string, productUrl: string, userId: string): Promise<void> {
    // TODO: Log to database
    console.log(`[Affiliate Click] Partner: ${partner}, User: ${userId}, Product: ${productUrl}`);
  }

  /**
   * Get affiliate statistics for a creator
   * In production, this would query analytics database
   */
  async getCreatorAffiliateStats(creatorId: string): Promise<{
    totalClicks: number;
    totalCommissions: number;
    topPartners: Array<{ name: string; clicks: number; commission: number }>;
  }> {
    // TODO: Query database for creator affiliate stats
    return {
      totalClicks: 0,
      totalCommissions: 0,
      topPartners: [],
    };
  }
}

/**
 * Singleton instance
 */
let affiliateService: AffiliateService | null = null;

export function getAffiliateService(): AffiliateService {
  if (!affiliateService) {
    affiliateService = new AffiliateService();
  }
  return affiliateService;
}

export default getAffiliateService;
