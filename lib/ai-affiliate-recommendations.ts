/**
 * AI Affiliate Recommendation Engine
 * Provides smart affiliate link suggestions based on AI specialty and audience
 */

import { affiliateNetworksService, AffiliateProduct } from './affiliate-networks';

export interface AIAffiliateProfile {
  aiCreatorId: string;
  specialty: 'wellness' | 'music' | 'video' | 'content';
  audienceSize: number;
  engagementRate: number;
  preferredCategories: string[];
  averageOrderValue: number;
  conversionRate: number;
}

export interface AffiliateRecommendation {
  productId: string;
  productName: string;
  reason: string;
  expectedRevenue: number;
  matchScore: number; // 0-100
  category: string;
  commission: number;
  affiliateUrl: string;
}

export class AIAffiliateRecommendationEngine {
  private aiProfiles: Map<string, AIAffiliateProfile> = new Map();

  // Category mappings by AI specialty
  private specialtyCategories: Record<string, string[]> = {
    wellness: ['health', 'fitness', 'yoga', 'meditation', 'supplements', 'wellness', 'nutrition'],
    music: ['instruments', 'audio', 'music-production', 'headphones', 'speakers', 'software'],
    video: ['cameras', 'lighting', 'editing-software', 'tripods', 'microphones', 'video-production'],
    content: ['writing-tools', 'software', 'courses', 'books', 'productivity', 'education'],
  };

  /**
   * Create AI affiliate profile
   */
  createAIProfile(profile: AIAffiliateProfile): void {
    this.aiProfiles.set(profile.aiCreatorId, profile);
  }

  /**
   * Get AI profile
   */
  getAIProfile(aiCreatorId: string): AIAffiliateProfile | undefined {
    return this.aiProfiles.get(aiCreatorId);
  }

  /**
   * Get recommended products for AI
   */
  getRecommendedProducts(aiCreatorId: string, limit: number = 10): AffiliateRecommendation[] {
    const profile = this.aiProfiles.get(aiCreatorId);
    if (!profile) return [];

    const categories = this.specialtyCategories[profile.specialty] || [];
    const allProducts: AffiliateProduct[] = [];

    // Get products from all networks
    affiliateNetworksService.getAllNetworks().forEach(network => {
      const products = affiliateNetworksService.getNetworkProducts(network.id);
      allProducts.push(...products);
    });

    // Filter and score products
    const recommendations = allProducts
      .filter(product => categories.includes(product.category))
      .map(product => ({
        product,
        score: this.calculateMatchScore(product, profile),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ product, score }) => ({
        productId: product.id,
        productName: product.productName,
        reason: this.generateRecommendationReason(product, profile),
        expectedRevenue: this.calculateExpectedRevenue(product, profile),
        matchScore: Math.round(score),
        category: product.category,
        commission: product.commission,
        affiliateUrl: product.affiliateUrl,
      }));

    return recommendations;
  }

