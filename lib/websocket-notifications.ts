/**
 * WebSocket Notifications Service
 * Enables real-time notifications for messages, collaboration requests, stream alerts, etc.
 */

export interface Notification {
  id: string;
  userId: string;
  type: "message" | "collaboration" | "stream" | "alert" | "engagement" | "earnings";
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface WebSocketMessage {
  type: "notification" | "update" | "subscribe" | "unsubscribe" | "ping" | "pong";
  payload: any;
  timestamp: number;
}

export interface NotificationSubscriber {
  userId: string;
  channels: Set<string>;
  onNotification: (notification: Notification) => void;
}

class WebSocketNotificationService {
  private subscribers: Map<string, NotificationSubscriber> = new Map();
  private notifications: Map<string, Notification[]> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private isConnected: boolean = false;

  /**
   * Subscribe user to notification channels
   */
  subscribe(userId: string, channels: string[], onNotification: (notification: Notification) => void): void {
    const subscriber: NotificationSubscriber = {
      userId,
      channels: new Set(channels),
      onNotification,
    };

    this.subscribers.set(userId, subscriber);

    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    this.isConnected = true;
  }

  /**
   * Unsubscribe user from notification channels
   */
  unsubscribe(userId: string, channels?: string[]): void {
    const subscriber = this.subscribers.get(userId);
    if (!subscriber) return;

    if (channels) {
      channels.forEach((channel) => subscriber.channels.delete(channel));
      if (subscriber.channels.size === 0) {
        this.subscribers.delete(userId);
      }
    } else {
      this.subscribers.delete(userId);
    }
  }

  /**
   * Send notification to user
   */
  sendNotification(notification: Omit<Notification, "id" | "createdAt">): Notification {
    const fullNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const userNotifications = this.notifications.get(notification.userId) || [];
    userNotifications.push(fullNotification);
    this.notifications.set(notification.userId, userNotifications);

    // Emit to subscriber if connected
    const subscriber = this.subscribers.get(notification.userId);
    if (subscriber && subscriber.channels.has(notification.type)) {
      subscriber.onNotification(fullNotification);
    }

    // Queue message for delivery
    this.messageQueue.push({
      type: "notification",
      payload: fullNotification,
      timestamp: Date.now(),
    });

    return fullNotification;
  }

  /**
   * Send message notification
   */
  sendMessageNotification(userId: string, fromUser: string, message: string): Notification {
    return this.sendNotification({
      userId,
      type: "message",
      title: `New message from ${fromUser}`,
      body: message.substring(0, 100),
      data: { fromUser, messagePreview: message },
      read: false,
      actionUrl: `/messages/direct?user=${fromUser}`,
    });
  }

  /**
   * Send collaboration request notification
   */
  sendCollaborationNotification(userId: string, creatorName: string, projectTitle: string): Notification {
    return this.sendNotification({
      userId,
      type: "collaboration",
      title: `Collaboration request from ${creatorName}`,
      body: `${creatorName} wants to collaborate on "${projectTitle}"`,
      data: { creatorName, projectTitle },
      read: false,
      actionUrl: `/messages/collaboration`,
    });
  }

  /**
   * Send stream alert notification
   */
  sendStreamAlertNotification(userId: string, creatorName: string, streamTitle: string): Notification {
    return this.sendNotification({
      userId,
      type: "stream",
      title: `${creatorName} is now live!`,
      body: `Watch: ${streamTitle}`,
      data: { creatorName, streamTitle },
      read: false,
      actionUrl: `/discover/trending-content`,
    });
  }

  /**
   * Send engagement notification
   */
  sendEngagementNotification(userId: string, creatorName: string, engagementType: string): Notification {
    return this.sendNotification({
      userId,
      type: "engagement",
      title: `${creatorName} ${engagementType} your content!`,
      body: `Your content is getting great engagement!`,
      data: { creatorName, engagementType },
      read: false,
      actionUrl: `/profile/analytics`,
    });
  }

  /**
   * Send earnings notification
   */
  sendEarningsNotification(userId: string, amount: number): Notification {
    return this.sendNotification({
      userId,
      type: "earnings",
      title: "You earned money!",
      body: `You just earned $${amount.toFixed(2)}`,
      data: { amount },
      read: false,
      actionUrl: `/profile/earnings`,
    });
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId: string, limit: number = 50): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.slice(-limit).reverse();
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
  markAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    let count = 0;
    userNotifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  /**
   * Delete notification
   */
  deleteNotification(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const index = userNotifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      userNotifications.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications for user
   */
  clearAllNotifications(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    const count = userNotifications.length;
    this.notifications.set(userId, []);
    return count;
  }

  /**
   * Broadcast notification to multiple users
   */
  broadcastNotification(userIds: string[], notification: Omit<Notification, "id" | "createdAt" | "userId">): Notification[] {
    return userIds.map((userId) =>
      this.sendNotification({
        ...notification,
        userId,
      })
    );
  }

  /**
   * Get connection status
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get pending messages in queue
   */
  getPendingMessages(): WebSocketMessage[] {
    return this.messageQueue;
  }

  /**
   * Clear message queue
   */
  clearMessageQueue(): number {
    const count = this.messageQueue.length;
    this.messageQueue = [];
    return count;
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId: string) {
    const userNotifications = this.notifications.get(userId) || [];
    const typeCount: Record<string, number> = {
      message: 0,
      collaboration: 0,
      stream: 0,
      alert: 0,
      engagement: 0,
      earnings: 0,
    };

    userNotifications.forEach((n) => {
      typeCount[n.type]++;
    });

    return {
      total: userNotifications.length,
      unread: userNotifications.filter((n) => !n.read).length,
      byType: typeCount,
      oldestNotification: userNotifications.length > 0 ? userNotifications[0].createdAt : null,
      newestNotification: userNotifications.length > 0 ? userNotifications[userNotifications.length - 1].createdAt : null,
    };
  }

  /**
   * Simulate real-time stream notification
   */
  simulateStreamNotification(creatorId: string, creatorName: string, streamTitle: string, viewerUserIds: string[]): void {
    viewerUserIds.forEach((userId) => {
      this.sendStreamAlertNotification(userId, creatorName, streamTitle);
    });
  }

  /**
   * Simulate engagement notification
   */
  simulateEngagementNotification(contentCreatorId: string, creatorName: string, engagementType: string): void {
    this.sendEngagementNotification(contentCreatorId, creatorName, engagementType);
  }

  /**
   * Simulate earnings notification
   */
  simulateEarningsNotification(userId: string, amount: number): void {
    this.sendEarningsNotification(userId, amount);
  }
}

export const websocketNotificationService = new WebSocketNotificationService();
