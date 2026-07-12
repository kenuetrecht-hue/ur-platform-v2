/**
 * Real-Time Notifications Service
 * Handles push notifications for creator events
 */

export interface Notification {
  id: string;
  userId: string;
  type: 'collaboration' | 'upload' | 'processing' | 'earnings' | 'milestone';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface NotificationPreferences {
  userId: string;
  collaborationAlerts: boolean;
  uploadAlerts: boolean;
  processingAlerts: boolean;
  earningsAlerts: boolean;
  milestoneAlerts: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export class NotificationsService {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private subscribers: Map<string, ((notification: Notification) => void)[]> = new Map();

  /**
   * Send notification to creator
   */
  sendNotification(userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
      read: false,
    };

    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push(fullNotification);

    // Trigger subscribers
    const subs = this.subscribers.get(userId) || [];
    subs.forEach(sub => sub(fullNotification));

    return fullNotification;
  }

  /**
   * Send collaboration notification
   */
  notifyCollaboration(userId: string, collaboratorName: string, projectName: string): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'collaboration',
      title: 'New Collaborator',
      message: `${collaboratorName} joined your project "${projectName}"`,
      data: { projectName, collaboratorName },
      actionUrl: `/projects/${projectName}`,
    });
  }

  /**
   * Send upload started notification
   */
  notifyUploadStarted(userId: string, fileName: string): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'upload',
      title: 'Upload Started',
      message: `Uploading "${fileName}"...`,
      data: { fileName },
    });
  }

  /**
   * Send upload completed notification
   */
  notifyUploadCompleted(userId: string, fileName: string, fileSize: number): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'upload',
      title: 'Upload Complete',
      message: `"${fileName}" (${(fileSize / 1024 / 1024).toFixed(2)}MB) uploaded successfully`,
      data: { fileName, fileSize },
    });
  }

  /**
   * Send processing started notification
   */
  notifyProcessingStarted(userId: string, projectName: string, type: string): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'processing',
      title: 'Processing Started',
      message: `${type} processing started for "${projectName}"`,
      data: { projectName, type },
    });
  }

  /**
   * Send processing completed notification
   */
  notifyProcessingCompleted(userId: string, projectName: string, type: string): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'processing',
      title: 'Processing Complete',
      message: `${type} processing completed for "${projectName}"`,
      data: { projectName, type },
      actionUrl: `/projects/${projectName}`,
    });
  }

  /**
   * Send earnings notification
   */
  notifyEarnings(userId: string, amount: number, source: string): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'earnings',
      title: 'New Earnings',
      message: `You earned $${amount.toFixed(2)} from ${source}`,
      data: { amount, source },
      actionUrl: '/earnings',
    });
  }

  /**
   * Send milestone notification
   */
  notifyMilestone(userId: string, milestone: string, value: number): Notification {
    return this.sendNotification(userId, {
      userId,
      type: 'milestone',
      title: 'Milestone Reached!',
      message: `Congratulations! You've reached ${value} ${milestone}`,
      data: { milestone, value },
      actionUrl: '/dashboard',
    });
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    if (unreadOnly) {
      return userNotifications.filter(n => !n.read);
    }
    return userNotifications;
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.read = true;
    return true;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    let count = 0;
    userNotifications.forEach(n => {
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

    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index === -1) return false;

    userNotifications.splice(index, 1);
    return true;
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
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  /**
   * Set notification preferences
   */
  setPreferences(userId: string, preferences: Partial<NotificationPreferences>): NotificationPreferences {
    const current = this.preferences.get(userId) || {
      userId,
      collaborationAlerts: true,
      uploadAlerts: true,
      processingAlerts: true,
      earningsAlerts: true,
      milestoneAlerts: true,
      pushEnabled: true,
      emailEnabled: false,
    };

    const updated = { ...current, ...preferences, userId };
    this.preferences.set(userId, updated);
    return updated;
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || {
      userId,
      collaborationAlerts: true,
      uploadAlerts: true,
      processingAlerts: true,
      earningsAlerts: true,
      milestoneAlerts: true,
      pushEnabled: true,
      emailEnabled: false,
    };
  }

  /**
   * Subscribe to notifications for user
   */
  subscribe(userId: string, callback: (notification: Notification) => void): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, []);
    }
    this.subscribers.get(userId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(userId);
      if (subs) {
        const index = subs.indexOf(callback);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get notification statistics
   */
  getStats(userId: string): {
    total: number;
    unread: number;
    byType: Record<string, number>;
  } {
    const userNotifications = this.notifications.get(userId) || [];
    const stats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.read).length,
      byType: {} as Record<string, number>,
    };

    userNotifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    });

    return stats;
  }
}
