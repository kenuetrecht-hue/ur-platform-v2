/**
 * Push Notifications Service
 * Handles push notifications for AI creators, tips, and subscriber updates
 */

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'ai_creator_update' | 'tip_received' | 'subscriber_joined' | 'content_published';
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  aiCreatorUpdates: boolean;
  tipNotifications: boolean;
  subscriberNotifications: boolean;
  contentNotifications: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

class PushNotificationsService {
  private notifications: Map<string, PushNotification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private subscribers: Set<string> = new Set();

  /**
   * Register device for push notifications
   */
  async registerDevice(userId: string, deviceToken: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, deviceToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device');
      }

      this.subscribers.add(userId);
    } catch (error) {
      console.error('Device registration error:', error);
      throw error;
    }
  }

  /**
   * Send notification when AI creator publishes content
   */
  async notifyAICreatorUpdate(
    creatorId: string,
    creatorName: string,
    contentTitle: string,
    subscriberIds: string[]
  ): Promise<void> {
    const notification: PushNotification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: '', // Will be set per subscriber
      title: `${creatorName} published new content`,
      body: contentTitle,
      type: 'ai_creator_update',
      data: { creatorId, contentTitle },
      read: false,
      createdAt: new Date(),
    };

    for (const subscriberId of subscriberIds) {
      const userNotif = { ...notification, userId: subscriberId, id: `${notification.id}_${subscriberId}` };

      // Store notification
      if (!this.notifications.has(subscriberId)) {
        this.notifications.set(subscriberId, []);
      }
      this.notifications.get(subscriberId)!.push(userNotif);

      // Check preferences
      const prefs = this.preferences.get(subscriberId);
      if (prefs?.aiCreatorUpdates && prefs?.pushEnabled) {
        await this.sendPushNotification(subscriberId, notification);
      }
    }
  }

  /**
   * Send notification when user receives a tip
   */
  async notifyTipReceived(
    userId: string,
    tipper: string,
    amount: number,
    message?: string
  ): Promise<void> {
    const notification: PushNotification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: `You received a tip from ${tipper}`,
      body: `$${amount.toFixed(2)}${message ? `: ${message}` : ''}`,
      type: 'tip_received',
      data: { tipper, amount, message },
      read: false,
      createdAt: new Date(),
    };

    // Store notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push(notification);

    // Check preferences
    const prefs = this.preferences.get(userId);
    if (prefs?.tipNotifications && prefs?.pushEnabled) {
      await this.sendPushNotification(userId, notification);
    }
  }

  /**
   * Send notification when new subscriber joins
   */
  async notifySubscriberJoined(
    creatorId: string,
    subscriberName: string,
    tier: string
  ): Promise<void> {
    const notification: PushNotification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: creatorId,
      title: `New subscriber: ${subscriberName}`,
      body: `Joined ${tier} tier`,
      type: 'subscriber_joined',
      data: { subscriberName, tier },
      read: false,
      createdAt: new Date(),
    };

    // Store notification
    if (!this.notifications.has(creatorId)) {
      this.notifications.set(creatorId, []);
    }
    this.notifications.get(creatorId)!.push(notification);

    // Check preferences
    const prefs = this.preferences.get(creatorId);
    if (prefs?.subscriberNotifications && prefs?.pushEnabled) {
      await this.sendPushNotification(creatorId, notification);
    }
  }

  /**
   * Send notification when content is published
   */
  async notifyContentPublished(
    creatorId: string,
    contentTitle: string,
    followerIds: string[]
  ): Promise<void> {
    const notification: PushNotification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: '', // Will be set per follower
      title: `New content published`,
      body: contentTitle,
      type: 'content_published',
      data: { creatorId, contentTitle },
      read: false,
      createdAt: new Date(),
    };

    for (const followerId of followerIds) {
      const userNotif = { ...notification, userId: followerId, id: `${notification.id}_${followerId}` };

      // Store notification
      if (!this.notifications.has(followerId)) {
        this.notifications.set(followerId, []);
      }
      this.notifications.get(followerId)!.push(userNotif);

      // Check preferences
      const prefs = this.preferences.get(followerId);
      if (prefs?.contentNotifications && prefs?.pushEnabled) {
        await this.sendPushNotification(followerId, notification);
      }
    }
  }

  /**
   * Send actual push notification via API
   */
  private async sendPushNotification(
    userId: string,
    notification: PushNotification
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notification }),
      });

      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }
    } catch (error) {
      console.error('Push notification error:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, limit: number = 50): PushNotification[] {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.slice(-limit).reverse();
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    }
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter((n) => !n.read).length;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const current = this.preferences.get(userId) || {
      userId,
      aiCreatorUpdates: true,
      tipNotifications: true,
      subscriberNotifications: true,
      contentNotifications: true,
      pushEnabled: true,
      emailEnabled: false,
    };

    this.preferences.set(userId, { ...current, ...preferences });
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    return (
      this.preferences.get(userId) || {
        userId,
        aiCreatorUpdates: true,
        tipNotifications: true,
        subscriberNotifications: true,
        contentNotifications: true,
        pushEnabled: true,
        emailEnabled: false,
      }
    );
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  clearOldNotifications(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const [userId, notifications] of this.notifications.entries()) {
      const filtered = notifications.filter((n) => n.createdAt > thirtyDaysAgo);
      this.notifications.set(userId, filtered);
    }
  }
}

export const pushNotificationsService = new PushNotificationsService();
