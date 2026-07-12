/**
 * Tests for Social Media Scheduler, Collaboration Tools, and Creator Certification
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSocialMediaScheduler,
  resetSocialMediaScheduler,
  type Platform,
} from "@/lib/social-media-scheduler";
import {
  getCollaborationTools,
  resetCollaborationTools,
} from "@/lib/collaboration-tools";
import {
  getCreatorCertification,
  resetCreatorCertification,
} from "@/lib/creator-certification";

// ============================================================================
// SOCIAL MEDIA SCHEDULER TESTS
// ============================================================================

describe("Social Media Scheduler", () => {
  beforeEach(() => {
    resetSocialMediaScheduler();
  });

  afterEach(() => {
    resetSocialMediaScheduler();
  });

  it("should schedule a post", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";
    const contentId = "content_1";
    const scheduledTime = Date.now() + 3600000; // 1 hour from now

    const post = scheduler.schedulePost(
      creatorId,
      contentId,
      "My First Post",
      "This is my first post",
      "text",
      ["instagram", "facebook"],
      scheduledTime,
      undefined,
      ["#content", "#creator"],
      ["@friend1"]
    );

    expect(post).toBeDefined();
    expect(post.id).toBeDefined();
    expect(post.status).toBe("scheduled");
    expect(post.platforms).toContain("instagram");
    expect(post.hashtags).toContain("#content");
  });

  it("should get scheduled post", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";
    const scheduledTime = Date.now() + 3600000;

    const post = scheduler.schedulePost(
      creatorId,
      "content_1",
      "Test Post",
      "Test content",
      "text",
      ["twitter"],
      scheduledTime
    );

    const retrieved = scheduler.getScheduledPost(post.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe("Test Post");
  });

  it("should cancel scheduled post", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";
    const scheduledTime = Date.now() + 3600000;

    const post = scheduler.schedulePost(
      creatorId,
      "content_1",
      "Test Post",
      "Test content",
      "text",
      ["twitter"],
      scheduledTime
    );

    const cancelled = scheduler.cancelScheduledPost(post.id);
    expect(cancelled).toBe(true);

    const retrieved = scheduler.getScheduledPost(post.id);
    expect(retrieved?.status).toBe("cancelled");
  });

  it("should get optimal posting times", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";

    const times = scheduler.getOptimalPostingTimes(creatorId, "instagram");
    expect(times).toBeDefined();
    expect(times.length).toBeGreaterThan(0);
    expect(times[0].platform).toBe("instagram");
  });

  it("should suggest optimal posting time", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";
    const platforms: Platform[] = ["instagram", "twitter"];

    const suggestedTime = scheduler.suggestOptimalTime(creatorId, platforms);
    expect(suggestedTime).toBeGreaterThan(Date.now());
  });

  it("should create campaign", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";
    const startDate = Date.now();
    const endDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1 week

    const campaign = scheduler.createCampaign(
      creatorId,
      "Summer Campaign",
      ["instagram", "facebook"],
      startDate,
      endDate,
      "A summer promotional campaign"
    );

    expect(campaign).toBeDefined();
    expect(campaign.name).toBe("Summer Campaign");
    expect(campaign.status).toBe("draft");
  });

  it("should get engagement analytics", () => {
    const scheduler = getSocialMediaScheduler();
    const creatorId = "creator_1";

    const analytics = scheduler.getEngagementAnalytics(creatorId);
    expect(analytics).toBeDefined();
    expect(analytics.totalPosts).toBeGreaterThanOrEqual(0);
    expect(analytics.avgEngagementRate).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// COLLABORATION TOOLS TESTS
// ============================================================================

describe("Collaboration Tools", () => {
  beforeEach(() => {
    resetCollaborationTools();
  });

  afterEach(() => {
    resetCollaborationTools();
  });

  it("should create collaborative project", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(
      creatorId,
      "Video Project",
      "video",
      "A collaborative video project"
    );

    expect(project).toBeDefined();
    expect(project.name).toBe("Video Project");
    expect(project.contentType).toBe("video");
    expect(project.collaborators.length).toBe(1);
  });

  it("should add collaborator to project", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(creatorId, "Video Project", "video");

    const updated = collab.addCollaborator(
      project.id,
      "user_2",
      "John Doe",
      "john@example.com",
      "editor",
      "edit"
    );

    expect(updated).toBeDefined();
    expect(updated?.collaborators.length).toBe(2);
  });

  it("should update project content", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(creatorId, "Video Project", "video");
    const newContent = { title: "Updated Title", duration: 120 };

    const updated = collab.updateProjectContent(
      project.id,
      creatorId,
      "Creator",
      newContent
    );

    expect(updated).toBeDefined();
    expect(updated?.currentContent).toEqual(newContent);
  });

  it("should add comment to project", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(creatorId, "Video Project", "video");

    const comment = collab.addComment(
      project.id,
      creatorId,
      "Creator",
      "Great work on this section",
      "text",
      ["@user_2"]
    );

    expect(comment).toBeDefined();
    expect(comment?.content).toBe("Great work on this section");
  });

  it("should create project version", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(creatorId, "Video Project", "video");
    collab.updateProjectContent(
      project.id,
      creatorId,
      "Creator",
      { title: "Version 1" }
    );

    const version = collab.createVersion(
      project.id,
      creatorId,
      "First version complete"
    );

    expect(version).toBeDefined();
    expect(version?.versionNumber).toBe(2);
  });

  it("should get unresolved comments", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(creatorId, "Video Project", "video");

    collab.addComment(
      project.id,
      creatorId,
      "Creator",
      "Fix this part",
      "suggestion"
    );

    const unresolved = collab.getUnresolvedComments(project.id);
    expect(unresolved.length).toBe(1);
  });

  it("should track active users", () => {
    const collab = getCollaborationTools();
    const creatorId = "creator_1";

    const project = collab.createProject(creatorId, "Video Project", "video");

    collab.userJoined(project.id, "user_2");
    const activeUsers = collab.getActiveUsers(project.id);

    expect(activeUsers).toContain(creatorId);
    expect(activeUsers).toContain("user_2");
  });
});

// ============================================================================
// CREATOR CERTIFICATION TESTS
// ============================================================================

describe("Creator Certification Program", () => {
  beforeEach(() => {
    resetCreatorCertification();
  });

  afterEach(() => {
    resetCreatorCertification();
  });

  it("should get courses by level", () => {
    const cert = getCreatorCertification();

    const beginnerCourses = cert.getCoursesByLevel("beginner");
    expect(beginnerCourses.length).toBeGreaterThan(0);
    expect(beginnerCourses[0].level).toBe("beginner");
  });

  it("should get courses by category", () => {
    const cert = getCreatorCertification();

    const videoCourses = cert.getCoursesByCategory("Video");
    expect(videoCourses.length).toBeGreaterThan(0);
  });

  it("should search courses", () => {
    const cert = getCreatorCertification();

    const results = cert.searchCourses("video");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should enroll creator in course", () => {
    const cert = getCreatorCertification();
    const courses = cert.getCoursesByLevel("beginner");
    const courseId = courses[0].id;
    const creatorId = "creator_1";

    const enrollment = cert.enrollCreator(courseId, creatorId);
    expect(enrollment).toBeDefined();
    expect(enrollment?.status).toBe("enrolled");
  });

  it("should complete lesson in course", () => {
    const cert = getCreatorCertification();
    const courses = cert.getCoursesByLevel("beginner");
    const courseId = courses[0].id;
    const creatorId = "creator_1";

    const enrollment = cert.enrollCreator(courseId, creatorId);
    if (!enrollment) throw new Error("Enrollment failed");

    const course = cert.getCourse(courseId);
    if (!course || course.lessons.length === 0) throw new Error("No lessons");

    const updated = cert.completeLessonInCourse(
      enrollment.id,
      course.lessons[0].id
    );

    expect(updated).toBeDefined();
    expect(updated?.lessonsCompleted).toContain(course.lessons[0].id);
    expect(updated?.progress).toBeGreaterThan(0);
  });

  it("should issue certificate on course completion", () => {
    const cert = getCreatorCertification();
    const courses = cert.getCoursesByLevel("beginner");
    const courseId = courses[0].id;
    const creatorId = "creator_1";

    const enrollment = cert.enrollCreator(courseId, creatorId);
    if (!enrollment) throw new Error("Enrollment failed");

    const course = cert.getCourse(courseId);
    if (!course) throw new Error("Course not found");

    // Complete all lessons
    for (const lesson of course.lessons) {
      cert.completeLessonInCourse(enrollment.id, lesson.id);
    }

    const updatedEnrollment = cert.getEnrollment(enrollment.id);
    expect(updatedEnrollment?.certificateId).toBeDefined();
  });

  it("should get creator certificates", () => {
    const cert = getCreatorCertification();
    const creatorId = "creator_1";

    const certificates = cert.getCreatorCertificates(creatorId);
    expect(certificates).toBeDefined();
    expect(Array.isArray(certificates)).toBe(true);
  });

  it("should verify certificate", () => {
    const cert = getCreatorCertification();
    const courses = cert.getCoursesByLevel("beginner");
    const courseId = courses[0].id;
    const creatorId = "creator_1";

    const enrollment = cert.enrollCreator(courseId, creatorId);
    if (!enrollment) throw new Error("Enrollment failed");

    const course = cert.getCourse(courseId);
    if (!course) throw new Error("Course not found");

    // Complete all lessons
    for (const lesson of course.lessons) {
      cert.completeLessonInCourse(enrollment.id, lesson.id);
    }

    const certificates = cert.getCreatorCertificates(creatorId);
    if (certificates.length === 0) throw new Error("No certificate issued");

    const certificate = certificates[0];
    const verified = cert.verifyCertificate(
      certificate.id,
      certificate.verificationCode
    );

    expect(verified).toBe(true);
  });

  it("should get learning progress", () => {
    const cert = getCreatorCertification();
    const creatorId = "creator_1";

    const progress = cert.getCreatorLearningProgress(creatorId);
    expect(progress).toBeDefined();
    expect(progress.totalEnrolled).toBeGreaterThanOrEqual(0);
    expect(progress.totalCompleted).toBeGreaterThanOrEqual(0);
  });

  it("should get popular courses", () => {
    const cert = getCreatorCertification();

    const popular = cert.getPopularCourses(5);
    expect(popular).toBeDefined();
    expect(popular.length).toBeGreaterThan(0);
  });

  it("should get recommended courses", () => {
    const cert = getCreatorCertification();
    const creatorId = "creator_1";

    const recommended = cert.getRecommendedCourses(creatorId, 5);
    expect(recommended).toBeDefined();
    expect(Array.isArray(recommended)).toBe(true);
  });
});
