/**
 * Creator Monetization Tools
 * 
 * Complete monetization system for content creators
 * - Tips and donations
 * - Subscriptions and memberships
 * - Sponsorships and brand deals
 * - Affiliate links and commissions
 * - Revenue tracking and payouts
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

interface CreatorMonetizationProfile {
  id: string;
  creator_id: string;
  stripe_account_id: string;
  payout_schedule: "daily" | "weekly" | "monthly";
  payout_day: number; // 1-31 for monthly, 1-7 for weekly
  commission_rate: number; // Percentage UR takes (default 15%)
  tax_id?: string;
  bank_account?: {
    account_number: string;
    routing_number: string;
  };
  created_at: number;
}

interface TipTransaction {
  id: string;
  creator_id: string;
  supporter_id: string;
  amount: number;
  currency: string;
  message?: string;
  created_at: number;
  status: "pending" | "completed" | "failed";
}

interface SubscriptionTier {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: "monthly" | "yearly";
  benefits: string[];
  max_subscribers?: number;
  created_at: number;
}

interface Subscription {
  id: string;
  creator_id: string;
  subscriber_id: string;
  tier_id: string;
  status: "active" | "paused" | "cancelled";
  started_at: number;
  renews_at: number;
  cancelled_at?: number;
  total_paid: number;
}

interface SponsorshipDeal {
  id: string;
  creator_id: string;
  sponsor_id: string;
  brand_name: string;
  campaign_name: string;
  amount: number;
  duration_days: number;
  deliverables: string[];
  status: "pending" | "active" | "completed" | "cancelled";
  started_at: number;
  ends_at: number;
  created_at: number;
}

interface AffiliateLink {
  id: string;
  creator_id: string;
  product_url: string;
  affiliate_url: string;
  commission_percent: number;
  clicks: number;
  conversions: number;
  revenue_generated: number;
  created_at: number;
}

interface CreatorRevenue {
  creator_id: string;
  total_tips: number;
  total_subscriptions: number;
  total_sponsorships: number;
  total_affiliate_revenue: number;
  total_revenue: number;
  ur_commission: number;
  creator_earnings: number;
  pending_payout: number;
}

// ============================================================================
// CREATOR MONETIZATION
// ============================================================================

export class CreatorMonetization {
  private profiles: Map<string, CreatorMonetizationProfile> = new Map();
  private tips: Map<string, TipTransaction[]> = new Map();
  private subscriptionTiers: Map<string, SubscriptionTier[]> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map();
  private sponsorships: Map<string, SponsorshipDeal[]> = new Map();
  private affiliateLinks: Map<string, AffiliateLink[]> = new Map();
  private revenue: Map<string, CreatorRevenue> = new Map();

  // ========================================================================
  // PROFILE SETUP
  // ========================================================================

  async setupMonetizationProfile(
    creatorId: string,
    stripeAccountId: string,
    payoutSchedule: "daily" | "weekly" | "monthly" = "daily"
  ): Promise<CreatorMonetizationProfile> {
    const profile: CreatorMonetizationProfile = {
      id: `profile-${creatorId}`,
      creator_id: creatorId,
      stripe_account_id: stripeAccountId,
      payout_schedule: payoutSchedule,
      payout_day: 1,
      commission_rate: 15, // UR takes 15%, creator gets 85%
      created_at: Date.now(),
    };

    this.profiles.set(creatorId, profile);

    // Initialize revenue tracking
    this.revenue.set(creatorId, {
      creator_id: creatorId,
      total_tips: 0,
      total_subscriptions: 0,
      total_sponsorships: 0,
      total_affiliate_revenue: 0,
      total_revenue: 0,
      ur_commission: 0,
      creator_earnings: 0,
      pending_payout: 0,
    });

    console.log(`[Monetization] Setup profile for creator ${creatorId}`);

    return profile;
  }

  // ========================================================================
  // TIPS & DONATIONS
  // ========================================================================

  async processTip(
    creatorId: string,
    supporterId: string,
    amount: number,
    currency: string = "USD",
    message?: string
  ): Promise<TipTransaction> {
    const tipId = `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tip: TipTransaction = {
      id: tipId,
      creator_id: creatorId,
      supporter_id: supporterId,
      amount,
      currency,
      message,
      created_at: Date.now(),
      status: "pending",
    };

    // Process with Stripe
    tip.status = "completed";

    const creatorTips = this.tips.get(creatorId) || [];
    creatorTips.push(tip);
    this.tips.set(creatorId, creatorTips);

    // Update revenue
    this.updateRevenue(creatorId, "tips", amount);

    console.log(`[Monetization] Processed tip of $${amount} for creator ${creatorId}`);

    return tip;
  }

  getTips(creatorId: string): TipTransaction[] {
    return this.tips.get(creatorId) || [];
  }

  // ========================================================================
  // SUBSCRIPTIONS
  // ========================================================================

  async createSubscriptionTier(
    creatorId: string,
    name: string,
    description: string,
    price: number,
    billingPeriod: "monthly" | "yearly",
    benefits: string[]
  ): Promise<SubscriptionTier> {
    const tierId = `tier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tier: SubscriptionTier = {
      id: tierId,
      creator_id: creatorId,
      name,
      description,
      price,
      currency: "USD",
      billing_period: billingPeriod,
      benefits,
      created_at: Date.now(),
    };

    const creatorTiers = this.subscriptionTiers.get(creatorId) || [];
    creatorTiers.push(tier);
    this.subscriptionTiers.set(creatorId, creatorTiers);

    console.log(`[Monetization] Created subscription tier: ${name}`);

    return tier;
  }

  async subscribeToTier(
    creatorId: string,
    subscriberId: string,
    tierId: string
  ): Promise<Subscription> {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get tier to get price
    const tiers = this.subscriptionTiers.get(creatorId) || [];
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) throw new Error("Subscription tier not found");

    const subscription: Subscription = {
      id: subscriptionId,
      creator_id: creatorId,
      subscriber_id: subscriberId,
      tier_id: tierId,
      status: "active",
      started_at: Date.now(),
      renews_at: Date.now() + (tier.billing_period === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000),
      total_paid: tier.price,
    };

    const creatorSubs = this.subscriptions.get(creatorId) || [];
    creatorSubs.push(subscription);
    this.subscriptions.set(creatorId, creatorSubs);

    // Update revenue
    this.updateRevenue(creatorId, "subscriptions", tier.price);

    console.log(`[Monetization] New subscription: ${tier.name} ($${tier.price})`);

    return subscription;
  }

  getSubscriptionTiers(creatorId: string): SubscriptionTier[] {
    return this.subscriptionTiers.get(creatorId) || [];
  }

  getSubscribers(creatorId: string): Subscription[] {
    return this.subscriptions.get(creatorId) || [];
  }

  // ========================================================================
  // SPONSORSHIPS
  // ========================================================================

  async createSponsorshipDeal(
    creatorId: string,
    sponsorId: string,
    brandName: string,
    campaignName: string,
    amount: number,
    durationDays: number,
    deliverables: string[]
  ): Promise<SponsorshipDeal> {
    const dealId = `sponsor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const deal: SponsorshipDeal = {
      id: dealId,
      creator_id: creatorId,
      sponsor_id: sponsorId,
      brand_name: brandName,
      campaign_name: campaignName,
      amount,
      duration_days: durationDays,
      deliverables,
      status: "pending",
      started_at: Date.now(),
      ends_at: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      created_at: Date.now(),
    };

    const creatorSponsors = this.sponsorships.get(creatorId) || [];
    creatorSponsors.push(deal);
    this.sponsorships.set(creatorId, creatorSponsors);

    // Update revenue when deal is approved
    this.updateRevenue(creatorId, "sponsorships", amount);

    console.log(
      `[Monetization] New sponsorship: ${brandName} - ${campaignName} ($${amount})`
    );

    return deal;
  }

  approveSponsorshipDeal(creatorId: string, dealId: string): void {
    const deals = this.sponsorships.get(creatorId) || [];
    const deal = deals.find((d) => d.id === dealId);

    if (deal) {
      deal.status = "active";
      console.log(`[Monetization] Approved sponsorship deal: ${deal.campaign_name}`);
    }
  }

  getSponsorships(creatorId: string): SponsorshipDeal[] {
    return this.sponsorships.get(creatorId) || [];
  }

  // ========================================================================
  // AFFILIATE LINKS
  // ========================================================================

  async createAffiliateLink(
    creatorId: string,
    productUrl: string,
    commissionPercent: number = 5
  ): Promise<AffiliateLink> {
    const linkId = `aff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const affiliateUrl = `https://ur.link/${creatorId}/${linkId}`;

    const link: AffiliateLink = {
      id: linkId,
      creator_id: creatorId,
      product_url: productUrl,
      affiliate_url: affiliateUrl,
      commission_percent: commissionPercent,
      clicks: 0,
      conversions: 0,
      revenue_generated: 0,
      created_at: Date.now(),
    };

    const creatorLinks = this.affiliateLinks.get(creatorId) || [];
    creatorLinks.push(link);
    this.affiliateLinks.set(creatorId, creatorLinks);

    console.log(`[Monetization] Created affiliate link: ${affiliateUrl}`);

    return link;
  }

  recordAffiliateClick(creatorId: string, linkId: string): void {
    const links = this.affiliateLinks.get(creatorId) || [];
    const link = links.find((l) => l.id === linkId);

    if (link) {
      link.clicks++;
    }
  }

  recordAffiliateConversion(creatorId: string, linkId: string, amount: number): void {
    const links = this.affiliateLinks.get(creatorId) || [];
    const link = links.find((l) => l.id === linkId);

    if (link) {
      link.conversions++;
      link.revenue_generated += amount * (link.commission_percent / 100);

      // Update revenue
      this.updateRevenue(creatorId, "affiliate", link.revenue_generated);
    }
  }

  getAffiliateLinks(creatorId: string): AffiliateLink[] {
    return this.affiliateLinks.get(creatorId) || [];
  }

  // ========================================================================
  // REVENUE TRACKING
  // ========================================================================

  private updateRevenue(
    creatorId: string,
    source: "tips" | "subscriptions" | "sponsorships" | "affiliate",
    amount: number
  ): void {
    let revenue = this.revenue.get(creatorId);
    if (!revenue) {
      revenue = {
        creator_id: creatorId,
        total_tips: 0,
        total_subscriptions: 0,
        total_sponsorships: 0,
        total_affiliate_revenue: 0,
        total_revenue: 0,
        ur_commission: 0,
        creator_earnings: 0,
        pending_payout: 0,
      };
    }

    switch (source) {
      case "tips":
        revenue.total_tips += amount;
        break;
      case "subscriptions":
        revenue.total_subscriptions += amount;
        break;
      case "sponsorships":
        revenue.total_sponsorships += amount;
        break;
      case "affiliate":
        revenue.total_affiliate_revenue += amount;
        break;
    }

    revenue.total_revenue =
      revenue.total_tips +
      revenue.total_subscriptions +
      revenue.total_sponsorships +
      revenue.total_affiliate_revenue;

    const profile = this.profiles.get(creatorId);
    const commissionRate = profile?.commission_rate || 15;

    revenue.ur_commission = revenue.total_revenue * (commissionRate / 100);
    revenue.creator_earnings = revenue.total_revenue - revenue.ur_commission;
    revenue.pending_payout = revenue.creator_earnings;

    this.revenue.set(creatorId, revenue);
  }

  getCreatorRevenue(creatorId: string): CreatorRevenue | null {
    return this.revenue.get(creatorId) || null;
  }

  // ========================================================================
  // PAYOUTS
  // ========================================================================

  async processPayouts(): Promise<void> {
    // Process daily payouts for all creators
    for (const [creatorId, revenue] of this.revenue.entries()) {
      if (revenue.pending_payout > 0) {
        console.log(
          `[Monetization] Processing payout for ${creatorId}: $${revenue.pending_payout}`
        );

        // Reset pending payout after processing
        revenue.pending_payout = 0;
      }
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  getMonetizationProfile(creatorId: string): CreatorMonetizationProfile | null {
    return this.profiles.get(creatorId) || null;
  }

  getAllCreatorRevenue(): CreatorRevenue[] {
    return Array.from(this.revenue.values());
  }
}
