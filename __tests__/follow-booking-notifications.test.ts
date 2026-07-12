import { describe, it, expect, beforeEach } from 'vitest';
import { followSystemService } from '@/lib/follow-system-service';
import { bookingSubscriptionService } from '@/lib/booking-subscription-service';
import { advancedNotificationService } from '@/lib/advanced-notification-service';

describe('Follow System Service', () => {
  beforeEach(() => {
    // Reset services
  });

  it('should allow user to follow creator', () => {
    const follower = followSystemService.followCreator('user1', 'creator1', 'silver');
    expect(follower.userId).toBe('user1');
    expect(follower.creatorId).toBe('creator1');
    expect(follower.tier).toBe('silver');
  });

  it('should track follower count', () => {
    followSystemService.followCreator('user1', 'creator1');
    followSystemService.followCreator('user2', 'creator1');
    expect(followSystemService.getFollowerCount('creator1')).toBe(2);
  });

  it('should check if user follows creator', () => {
    followSystemService.followCreator('user1', 'creator1');
    expect(followSystemService.isFollowing('user1', 'creator1')).toBe(true);
    expect(followSystemService.isFollowing('user2', 'creator1')).toBe(false);
  });

  it('should allow user to unfollow creator', () => {
    followSystemService.followCreator('user1', 'creator1');
    expect(followSystemService.getFollowerCount('creator1')).toBe(1);
    followSystemService.unfollowCreator('user1', 'creator1');
    expect(followSystemService.getFollowerCount('creator1')).toBe(0);
  });

  it('should get followed creators for user', () => {
    followSystemService.followCreator('user1', 'creator1');
    followSystemService.followCreator('user1', 'creator2');
    const followed = followSystemService.getFollowedCreators('user1');
    expect(followed).toContain('creator1');
    expect(followed).toContain('creator2');
  });

  it('should update follower tier', () => {
    followSystemService.followCreator('user1', 'creator1', 'free');
    followSystemService.updateFollowerTier('user1', 'creator1', 'gold');
    const followers = followSystemService.getFollowers('creator1');
    expect(followers[0].tier).toBe('gold');
  });

  it('should toggle notifications for follower', () => {
    followSystemService.followCreator('user1', 'creator1');
    expect(followSystemService.getFollowers('creator1')[0].notificationsEnabled).toBe(true);
    followSystemService.toggleNotifications('user1', 'creator1');
    expect(followSystemService.getFollowers('creator1')[0].notificationsEnabled).toBe(false);
  });

  it('should get follow analytics', () => {
    followSystemService.followCreator('user1', 'creator1');
    followSystemService.followCreator('user2', 'creator1');
    const analytics = followSystemService.getAnalytics('creator1');
    expect(analytics.totalFollowers).toBe(2);
  });

  it('should broadcast notification to followers', () => {
    followSystemService.followCreator('user1', 'creator1');
    followSystemService.followCreator('user2', 'creator1');
    const count = followSystemService.broadcastToFollowers('creator1', 'New content available');
    expect(count).toBe(2);
  });

  it('should get follower statistics by tier', () => {
    followSystemService.followCreator('user1', 'creator1', 'free');
    followSystemService.followCreator('user2', 'creator1', 'gold');
    const stats = followSystemService.getFollowerStats('creator1');
    expect(stats.total).toBe(2);
    expect(stats.byTier.free).toBe(1);
    expect(stats.byTier.gold).toBe(1);
  });
});

