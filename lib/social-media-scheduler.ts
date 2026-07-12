/**
 * Social Media Scheduler Service
 * Schedule and publish content across multiple platforms with optimal timing
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type Platform = "facebook" | "twitter" | "instagram" | "tiktok" | "youtube" | "linkedin" | "pinterest";
export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "cancelled";
export type ContentType = "text" | "image" | "video" | "carousel" | "story" | "reel";

export interface PlatformConfig {
  platform: Platform;
  enabled: boolean;
  accountId: string;
  accountName: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ScheduledPost {
  id: string;
  creatorId: string;
  contentId: string;
  title: string;
  content: string;
  contentType: ContentType;
  platforms: Platform[];
  scheduledTime: number;
  publishedTime?: number;
  status: PostStatus;
  mediaUrls?: string[];
  hashtags: string[];
  mentions: string[];
  engagementMetrics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  platformSpecificData?: Record<Platform, Record<string, any>>;
  createdAt: number;
  updatedAt: number;
}

export interface OptimalPostingTime {
  platform: Platform;
  dayOfWeek: number;
  hour: number;
  expectedEngagement: number;
  reason: string;
}

export interface CampaignSchedule {
  id: string;
  creatorId: string;
  name: string;
  description?: string;
  posts: ScheduledPost[];
  startDate: number;
  endDate: number;
  platforms: Platform[];
  status: "draft" | "active" | "completed" | "paused";
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// SOCIAL MEDIA SCHEDULER SERVICE
// ============================================================================

class SocialMediaScheduler {
  private scheduledPosts: Map<string, ScheduledPost> = new Map();
  private campaigns: Map<string, CampaignSchedule> = new Map();
  private platformConfigs: Map<string, PlatformConfig> = new Map();
  private publishQueue: ScheduledPost[] = [];
  private publishTimer: NodeJS.Timeout | null = null;
  private readonly PUBLISH_CHECK_INTERVAL = 60000; // Check every minute

  constructor() {
    this.startPublishQueue();
  }

  /**
   * Configure platform connection
   */
  configurePlatform(creatorId: string, config: PlatformConfig): void {
    const key = `${creatorId}_${config.platform}`;
    this.platformConfigs.set(key, config);
  }

  /**
   * Get platform config
   */
  getPlatformConfig(creatorId: string, platform: Platform): PlatformConfig | undefined {
    return this.platformConfigs.get(`${creatorId}_${platform}`);
  }

  /**
   * Schedule post
   */
  schedulePost(
    creatorId: string,
    contentId: string,
    title: string,
    content: string,
    contentType: ContentType,
    platforms: Platform[],
    scheduledTime: number,
    mediaUrls?: string[],
    hashtags?: string[],
    mentions?: string[]
  ): ScheduledPost {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const post: ScheduledPost = {
      id: postId,
      creatorId,
      contentId,
      title,
      content,
      contentType,
      platforms,
      scheduledTime,
      status: "scheduled",
      mediaUrls,
      hashtags: hashtags || [],
      mentions: mentions || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.scheduledPosts.set(postId, post);
    this.publishQueue.push(post);

    // Sort queue by scheduled time
    this.publishQueue.sort((a, b) => a.scheduledTime - b.scheduledTime);

    return post;
  }

  /**
   * Get scheduled post
   */
  getScheduledPost(postId: string): ScheduledPost | undefined {
    return this.scheduledPosts.get(postId);
  }

  /**
   * Update scheduled post
   */
  updateScheduledPost(postId: string, updates: Partial<Omit<ScheduledPost, "id" | "creatorId" | "createdAt">>): ScheduledPost | undefined {
    const post = this.scheduledPosts.get(postId);
    if (!post) return undefined;

    const updated = {
      ...post,
      ...updates,
      updatedAt: Date.now(),
    };

    this.scheduledPosts.set(postId, updated);
    return updated;
  }

  /**
   * Cancel scheduled post
   */
  cancelScheduledPost(postId: string): boolean {
    const post = this.scheduledPosts.get(postId);
    if (!post) return false;

    post.status = "cancelled";
    post.updatedAt = Date.now();

    // Remove from queue
    this.publishQueue = this.publishQueue.filter((p) => p.id !== postId);

    return true;
  }

  /**
   * Get creator scheduled posts
   */
  getCreatorScheduledPosts(creatorId: string, status?: PostStatus): ScheduledPost[] {
    return Array.from(this.scheduledPosts.values())
      .filter((p) => p.creatorId === creatorId && (!status || p.status === status))
      .sort((a, b) => b.scheduledTime - a.scheduledTime);
  }

  /**
   * Get optimal posting times
   */
  getOptimalPostingTimes(creatorId: string, platform: Platform): OptimalPostingTime[] {
    // This would typically analyze historical performance data
    // For now, returning recommended times based on platform best practices
    const optimalTimes: Record<Platform, OptimalPostingTime[]> = {
      facebook: [
        { platform: "facebook", dayOfWeek: 3, hour: 13, expectedEngagement: 0.08, reason: "Mid-week lunch time" },
        { platform: "facebook", dayOfWeek: 5, hour: 19, expectedEngagement: 0.12, reason: "Friday evening" },
      ],
      twitter: [
        { platform: "twitter", dayOfWeek: 2, hour: 9, expectedEngagement: 0.1, reason: "Tuesday morning" },
        { platform: "twitter", dayOfWeek: 4, hour: 17, expectedEngagement: 0.14, reason: "Thursday evening" },
      ],
      instagram: [
        { platform: "instagram", dayOfWeek: 1, hour: 11, expectedEngagement: 0.15, reason: "Monday late morning" },
        { platform: "instagram", dayOfWeek: 5, hour: 20, expectedEngagement: 0.18, reason: "Friday night" },
      ],
      tiktok: [
        { platform: "tiktok", dayOfWeek: 3, hour: 18, expectedEngagement: 0.2, reason: "Wednesday evening" },
        { platform: "tiktok", dayOfWeek: 6, hour: 19, expectedEngagement: 0.22, reason: "Saturday evening" },
      ],
      youtube: [
        { platform: "youtube", dayOfWeek: 4, hour: 14, expectedEngagement: 0.12, reason: "Thursday afternoon" },
        { platform: "youtube", dayOfWeek: 0, hour: 10, expectedEngagement: 0.1, reason: "Sunday morning" },
      ],
      linkedin: [
        { platform: "linkedin", dayOfWeek: 2, hour: 8, expectedEngagement: 0.11, reason: "Tuesday morning" },
        { platform: "linkedin", dayOfWeek: 4, hour: 10, expectedEngagement: 0.13, reason: "Thursday morning" },
      ],
      pinterest: [
        { platform: "pinterest", dayOfWeek: 1, hour: 14, expectedEngagement: 0.09, reason: "Monday afternoon" },
        { platform: "pinterest", dayOfWeek: 3, hour: 20, expectedEngagement: 0.11, reason: "Wednesday evening" },
      ],
    };

    return optimalTimes[platform] || [];
  }

  /**
   * Suggest optimal time
   */
  suggestOptimalTime(creatorId: string, platforms: Platform[]): number {
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;

    // Find the best time across all platforms
    let bestTime = tomorrow;
    let bestScore = 0;

    for (let hour = 8; hour <= 20; hour++) {
      let score = 0;
      platforms.forEach((platform) => {
        const optimalTimes = this.getOptimalPostingTimes(creatorId, platform);
        const matching = optimalTimes.find((t) => t.hour === hour);
        if (matching) {
          score += matching.expectedEngagement;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestTime = tomorrow + hour * 60 * 60 * 1000;
      }
    }

    return bestTime;
  }

  /**
   * Create campaign
   */
  createCampaign(
    creatorId: string,
    name: string,
    platforms: Platform[],
    startDate: number,
    endDate: number,
    description?: string
  ): CampaignSchedule {
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const campaign: CampaignSchedule = {
      id: campaignId,
      creatorId,
      name,
      description,
      posts: [],
      startDate,
      endDate,
      platforms,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  /**
   * Add post to campaign
   */
  addPostToCampaign(campaignId: string, post: ScheduledPost): CampaignSchedule | undefined {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return undefined;

    campaign.posts.push(post);
    campaign.updatedAt = Date.now();

    return campaign;
  }

  /**
   * Get campaign
   */
  getCampaign(campaignId: string): CampaignSchedule | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get creator campaigns
   */
  getCreatorCampaigns(creatorId: string, status?: "draft" | "active" | "completed" | "paused"): CampaignSchedule[] {
    return Array.from(this.campaigns.values())
      .filter((c) => c.creatorId === creatorId && (!status || c.status === status))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Publish campaign
   */
  publishCampaign(campaignId: string): CampaignSchedule | undefined {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return undefined;

    campaign.status = "active";
    campaign.updatedAt = Date.now();

    return campaign;
  }

  /**
   * Start publish queue processor
   */
  private startPublishQueue(): void {
    this.publishTimer = setInterval(() => {
      this.processPublishQueue();
    }, this.PUBLISH_CHECK_INTERVAL) as unknown as NodeJS.Timeout;
  }

  /**
   * Process publish queue
   */
  private processPublishQueue(): void {
    const now = Date.now();

    for (let i = 0; i < this.publishQueue.length; i++) {
      const post = this.publishQueue[i];

      if (post.scheduledTime <= now && post.status === "scheduled") {
        // Publish the post
        this.publishPost(post.id);
        this.publishQueue.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * Publish post
   */
  private publishPost(postId: string): void {
    const post = this.scheduledPosts.get(postId);
    if (!post) return;

    try {
      // In a real implementation, this would call the platform APIs
      // For now, we'll just mark it as published
      post.status = "published";
      post.publishedTime = Date.now();
      post.updatedAt = Date.now();

      // Initialize engagement metrics
      post.engagementMetrics = {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
      };
    } catch (error) {
      post.status = "failed";
      post.updatedAt = Date.now();
    }
  }

  /**
   * Get published posts
   */
  getPublishedPosts(creatorId: string, limit: number = 50): ScheduledPost[] {
    return Array.from(this.scheduledPosts.values())
      .filter((p) => p.creatorId === creatorId && p.status === "published")
      .sort((a, b) => (b.publishedTime || 0) - (a.publishedTime || 0))
      .slice(0, limit);
  }

  /**
   * Get engagement analytics
   */
  getEngagementAnalytics(creatorId: string, platform?: Platform): {
    totalPosts: number;
    totalEngagements: number;
    avgEngagementRate: number;
    topPost?: ScheduledPost;
  } {
    let posts = Array.from(this.scheduledPosts.values()).filter((p) => p.creatorId === creatorId && p.status === "published");

    if (platform) {
      posts = posts.filter((p) => p.platforms.includes(platform));
    }

    const totalEngagements = posts.reduce((sum, p) => {
      const metrics = p.engagementMetrics || { likes: 0, comments: 0, shares: 0, views: 0 };
      return sum + metrics.likes + metrics.comments + metrics.shares;
    }, 0);

    const topPost = posts.sort((a, b) => {
      const aMetrics = a.engagementMetrics || { likes: 0, comments: 0, shares: 0, views: 0 };
      const bMetrics = b.engagementMetrics || { likes: 0, comments: 0, shares: 0, views: 0 };
      const aTotal = aMetrics.likes + aMetrics.comments + aMetrics.shares;
      const bTotal = bMetrics.likes + bMetrics.comments + bMetrics.shares;
      return bTotal - aTotal;
    })[0];

    return {
      totalPosts: posts.length,
      totalEngagements,
      avgEngagementRate: posts.length > 0 ? totalEngagements / posts.length : 0,
      topPost,
    };
  }

  /**
   * Stop publish queue
   */
  stop(): void {
    if (this.publishTimer) {
      clearInterval(this.publishTimer);
      this.publishTimer = null;
    }
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.stop();
    this.scheduledPosts.clear();
    this.campaigns.clear();
    this.platformConfigs.clear();
    this.publishQueue = [];
    this.startPublishQueue();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let schedulerInstance: SocialMediaScheduler | null = null;

export function getSocialMediaScheduler(): SocialMediaScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SocialMediaScheduler();
  }
  return schedulerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSocialMediaScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.reset();
  }
  schedulerInstance = null;
}

export default SocialMediaScheduler;