  /**
   * Calculate match score for product
   */
  private calculateMatchScore(product: AffiliateProduct, profile: AIAffiliateProfile): number {
    let score = 0;

    // Rating score (0-30)
    score += Math.min(product.rating * 3, 30);

    // Commission score (0-25)
    score += Math.min(product.commission * 2.5, 25);

    // Audience fit score (0-25)
    const audienceFit = product.reviews > 100 ? 25 : (product.reviews / 100) * 25;
    score += audienceFit;

    // Price alignment (0-20)
    const priceAlignment = Math.abs(product.price - profile.averageOrderValue) < 50 ? 20 : 10;
    score += priceAlignment;

    return score;
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(product: AffiliateProduct, profile: AIAffiliateProfile): string {
    const reasons: string[] = [];

    if (product.rating >= 4.5) {
      reasons.push(`Highly rated (${product.rating}/5)`);
    }

    if (product.commission >= 10) {
      reasons.push(`Strong commission (${product.commission}%)`);
    }

    if (product.reviews > 500) {
      reasons.push(`Trusted by ${product.reviews}+ customers`);
    }

    if (Math.abs(product.price - profile.averageOrderValue) < 50) {
      reasons.push('Perfect price point for your audience');
    }

    return reasons.join(' • ') || 'Great fit for your audience';
  }

  /**
   * Calculate expected revenue
   */
  private calculateExpectedRevenue(product: AffiliateProduct, profile: AIAffiliateProfile): number {
    const monthlyImpressions = profile.audienceSize * profile.engagementRate * 30;
    const clicks = monthlyImpressions * 0.02; // 2% CTR
    const conversions = clicks * profile.conversionRate;
    const revenue = conversions * (product.price * product.commission / 100);

    return Math.round(revenue);
  }

  /**
   * Get trending products for AI
   */
  getTrendingProducts(aiCreatorId: string, limit: number = 5): AffiliateRecommendation[] {
    const profile = this.aiProfiles.get(aiCreatorId);
    if (!profile) return [];

    const categories = this.specialtyCategories[profile.specialty] || [];
    const allProducts: AffiliateProduct[] = [];

    affiliateNetworksService.getAllNetworks().forEach(network => {
      const products = affiliateNetworksService.getNetworkProducts(network.id);
      allProducts.push(...products);
    });

    return allProducts
      .filter(product => categories.includes(product.category) && product.inStock)
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, limit)
      .map(product => ({
        productId: product.id,
        productName: product.productName,
        reason: `Trending in ${product.category}`,
        expectedRevenue: this.calculateExpectedRevenue(product, profile),
        matchScore: Math.round(this.calculateMatchScore(product, profile)),
        category: product.category,
        commission: product.commission,
        affiliateUrl: product.affiliateUrl,
      }));
  }

  /**
   * Get high-commission products for AI
   */
  getHighCommissionProducts(aiCreatorId: string, limit: number = 5): AffiliateRecommendation[] {
    const profile = this.aiProfiles.get(aiCreatorId);
    if (!profile) return [];

    const categories = this.specialtyCategories[profile.specialty] || [];
    const allProducts: AffiliateProduct[] = [];

    affiliateNetworksService.getAllNetworks().forEach(network => {
      const products = affiliateNetworksService.getNetworkProducts(network.id);
      allProducts.push(...products);
    });

    return allProducts
      .filter(product => categories.includes(product.category))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, limit)
      .map(product => ({
        productId: product.id,
        productName: product.productName,
        reason: `High commission opportunity (${product.commission}%)`,
        expectedRevenue: this.calculateExpectedRevenue(product, profile),
        matchScore: Math.round(this.calculateMatchScore(product, profile)),
        category: product.category,
        commission: product.commission,
        affiliateUrl: product.affiliateUrl,
      }));
  }

  /**
   * Get personalized recommendations for all AIs
   */
  getAllAIRecommendations(): Map<string, AffiliateRecommendation[]> {
    const allRecommendations = new Map<string, AffiliateRecommendation[]>();

    for (const [aiCreatorId] of this.aiProfiles) {
      allRecommendations.set(aiCreatorId, this.getRecommendedProducts(aiCreatorId));
    }

    return allRecommendations;
  }

  /**
   * Get recommendation insights
   */
  getRecommendationInsights(aiCreatorId: string): {
    totalRecommendations: number;
    averageMatchScore: number;
    totalExpectedRevenue: number;
    topCategory: string;
    recommendations: AffiliateRecommendation[];
  } {
    const recommendations = this.getRecommendedProducts(aiCreatorId, 20);

    const averageMatchScore = recommendations.length > 0
      ? Math.round(recommendations.reduce((sum, r) => sum + r.matchScore, 0) / recommendations.length)
      : 0;

    const totalExpectedRevenue = recommendations.reduce((sum, r) => sum + r.expectedRevenue, 0);

    const categoryCount: Record<string, number> = {};
    recommendations.forEach(r => {
      categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
    });

    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalRecommendations: recommendations.length,
      averageMatchScore,
      totalExpectedRevenue,
      topCategory,
      recommendations: recommendations.slice(0, 10),
    };
  }
}

// Export singleton instance
export const aiAffiliateRecommendationEngine = new AIAffiliateRecommendationEngine();
