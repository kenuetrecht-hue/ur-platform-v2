/**
 * AI Audience Learning Service
 * Analyzes follower behavior, interests, and engagement patterns
 * Enables AI creators to understand their audience for personalized pitching
 */

export interface AudienceMember {
  userId: string;
  creatorId: string;
  followedAt: Date;
  engagementScore: number;
  interactionCount: number;
  lastInteractionAt?: Date;
  interests: string[];
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  likelyToConvert: boolean;
  conversionProbability: number; // 0-100
  preferredContentType: 'video' | 'audio' | 'text' | 'mixed';
  subscriptionReadiness: 'cold' | 'warm' | 'hot';
  estimatedLifetimeValue: number;
}

export interface AudienceInsight {
  creatorId: string;
  totalFollowers: number;
  averageEngagementScore: number;
  topInterests: { interest: string; count: number }[];
  engagementDistribution: {
    high: number; // > 75
    medium: number; // 25-75
    low: number; // < 25
  };
  conversionReadyCount: number;
  estimatedTotalLTV: number;
  audienceGrowthRate: number;
  churnRate: number;
  recommendedPitchTiming: string; // e.g., "after 3rd interaction"
  topConversionSegments: string[];
}

export interface InteractionEvent {
  userId: string;
  creatorId: string;
  eventType: 'view' | 'like' | 'comment' | 'share' | 'message' | 'bookmark';
  contentId: string;
  timestamp: Date;
  engagementValue: number; // 1-10
}

class AIAudienceLearningService {
  private audienceMembers: Map<string, AudienceMember[]> = new Map();
  private interactionEvents: Map<string, InteractionEvent[]> = new Map();
  private audienceInsights: Map<string, AudienceInsight> = new Map();

  /**
   * Track audience member
   */
  trackAudienceMember(userId: string, creatorId: string): AudienceMember {
    const member: AudienceMember = {
      userId,
      creatorId,
      followedAt: new Date(),
      engagementScore: 0,
      interactionCount: 0,
      interests: [],
      engagementTrend: 'stable',
      likelyToConvert: false,
      conversionProbability: 0,
      preferredContentType: 'mixed',
      subscriptionReadiness: 'cold',
      estimatedLifetimeValue: 0,
    };

    if (!this.audienceMembers.has(creatorId)) {
      this.audienceMembers.set(creatorId, []);
    }

    this.audienceMembers.get(creatorId)!.push(member);
    this.updateAudienceInsights(creatorId);

    return member;
  }

  /**
   * Record interaction event
   */
  recordInteraction(userId: string, creatorId: string, eventType: 'view' | 'like' | 'comment' | 'share' | 'message' | 'bookmark', contentId: string): void {
    const engagementValues: Record<string, number> = {
      view: 1,
      like: 3,
      comment: 5,
      share: 7,
      message: 8,
      bookmark: 4,
    };

    const event: InteractionEvent = {
      userId,
      creatorId,
      eventType,
      contentId,
      timestamp: new Date(),
      engagementValue: engagementValues[eventType],
    };

    if (!this.interactionEvents.has(creatorId)) {
      this.interactionEvents.set(creatorId, []);
    }

    this.interactionEvents.get(creatorId)!.push(event);

    // Update audience member
    this.updateAudienceMember(userId, creatorId, event);
  }

  /**
   * Update audience member based on interaction
   */
  private updateAudienceMember(userId: string, creatorId: string, event: InteractionEvent): void {
    const members = this.audienceMembers.get(creatorId);
    if (!members) return;

    const member = members.find(m => m.userId === userId);
    if (!member) return;

    member.interactionCount++;
    member.lastInteractionAt = new Date();
    member.engagementScore += event.engagementValue;

    // Infer interests from content
    this.inferInterests(member, event);

    // Update subscription readiness
    this.updateSubscriptionReadiness(member);

    // Calculate conversion probability
    this.calculateConversionProbability(member);

    // Update LTV
    this.estimateLifetimeValue(member);

    this.updateAudienceInsights(creatorId);
  }

