import { describe, it, expect, beforeEach } from "vitest";
import { MultiPlatformPublisher } from "../lib/multi-platform-publisher";
import { ContentRepurposingService } from "../lib/content-repurposing";

describe("Quick Win Features", () => {
  describe("Feature #2: Multi-Platform Publisher", () => {
    let publisher: MultiPlatformPublisher;

    beforeEach(() => {
      publisher = new MultiPlatformPublisher();
      // Initialize platforms
      publisher.initializePlatform("youtube", {
        platform: "youtube",
        enabled: true,
        settings: {
          maxTitleLength: 100,
          maxDescriptionLength: 5000,
          maxHashtags: 30,
          supportedFormats: ["mp4", "mov"],
          aspectRatios: ["16:9"],
        },
      });

      publisher.initializePlatform("tiktok", {
        platform: "tiktok",
        enabled: true,
        settings: {
          maxTitleLength: 150,
          maxDescriptionLength: 2200,
          maxHashtags: 30,
          supportedFormats: ["mp4"],
          aspectRatios: ["9:16"],
        },
      });
    });

    it("should create platform-specific content", () => {
      const content = {
        id: "content_1",
        creatorId: "creator_1",
        title: "Amazing Video Title",
        description: "This is an amazing video description",
        content: { videoUrl: "https://example.com/video.mp4" },
        platforms: ["youtube", "tiktok"],
        platformSpecific: {},
        status: "draft" as const,
      };

      const youtubeContent = publisher.createPlatformContent(content, "youtube");
      expect(youtubeContent.title).toBe("Amazing Video Title");
      expect(youtubeContent.description).toContain("amazing");
    });

    it("should publish to multiple platforms", async () => {
      const content = {
        id: "content_1",
        creatorId: "creator_1",
        title: "Test Video",
        description: "Test Description",
        content: { videoUrl: "https://example.com/video.mp4" },
        platforms: ["youtube", "tiktok"],
        platformSpecific: {},
        status: "draft" as const,
      };

      const results = await publisher.publishToMultiplePlatforms(content, ["youtube", "tiktok"]);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it("should schedule content for later publishing", () => {
      const content = {
        id: "content_1",
        creatorId: "creator_1",
        title: "Scheduled Video",
        description: "This will be published later",
        content: { videoUrl: "https://example.com/video.mp4" },
        platforms: [],
        platformSpecific: {},
        status: "draft" as const,
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const scheduled = publisher.schedulePublish(content, ["youtube", "tiktok"], futureDate);
      expect(scheduled.status).toBe("scheduled");
      expect(scheduled.scheduledTime).toEqual(futureDate);
    });

    it("should get cross-platform analytics", async () => {
      const content = {
        id: "content_1",
        creatorId: "creator_1",
        title: "Analytics Test",
        description: "Testing analytics",
        content: { videoUrl: "https://example.com/video.mp4" },
        platforms: ["youtube", "tiktok"],
        platformSpecific: {},
        status: "draft" as const,
      };

      await publisher.publishToMultiplePlatforms(content, ["youtube", "tiktok"]);
      const analytics = publisher.getCrossPlatformAnalytics("content_1");

      expect(Object.keys(analytics)).toContain("youtube");
      expect(Object.keys(analytics)).toContain("tiktok");
    });
  });

  describe("Feature #3: Content Repurposing", () => {
    let repurposing: ContentRepurposingService;

    beforeEach(() => {
      repurposing = new ContentRepurposingService();
    });

    it("should create repurposing job", () => {
      const job = repurposing.createRepurposingJob("creator_1", "content_1", "video", [
        "video_clip",
        "transcript",
        "social_post",
      ]);

      expect(job.id).toBeDefined();
      expect(job.status).toBe("pending");
      expect(job.targetFormats).toHaveLength(3);
    });

    it("should process repurposing job", async () => {
      const job = repurposing.createRepurposingJob("creator_1", "content_1", "video", [
        "video_clip",
        "audio_clip",
        "transcript",
      ]);

      const processed = await repurposing.processRepurposingJob(job.id);
      expect(processed?.status).toBe("completed");
      expect(processed?.results.length).toBeGreaterThan(0);
    });

    it("should repurpose video to multiple formats", async () => {
      const job = repurposing.createRepurposingJob("creator_1", "content_1", "video", [
        "video_clip",
        "audio_clip",
        "transcript",
        "social_post",
        "thumbnail",
        "blog_post",
      ]);

      await repurposing.processRepurposingJob(job.id);
      const content = repurposing.getRepurposedContent("content_1");

      expect(content.length).toBeGreaterThan(0);
      const formats = content.map((c) => c.format);
      expect(formats).toContain("video_clip");
      expect(formats).toContain("transcript");
      expect(formats).toContain("social_post");
    });

    it("should get repurposed content by format", async () => {
      const job = repurposing.createRepurposingJob("creator_1", "content_1", "video", ["transcript", "social_post"]);
      await repurposing.processRepurposingJob(job.id);

      const transcript = repurposing.getRepurposedContentByFormat("content_1", "transcript");
      expect(transcript).not.toBeNull();
      expect(transcript?.format).toBe("transcript");
    });

    it("should batch repurpose multiple content items", async () => {
      const jobs = await repurposing.batchRepurpose("creator_1", ["content_1", "content_2", "content_3"], "video", [
        "video_clip",
        "transcript",
      ]);

      expect(jobs).toHaveLength(3);
      jobs.forEach((job) => {
        expect(job.status).toBe("completed");
      });
    });

    it("should get repurposing statistics", async () => {
      const job = repurposing.createRepurposingJob("creator_1", "content_1", "video", [
        "video_clip",
        "transcript",
        "social_post",
      ]);
      await repurposing.processRepurposingJob(job.id);

      const stats = repurposing.getRepurposingStats("creator_1");
      expect(stats.totalJobs).toBeGreaterThan(0);
      expect(stats.completedJobs).toBeGreaterThan(0);
      expect(stats.averageFormatsPerContent).toBeGreaterThan(0);
    });

    it("should track job progress", async () => {
      const job = repurposing.createRepurposingJob("creator_1", "content_1", "video", [
        "video_clip",
        "transcript",
      ]);

      const progress = repurposing.getJobProgress(job.id);
      expect(progress?.status).toBe("pending");
      expect(progress?.progress).toBe(0);

      await repurposing.processRepurposingJob(job.id);
      const completedProgress = repurposing.getJobProgress(job.id);
      expect(completedProgress?.status).toBe("completed");
      expect(completedProgress?.progress).toBe(100);
    });
  });

  describe("Integration Tests", () => {
    it("should publish and repurpose content workflow", async () => {
      const publisher = new MultiPlatformPublisher();
      const repurposing = new ContentRepurposingService();

      // Initialize publisher
      publisher.initializePlatform("youtube", {
        platform: "youtube",
        enabled: true,
        settings: {
          maxTitleLength: 100,
          maxDescriptionLength: 5000,
          maxHashtags: 30,
          supportedFormats: ["mp4"],
          aspectRatios: ["16:9"],
        },
      });

      // Create content
      const content = {
        id: "workflow_content_1",
        creatorId: "creator_1",
        title: "Workflow Test Video",
        description: "Testing complete workflow",
        content: { videoUrl: "https://example.com/video.mp4" },
        platforms: ["youtube"],
        platformSpecific: {},
        status: "draft" as const,
      };

      // Publish
      const publishResults = await publisher.publishToMultiplePlatforms(content, ["youtube"]);
      expect(publishResults[0].success).toBe(true);

      // Repurpose
      const repurposingJob = repurposing.createRepurposingJob("creator_1", "workflow_content_1", "video", [
        "video_clip",
        "transcript",
        "social_post",
      ]);
      await repurposing.processRepurposingJob(repurposingJob.id);

      const repurposedContent = repurposing.getRepurposedContent("workflow_content_1");
      expect(repurposedContent.length).toBeGreaterThan(0);
    });

    it("should handle multi-platform publishing with repurposing", async () => {
      const publisher = new MultiPlatformPublisher();
      const repurposing = new ContentRepurposingService();

      // Setup platforms
      ["youtube", "tiktok", "instagram"].forEach((platform) => {
        publisher.initializePlatform(platform, {
          platform: platform as any,
          enabled: true,
          settings: {
            maxTitleLength: 100,
            maxDescriptionLength: 5000,
            maxHashtags: 30,
            supportedFormats: ["mp4"],
            aspectRatios: ["16:9"],
          },
        });
      });

      // Create and publish
      const content = {
        id: "multi_content_1",
        creatorId: "creator_1",
        title: "Multi-Platform Content",
        description: "Testing multi-platform",
        content: { videoUrl: "https://example.com/video.mp4" },
        platforms: ["youtube", "tiktok", "instagram"],
        platformSpecific: {},
        status: "draft" as const,
      };

      const publishResults = await publisher.publishToMultiplePlatforms(content, ["youtube", "tiktok", "instagram"]);
      expect(publishResults).toHaveLength(3);
      expect(publishResults.every((r) => r.success)).toBe(true);

      // Repurpose for social media
      const repurposingJob = repurposing.createRepurposingJob("creator_1", "multi_content_1", "video", [
        "social_post",
        "thumbnail",
      ]);
      await repurposing.processRepurposingJob(repurposingJob.id);

      const repurposedContent = repurposing.getRepurposedContent("multi_content_1");
      expect(repurposedContent.length).toBeGreaterThan(0);
    });
  });
});
