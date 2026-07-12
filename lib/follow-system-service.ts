/**
 * Follow System Service
 * Manages user follows, follower tracking, and analytics
 */

export interface Follower {
  userId: string;
  creatorId: string;
  followedAt: Date;
  notificationsEnabled: boolean;
  tier: 'free' | 'silver' | 'gold' | 'platinum';
}

export interface FollowAnalytics {
  totalFollowers: number;
  newFollowersToday: number;
  newFollowersThisWeek: number;
  newFollowersThisMonth: number;
  followRetentionRate: number;
  engagementRate: number;
  averageSessionDuration: number;
  topFollowersByEngagement: string[];
  followerGrowthTrend: number[];
  conversionRate: number;
}

export interface FollowNotification {
  id: string;
  userId: string;
  creatorId: string;
  type: 'follow' | 'content' | 'message' | 'milestone';
  message: string;
  read: boolean;
  createdAt: Date;
}

class FollowSystemService {
  private followers: Map<string, Follower[]> = new Map();
  private followNotifications: Map<string, FollowNotification[]> = new Map();
  private analytics: Map<string, FollowAnalytics> = new Map();
  private notificationId = 0;

  /**
   * User follows a creator
   */
  followCreator(userId: string, creatorId: string, tier: 'free' | 'silver' | 'gold' | 'platinum' = 'free'): Follower {
    const follower: Follower = {
      userId,
      creatorId,
      followedAt: new Date(),
      notificationsEnabled: true,
      tier,
    };

    if (!this.followers.has(creatorId)) {
      this.followers.set(creatorId, []);
    }

    this.followers.get(creatorId)!.push(follower);

    // Create follow notification
    this.createNotification(userId, creatorId, 'follow', `You followed ${creatorId}`);

    // Update analytics
    this.updateAnalytics(creatorId);

    return follower;
  }

  /**
   * User unfollows a creator
   */
  unfollowCreator(userId: string, creatorId: string): boolean {
    const creatorFollowers = this.followers.get(creatorId);
    if (!creatorFollowers) return false;

    const index = creatorFollowers.findIndex(f => f.userId === userId);
    if (index === -1) return false;

    creatorFollowers.splice(index, 1);
    this.updateAnalytics(creatorId);
    return true;
  }

  /**
   * Get all followers of a creator
   */
  getFollowers(creatorId: string): Follower[] {
    return this.followers.get(creatorId) || [];
  }

  /**
   * Get followers count
   */
  getFollowerCount(creatorId: string): number {
    return this.getFollowers(creatorId).length;
  }

  /**
   * Check if user follows creator
   */
  isFollowing(userId: string, creatorId: string): boolean {
    const followers = this.followers.get(creatorId) || [];
    return followers.some(f => f.userId === userId);
  }

  /**
   * Get creators followed by user
   */
  getFollowedCreators(userId: string): string[] {
    const followed: string[] = [];
    for (const [creatorId, followers] of this.followers) {
      if (followers.some(f => f.userId === userId)) {
        followed.push(creatorId);
      }
    }
    return followed;
  }

  /**
   * Get follow analytics for creator
   */
  getAnalytics(creatorId: string): FollowAnalytics {
    return this.analytics.get(creatorId) || this.createDefaultAnalytics();
  }

  /**
   * Update follower tier (upgrade/downgrade subscription)
   */
  updateFollowerTier(userId: string, creatorId: string, newTier: 'free' | 'silver' | 'gold' | 'platinum'): boolean {
    const followers = this.followers.get(creatorId);
    if (!followers) return false;

    const follower = followers.find(f => f.userId === userId);
    if (!follower) return false;

    const oldTier = follower.tier;
    follower.tier = newTier;

    // Create notification
    this.createNotification(userId, creatorId, 'milestone', `Upgraded from ${oldTier} to ${newTier}`);

    return true;
  }

  /**
   * Toggle notifications for follower
   */
  toggleNotifications(userId: string, creatorId: string): boolean {
    const followers = this.followers.get(creatorId);
    if (!followers) return false;

    const follower = followers.find(f => f.userId === userId);
    if (!follower) return false;

    follower.notificationsEnabled = !follower.notificationsEnabled;
    return true;
  }