  /**
   * Infer interests from interaction
   */
  private inferInterests(member: AudienceMember, event: InteractionEvent): void {
    // Extract interests from content ID or event type
    const interestMap: Record<string, string[]> = {
      music: ['music', 'audio', 'production'],
      video: ['video', 'editing', 'visual'],
      wellness: ['health', 'fitness', 'wellness'],
      tech: ['technology', 'coding', 'development'],
      art: ['art', 'design', 'creative'],
      business: ['business', 'entrepreneurship', 'marketing'],
    };

    for (const [key, interests] of Object.entries(interestMap)) {
      if (event.contentId.toLowerCase().includes(key)) {
        for (const interest of interests) {
          if (!member.interests.includes(interest)) {
            member.interests.push(interest);
          }
        }
      }
    }
  }

  /**
   * Update subscription readiness based on engagement
   */
  private updateSubscriptionReadiness(member: AudienceMember): void {
    if (member.engagementScore < 10) {
      member.subscriptionReadiness = 'cold';
    } else if (member.engagementScore < 30) {
      member.subscriptionReadiness = 'warm';
    } else {
      member.subscriptionReadiness = 'hot';
    }
  }

  /**
   * Calculate conversion probability
   */
  private calculateConversionProbability(member: AudienceMember): void {
    let probability = 0;

    // Engagement score factor (40%)
    probability += Math.min(member.engagementScore / 100, 1) * 40;

    // Interaction frequency factor (30%)
    const daysFollowed = (new Date().getTime() - member.followedAt.getTime()) / (1000 * 60 * 60 * 24);
    const interactionRate = member.interactionCount / Math.max(daysFollowed, 1);
    probability += Math.min(interactionRate * 10, 1) * 30;

    // Recency factor (20%)
    if (member.lastInteractionAt) {
      const daysSinceLastInteraction = (new Date().getTime() - member.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastInteraction < 7) {
        probability += 20;
      } else if (daysSinceLastInteraction < 30) {
        probability += 10;
      }
    }

    // Interest alignment factor (10%)
    probability += Math.min(member.interests.length * 2, 1) * 10;

    member.conversionProbability = Math.round(probability);
    member.likelyToConvert = member.conversionProbability > 50;
  }

  /**
   * Estimate lifetime value
   */
  private estimateLifetimeValue(member: AudienceMember): void {
    // Base LTV calculation
    let ltv = 0;

    // Subscription tier prediction
    if (member.conversionProbability > 80) {
      ltv = 99.99 * 12; // Platinum tier
    } else if (member.conversionProbability > 60) {
      ltv = 24.99 * 12; // Gold tier
    } else if (member.conversionProbability > 40) {
      ltv = 9.99 * 12; // Silver tier
    } else {
      ltv = 0; // Free tier
    }

    // Adjust based on engagement trend
    if (member.engagementTrend === 'increasing') {
      ltv *= 1.5;
    } else if (member.engagementTrend === 'decreasing') {
      ltv *= 0.5;
    }

    member.estimatedLifetimeValue = Math.round(ltv * 100) / 100;
  }

  /**
   * Get audience insights
   */
  getAudienceInsights(creatorId: string): AudienceInsight {
    return this.audienceInsights.get(creatorId) || this.createDefaultInsights(creatorId);
  }

