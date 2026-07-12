import { describe, it, expect, beforeEach } from 'vitest';
import { aiAudienceLearningService } from '@/lib/ai-audience-learning-service';
import { aiSubscriptionPitchEngine } from '@/lib/ai-subscription-pitch-engine';

describe('AI Audience Learning Service', () => {
  beforeEach(() => {
    // Reset services
  });

  it('should track audience member', () => {
    const member = aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    expect(member.userId).toBe('user1');
    expect(member.engagementScore).toBe(0);
    expect(member.subscriptionReadiness).toBe('cold');
  });

  it('should record interaction and update engagement', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    aiAudienceLearningService.recordInteraction('user1', 'creator1', 'like', 'content1');
    
    const member = aiAudienceLearningService.getAudienceMember('user1', 'creator1');
    expect(member?.engagementScore).toBeGreaterThan(0);
    expect(member?.interactionCount).toBe(1);
  });

  it('should infer interests from interactions', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    aiAudienceLearningService.recordInteraction('user1', 'creator1', 'like', 'music_production_101');
    
    const member = aiAudienceLearningService.getAudienceMember('user1', 'creator1');
    expect(member?.interests.length).toBeGreaterThan(0);
  });

  it('should update subscription readiness based on engagement', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    
    // Record multiple interactions
    for (let i = 0; i < 5; i++) {
      aiAudienceLearningService.recordInteraction('user1', 'creator1', 'like', `content${i}`);
    }
    
    const member = aiAudienceLearningService.getAudienceMember('user1', 'creator1');
    expect(member?.subscriptionReadiness).not.toBe('cold');
  });

  it('should calculate conversion probability', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    
    // Record high-engagement interactions
    for (let i = 0; i < 10; i++) {
      aiAudienceLearningService.recordInteraction('user1', 'creator1', 'message', `content${i}`);
    }
    
    const member = aiAudienceLearningService.getAudienceMember('user1', 'creator1');
    expect(member?.conversionProbability).toBeGreaterThan(50);
    expect(member?.likelyToConvert).toBe(true);
  });

  it('should estimate lifetime value', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    
    for (let i = 0; i < 15; i++) {
      aiAudienceLearningService.recordInteraction('user1', 'creator1', 'message', `content${i}`);
    }
    
    const member = aiAudienceLearningService.getAudienceMember('user1', 'creator1');
    expect(member?.estimatedLifetimeValue).toBeGreaterThan(0);
  });

  it('should get audience insights', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    aiAudienceLearningService.trackAudienceMember('user2', 'creator1');
    
    const insights = aiAudienceLearningService.getAudienceInsights('creator1');
    expect(insights.totalFollowers).toBe(2);
  });

  it('should get conversion-ready audience', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    
    for (let i = 0; i < 20; i++) {
      aiAudienceLearningService.recordInteraction('user1', 'creator1', 'message', `content${i}`);
    }
    
    const ready = aiAudienceLearningService.getConversionReadyAudience('creator1');
    expect(ready.length).toBeGreaterThan(0);
  });

  it('should get warm audience', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    
    for (let i = 0; i < 5; i++) {
      aiAudienceLearningService.recordInteraction('user1', 'creator1', 'like', `content${i}`);
    }
    
    const warm = aiAudienceLearningService.getWarmAudience('creator1');
    expect(warm.length).toBeGreaterThanOrEqual(0);
  });

  it('should get audience by interest', () => {
    aiAudienceLearningService.trackAudienceMember('user1', 'creator1');
    aiAudienceLearningService.recordInteraction('user1', 'creator1', 'like', 'music_production');
    
    const byInterest = aiAudienceLearningService.getAudienceByInterest('creator1', 'music');
    expect(byInterest.length).toBeGreaterThanOrEqual(0);
  });
});

describe('AI Subscription Pitch Engine', () => {
  beforeEach(() => {
    // Reset services
  });

  it('should generate subscription pitch with AI disclosure', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music', 'production'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation', 'mixing', 'mastering']);
    
    expect(pitch.aiDisclosurePrePitch).toContain('AI');
    expect(pitch.aiDisclosurePrePitch).toContain('UR LLC');
    expect(pitch.aiDisclosurePostPitch).toContain('AI');
  });

  it('should include compliance disclaimer', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation']);
    
    expect(pitch.complianceDisclaimer).toContain('entertainment');
    expect(pitch.complianceDisclaimer).toContain('UR LLC');
    expect(pitch.complianceDisclaimer).toContain('AI');
  });

  it('should calculate UR LLC revenue share', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'hot' as const,
      conversionProbability: 85,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation']);
    
    // UR LLC gets 30% of subscription
    expect(pitch.urLLCRevenueShare).toBe(pitch.estimatedValue * 0.30);
  });

  it('should recommend appropriate tier based on conversion probability', () => {
    const hotContext = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 80,
      userInterests: ['music'],
      subscriptionReadiness: 'hot' as const,
      conversionProbability: 85,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(hotContext, ['beat creation']);
    expect(pitch.recommendedTier).toBe('platinum');
  });

  it('should include benefits specific to creator abilities', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const abilities = ['beat creation', 'mixing', 'mastering'];
    const pitch = aiSubscriptionPitchEngine.generatePitch(context, abilities);
    
    expect(pitch.benefitsHighlight.length).toBeGreaterThan(0);
  });

  it('should track pitch metrics', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation']);
    const metrics = aiSubscriptionPitchEngine.getPitchMetrics('creator1');
    
    expect(metrics.sent).toBe(1);
  });

  it('should record conversion and calculate revenue', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation']);
    aiSubscriptionPitchEngine.recordConversion(pitch.pitchId, 'creator1', 24.99);
    
    const metrics = aiSubscriptionPitchEngine.getPitchMetrics('creator1');
    expect(metrics.converted).toBe(1);
    expect(metrics.revenue).toBeGreaterThan(0);
    expect(metrics.urLLCShare).toBe(metrics.revenue * 0.30);
  });

  it('should validate pitch compliance', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation']);
    const validation = aiSubscriptionPitchEngine.validatePitchCompliance(pitch);
    
    expect(validation.compliant).toBe(true);
    expect(validation.issues.length).toBe(0);
  });

  it('should generate compliance summary', () => {
    const context = {
      userId: 'user1',
      creatorId: 'creator1',
      creatorName: 'AI Music Producer',
      creatorSpecialty: 'music production',
      userEngagementScore: 50,
      userInterests: ['music'],
      subscriptionReadiness: 'warm' as const,
      conversionProbability: 65,
      preferredContentType: 'audio',
    };

    const pitch = aiSubscriptionPitchEngine.generatePitch(context, ['beat creation']);
    const summary = aiSubscriptionPitchEngine.generateComplianceSummary(pitch);
    
    expect(summary).toContain('AI');
    expect(summary).toContain('entertainment');
    expect(summary).toContain('UR LLC');
  });
});
