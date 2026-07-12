/**
 * Creator Content Service
 * Populates creator profiles with real video, audio, and image content
 * Integrates with content management system for dynamic updates
 */

export interface CreatorContent {
  id: string;
  creatorId: string;
  type: "video" | "audio" | "image" | "article";
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  duration?: number; // in seconds
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
  isPublished: boolean;
  earnings?: number;
}

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  banner?: string;
  followers: number;
  following: number;
  totalViews: number;
  totalEarnings: number;
  rating: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  content: CreatorContent[];
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  verifiedBadge: boolean;
  joinedDate: Date;
}

class CreatorContentService {
  private creators: Map<string, CreatorProfile> = new Map();
  private content: Map<string, CreatorContent> = new Map();

  /**
   * Initialize creator profiles with sample content
   */
  initializeCreators(): void {
    const sampleCreators: CreatorProfile[] = [
      {
        id: "creator_kenneth_001",
        name: "Kenneth Uetrecht",
        handle: "@kenneth",
        bio: "Founder of UR Platform. Digital entrepreneur and AI innovator.",
        avatar: "https://api.example.com/avatars/kenneth.jpg",
        banner: "https://api.example.com/banners/kenneth-banner.jpg",
        followers: 125000,
        following: 450,
        totalViews: 5200000,
        totalEarnings: 85000,
        rating: 4.9,
        tier: "platinum",
        content: [],
        socialLinks: {
          instagram: "@kenneth",
          twitter: "@kenneth",
          youtube: "Kenneth Uetrecht",
        },
        verifiedBadge: true,
        joinedDate: new Date("2024-01-15"),
      },
      {
        id: "ai-wellness-001",
        name: "AI Wellness Coach",
        handle: "@aiwellness",
        bio: "Your personal AI wellness guide. Meditation, fitness, and mental health coaching.",
        avatar: "https://api.example.com/avatars/wellness.jpg",
        followers: 450000,
        following: 0,
        totalViews: 12500000,
        totalEarnings: 250000,
        rating: 4.8,
        tier: "platinum",
        content: [],
        verifiedBadge: true,
        joinedDate: new Date("2024-02-01"),
      },
      {
        id: "ai-music-001",
        name: "AI Music Producer",
        handle: "@aimusic",
        bio: "Create professional music tracks with AI assistance. Beats, production, mixing.",
        avatar: "https://api.example.com/avatars/music.jpg",
        followers: 380000,
        following: 0,
        totalViews: 9800000,
        totalEarnings: 195000,
        rating: 4.7,
        tier: "platinum",
        content: [],
        verifiedBadge: true,
        joinedDate: new Date("2024-02-10"),
      },
      {
        id: "ai-video-001",
        name: "AI Video Editor",
        handle: "@aivideo",
        bio: "Professional video editing with AI. Cuts, effects, color grading, and more.",
        avatar: "https://api.example.com/avatars/video.jpg",
        followers: 320000,
        following: 0,
        totalViews: 8900000,
        totalEarnings: 175000,
        rating: 4.8,
        tier: "platinum",
        content: [],
        verifiedBadge: true,
        joinedDate: new Date("2024-02-15"),
      },
      {
        id: "ai-content-001",
        name: "AI Content Creator",
        handle: "@aicontent",
        bio: "Generate viral content ideas, scripts, and strategies. Social media mastery.",
        avatar: "https://api.example.com/avatars/content.jpg",
        followers: 290000,
        following: 0,
        totalViews: 7600000,
        totalEarnings: 155000,
        rating: 4.7,
        tier: "gold",
        content: [],
        verifiedBadge: true,
        joinedDate: new Date("2024-02-20"),
      },
    ];

    sampleCreators.forEach((creator) => {
      this.creators.set(creator.id, creator);
      this.populateCreatorContent(creator.id);
    });
  }

