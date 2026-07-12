import { pushNotificationsService } from './push-notifications-service';

/**
 * Push Notifications Event System
 * Connects push notifications to real platform events
 */

export interface PlatformEvent {
  type: 'new_subscriber' | 'new_tip' | 'ai_creator_content' | 'message' | 'payment' | 'milestone';
  userId: string;
  creatorId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

class PushNotificationsEventSystem {
  private eventListeners: Map<string, Function[]> = new Map();
  private notifications: Map<string, any[]> = new Map();

  /**
   * Register event listener for push notifications
   */
  registerListener(eventType: string, callback: (event: PlatformEvent) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Emit platform event and trigger push notifications
   */
  async emitEvent(event: PlatformEvent) {
    const listeners = this.eventListeners.get(event.type) || [];
    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    }
  }

  /**
   * Handle new subscriber event
   */
  async onNewSubscriber(creatorId: string, subscriberName: string, tier: string) {
    const event: PlatformEvent = {
      type: 'new_subscriber',
      userId: creatorId,
      creatorId,
      data: {
        subscriberName,
        tier,
        message: `New subscriber joined your ${tier} tier!`,
      },
      timestamp: new Date(),
    };

    await this.emitEvent(event);

    // Send push notification to creator
    await pushNotificationsService.notifySubscriberJoined(creatorId, subscriberName, tier);
  }

  /**
   * Handle new tip event
   */
  async onNewTip(creatorId: string, tipperName: string, amount: number, message?: string) {
    const event: PlatformEvent = {
      type: 'new_tip',
      userId: creatorId,
      creatorId,
      data: {
        tipperName,
        amount,
        message,
      },
      timestamp: new Date(),
    };

    await this.emitEvent(event);

    // Send push notification to creator
    await pushNotificationsService.notifyTipReceived(creatorId, tipperName, amount, message);
  }

  /**
   * Handle AI creator content published
   */
  async onAICreatorContent(creatorId: string, creatorName: string, subscriberIds: string[], contentTitle: string) {
    const event: PlatformEvent = {
      type: 'ai_creator_content',
      userId: creatorId,
      creatorId,
      data: {
        contentTitle,
        subscriberCount: subscriberIds.length,
      },
      timestamp: new Date(),
    };

    await this.emitEvent(event);

    // Send push notifications to all subscribers
    await pushNotificationsService.notifyAICreatorUpdate(creatorId, creatorName, contentTitle, subscriberIds);
  }

  /**
   * Handle new message
   */
  async onNewMessage(recipientId: string, senderName: string, messagePreview: string) {
    const event: PlatformEvent = {
      type: 'message',
      userId: recipientId,
      data: {
        senderName,
        messagePreview,
      },
      timestamp: new Date(),
    };

    await this.emitEvent(event);

    // Send push notification via notification service
    if (!this.notifications.has(recipientId)) {
      this.notifications.set(recipientId, []);
    }
    this.notifications.get(recipientId)!.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: recipientId,
      title: `💬 Message from ${senderName}`,
      body: messagePreview,
      type: 'content_published',
      data: { type: 'message', sender: senderName },
      read: false,
      createdAt: new Date(),
    });
  }

  /**
   * Handle payment received
   */
  async onPaymentReceived(userId: string, amount: number, source: string) {
    const event: PlatformEvent = {
      type: 'payment',
      userId,
      data: {
        amount,
        source,
      },
      timestamp: new Date(),
    };

    await this.emitEvent(event);

    // Store payment notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: '💵 Payment Received',
      body: `$${amount.toFixed(2)} from ${source}`,
      type: 'content_published',
      data: { type: 'payment', amount: amount.toString() },
      read: false,
      createdAt: new Date(),
    });
  }

  /**
   * Handle milestone reached
   */
  async onMilestoneReached(userId: string, milestone: string, value: number) {
    const event: PlatformEvent = {
      type: 'milestone',
      userId,
      data: {
        milestone,
        value,
      },
      timestamp: new Date(),
    };

    await this.emitEvent(event);

    // Store milestone notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: '🏆 Milestone Reached!',
      body: `You've reached ${value} ${milestone}!`,
      type: 'content_published',
      data: { type: 'milestone', milestone, value: value.toString() },
      read: false,
      createdAt: new Date(),
    });
  }

  /**
   * Handle loyalty points earned
   */
  async onLoyaltyPointsEarned(userId: string, points: number, reason: string) {
    // Store loyalty points notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: '⭐ Loyalty Points Earned',
      body: `+${points} points for ${reason}`,
      type: 'content_published',
      data: { type: 'loyalty_points', points: points.toString() },
      read: false,
      createdAt: new Date(),
    });
  }

  /**
   * Handle subscription expiring soon
   */
  async onSubscriptionExpiringsoon(userId: string, creatorName: string, daysLeft: number) {
    // Store subscription expiring notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: '⏰ Subscription Expiring Soon',
      body: `Your ${creatorName} subscription expires in ${daysLeft} days`,
      type: 'content_published',
      data: { type: 'subscription_expiring', daysLeft: daysLeft.toString() },
      read: false,
      createdAt: new Date(),
    });
  }
}

export const pushNotificationsEventSystem = new PushNotificationsEventSystem();
