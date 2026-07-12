import { describe, it, expect, beforeEach } from "vitest";
import { creatorContentService, CreatorProfile, CreatorContent } from "../lib/creator-content-service";
import { websocketNotificationService, Notification } from "../lib/websocket-notifications";

describe("Creator Content Service", () => {
  beforeEach(() => {
    // Reset services before each test
    creatorContentService.initializeCreators();
  });

  describe("Creator Profiles", () => {
    it("should initialize with sample creators", () => {
      const creators = creatorContentService.getAllCreators();
      expect(creators.length).toBeGreaterThanOrEqual(5);
    });

    it("should get creator by ID", () => {
      const creator = creatorContentService.getCreatorById("creator_kenneth_001");
      expect(creator).toBeDefined();
      expect(creator?.name).toBe("Kenneth Uetrecht");
      expect(creator?.tier).toBe("platinum");
      expect(creator?.verifiedBadge).toBe(true);
    });

    it("should get top creators by followers", () => {
      const topCreators = creatorContentService.getTopCreators(3);
      expect(topCreators.length).toBeGreaterThan(0);
      expect(topCreators[0].followers).toBeGreaterThanOrEqual(topCreators[1].followers);
    });

    it("should get top earners", () => {
      const topEarners = creatorContentService.getTopEarners(3);
      expect(topEarners.length).toBeGreaterThan(0);
      expect(topEarners[0].totalEarnings).toBeGreaterThanOrEqual(topEarners[1].totalEarnings);
    });

    it("should search creators by name", () => {
      const results = creatorContentService.searchCreators("kenneth");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain("Kenneth");
    });

    it("should search creators by handle", () => {
      const results = creatorContentService.searchCreators("wellness");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Creator Content", () => {
    it("should get creator content", () => {
      const content = creatorContentService.getCreatorContent("creator_kenneth_001");
      expect(content.length).toBeGreaterThan(0);
    });

    it("should have different content types", () => {
      const content = creatorContentService.getCreatorContent("creator_kenneth_001");
      const types = new Set(content.map((c) => c.type));
      expect(types.size).toBeGreaterThan(1);
    });

    it("should get trending content", () => {
      const trending = creatorContentService.getTrendingContent(5);
      expect(trending.length).toBeGreaterThan(0);
      expect(trending[0].views).toBeGreaterThanOrEqual(trending[1].views);
    });

    it("should get content by category", () => {
      const education = creatorContentService.getContentByCategory("Education");
      expect(education.length).toBeGreaterThan(0);
      expect(education.every((c) => c.category === "Education")).toBe(true);
    });

    it("should update content engagement metrics", () => {
      const content = creatorContentService.getCreatorContent("creator_kenneth_001")[0];
      const originalViews = content.views;

      const updated = creatorContentService.updateContentEngagement(content.id, {
        views: originalViews + 1000,
        likes: content.likes + 100,
      });

      expect(updated?.views).toBe(originalViews + 1000);
      expect(updated?.likes).toBeGreaterThanOrEqual(content.likes);
    });

    it("should add new content for creator", () => {
      const newContent = creatorContentService.addContent("creator_kenneth_001", {
        type: "video",
        title: "New Tutorial",
        description: "A new tutorial video",
        url: "https://example.com/new-video.mp4",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        tags: ["tutorial"],
        category: "Education",
        isPublished: true,
        earnings: 0,
      });

      expect(newContent.id).toBeDefined();
      expect(newContent.title).toBe("New Tutorial");
      expect(newContent.type).toBe("video");
    });
  });

  describe("Creator Statistics", () => {
    it("should get creator statistics", () => {
      const stats = creatorContentService.getCreatorStats("creator_kenneth_001");
      expect(stats).toBeDefined();
      expect(stats?.totalContent).toBeGreaterThan(0);
      expect(stats?.totalViews).toBeGreaterThan(0);
      expect(stats?.totalEarnings).toBeGreaterThan(0);
    });

    it("should calculate average views per content", () => {
      const stats = creatorContentService.getCreatorStats("creator_kenneth_001");
      expect(stats?.averageViewsPerContent).toBeGreaterThan(0);
    });

    it("should count content by type", () => {
      const stats = creatorContentService.getCreatorStats("creator_kenneth_001");
      const totalByType =
        (stats?.contentByType.video || 0) +
        (stats?.contentByType.audio || 0) +
        (stats?.contentByType.image || 0) +
        (stats?.contentByType.article || 0);
      expect(totalByType).toBeGreaterThan(0);
    });
  });
});

describe("WebSocket Notifications Service", () => {
  beforeEach(() => {
    // Reset service before each test
    websocketNotificationService.clearMessageQueue();
  });

  describe("Subscription Management", () => {
    it("should subscribe user to notification channels", () => {
      const mockCallback = () => {};
      websocketNotificationService.subscribe("user_1", ["message", "stream"], mockCallback);
      expect(websocketNotificationService.isWebSocketConnected()).toBe(true);
    });

    it("should unsubscribe user from specific channels", () => {
      const mockCallback = () => {};
      websocketNotificationService.subscribe("user_1", ["message", "stream"], mockCallback);
      websocketNotificationService.unsubscribe("user_1", ["message"]);
      expect(websocketNotificationService.isWebSocketConnected()).toBe(true);
    });

    it("should unsubscribe user completely", () => {
      const mockCallback = () => {};
      websocketNotificationService.subscribe("user_1", ["message"], mockCallback);
      websocketNotificationService.unsubscribe("user_1");
      // Service should still be connected if other users are subscribed
    });
  });

  describe("Notification Types", () => {
    it("should send message notification", () => {
      const notification = websocketNotificationService.sendMessageNotification("user_1", "john_doe", "Hey, how are you?");
      expect(notification.type).toBe("message");
      expect(notification.title).toContain("john_doe");
      expect(notification.read).toBe(false);
    });

    it("should send collaboration notification", () => {
      const notification = websocketNotificationService.sendCollaborationNotification(
        "user_1",
        "Jane Smith",
        "Music Video Project"
      );
      expect(notification.type).toBe("collaboration");
      expect(notification.title).toContain("Jane Smith");
      expect(notification.data?.projectTitle).toBe("Music Video Project");
    });

    it("should send stream alert notification", () => {
      const notification = websocketNotificationService.sendStreamAlertNotification(
        "user_1",
        "AI Wellness Coach",
        "Live Meditation Session"
      );
      expect(notification.type).toBe("stream");
      expect(notification.title).toContain("now live");
      expect(notification.actionUrl).toContain("trending-content");
    });

    it("should send engagement notification", () => {
      const notification = websocketNotificationService.sendEngagementNotification("user_1", "Sarah", "liked");
      expect(notification.type).toBe("engagement");
      expect(notification.title).toContain("Sarah");
      expect(notification.title).toContain("liked");
    });

    it("should send earnings notification", () => {
      const notification = websocketNotificationService.sendEarningsNotification("user_1", 25.5);
      expect(notification.type).toBe("earnings");
      expect(notification.body).toContain("25.50");
      expect(notification.data?.amount).toBe(25.5);
    });
  });

  describe("Notification Management", () => {
    it("should get user notifications", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      websocketNotificationService.sendMessageNotification("user_1", "jane", "Hi");

      const notifications = websocketNotificationService.getUserNotifications("user_1");
      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it("should get unread count", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      websocketNotificationService.sendMessageNotification("user_1", "jane", "Hi");

      const unreadCount = websocketNotificationService.getUnreadCount("user_1");
      expect(unreadCount).toBeGreaterThanOrEqual(2);
    });

    it("should mark notification as read", () => {
      const notification = websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      const marked = websocketNotificationService.markAsRead("user_1", notification.id);
      expect(marked).toBe(true);
    });

    it("should mark all notifications as read", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      websocketNotificationService.sendMessageNotification("user_1", "jane", "Hi");

      const count = websocketNotificationService.markAllAsRead("user_1");
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("should delete notification", () => {
      const notification = websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      const deleted = websocketNotificationService.deleteNotification("user_1", notification.id);
      expect(deleted).toBe(true);
    });

    it("should clear all notifications", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      websocketNotificationService.sendMessageNotification("user_1", "jane", "Hi");

      const count = websocketNotificationService.clearAllNotifications("user_1");
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Broadcasting", () => {
    it("should broadcast notification to multiple users", () => {
      const notifications = websocketNotificationService.broadcastNotification(
        ["user_1", "user_2", "user_3"],
        {
          type: "alert",
          title: "Platform Maintenance",
          body: "Scheduled maintenance tonight",
          read: false,
        }
      );

      expect(notifications.length).toBe(3);
      expect(notifications.every((n) => n.type === "alert")).toBe(true);
    });
  });

  describe("Message Queue", () => {
    it("should queue messages", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      const pending = websocketNotificationService.getPendingMessages();
      expect(pending.length).toBeGreaterThan(0);
    });

    it("should clear message queue", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      const count = websocketNotificationService.clearMessageQueue();
      expect(count).toBeGreaterThan(0);

      const pending = websocketNotificationService.getPendingMessages();
      expect(pending.length).toBe(0);
    });
  });

  describe("Statistics", () => {
    it("should get notification statistics", () => {
      websocketNotificationService.sendMessageNotification("user_1", "john", "Hello");
      websocketNotificationService.sendStreamAlertNotification("user_1", "Coach", "Live Session");
      websocketNotificationService.sendEarningsNotification("user_1", 50);

      const stats = websocketNotificationService.getNotificationStats("user_1");
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.unread).toBeGreaterThanOrEqual(3);
      expect(stats.byType.message).toBeGreaterThan(0);
      expect(stats.byType.stream).toBeGreaterThan(0);
      expect(stats.byType.earnings).toBeGreaterThan(0);
    });
  });

  describe("Simulations", () => {
    it("should simulate stream notifications", () => {
      websocketNotificationService.simulateStreamNotification(
        "creator_1",
        "AI Wellness Coach",
        "Live Meditation",
        ["user_1", "user_2", "user_3"]
      );

      const stats1 = websocketNotificationService.getNotificationStats("user_1");
      expect(stats1.byType.stream).toBeGreaterThan(0);
    });

    it("should simulate engagement notifications", () => {
      websocketNotificationService.simulateEngagementNotification("creator_1", "Jane", "liked");
      const stats = websocketNotificationService.getNotificationStats("creator_1");
      expect(stats.byType.engagement).toBeGreaterThan(0);
    });

    it("should simulate earnings notifications", () => {
      websocketNotificationService.simulateEarningsNotification("user_1", 100);
      const stats = websocketNotificationService.getNotificationStats("user_1");
      expect(stats.byType.earnings).toBeGreaterThan(0);
    });
  });
});

describe("Integration: Content + Notifications", () => {
  it("should notify creator when content gets engagement", () => {
    const creator = creatorContentService.getCreatorById("creator_kenneth_001");
    if (creator && creator.content.length > 0) {
      const content = creator.content[0];

      // Simulate engagement
      creatorContentService.updateContentEngagement(content.id, {
        likes: content.likes + 100,
      });

      // Send notification
      websocketNotificationService.sendEngagementNotification("creator_kenneth_001", "User123", "liked");

      const stats = websocketNotificationService.getNotificationStats("creator_kenneth_001");
      expect(stats.byType.engagement).toBeGreaterThan(0);
    }
  });

  it("should notify followers when creator goes live", () => {
    const creator = creatorContentService.getCreatorById("ai-wellness-001");
    if (creator) {
      const followers = ["user_1", "user_2", "user_3"];
      websocketNotificationService.simulateStreamNotification(
        creator.id,
        creator.name,
        "Live Wellness Session",
        followers
      );

      followers.forEach((userId) => {
        const stats = websocketNotificationService.getNotificationStats(userId);
        expect(stats.byType.stream).toBeGreaterThan(0);
      });
    }
  });

  it("should track earnings notifications for creators", () => {
    const creator = creatorContentService.getCreatorById("creator_kenneth_001");
    if (creator) {
      const earnings = 250;
      websocketNotificationService.sendEarningsNotification(creator.id, earnings);

      const stats = websocketNotificationService.getNotificationStats(creator.id);
      expect(stats.byType.earnings).toBeGreaterThan(0);
    }
  });
});
