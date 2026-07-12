/**
 * Real-Time Notifications Service
 * Manages WebSocket-based notifications for live updates
 */

export type NotificationType =
  | 'post_published'
  | 'new_follower'
  | 'earnings_milestone'
  | 'ai_activity'
  | 'message'
  | 'collaboration'
  | 'system';

export interface RealtimeNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationSubscriber {
  userId: string;
  callback: (notification: RealtimeNotification) => void;
}

export class RealtimeNotificationsService {
  private subscribers: Map<string, NotificationSubscriber[]> = new Map();
  private notifications: Map<string, RealtimeNotification[]> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();
  private notificationQueue: RealtimeNotification[] = [];
  private isProcessing = false;

  /**
   * Subscribe to notifications for a user
   */
  subscribe(
    userId: string,
    callback: (notification: RealtimeNotification) => void
  ): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, []);
    }

    const subscriber: NotificationSubscriber = { userId, callback };
    this.subscribers.get(userId)!.push(subscriber);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(userId);
      if (subs) {
        const index = subs.indexOf(subscriber);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  /**
   * Send notification to user
   */
  sendNotification(notification: RealtimeNotification): void {
    this.notificationQueue.push(notification);
    this.processQueue();
  }

  /**
   * Process notification queue
   */
  private processQueue(): void {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()!;

      // Store notification
      if (!this.notifications.has(notification.userId)) {
        this.notifications.set(notification.userId, []);
      }
      this.notifications.get(notification.userId)!.push(notification);

      // Send to subscribers
      const subscribers = this.subscribers.get(notification.userId) || [];
      subscribers.forEach((subscriber) => {
        subscriber.callback(notification);
      });
    }

    this.isProcessing = false;
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, limit: number = 50): RealtimeNotification[] {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.slice(-limit);
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter((n) => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach((n) => {
      n.read = true;
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex((n) => n.id === notificationId);
    if (index > -1) {
      userNotifications.splice(index, 1);
    }
  }

  /**
   * Send post published notification
   */
  notifyPostPublished(
    userId: string,
    postTitle: string,
    platforms: string[]
  ): void {
    this.sendNotification({
      id: `post_${Date.now()}_${Math.random()}`,
      userId,
      type: 'post_published',
      title: '🎉 Post Published',
      message: `Your post "${postTitle}" is now live on ${platforms.join(', ')}`,
      data: { postTitle, platforms },
      timestamp: Date.now(),
      read: false,
      actionUrl: '/dashboard/posts',
    });
  }

  /**
   * Send new follower notification
   */
  notifyNewFollower(userId: string, followerName: string): void {
    this.sendNotification({
      id: `follower_${Date.now()}_${Math.random()}`,
      userId,
      type: 'new_follower',
      title: '👥 New Follower',
      message: `${followerName} started following you!`,
      data: { followerName },
      timestamp: Date.now(),
      read: false,
      actionUrl: '/profile/followers',
    });
  }

  /**
   * Send earnings milestone notification
   */
  notifyEarningsMilestone(
    userId: string,
    amount: number,
    milestone: string
  ): void {
    this.sendNotification({
      id: `earnings_${Date.now()}_${Math.random()}`,
      userId,
      type: 'earnings_milestone',
      title: '💰 Earnings Milestone',
      message: `Congratulations! You've reached $${amount} in ${milestone} earnings!`,
      data: { amount, milestone },
      timestamp: Date.now(),
      read: false,
      actionUrl: '/dashboard/earnings',
    });
  }

  /**
   * Send AI activity notification
   */
  notifyAIActivity(userId: string, aiName: string, activity: string): void {
    this.sendNotification({
      id: `ai_${Date.now()}_${Math.random()}`,
      userId,
      type: 'ai_activity',
      title: `🤖 ${aiName} Activity`,
      message: activity,
      data: { aiName, activity },
      timestamp: Date.now(),
      read: false,
      actionUrl: '/ai-creators',
    });
  }

  /**
   * Send message notification
   */
  notifyMessage(userId: string, senderName: string, preview: string): void {
    this.sendNotification({
      id: `msg_${Date.now()}_${Math.random()}`,
      userId,
      type: 'message',
      title: '💬 New Message',
      message: `${senderName}: ${preview}`,
      data: { senderName, preview },
      timestamp: Date.now(),
      read: false,
      actionUrl: '/messages',
    });
  }

  /**
   * Send collaboration notification
   */
  notifyCollaboration(
    userId: string,
    collaboratorName: string,
    action: string
  ): void {
    this.sendNotification({
      id: `collab_${Date.now()}_${Math.random()}`,
      userId,
      type: 'collaboration',
      title: '🤝 Collaboration Update',
      message: `${collaboratorName} ${action}`,
      data: { collaboratorName, action },
      timestamp: Date.now(),
      read: false,
      actionUrl: '/collaborations',
    });
  }

  /**
   * Set user connection status
   */
  setConnectionStatus(userId: string, connected: boolean): void {
    this.connectionStatus.set(userId, connected);
  }

  /**
   * Get user connection status
   */
  isConnected(userId: string): boolean {
    return this.connectionStatus.get(userId) ?? false;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectionStatus.entries())
      .filter(([, connected]) => connected)
      .map(([userId]) => userId);
  }

  /**
   * Clear all notifications for user
   */
  clearAllNotifications(userId: string): void {
    this.notifications.delete(userId);
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId: string): {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
  } {
    const userNotifications = this.notifications.get(userId) || [];
    const byType: Record<NotificationType, number> = {
      post_published: 0,
      new_follower: 0,
      earnings_milestone: 0,
      ai_activity: 0,
      message: 0,
      collaboration: 0,
      system: 0,
    };

    userNotifications.forEach((n) => {
      byType[n.type]++;
    });

    return {
      total: userNotifications.length,
      unread: userNotifications.filter((n) => !n.read).length,
      byType,
    };
  }
}

export const realtimeNotificationsService = new RealtimeNotificationsService();