  /**
   * Update audience insights
   */
  private updateAudienceInsights(creatorId: string): void {
    const members = this.audienceMembers.get(creatorId) || [];
    const events = this.interactionEvents.get(creatorId) || [];

    if (members.length === 0) {
      this.audienceInsights.set(creatorId, this.createDefaultInsights(creatorId));
      return;
    }

    // Calculate average engagement
    const avgEngagement = members.reduce((sum, m) => sum + m.engagementScore, 0) / members.length;

    // Count engagement distribution
    const engagementDist = {
      high: members.filter(m => m.engagementScore > 75).length,
      medium: members.filter(m => m.engagementScore >= 25 && m.engagementScore <= 75).length,
      low: members.filter(m => m.engagementScore < 25).length,
    };

    // Get top interests
    const interestCount: Record<string, number> = {};
    for (const member of members) {
      for (const interest of member.interests) {
        interestCount[interest] = (interestCount[interest] || 0) + 1;
      }
    }
    const topInterests = Object.entries(interestCount)
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate growth and churn
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newFollowers = members.filter(m => m.followedAt >= thirtyDaysAgo).length;
    const inactiveMembers = members.filter(m => !m.lastInteractionAt || new Date(m.lastInteractionAt).getTime() < thirtyDaysAgo.getTime()).length;

    const growthRate = (newFollowers / members.length) * 100;
    const churnRate = (inactiveMembers / members.length) * 100;

    // Count conversion ready
    const conversionReady = members.filter(m => m.likelyToConvert).length;

    // Total LTV
    const totalLTV = members.reduce((sum, m) => sum + m.estimatedLifetimeValue, 0);

    // Top conversion segments
    const topSegments = topInterests.slice(0, 3).map(t => t.interest);

    const insights: AudienceInsight = {
      creatorId,
      totalFollowers: members.length,
      averageEngagementScore: Math.round(avgEngagement * 100) / 100,
      topInterests,
      engagementDistribution: engagementDist,
      conversionReadyCount: conversionReady,
      estimatedTotalLTV: Math.round(totalLTV * 100) / 100,
      audienceGrowthRate: Math.round(growthRate * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      recommendedPitchTiming: this.getRecommendedPitchTiming(members),
      topConversionSegments: topSegments,
    };

    this.audienceInsights.set(creatorId, insights);
  }

  /**
   * Get recommended pitch timing
   */
  private getRecommendedPitchTiming(members: AudienceMember[]): string {
    const avgInteractions = members.reduce((sum, m) => sum + m.interactionCount, 0) / members.length;

    if (avgInteractions < 2) {
      return 'after 3rd interaction';
    } else if (avgInteractions < 5) {
      return 'after 5th interaction';
    } else {
      return 'after 7th interaction or when engagement peaks';
    }
  }

  /**
   * Create default insights
   */
  private createDefaultInsights(creatorId: string): AudienceInsight {
    return {
      creatorId,
      totalFollowers: 0,
      averageEngagementScore: 0,
      topInterests: [],
      engagementDistribution: { high: 0, medium: 0, low: 0 },
      conversionReadyCount: 0,
      estimatedTotalLTV: 0,
      audienceGrowthRate: 0,
      churnRate: 0,
      recommendedPitchTiming: 'after 3rd interaction',
      topConversionSegments: [],
    };
  }

  /**
   * Get audience member profile
   */
  getAudienceMember(userId: string, creatorId: string): AudienceMember | undefined {
    const members = this.audienceMembers.get(creatorId);
    return members?.find(m => m.userId === userId);
  }

  /**
   * Get conversion-ready audience
   */
  getConversionReadyAudience(creatorId: string): AudienceMember[] {
    const members = this.audienceMembers.get(creatorId) || [];
    return members.filter(m => m.likelyToConvert).sort((a, b) => b.conversionProbability - a.conversionProbability);
  }

  /**
   * Get warm audience (potential converters)
   */
  getWarmAudience(creatorId: string): AudienceMember[] {
    const members = this.audienceMembers.get(creatorId) || [];
    return members.filter(m => m.subscriptionReadiness === 'warm').sort((a, b) => b.engagementScore - a.engagementScore);
  }

  /**
   * Get audience by interest
   */
  getAudienceByInterest(creatorId: string, interest: string): AudienceMember[] {
    const members = this.audienceMembers.get(creatorId) || [];
    return members.filter(m => m.interests.includes(interest));
  }
}

export const aiAudienceLearningService = new AIAudienceLearningService();
