/**
 * Advanced Notification System Service
 * Manages real-time notifications, delivery, and analytics
 */

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'follow' | 'message' | 'booking' | 'subscription' | 'content' | 'milestone' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  delivered: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreference {
  userId: string;
  followNotifications: boolean;
  messageNotifications: boolean;
  bookingNotifications: boolean;
  subscriptionNotifications: boolean;
  contentNotifications: boolean;
  milestoneNotifications: boolean;
  alertNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  notificationFrequency: 'instant' | 'daily' | 'weekly' | 'never';
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  deliveryRate: number;
  readRate: number;
  averageReadTime: number; // minutes
  topNotificationTypes: { type: string; count: number }[];
  engagementByHour: number[];
  conversionRate: number;
}

class AdvancedNotificationService {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreference> = new Map();
  private analytics: Map<string, NotificationAnalytics> = new Map();
  private notificationId = 0;
  private deliveryQueue: Notification[] = [];

  /**
   * Create and send notification
   */
  createNotification(
    userId: string,
    title: string,
    body: string,
    type: 'follow' | 'message' | 'booking' | 'subscription' | 'content' | 'milestone' | 'alert',
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    options?: {
      actionUrl?: string;
      imageUrl?: string;
      metadata?: Record<string, any>;
      expiresInHours?: number;
    }
  ): Notification {
    const notification: Notification = {
      id: `notif-${++this.notificationId}`,
      userId,
      title,
      body,
      type,
      priority,
      read: false,
      delivered: false,
      createdAt: new Date(),
      actionUrl: options?.actionUrl,
      imageUrl: options?.imageUrl,
      metadata: options?.metadata,
      expiresAt: options?.expiresInHours ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000) : undefined,
    };

    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    this.notifications.get(userId)!.push(notification);

    // Check preferences and add to delivery queue
    this.scheduleDelivery(notification);

    // Update analytics
    this.updateAnalytics(userId);