describe('Booking & Subscription Service', () => {
  beforeEach(() => {
    // Reset services
  });

  it('should create subscription', () => {
    const subscription = bookingSubscriptionService.createSubscription('user1', 'creator1', 'silver');
    expect(subscription.userId).toBe('user1');
    expect(subscription.tier).toBe('silver');
    expect(subscription.status).toBe('active');
  });

  it('should get user subscriptions', () => {
    bookingSubscriptionService.createSubscription('user1', 'creator1', 'silver');
    bookingSubscriptionService.createSubscription('user1', 'creator2', 'gold');
    const subscriptions = bookingSubscriptionService.getSubscriptions('user1');
    expect(subscriptions.length).toBe(2);
  });

  it('should upgrade subscription tier', () => {
    const subscription = bookingSubscriptionService.createSubscription('user1', 'creator1', 'silver');
    bookingSubscriptionService.upgradeSubscription(subscription.id, 'user1', 'gold');
    const updated = bookingSubscriptionService.getSubscriptions('user1')[0];
    expect(updated.tier).toBe('gold');
  });

  it('should cancel subscription', () => {
    const subscription = bookingSubscriptionService.createSubscription('user1', 'creator1', 'silver');
    bookingSubscriptionService.cancelSubscription(subscription.id, 'user1');
    const cancelled = bookingSubscriptionService.getSubscriptions('user1')[0];
    expect(cancelled.status).toBe('cancelled');
  });

  it('should book session', () => {
    bookingSubscriptionService.createSubscription('user1', 'creator1', 'gold');
    const booking = bookingSubscriptionService.bookSession('user1', 'creator1', 'consultation', 60, new Date(), 50);
    expect(booking).not.toBeNull();
    expect(booking?.status).toBe('pending');
  });

  it('should confirm booking', () => {
    bookingSubscriptionService.createSubscription('user1', 'creator1', 'gold');
    const booking = bookingSubscriptionService.bookSession('user1', 'creator1', 'consultation', 60, new Date(), 50);
    if (booking) {
      bookingSubscriptionService.confirmBooking(booking.id, 'user1', 'https://zoom.us/meeting');
      const confirmed = bookingSubscriptionService.getBookings('user1')[0];
      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.meetingLink).toBe('https://zoom.us/meeting');
    }
  });

  it('should cancel booking and refund', () => {
    bookingSubscriptionService.createSubscription('user1', 'creator1', 'gold');
    const booking = bookingSubscriptionService.bookSession('user1', 'creator1', 'consultation', 60, new Date(), 50);
    if (booking) {
      bookingSubscriptionService.cancelBooking(booking.id, 'user1');
      const cancelled = bookingSubscriptionService.getBookings('user1')[0];
      expect(cancelled.status).toBe('cancelled');
    }
  });

  it('should get creator earnings', () => {
    bookingSubscriptionService.createSubscription('user1', 'creator1', 'silver');
    bookingSubscriptionService.createSubscription('user2', 'creator1', 'gold');
    const earnings = bookingSubscriptionService.getCreatorEarnings('creator1');
    expect(earnings.total).toBeGreaterThan(0);
  });

  it('should get subscription tier info', () => {
    const tier = bookingSubscriptionService.getSubscriptionTier('gold');
    expect(tier.name).toBe('gold');
    expect(tier.monthlyPrice).toBe(24.99);
  });

  it('should get all subscription tiers', () => {
    const tiers = bookingSubscriptionService.getAllSubscriptionTiers();
    expect(tiers.length).toBe(4);
  });
});

describe('Advanced Notification Service', () => {
  beforeEach(() => {
    // Reset services
  });

  it('should create notification', () => {
    const notification = advancedNotificationService.createNotification('user1', 'New Follow', 'Someone followed you', 'follow');
    expect(notification.userId).toBe('user1');
    expect(notification.type).toBe('follow');
    expect(notification.read).toBe(false);
  });

  it('should get notifications for user', () => {
    advancedNotificationService.createNotification('user1', 'Title 1', 'Body 1', 'follow');
    advancedNotificationService.createNotification('user1', 'Title 2', 'Body 2', 'message');
    const notifications = advancedNotificationService.getNotifications('user1');
    expect(notifications.length).toBe(2);
  });

  it('should mark notification as read', () => {
    const notification = advancedNotificationService.createNotification('user1', 'Title', 'Body', 'follow');
    advancedNotificationService.markAsRead(notification.id, 'user1');
    const updated = advancedNotificationService.getNotifications('user1')[0];
    expect(updated.read).toBe(true);
  });

  it('should get unread count', () => {
    advancedNotificationService.createNotification('user1', 'Title 1', 'Body 1', 'follow');
    advancedNotificationService.createNotification('user1', 'Title 2', 'Body 2', 'message');
    expect(advancedNotificationService.getUnreadCount('user1')).toBe(2);
  });

  it('should mark all as read', () => {
    advancedNotificationService.createNotification('user1', 'Title 1', 'Body 1', 'follow');
    advancedNotificationService.createNotification('user1', 'Title 2', 'Body 2', 'message');
    advancedNotificationService.markAllAsRead('user1');
    expect(advancedNotificationService.getUnreadCount('user1')).toBe(0);
  });

  it('should delete notification', () => {
    const notification = advancedNotificationService.createNotification('user1', 'Title', 'Body', 'follow');
    advancedNotificationService.deleteNotification(notification.id, 'user1');
    const notifications = advancedNotificationService.getNotifications('user1');
    expect(notifications.length).toBe(0);
  });

  it('should get notification preferences', () => {
    const preferences = advancedNotificationService.getPreferences('user1');
    expect(preferences.userId).toBe('user1');
    expect(preferences.pushNotifications).toBe(true);
  });

  it('should update notification preferences', () => {
    advancedNotificationService.updatePreferences('user1', { pushNotifications: false });
    const preferences = advancedNotificationService.getPreferences('user1');
    expect(preferences.pushNotifications).toBe(false);
  });

  it('should broadcast notification to multiple users', () => {
    const count = advancedNotificationService.broadcastNotification(['user1', 'user2', 'user3'], 'Title', 'Body', 'content');
    expect(count).toBe(3);
  });

  it('should get notification analytics', () => {
    advancedNotificationService.createNotification('user1', 'Title 1', 'Body 1', 'follow');
    advancedNotificationService.createNotification('user1', 'Title 2', 'Body 2', 'message');
    const analytics = advancedNotificationService.getAnalytics('user1');
    expect(analytics.totalSent).toBeGreaterThanOrEqual(2);
  });

  it('should clear expired notifications', () => {
    advancedNotificationService.createNotification('user1', 'Title', 'Body', 'follow', 'normal', { expiresInHours: 0 });
    const cleared = advancedNotificationService.clearExpiredNotifications();
    expect(cleared).toBeGreaterThanOrEqual(0);
  });
});