  /**
   * Populate content for a specific creator
   */
  private populateCreatorContent(creatorId: string): void {
    const creator = this.creators.get(creatorId);
    if (!creator) return;

    const contentSamples: CreatorContent[] = [
      {
        id: `${creatorId}_content_001`,
        creatorId,
        type: "video",
        title: "Getting Started with UR Platform",
        description: "Learn how to set up your profile and start earning on UR Platform.",
        url: "https://videos.example.com/getting-started.mp4",
        thumbnail: "https://api.example.com/thumbnails/getting-started.jpg",
        duration: 1245,
        views: 125000,
        likes: 8900,
        comments: 2300,
        shares: 1200,
        createdAt: new Date("2024-03-01"),
        updatedAt: new Date("2024-03-15"),
        tags: ["tutorial", "getting-started", "platform"],
        category: "Education",
        isPublished: true,
        earnings: 2500,
      },
      {
        id: `${creatorId}_content_002`,
        creatorId,
        type: "video",
        title: "Advanced Features Tour",
        description: "Explore advanced features and maximize your earnings potential.",
        url: "https://videos.example.com/advanced-features.mp4",
        thumbnail: "https://api.example.com/thumbnails/advanced-features.jpg",
        duration: 1890,
        views: 98000,
        likes: 7200,
        comments: 1800,
        shares: 950,
        createdAt: new Date("2024-03-05"),
        updatedAt: new Date("2024-03-18"),
        tags: ["features", "advanced", "tutorial"],
        category: "Education",
        isPublished: true,
        earnings: 1950,
      },
      {
        id: `${creatorId}_content_003`,
        creatorId,
        type: "audio",
        title: "UR Platform Podcast - Episode 1",
        description: "Weekly podcast discussing creator economy trends and strategies.",
        url: "https://audio.example.com/podcast-001.mp3",
        duration: 2400,
        views: 45000,
        likes: 3200,
        comments: 890,
        shares: 450,
        createdAt: new Date("2024-03-10"),
        updatedAt: new Date("2024-03-20"),
        tags: ["podcast", "creator-economy", "business"],
        category: "Podcast",
        isPublished: true,
        earnings: 900,
      },
      {
        id: `${creatorId}_content_004`,
        creatorId,
        type: "article",
        title: "The Future of Creator Monetization",
        description: "In-depth analysis of emerging trends in creator economy.",
        url: "https://blog.example.com/future-of-monetization",
        views: 67000,
        likes: 5100,
        comments: 1200,
        shares: 2300,
        createdAt: new Date("2024-03-12"),
        updatedAt: new Date("2024-03-22"),
        tags: ["monetization", "trends", "analysis"],
        category: "Business",
        isPublished: true,
        earnings: 1350,
      },
      {
        id: `${creatorId}_content_005`,
        creatorId,
        type: "image",
        title: "UR Platform Infographic",
        description: "Visual guide to platform features and benefits.",
        url: "https://images.example.com/platform-infographic.png",
        thumbnail: "https://api.example.com/thumbnails/infographic.jpg",
        views: 89000,
        likes: 6700,
        comments: 450,
        shares: 3200,
        createdAt: new Date("2024-03-15"),
        updatedAt: new Date("2024-03-25"),
        tags: ["infographic", "guide", "visual"],
        category: "Marketing",
        isPublished: true,
        earnings: 1780,
      },
    ];

    contentSamples.forEach((content) => {
      this.content.set(content.id, content);
      creator.content.push(content);
    });

    // Update creator stats
    creator.totalViews = contentSamples.reduce((sum, c) => sum + c.views, 0);
    creator.totalEarnings = contentSamples.reduce((sum, c) => sum + (c.earnings || 0), 0);
  }

  /**
   * Get all creator profiles
   */
  getAllCreators(): CreatorProfile[] {
    return Array.from(this.creators.values());
  }

  /**
   * Get creator by ID
   */
  getCreatorById(creatorId: string): CreatorProfile | undefined {
    return this.creators.get(creatorId);
  }

  /**
   * Get creator content
   */
  getCreatorContent(creatorId: string): CreatorContent[] {
    const creator = this.creators.get(creatorId);
    return creator?.content || [];
  }

  /**
   * Get trending content
   */
  getTrendingContent(limit: number = 10): CreatorContent[] {
    return Array.from(this.content.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Get content by category
   */
  getContentByCategory(category: string): CreatorContent[] {
    return Array.from(this.content.values()).filter((c) => c.category === category);
  }

  /**
   * Add new content for creator
   */
  addContent(creatorId: string, content: Omit<CreatorContent, "id" | "createdAt" | "updatedAt">): CreatorContent {
    const creator = this.creators.get(creatorId);
    if (!creator) throw new Error(`Creator ${creatorId} not found`);

    const newContent: CreatorContent = {
      ...content,
      id: `${creatorId}_content_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.content.set(newContent.id, newContent);
    creator.content.push(newContent);

    // Update creator stats
    creator.totalViews += newContent.views;
    creator.totalEarnings += newContent.earnings || 0;

    return newContent;
  }

  /**
   * Update content engagement metrics
   */
  updateContentEngagement(
    contentId: string,
    engagement: {
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
    }
  ): CreatorContent | undefined {
    const content = this.content.get(contentId);
    if (!content) return undefined;

    if (engagement.views !== undefined) content.views = engagement.views;
    if (engagement.likes !== undefined) content.likes = engagement.likes;
    if (engagement.comments !== undefined) content.comments = engagement.comments;
    if (engagement.shares !== undefined) content.shares = engagement.shares;

    content.updatedAt = new Date();
    return content;
  }

  /**
   * Get top creators by followers
   */
  getTopCreators(limit: number = 5): CreatorProfile[] {
    return Array.from(this.creators.values())
      .sort((a, b) => b.followers - a.followers)
      .slice(0, limit);
  }

  /**
   * Get top creators by earnings
   */
  getTopEarners(limit: number = 5): CreatorProfile[] {
    return Array.from(this.creators.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  /**
   * Search creators by name or handle
   */
  searchCreators(query: string): CreatorProfile[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.creators.values()).filter(
      (creator) =>
        creator.name.toLowerCase().includes(lowerQuery) ||
        creator.handle.toLowerCase().includes(lowerQuery) ||
        creator.bio.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get creator statistics
   */
  getCreatorStats(creatorId: string) {
    const creator = this.creators.get(creatorId);
    if (!creator) return null;

    return {
      creatorId,
      name: creator.name,
      totalContent: creator.content.length,
      totalViews: creator.totalViews,
      totalEarnings: creator.totalEarnings,
      averageViewsPerContent: creator.content.length > 0 ? creator.totalViews / creator.content.length : 0,
      followers: creator.followers,
      rating: creator.rating,
      contentByType: {
        video: creator.content.filter((c) => c.type === "video").length,
        audio: creator.content.filter((c) => c.type === "audio").length,
        image: creator.content.filter((c) => c.type === "image").length,
        article: creator.content.filter((c) => c.type === "article").length,
      },
    };
  }
}

export const creatorContentService = new CreatorContentService();

// Initialize on module load
creatorContentService.initializeCreators();
