/**
 * AI Creator System
 * Manages independent AI creator profiles, dashboards, and monetization
 */

export interface AICreatorProfile {
  id: string;
  name: string;
  specialty: 'wellness' | 'music' | 'video' | 'content';
  bio: string;
  avatar: string;
  followers: number;
  totalEarnings: number;
  rating: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AICreatorContent {
  id: string;
  aiCreatorId: string;
  title: string;
  description: string;
  type: 'video' | 'audio' | 'text' | 'image';
  url: string;
  views: number;
  likes: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AICreatorAudience {
  id: string;
  aiCreatorId: string;
  userId: string;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'premium';
  subscriptionStartDate: Date;
  subscriptionEndDate?: Date;
  totalSpent: number;
  interactionCount: number;
}

export interface AICreatorEarnings {
  id: string;
  aiCreatorId: string;
  source: 'subscriptions' | 'content_sales' | 'ads' | 'tips';
  amount: number;
  date: Date;
  description: string;
}

export interface AICreatorAd {
  id: string;
  aiCreatorId: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: 'profile' | 'content' | 'sidebar';
  isActive: boolean;
  impressions: number;
  clicks: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAIControl {
  aiCreatorId: string;
  isMonitored: boolean;
  isPaused: boolean;
  dailyInteractionLimit?: number;
  contentApprovalRequired: boolean;
  allowedAds: boolean;
  notes: string;
  lastModified: Date;
}

export class AICreatorSystem {
  private aiCreators: Map<string, AICreatorProfile> = new Map();
  private aiContent: Map<string, AICreatorContent[]> = new Map();
  private aiAudience: Map<string, AICreatorAudience[]> = new Map();
  private aiEarnings: Map<string, AICreatorEarnings[]> = new Map();
  private aiAds: Map<string, AICreatorAd[]> = new Map();
  private adminControls: Map<string, AdminAIControl> = new Map();

  constructor() {
    this.initializeDefaultAICreators();
  }

  /**
   * Initialize default AI creators
   */
  private initializeDefaultAICreators(): void {
    const defaultAIs: AICreatorProfile[] = [
      {
        id: 'ai_wellness_001',
        name: 'Dr. Wellness AI',
        specialty: 'wellness',
        bio: 'Your personal wellness coach specializing in meditation, fitness, and mental health',
        avatar: 'https://example.com/wellness-ai.png',
        followers: 15000,
        totalEarnings: 45000,
        rating: 4.9,
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
      },
      {
        id: 'ai_music_001',
        name: 'Harmony AI',
        specialty: 'music',
        bio: 'AI music producer creating original compositions and remixes',
        avatar: 'https://example.com/music-ai.png',
        followers: 22000,
        totalEarnings: 67000,
        rating: 4.8,
        isActive: true,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date(),
      },
      {
        id: 'ai_video_001',
        name: 'CinemaAI',
        specialty: 'video',
        bio: 'Professional video editing and production AI',
        avatar: 'https://example.com/video-ai.png',
        followers: 18000,
        totalEarnings: 52000,
        rating: 4.7,
        isActive: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
      },
      {
        id: 'ai_content_001',
        name: 'Creative AI',
        specialty: 'content',
        bio: 'AI content creator for writing, design, and creative projects',
        avatar: 'https://example.com/content-ai.png',
        followers: 25000,
        totalEarnings: 78000,
        rating: 4.9,
        isActive: true,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date(),
      },
    ];

    defaultAIs.forEach(ai => {
      this.aiCreators.set(ai.id, ai);
      this.aiContent.set(ai.id, []);
      this.aiAudience.set(ai.id, []);
      this.aiEarnings.set(ai.id, []);
      this.aiAds.set(ai.id, []);
      this.adminControls.set(ai.id, {
        aiCreatorId: ai.id,
        isMonitored: true,
        isPaused: false,
        contentApprovalRequired: false,
        allowedAds: true,
        notes: `Monitoring ${ai.name}`,
        lastModified: new Date(),
      });
    });
  }

  /**
   * Get all AI creators
   */
  getAllAICreators(): AICreatorProfile[] {
    return Array.from(this.aiCreators.values());
  }

  /**
   * Get AI creator by ID
   */
  getAICreator(aiCreatorId: string): AICreatorProfile | undefined {
    return this.aiCreators.get(aiCreatorId);
  }

  /**
   * Add content for AI creator
   */
  addContent(aiCreatorId: string, content: Omit<AICreatorContent, 'id'>): AICreatorContent {
    const newContent: AICreatorContent = {
      ...content,
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.aiContent.has(aiCreatorId)) {
      this.aiContent.set(aiCreatorId, []);
    }
    this.aiContent.get(aiCreatorId)!.push(newContent);
    return newContent;
  }

  /**
   * Get content for AI creator
   */
  getAICreatorContent(aiCreatorId: string): AICreatorContent[] {
    return this.aiContent.get(aiCreatorId) || [];
  }

  /**
   * Add audience member for AI creator
   */
  addAudience(aiCreatorId: string, audience: Omit<AICreatorAudience, 'id'>): AICreatorAudience {
    const newAudience: AICreatorAudience = {
      ...audience,
      id: `audience_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.aiAudience.has(aiCreatorId)) {
      this.aiAudience.set(aiCreatorId, []);
    }
    this.aiAudience.get(aiCreatorId)!.push(newAudience);

    // Update follower count
    const ai = this.aiCreators.get(aiCreatorId);
    if (ai) {
      ai.followers = (this.aiAudience.get(aiCreatorId) || []).length;
    }

    return newAudience;
  }

  /**
   * Get audience for AI creator
   */
  getAICreatorAudience(aiCreatorId: string): AICreatorAudience[] {
    return this.aiAudience.get(aiCreatorId) || [];
  }

  /**
   * Record earnings for AI creator
   */
  recordEarnings(aiCreatorId: string, earnings: Omit<AICreatorEarnings, 'id'>): AICreatorEarnings {
    const newEarnings: AICreatorEarnings = {
      ...earnings,
      id: `earnings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.aiEarnings.has(aiCreatorId)) {
      this.aiEarnings.set(aiCreatorId, []);
    }
    this.aiEarnings.get(aiCreatorId)!.push(newEarnings);

    // Update total earnings
    const ai = this.aiCreators.get(aiCreatorId);
    if (ai) {
      ai.totalEarnings += earnings.amount;
    }

    return newEarnings;
  }

  /**
   * Get earnings for AI creator
   */
  getAICreatorEarnings(aiCreatorId: string): AICreatorEarnings[] {
    return this.aiEarnings.get(aiCreatorId) || [];
  }

  /**
   * Add ad for AI creator
   */
  addAd(aiCreatorId: string, ad: Omit<AICreatorAd, 'id'>): AICreatorAd {
    const newAd: AICreatorAd = {
      ...ad,
      id: `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.aiAds.has(aiCreatorId)) {
      this.aiAds.set(aiCreatorId, []);
    }
    this.aiAds.get(aiCreatorId)!.push(newAd);
    return newAd;
  }

  /**
   * Get ads for AI creator
   */
  getAICreatorAds(aiCreatorId: string): AICreatorAd[] {
    return this.aiAds.get(aiCreatorId) || [];
  }

  /**
   * Update ad performance
   */
  updateAdPerformance(aiCreatorId: string, adId: string, impressions: number, clicks: number): void {
    const ads = this.aiAds.get(aiCreatorId) || [];
    const ad = ads.find(a => a.id === adId);
    if (ad) {
      ad.impressions += impressions;
      ad.clicks += clicks;
      ad.revenue = ad.impressions * 0.5 + ad.clicks * 2; // CPM + CPC model
    }
  }

  /**
   * Get admin control for AI creator
   */
  getAdminControl(aiCreatorId: string): AdminAIControl | undefined {
    return this.adminControls.get(aiCreatorId);
  }

  /**
   * Update admin control for AI creator
   */
  updateAdminControl(aiCreatorId: string, control: Partial<AdminAIControl>): void {
    const existing = this.adminControls.get(aiCreatorId);
    if (existing) {
      this.adminControls.set(aiCreatorId, {
        ...existing,
        ...control,
        lastModified: new Date(),
      });
    }
  }

  /**
   * Pause AI creator
   */
  pauseAICreator(aiCreatorId: string): void {
    this.updateAdminControl(aiCreatorId, { isPaused: true });
    const ai = this.aiCreators.get(aiCreatorId);
    if (ai) {
      ai.isActive = false;
    }
  }

  /**
   * Resume AI creator
   */
  resumeAICreator(aiCreatorId: string): void {
    this.updateAdminControl(aiCreatorId, { isPaused: false });
    const ai = this.aiCreators.get(aiCreatorId);
    if (ai) {
      ai.isActive = true;
    }
  }

  /**
   * Get admin dashboard data
   */
  getAdminDashboardData(): {
    totalAICreators: number;
    totalFollowers: number;
    totalEarnings: number;
    averageRating: number;
    activeAIs: number;
    aiCreators: AICreatorProfile[];
  } {
    const creators = Array.from(this.aiCreators.values());
    const totalFollowers = creators.reduce((sum, ai) => sum + ai.followers, 0);
    const totalEarnings = creators.reduce((sum, ai) => sum + ai.totalEarnings, 0);
    const averageRating = creators.reduce((sum, ai) => sum + ai.rating, 0) / creators.length;
    const activeAIs = creators.filter(ai => ai.isActive).length;

    return {
      totalAICreators: creators.length,
      totalFollowers,
      totalEarnings,
      averageRating,
      activeAIs,
      aiCreators: creators,
    };
  }

  /**
   * Get individual AI dashboard data
   */
  getAIDashboardData(aiCreatorId: string): {
    profile: AICreatorProfile | undefined;
    content: AICreatorContent[];
    audience: AICreatorAudience[];
    earnings: AICreatorEarnings[];
    ads: AICreatorAd[];
    control: AdminAIControl | undefined;
    stats: {
      totalViews: number;
      totalLikes: number;
      totalDownloads: number;
      monthlyEarnings: number;
      adRevenue: number;
    };
  } {
    const profile = this.aiCreators.get(aiCreatorId);
    const content = this.aiContent.get(aiCreatorId) || [];
    const audience = this.aiAudience.get(aiCreatorId) || [];
    const earnings = this.aiEarnings.get(aiCreatorId) || [];
    const ads = this.aiAds.get(aiCreatorId) || [];
    const control = this.adminControls.get(aiCreatorId);

    const totalViews = content.reduce((sum, c) => sum + c.views, 0);
    const totalLikes = content.reduce((sum, c) => sum + c.likes, 0);
    const totalDownloads = content.reduce((sum, c) => sum + c.downloads, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = earnings
      .filter(e => e.date >= monthStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const adRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0);

    return {
      profile,
      content,
      audience,
      earnings,
      ads,
      control,
      stats: {
        totalViews,
        totalLikes,
        totalDownloads,
        monthlyEarnings,
        adRevenue,
      },
    };
  }
}

// Export singleton instance
export const aiCreatorSystem = new AICreatorSystem();