  /**
   * Create follow notification
   */
  private createNotification(userId: string, creatorId: string, type: 'follow' | 'content' | 'message' | 'milestone', message: string): FollowNotification {
    const notification: FollowNotification = {
      id: `notif-${++this.notificationId}`,
      userId,
      creatorId,
      type,
      message,
      read: false,
      createdAt: new Date(),
    };

    if (!this.followNotifications.has(userId)) {
      this.followNotifications.set(userId, []);
    }

    this.followNotifications.get(userId)!.push(notification);
    return notification;
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string): FollowNotification[] {
    return this.followNotifications.get(userId) || [];
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string, userId: string): boolean {
    const notifications = this.followNotifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.read = true;
    return true;
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(userId: string): number {
    const notifications = this.followNotifications.get(userId) || [];
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Update analytics for creator
   */
  private updateAnalytics(creatorId: string): void {
    const followers = this.getFollowers(creatorId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    const newFollowersToday = followers.filter(f => f.followedAt >= today).length;
    const newFollowersThisWeek = followers.filter(f => f.followedAt >= weekAgo).length;
    const newFollowersThisMonth = followers.filter(f => f.followedAt >= monthAgo).length;

    // Calculate retention rate (followers from 30 days ago still following)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const followersFromThirtyDaysAgo = followers.filter(f => f.followedAt <= thirtyDaysAgo).length;
    const retentionRate = followersFromThirtyDaysAgo > 0 ? (followers.length / followersFromThirtyDaysAgo) * 100 : 100;

    // Calculate engagement rate (followers with notifications enabled)
    const engagementRate = followers.length > 0 ? (followers.filter(f => f.notificationsEnabled).length / followers.length) * 100 : 0;

    // Generate growth trend (7 days)
    const growthTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayFollowers = followers.filter(f => f.followedAt >= dayStart && f.followedAt < dayEnd).length;
      growthTrend.push(dayFollowers);
    }

    // Get top followers by engagement (those with notifications enabled and higher tier)
    const topFollowers = followers
      .filter(f => f.notificationsEnabled)
      .sort((a, b) => {
        const tierOrder = { free: 0, silver: 1, gold: 2, platinum: 3 };
        return tierOrder[b.tier] - tierOrder[a.tier];
      })
      .slice(0, 5)
      .map(f => f.userId);

    const analytics: FollowAnalytics = {
      totalFollowers: followers.length,
      newFollowersToday,
      newFollowersThisWeek,
      newFollowersThisMonth,
      followRetentionRate: Math.round(retentionRate * 100) / 100,
      engagementRate: Math.round(engagementRate * 100) / 100,
      averageSessionDuration: Math.random() * 30 + 5, // Mock data
      topFollowersByEngagement: topFollowers,
      followerGrowthTrend: growthTrend,
      conversionRate: Math.random() * 15 + 5, // Mock data
    };

    this.analytics.set(creatorId, analytics);
  }

  /**
   * Create default analytics
   */
  private createDefaultAnalytics(): FollowAnalytics {
    return {
      totalFollowers: 0,
      newFollowersToday: 0,
      newFollowersThisWeek: 0,
      newFollowersThisMonth: 0,
      followRetentionRate: 0,
      engagementRate: 0,
      averageSessionDuration: 0,
      topFollowersByEngagement: [],
      followerGrowthTrend: [0, 0, 0, 0, 0, 0, 0],
      conversionRate: 0,
    };
  }

  /**
   * Broadcast notification to all followers
   */
  broadcastToFollowers(creatorId: string, message: string, type: 'content' | 'message' | 'milestone' = 'content'): number {
    const followers = this.getFollowers(creatorId);
    let notificationCount = 0;

    for (const follower of followers) {
      if (follower.notificationsEnabled) {
        this.createNotification(follower.userId, creatorId, type, message);
        notificationCount++;
      }
    }

    return notificationCount;
  }

  /**
   * Get follower statistics
   */
  getFollowerStats(creatorId: string) {
    const followers = this.getFollowers(creatorId);
    const tierCounts = { free: 0, silver: 0, gold: 0, platinum: 0 };

    for (const follower of followers) {
      tierCounts[follower.tier]++;
    }

    return {
      total: followers.length,
      byTier: tierCounts,
      percentages: {
        free: (tierCounts.free / followers.length) * 100,
        silver: (tierCounts.silver / followers.length) * 100,
        gold: (tierCounts.gold / followers.length) * 100,
        platinum: (tierCounts.platinum / followers.length) * 100,
      },
    };
  }
}

export const followSystemService = new FollowSystemService();
