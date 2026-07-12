import { describe, it, expect, beforeEach } from 'vitest';
import { aiCreatorSystem } from '../lib/ai-creator-system';
import { aiCreatorDashboardService } from '../lib/ai-creator-dashboard';
import { aiCreatorAdService } from '../lib/ai-creator-ads';

describe('AI Creator System', () => {
  beforeEach(() => {
    // System is initialized with default AIs, tests are isolated
  });

  describe('AI Creator Profiles', () => {
    it('should initialize with 4 default AI creators', () => {
      const creators = aiCreatorSystem.getAllAICreators();
      expect(creators).toHaveLength(4);
    });

    it('should have correct AI specialties', () => {
      const creators = aiCreatorSystem.getAllAICreators();
      const specialties = creators.map(c => c.specialty).sort();
      expect(specialties).toEqual(['content', 'music', 'video', 'wellness']);
    });

    it('should get AI creator by ID', () => {
      const creator = aiCreatorSystem.getAICreator('ai_wellness_001');
      expect(creator).toBeDefined();
      expect(creator?.name).toBe('Dr. Wellness AI');
      expect(creator?.specialty).toBe('wellness');
    });

    it('should have initial followers and earnings', () => {
      const creator = aiCreatorSystem.getAICreator('ai_music_001');
      expect(creator?.followers).toBeGreaterThan(0);
      expect(creator?.totalEarnings).toBeGreaterThan(0);
      expect(creator?.rating).toBeGreaterThan(0);
    });
  });

  describe('AI Creator Content', () => {
    it('should add content for AI creator', () => {
      const content = aiCreatorSystem.addContent('ai_wellness_001', {
        title: 'Meditation Guide',
        description: 'A guide to meditation',
        type: 'video',
        url: 'https://example.com/meditation.mp4',
        views: 100,
        likes: 10,
        downloads: 5,
        aiCreatorId: 'ai_wellness_001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(content).toBeDefined();
      expect(content.title).toBe('Meditation Guide');
      expect(content.views).toBe(100);
    });

    it('should get content for AI creator', () => {
      aiCreatorSystem.addContent('ai_music_001', {
        title: 'Original Song',
        description: 'An original composition',
        type: 'audio',
        url: 'https://example.com/song.mp3',
        views: 500,
        likes: 50,
        downloads: 20,
        aiCreatorId: 'ai_music_001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const content = aiCreatorSystem.getAICreatorContent('ai_music_001');
      expect(content.length).toBeGreaterThan(0);
      expect(content[0].title).toBe('Original Song');
    });
  });

  describe('AI Creator Audience', () => {
    it('should add audience member for AI creator', () => {
      const audience = aiCreatorSystem.addAudience('ai_video_001', {
        userId: 'user_123',
        subscriptionTier: 'pro',
        subscriptionStartDate: new Date(),
        totalSpent: 50,
        interactionCount: 10,
        aiCreatorId: 'ai_video_001',
      });

      expect(audience).toBeDefined();
      expect(audience.userId).toBe('user_123');
      expect(audience.subscriptionTier).toBe('pro');
    });

    it('should update follower count when adding audience', () => {
      const creatorBefore = aiCreatorSystem.getAICreator('ai_content_001');
      const audienceBefore = aiCreatorSystem.getAICreatorAudience('ai_content_001').length;

      aiCreatorSystem.addAudience('ai_content_001', {
        userId: 'user_456',
        subscriptionTier: 'basic',
        subscriptionStartDate: new Date(),
        totalSpent: 20,
        interactionCount: 5,
        aiCreatorId: 'ai_content_001',
      });

      const audienceAfter = aiCreatorSystem.getAICreatorAudience('ai_content_001').length;
      expect(audienceAfter).toBeGreaterThan(audienceBefore);
    });
  });

  describe('AI Creator Earnings', () => {
    it('should record earnings for AI creator', () => {
      const earnings = aiCreatorSystem.recordEarnings('ai_wellness_001', {
        source: 'subscriptions',
        amount: 100,
        date: new Date(),
        description: 'Monthly subscriptions',
        aiCreatorId: 'ai_wellness_001',
      });

      expect(earnings).toBeDefined();
      expect(earnings.amount).toBe(100);
      expect(earnings.source).toBe('subscriptions');
    });

    it('should update total earnings when recording earnings', () => {
      const creatorBefore = aiCreatorSystem.getAICreator('ai_music_001');
      const earningsBefore = creatorBefore?.totalEarnings || 0;

      aiCreatorSystem.recordEarnings('ai_music_001', {
        source: 'content_sales',
        amount: 250,
        date: new Date(),
        description: 'Content sales',
        aiCreatorId: 'ai_music_001',
      });

      const creatorAfter = aiCreatorSystem.getAICreator('ai_music_001');
      expect(creatorAfter?.totalEarnings).toBeGreaterThan(earningsBefore);
    });
  });

  describe('AI Creator Ads', () => {
    it('should add ad for AI creator', () => {
      const ad = aiCreatorSystem.addAd('ai_video_001', {
        title: 'Video Editing Course',
        description: 'Learn video editing',
        imageUrl: 'https://example.com/ad.png',
        targetUrl: 'https://example.com/course',
        placement: 'profile',
        isActive: true,
        impressions: 0,
        clicks: 0,
        revenue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(ad).toBeDefined();
      expect(ad.title).toBe('Video Editing Course');
      expect(ad.placement).toBe('profile');
    });

    it('should update ad performance', () => {
      const ad = aiCreatorSystem.addAd('ai_content_001', {
        title: 'Writing Workshop',
        description: 'Learn creative writing',
        imageUrl: 'https://example.com/ad.png',
        targetUrl: 'https://example.com/workshop',
        placement: 'content',
        isActive: true,
        impressions: 0,
        clicks: 0,
        revenue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      aiCreatorSystem.updateAdPerformance('ai_content_001', ad.id, 1000, 50);

      const ads = aiCreatorSystem.getAICreatorAds('ai_content_001');
      const updated = ads.find(a => a.id === ad.id);
      expect(updated?.impressions).toBe(1000);
      expect(updated?.clicks).toBe(50);
      expect(updated?.revenue).toBeGreaterThan(0);
    });
  });

  describe('Admin Controls', () => {
    it('should get admin control for AI creator', () => {
      const control = aiCreatorSystem.getAdminControl('ai_wellness_001');
      expect(control).toBeDefined();
      expect(control?.isMonitored).toBe(true);
      expect(control?.isPaused).toBe(false);
    });

    it('should pause AI creator', () => {
      aiCreatorSystem.pauseAICreator('ai_music_001');

      const creator = aiCreatorSystem.getAICreator('ai_music_001');
      const control = aiCreatorSystem.getAdminControl('ai_music_001');

      expect(creator?.isActive).toBe(false);
      expect(control?.isPaused).toBe(true);
    });

    it('should resume AI creator', () => {
      aiCreatorSystem.pauseAICreator('ai_video_001');
      aiCreatorSystem.resumeAICreator('ai_video_001');

      const creator = aiCreatorSystem.getAICreator('ai_video_001');
      const control = aiCreatorSystem.getAdminControl('ai_video_001');

      expect(creator?.isActive).toBe(true);
      expect(control?.isPaused).toBe(false);
    });

    it('should update admin control settings', () => {
      aiCreatorSystem.updateAdminControl('ai_content_001', {
        contentApprovalRequired: true,
        dailyInteractionLimit: 1000,
      });

      const control = aiCreatorSystem.getAdminControl('ai_content_001');
      expect(control?.contentApprovalRequired).toBe(true);
      expect(control?.dailyInteractionLimit).toBe(1000);
    });
  });

  describe('Admin Dashboard', () => {
    it('should get admin dashboard data', () => {
      const data = aiCreatorSystem.getAdminDashboardData();

      expect(data.totalAICreators).toBe(4);
      expect(data.activeAIs).toBeGreaterThanOrEqual(0);
      expect(data.totalFollowers).toBeGreaterThan(0);
      expect(data.totalEarnings).toBeGreaterThan(0);
      expect(data.averageRating).toBeGreaterThan(0);
    });

    it('should get individual AI dashboard data', () => {
      const data = aiCreatorSystem.getAIDashboardData('ai_wellness_001');

      expect(data.profile).toBeDefined();
      expect(data.profile?.name).toBe('Dr. Wellness AI');
      expect(Array.isArray(data.content)).toBe(true);
      expect(Array.isArray(data.audience)).toBe(true);
      expect(Array.isArray(data.earnings)).toBe(true);
      expect(data.stats).toBeDefined();
    });
  });
});

describe('AI Creator Dashboard Service', () => {
  describe('Dashboard Stats', () => {
    it('should get AI creator dashboard stats', () => {
      const stats = aiCreatorDashboardService.getAICreatorDashboardStats('ai_music_001');

      expect(stats.profile).toBeDefined();
      expect(stats.contentCount).toBeGreaterThanOrEqual(0);
      expect(stats.audienceCount).toBeGreaterThanOrEqual(0);
      expect(stats.isMonitored).toBe(true);
      expect(typeof stats.isPaused).toBe('boolean');
    });

    it('should get admin dashboard summary', () => {
      const summary = aiCreatorDashboardService.getAdminDashboardSummary();

      expect(summary.totalAICreators).toBe(4);
      expect(summary.activeAICreators).toBeGreaterThanOrEqual(0);
      expect(summary.totalFollowers).toBeGreaterThan(0);
      expect(summary.totalEarnings).toBeGreaterThan(0);
      expect(summary.aiCreators.length).toBe(4);
    });
  });

  describe('Control Panels', () => {
    it('should get AI creator control panel', () => {
      const panel = aiCreatorDashboardService.getAICreatorControlPanel('ai_video_001');

      expect(panel.aiCreatorId).toBe('ai_video_001');
      expect(panel.name).toBe('CinemaAI');
      expect(panel.specialty).toBe('video');
      expect(panel.actions).toBeDefined();
    });

    it('should get all AI creator control panels', () => {
      const panels = aiCreatorDashboardService.getAllAICreatorControlPanels();

      expect(panels).toHaveLength(4);
      panels.forEach(panel => {
        expect(panel.aiCreatorId).toBeDefined();
        expect(panel.name).toBeDefined();
        expect(panel.actions).toBeDefined();
      });
    });
  });

  describe('Monitoring', () => {
    it('should monitor AI creator activity', () => {
      const activity = aiCreatorDashboardService.monitorAICreatorActivity('ai_content_001');

      expect(activity.recentContent).toBeDefined();
      expect(activity.recentAudience).toBeDefined();
      expect(activity.recentEarnings).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(activity.activityLevel);
      expect(activity.lastActivityTime).toBeDefined();
    });

    it('should get AI creator performance metrics', () => {
      const metrics = aiCreatorDashboardService.getAICreatorPerformanceMetrics('ai_wellness_001');

      expect(metrics.engagementRate).toBeGreaterThanOrEqual(0);
      expect(metrics.growthRate).toBeGreaterThanOrEqual(0);
      expect(metrics.conversionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.retentionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageSessionDuration).toBeGreaterThan(0);
    });
  });

  describe('Data Export', () => {
    it('should export AI creator data', () => {
      const exported = aiCreatorDashboardService.exportAICreatorData('ai_music_001');

      expect(exported.profile).toBeDefined();
      expect(exported.contentCount).toBeGreaterThanOrEqual(0);
      expect(exported.audienceCount).toBeGreaterThanOrEqual(0);
      expect(exported.totalEarnings).toBeGreaterThanOrEqual(0);
      expect(exported.exportDate).toBeDefined();
    });
  });
});

describe('AI Creator Ad Service', () => {
  describe('Ad Campaigns', () => {
    it('should create ad campaign for AI creator', () => {
      const campaign = aiCreatorAdService.createAdCampaign('ai_video_001', {
        title: 'Summer Sale',
        description: 'Special summer discount',
        imageUrl: 'https://example.com/summer.png',
        targetUrl: 'https://example.com/sale',
        placement: 'profile',
        startDate: new Date(),
        dailyBudget: 50,
        totalBudget: 1000,
      });

      expect(campaign).toBeDefined();
      expect(campaign.title).toBe('Summer Sale');
      expect(campaign.status).toBe('active');
      expect(campaign.spent).toBe(0);
    });

    it('should get ad campaign by ID', () => {
      const campaign = aiCreatorAdService.createAdCampaign('ai_content_001', {
        title: 'Workshop Promo',
        description: 'Promote writing workshop',
        imageUrl: 'https://example.com/workshop.png',
        targetUrl: 'https://example.com/workshop',
        placement: 'content',
        startDate: new Date(),
        dailyBudget: 30,
        totalBudget: 500,
      });

      const retrieved = aiCreatorAdService.getAdCampaign(campaign.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Workshop Promo');
    });

    it('should get all ad campaigns for AI creator', () => {
      const campaign = aiCreatorAdService.createAdCampaign('ai_music_001', {
        title: 'Album Release',
        description: 'New album announcement',
        imageUrl: 'https://example.com/album.png',
        targetUrl: 'https://example.com/album',
        placement: 'sidebar',
        startDate: new Date(),
        dailyBudget: 40,
        totalBudget: 800,
      });

      const retrieved = aiCreatorAdService.getAdCampaign(campaign.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Album Release');
    });
  });

  describe('Campaign Management', () => {
    it('should pause ad campaign', () => {
      const campaign = aiCreatorAdService.createAdCampaign('ai_wellness_001', {
        title: 'Wellness Challenge',
        description: 'Join our wellness challenge',
        imageUrl: 'https://example.com/challenge.png',
        targetUrl: 'https://example.com/challenge',
        placement: 'profile',
        startDate: new Date(),
        dailyBudget: 25,
        totalBudget: 400,
      });

      aiCreatorAdService.pauseAdCampaign(campaign.id);

      const paused = aiCreatorAdService.getAdCampaign(campaign.id);
      expect(paused?.status).toBe('paused');
    });

    it('should resume ad campaign', () => {
      const campaign = aiCreatorAdService.createAdCampaign('ai_video_001', {
        title: 'Editing Tips',
        description: 'Video editing tips',
        imageUrl: 'https://example.com/tips.png',
        targetUrl: 'https://example.com/tips',
        placement: 'content',
        startDate: new Date(),
        dailyBudget: 35,
        totalBudget: 600,
      });

      aiCreatorAdService.pauseAdCampaign(campaign.id);
      aiCreatorAdService.resumeAdCampaign(campaign.id);

      const resumed = aiCreatorAdService.getAdCampaign(campaign.id);
      expect(resumed?.status).toBe('active');
    });
  });

  describe('Performance Reporting', () => {
    it('should get ad performance report', () => {
      aiCreatorAdService.createAdCampaign('ai_content_001', {
        title: 'Writing Guide',
        description: 'Complete writing guide',
        imageUrl: 'https://example.com/guide.png',
        targetUrl: 'https://example.com/guide',
        placement: 'sidebar',
        startDate: new Date(),
        dailyBudget: 20,
        totalBudget: 300,
      });

      const report = aiCreatorAdService.getAdPerformanceReport('ai_content_001');
      expect(Array.isArray(report)).toBe(true);
    });

    it('should get total ad revenue for AI creator', () => {
      const revenue = aiCreatorAdService.getTotalAdRevenue('ai_music_001');
      expect(typeof revenue).toBe('number');
      expect(revenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recommendations', () => {
    it('should get ad recommendations', () => {
      aiCreatorAdService.createAdCampaign('ai_wellness_001', {
        title: 'Fitness Program',
        description: 'New fitness program',
        imageUrl: 'https://example.com/fitness.png',
        targetUrl: 'https://example.com/fitness',
        placement: 'profile',
        startDate: new Date(),
        dailyBudget: 45,
        totalBudget: 900,
      });

      const recommendations = aiCreatorAdService.getAdRecommendations('ai_wellness_001');
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should get ad placement recommendations', () => {
      const recommendations = aiCreatorAdService.getAdPlacementRecommendations('ai_video_001');
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(['profile', 'content', 'sidebar']).toContain(rec.placement);
        expect(typeof rec.performance).toBe('number');
        expect(rec.recommendation).toBeDefined();
      });
    });
  });
});