    return notification;
  }

  /**
   * Schedule notification delivery
   */
  private scheduleDelivery(notification: Notification): void {
    const preferences = this.getOrCreatePreferences(notification.userId);

    // Check if notification type is enabled
    if (!this.isNotificationTypeEnabled(notification.type, preferences)) {
      return;
    }

    // Check quiet hours
    if (this.isInQuietHours(preferences)) {
      // Queue for later delivery
      this.deliveryQueue.push(notification);
      return;
    }

    // Deliver immediately
    this.deliverNotification(notification);
  }

  /**
   * Deliver notification
   */
  private deliverNotification(notification: Notification): void {
    notification.delivered = true;
    notification.deliveredAt = new Date();
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string, userId: string): boolean {
    const notifications = this.notifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.read = true;
    notification.readAt = new Date();

    this.updateAnalytics(userId);
    return true;
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, limit: number = 50): Notification[] {
    const notifications = this.notifications.get(userId) || [];
    return notifications
      .filter(n => !n.expiresAt || n.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(userId: string): Notification[] {
    return this.getNotifications(userId).filter(n => !n.read);
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    return this.getUnreadNotifications(userId).length;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string, userId: string): boolean {
    const notifications = this.notifications.get(userId);
    if (!notifications) return false;

    const index = notifications.findIndex(n => n.id === notificationId);
    if (index === -1) return false;

    notifications.splice(index, 1);
    return true;
  }

  /**
   * Mark all as read
   */
  markAllAsRead(userId: string): number {
    const notifications = this.getUnreadNotifications(userId);
    for (const notification of notifications) {
      this.markAsRead(notification.id, userId);
    }
    return notifications.length;
  }

  /**
   * Get or create notification preferences
   */
  private getOrCreatePreferences(userId: string): NotificationPreference {
    if (this.preferences.has(userId)) {
      return this.preferences.get(userId)!;
    }

    const preferences: NotificationPreference = {
      userId,
      followNotifications: true,
      messageNotifications: true,
      bookingNotifications: true,
      subscriptionNotifications: true,
      contentNotifications: true,
      milestoneNotifications: true,
      alertNotifications: true,
      emailNotifications: false,
      pushNotifications: true,
      smsNotifications: false,
      notificationFrequency: 'instant',
    };

    this.preferences.set(userId, preferences);
    return preferences;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(userId: string, updates: Partial<NotificationPreference>): NotificationPreference {
    const preferences = this.getOrCreatePreferences(userId);
    Object.assign(preferences, updates);
    return preferences;
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreference {
    return this.getOrCreatePreferences(userId);
  }

  /**
   * Check if notification type is enabled
   */
  private isNotificationTypeEnabled(type: string, preferences: NotificationPreference): boolean {
    const typeMap: Record<string, keyof NotificationPreference> = {
      follow: 'followNotifications',
      message: 'messageNotifications',
      booking: 'bookingNotifications',
      subscription: 'subscriptionNotifications',
      content: 'contentNotifications',
      milestone: 'milestoneNotifications',
      alert: 'alertNotifications',
    };

    const key = typeMap[type];
    return key ? (preferences[key] as boolean) : true;
  }

  /**
   * Check if in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreference): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
  }

  /**
   * Process delivery queue (called periodically)
   */
  processDeliveryQueue(): number {
    let processed = 0;

    for (let i = this.deliveryQueue.length - 1; i >= 0; i--) {
      const notification = this.deliveryQueue[i];
      const preferences = this.getOrCreatePreferences(notification.userId);

      if (!this.isInQuietHours(preferences)) {
        this.deliverNotification(notification);
        this.deliveryQueue.splice(i, 1);
        processed++;
      }
    }

    return processed;
  }

  /**
   * Get analytics for user
   */
  getAnalytics(userId: string): NotificationAnalytics {
    return this.analytics.get(userId) || this.createDefaultAnalytics();
  }

  /**
   * Update analytics
   */
  private updateAnalytics(userId: string): void {
    const notifications = this.notifications.get(userId) || [];
    const totalSent = notifications.length;
    const totalDelivered = notifications.filter(n => n.delivered).length;
    const totalRead = notifications.filter(n => n.read).length;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

    // Calculate average read time
    let totalReadTime = 0;
    let readCount = 0;
    for (const notification of notifications) {
      if (notification.read && notification.readAt && notification.deliveredAt) {
        const readTime = (notification.readAt.getTime() - notification.deliveredAt.getTime()) / (1000 * 60);
        totalReadTime += readTime;
        readCount++;
      }
    }
    const averageReadTime = readCount > 0 ? totalReadTime / readCount : 0;

    // Get top notification types
    const typeCount: Record<string, number> = {};
    for (const notification of notifications) {
      typeCount[notification.type] = (typeCount[notification.type] || 0) + 1;
    }
    const topNotificationTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Engagement by hour
    const engagementByHour = new Array(24).fill(0);
    for (const notification of notifications) {
      if (notification.read && notification.readAt) {
        const hour = notification.readAt.getHours();
        engagementByHour[hour]++;
      }
    }

    const analytics: NotificationAnalytics = {
      totalSent,
      totalDelivered,
      totalRead,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      averageReadTime: Math.round(averageReadTime * 100) / 100,
      topNotificationTypes,
      engagementByHour,
      conversionRate: Math.random() * 20 + 5, // Mock data
    };

    this.analytics.set(userId, analytics);
  }

  /**
   * Create default analytics
   */
  private createDefaultAnalytics(): NotificationAnalytics {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      deliveryRate: 0,
      readRate: 0,
      averageReadTime: 0,
      topNotificationTypes: [],
      engagementByHour: new Array(24).fill(0),
      conversionRate: 0,
    };
  }

  /**
   * Broadcast notification to multiple users
   */
  broadcastNotification(
    userIds: string[],
    title: string,
    body: string,
    type: 'follow' | 'message' | 'booking' | 'subscription' | 'content' | 'milestone' | 'alert',
    options?: {
      actionUrl?: string;
      imageUrl?: string;
      metadata?: Record<string, any>;
    }
  ): number {
    let count = 0;
    for (const userId of userIds) {
      this.createNotification(userId, title, body, type, 'normal', options);
      count++;
    }
    return count;
  }

  /**
   * Clear expired notifications
   */
  clearExpiredNotifications(): number {
    let cleared = 0;
    const now = new Date();

    for (const notifications of this.notifications.values()) {
      for (let i = notifications.length - 1; i >= 0; i--) {
        const notification = notifications[i];
        if (notification.expiresAt && notification.expiresAt < now) {
          notifications.splice(i, 1);
          cleared++;
        }
      }
    }

    return cleared;
  }
}

export const advancedNotificationService = new AdvancedNotificationService();
