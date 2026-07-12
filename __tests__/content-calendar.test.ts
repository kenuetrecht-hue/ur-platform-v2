import { describe, it, expect, beforeEach } from "vitest";
import { ContentCalendarService } from "../lib/content-calendar";

describe("Content Calendar Service", () => {
  let service: any;
  const creatorId = "creator_123";

  beforeEach(() => {
    service = new ContentCalendarService();
  });

  describe("Schedule Content", () => {
    it("should create scheduled content", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "My First Video",
        description: "Testing content calendar",
        contentType: "video",
        platforms: ["youtube", "tiktok"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {
          videoUrl: "https://example.com/video.mp4",
          thumbnailUrl: "https://example.com/thumb.jpg",
        },
        metadata: {
          hashtags: ["#test", "#video"],
          mentions: [],
          captions: { youtube: "Test caption", tiktok: "TikTok caption" },
          thumbnails: { youtube: "thumb.jpg", tiktok: "thumb_tiktok.jpg" },
        },
      });

      expect(content.id).toBeDefined();
      expect(content.title).toBe("My First Video");
      expect(content.status).toBe("scheduled");
      expect(content.engagement.views).toBe(0);
    });

    it("should schedule content across multiple platforms", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Multi-Platform Content",
        description: "Testing multi-platform",
        contentType: "video",
        platforms: ["youtube", "tiktok", "instagram"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: { videoUrl: "https://example.com/video.mp4" },
        metadata: {
          hashtags: ["#test"],
          mentions: [],
          captions: {},
          thumbnails: {},
        },
      });

      const scheduled = service.scheduleContent(content, ["youtube", "tiktok", "instagram"], new Date(), false);
      expect(scheduled.platforms).toHaveLength(3);
      expect(scheduled.platforms).toContain("youtube");
      expect(scheduled.platforms).toContain("tiktok");
      expect(scheduled.platforms).toContain("instagram");
    });

    it("should batch schedule multiple content items", () => {
      const contents = [
        {
          creatorId,
          title: "Video 1",
          description: "First video",
          contentType: "video" as const,
          platforms: ["youtube"],
          scheduledTime: new Date(),
          status: "scheduled" as const,
          content: { videoUrl: "https://example.com/video1.mp4" },
          metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
        },
        {
          creatorId,
          title: "Video 2",
          description: "Second video",
          contentType: "video" as const,
          platforms: ["tiktok"],
          scheduledTime: new Date(),
          status: "scheduled" as const,
          content: { videoUrl: "https://example.com/video2.mp4" },
          metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
        },
      ];

      const scheduled = service.batchScheduleContent(creatorId, contents);
      expect(scheduled).toHaveLength(2);
      expect(scheduled[0].title).toBe("Video 1");
      expect(scheduled[1].title).toBe("Video 2");
    });
  });

  describe("Calendar View", () => {
    it("should get calendar view for date range", () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const content1 = service.createScheduledContent({
        creatorId,
        title: "Today's Content",
        description: "Today",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: today,
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });
      service.scheduleContent(content1, ["youtube"], today, false);

      const content2 = service.createScheduledContent({
        creatorId,
        title: "Tomorrow's Content",
        description: "Tomorrow",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: tomorrow,
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });
      service.scheduleContent(content2, ["youtube"], tomorrow, false);

      const events = service.getCalendarView(creatorId, today, tomorrow);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it("should get content by specific date", () => {
      const today = new Date();
      const created = service.createScheduledContent({
        creatorId,
        title: "Today's Content",
        description: "Today",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: today,
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });
      service.scheduleContent(created, ["youtube"], today, false);

      const content = service.getContentByDate(creatorId, today);
      expect(content.length).toBeGreaterThan(0);
      expect(content[0].title).toBe("Today's Content");
    });
  });

  describe("Optimal Posting Times", () => {
    it("should get optimal posting time for platform", () => {
      const optimalTime = service.getOptimalPostingTime(creatorId, "youtube", "video");
      expect(optimalTime.platform).toBe("youtube");
      expect(optimalTime.hour).toBeGreaterThanOrEqual(0);
      expect(optimalTime.hour).toBeLessThan(24);
      expect(optimalTime.confidence).toBeGreaterThan(0);
      expect(optimalTime.confidence).toBeLessThanOrEqual(1);
    });

    it("should have different optimal times for different platforms", () => {
      const youtubeTime = service.getOptimalPostingTime(creatorId, "youtube", "video");
      const tiktokTime = service.getOptimalPostingTime(creatorId, "tiktok", "video");
      expect(youtubeTime.hour).not.toBe(tiktokTime.hour);
    });

    it("should apply AI optimization when scheduling", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Optimized Content",
        description: "Testing AI optimization",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const scheduled = service.scheduleContent(content, ["youtube"], new Date(), true);
      expect(scheduled.aiOptimizedTime).toBeDefined();
    });
  });

  describe("Reschedule Content", () => {
    it("should reschedule content to new time", () => {
      const originalTime = new Date();
      const content = service.createScheduledContent({
        creatorId,
        title: "Reschedulable Content",
        description: "Testing reschedule",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: originalTime,
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const newTime = new Date(originalTime);
      newTime.setDate(newTime.getDate() + 1);

      const rescheduled = service.rescheduleContent(content.id, newTime);
      expect(rescheduled).not.toBeNull();
      expect(rescheduled?.scheduledTime.getTime()).toBe(newTime.getTime());
    });

    it("should handle drag-and-drop rescheduling", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Drag-Drop Content",
        description: "Testing drag-drop",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const newTime = new Date();
      newTime.setHours(newTime.getHours() + 2);

      const rescheduled = service.rescheduleContent(content.id, newTime);
      expect(rescheduled?.scheduledTime).toEqual(newTime);
    });
  });

  describe("Calendar Statistics", () => {
    it("should calculate calendar statistics", () => {
      service.createScheduledContent({
        creatorId,
        title: "Content 1",
        description: "Test",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "published",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const stats = service.getCalendarStats(creatorId);
      expect(stats.totalScheduled).toBeGreaterThan(0);
      expect(stats.bestPerformingPlatform).toBeDefined();
      expect(stats.bestPerformingTime).toBeDefined();
    });

    it("should identify content gaps", () => {
      service.createScheduledContent({
        creatorId,
        title: "Video Only",
        description: "Only video content",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "published",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const stats = service.getCalendarStats(creatorId);
      expect(stats.contentGaps.length).toBeGreaterThan(0);
    });
  });

  describe("Content Management", () => {
    it("should update content metadata", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Metadata Test",
        description: "Test",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: ["#old"], mentions: [], captions: {}, thumbnails: {} },
      });

      const updated = service.updateContentMetadata(content.id, {
        hashtags: ["#new", "#updated"],
      });

      expect(updated?.metadata.hashtags).toContain("#new");
      expect(updated?.metadata.hashtags).toContain("#updated");
    });

    it("should track engagement metrics", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Engagement Test",
        description: "Test",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "published",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const tracked = service.trackEngagement(content.id, {
        views: 1000,
        likes: 50,
        comments: 10,
        shares: 5,
      });

      expect(tracked?.engagement.views).toBe(1000);
      expect(tracked?.engagement.likes).toBe(50);
      expect(tracked?.engagement.comments).toBe(10);
    });

    it("should delete scheduled content", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Delete Test",
        description: "Test",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const deleted = service.deleteScheduledContent(content.id);
      expect(deleted).toBe(true);

      const retrieved = service.getScheduledContent(content.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Creator Content Retrieval", () => {
    it("should get all content for creator", () => {
      service.createScheduledContent({
        creatorId,
        title: "Content 1",
        description: "Test",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      service.createScheduledContent({
        creatorId,
        title: "Content 2",
        description: "Test",
        contentType: "audio",
        platforms: ["spotify"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const contents = service.getCreatorContent(creatorId);
      expect(contents.length).toBeGreaterThanOrEqual(2);
    });

    it("should get specific scheduled content by ID", () => {
      const content = service.createScheduledContent({
        creatorId,
        title: "Specific Content",
        description: "Test",
        contentType: "video",
        platforms: ["youtube"],
        scheduledTime: new Date(),
        status: "scheduled",
        content: {},
        metadata: { hashtags: [], mentions: [], captions: {}, thumbnails: {} },
      });

      const retrieved = service.getScheduledContent(content.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe("Specific Content");
      expect(retrieved?.id).toBe(content.id);
    });
  });
});
