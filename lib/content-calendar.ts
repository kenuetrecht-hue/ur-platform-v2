import { z } from "zod";

/**
 * Content Calendar Service
 * Manages unified content calendar with AI-powered scheduling optimization
 * Supports multi-platform scheduling with optimal posting times
 */

export interface ScheduledContent {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  contentType: "video" | "audio" | "image" | "text" | "mixed";
  platforms: ("youtube" | "tiktok" | "instagram" | "twitter" | "linkedin")[];
  scheduledTime: Date;
  aiOptimizedTime?: Date;
  status: "draft" | "scheduled" | "published" | "failed";
  content: {
    videoUrl?: string;
    audioUrl?: string;
    imageUrl?: string;
    text?: string;
    thumbnailUrl?: string;
  };
  metadata: {
    hashtags: string[];
    mentions: string[];
    captions: Record<string, string>; // platform-specific captions
    thumbnails: Record<string, string>; // platform-specific thumbnails
  };
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: string;
  creatorId: string;
  date: Date;
  content: ScheduledContent[];
  notes: string;
}

export interface OptimalPostingTime {
  platform: string;
  dayOfWeek: number; // 0-6
  hour: number; // 0-23
  expectedEngagement: number;
  confidence: number; // 0-1
}

export interface CalendarStats {
  totalScheduled: number;
  publishedThisWeek: number;
  publishedThisMonth: number;
  averageEngagement: number;
  bestPerformingPlatform: string;
  bestPerformingTime: OptimalPostingTime;
  contentGaps: string[]; // Topics/formats not covered
}

/**
 * Content Calendar Service
 */
export class ContentCalendarService {
  private calendar: Map<string, CalendarEvent> = new Map();
  private scheduledContent: Map<string, ScheduledContent> = new Map();
  private optimalTimes: Map<string, OptimalPostingTime[]> = new Map();
  private engagementHistory: Map<string, number[]> = new Map();

  /**
   * Create a new scheduled content item
   */
  createScheduledContent(data: Omit<ScheduledContent, "id" | "createdAt" | "updatedAt" | "engagement">): ScheduledContent {
    const id = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const content: ScheduledContent = {
      ...data,
      id,
      engagement: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scheduledContent.set(id, content);
    return content;
  }

  /**
   * Get AI-optimized posting time for content
   */
  getOptimalPostingTime(creatorId: string, platform: string, contentType: string): OptimalPostingTime {
    const key = `${creatorId}_${platform}`;
    const times = this.optimalTimes.get(key) || [];

    // Find best time based on creator's history
    const bestTime = times.reduce((best, current) => {
      return current.expectedEngagement > best.expectedEngagement ? current : best;
    }, times[0] || this.getDefaultOptimalTime(platform));

    return bestTime;
  }

  /**
   * Get default optimal posting times by platform
   */
  private getDefaultOptimalTime(platform: string): OptimalPostingTime {
    const defaults: Record<string, OptimalPostingTime> = {
      youtube: { platform: "youtube", dayOfWeek: 3, hour: 14, expectedEngagement: 0.85, confidence: 0.7 },
      tiktok: { platform: "tiktok", dayOfWeek: 5, hour: 19, expectedEngagement: 0.9, confidence: 0.75 },
      instagram: { platform: "instagram", dayOfWeek: 4, hour: 18, expectedEngagement: 0.8, confidence: 0.7 },
      twitter: { platform: "twitter", dayOfWeek: 2, hour: 9, expectedEngagement: 0.75, confidence: 0.65 },
      linkedin: { platform: "linkedin", dayOfWeek: 1, hour: 8, expectedEngagement: 0.7, confidence: 0.65 },
    };
    return defaults[platform] || defaults.youtube;
  }

  /**
   * Schedule content across multiple platforms
   */
  scheduleContent(
    content: ScheduledContent,
    platforms: string[],
    scheduledTime: Date,
    autoOptimize: boolean = true
  ): ScheduledContent {
    const updated = { ...content, platforms: platforms as any, scheduledTime, updatedAt: new Date() };

    if (autoOptimize) {
      // Get AI-optimized time
      const optimalTime = this.getOptimalPostingTime(content.creatorId, platforms[0], content.contentType);
      const optimizedDate = new Date(scheduledTime);
      optimizedDate.setHours(optimalTime.hour);
      optimizedDate.setDate(optimizedDate.getDate() + (optimalTime.dayOfWeek - optimizedDate.getDay()));
      updated.aiOptimizedTime = optimizedDate;
    }

    this.scheduledContent.set(content.id, updated);
    this.addToCalendar(updated);
    return updated;
  }

  /**
   * Add content to calendar
   */
  private addToCalendar(content: ScheduledContent): void {
    const dateKey = content.scheduledTime.toISOString().split("T")[0];
    const existing = this.calendar.get(dateKey) || {
      id: `event_${dateKey}`,
      creatorId: content.creatorId,
      date: content.scheduledTime,
      content: [],
      notes: "",
    };
    existing.content.push(content);
    this.calendar.set(dateKey, existing);
  }

  /**
   * Get calendar view for date range
   */
  getCalendarView(creatorId: string, startDate: Date, endDate: Date): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toISOString().split("T")[0];
      const event = this.calendar.get(dateKey);
      if (event && event.creatorId === creatorId) {
        events.push(event);
      }
      current.setDate(current.getDate() + 1);
    }

    return events;
  }

  /**
   * Batch schedule multiple content items
   */
  batchScheduleContent(creatorId: string, contents: Omit<ScheduledContent, "id" | "createdAt" | "updatedAt" | "engagement">[]): ScheduledContent[] {
    return contents.map((content) => {
      const scheduled = this.createScheduledContent(content);
      this.scheduleContent(scheduled, content.platforms, content.scheduledTime, true);
      return scheduled;
    });
  }

  /**
   * Reschedule content (drag-and-drop)
   */
  rescheduleContent(contentId: string, newTime: Date): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content) return null;

    content.scheduledTime = newTime;
    content.updatedAt = new Date();
    this.scheduledContent.set(contentId, content);

    // Update calendar
    const oldDateKey = content.scheduledTime.toISOString().split("T")[0];
    const event = this.calendar.get(oldDateKey);
    if (event) {
      event.content = event.content.filter((c) => c.id !== contentId);
    }

    this.addToCalendar(content);
    return content;
  }

  /**
   * Get calendar statistics
   */
  getCalendarStats(creatorId: string): CalendarStats {
    const contents = Array.from(this.scheduledContent.values()).filter((c) => c.creatorId === creatorId);

    const thisWeek = contents.filter((c) => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return c.updatedAt >= weekAgo && c.status === "published";
    });

    const thisMonth = contents.filter((c) => {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return c.updatedAt >= monthAgo && c.status === "published";
    });

    const avgEngagement =
      contents.reduce((sum, c) => sum + (c.engagement.views + c.engagement.likes + c.engagement.comments), 0) / Math.max(contents.length, 1);

    const platformEngagement: Record<string, number> = {};
    contents.forEach((c) => {
      c.platforms.forEach((p) => {
        platformEngagement[p] = (platformEngagement[p] || 0) + c.engagement.views;
      });
    });

    const bestPlatform = Object.entries(platformEngagement).sort((a, b) => b[1] - a[1])[0]?.[0] || "youtube";

    // Identify content gaps
    const contentTypes = new Set(contents.map((c) => c.contentType));
    const gaps: string[] = [];
    if (!contentTypes.has("video")) gaps.push("Video content");
    if (!contentTypes.has("audio")) gaps.push("Audio content");
    if (!contentTypes.has("image")) gaps.push("Image content");

    return {
      totalScheduled: contents.length,
      publishedThisWeek: thisWeek.length,
      publishedThisMonth: thisMonth.length,
      averageEngagement: avgEngagement,
      bestPerformingPlatform: bestPlatform,
      bestPerformingTime: this.getOptimalPostingTime(creatorId, bestPlatform, "mixed"),
      contentGaps: gaps,
    };
  }

  /**
   * Get content by date
   */
  getContentByDate(creatorId: string, date: Date): ScheduledContent[] {
    const dateKey = date.toISOString().split("T")[0];
    const event = this.calendar.get(dateKey);
    return event?.creatorId === creatorId ? event.content : [];
  }

  /**
   * Update content metadata
   */
  updateContentMetadata(contentId: string, metadata: Partial<ScheduledContent["metadata"]>): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content) return null;

    content.metadata = { ...content.metadata, ...metadata };
    content.updatedAt = new Date();
    this.scheduledContent.set(contentId, content);
    return content;
  }

  /**
   * Track engagement for content
   */
  trackEngagement(contentId: string, engagement: Partial<ScheduledContent["engagement"]>): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content) return null;

    content.engagement = { ...content.engagement, ...engagement };
    content.updatedAt = new Date();
    this.scheduledContent.set(contentId, content);

    // Store for optimal time calculation
    const key = `${content.creatorId}_engagement`;
    const history = this.engagementHistory.get(key) || [];
    history.push(engagement.views || 0);
    this.engagementHistory.set(key, history);

    return content;
  }

  /**
   * Get scheduled content by ID
   */
  getScheduledContent(contentId: string): ScheduledContent | null {
    return this.scheduledContent.get(contentId) || null;
  }

  /**
   * Get all scheduled content for creator
   */
  getCreatorContent(creatorId: string): ScheduledContent[] {
    return Array.from(this.scheduledContent.values()).filter((c) => c.creatorId === creatorId);
  }

  /**
   * Delete scheduled content
   */
  deleteScheduledContent(contentId: string): boolean {
    const content = this.scheduledContent.get(contentId);
    if (!content) return false;

    this.scheduledContent.delete(contentId);

    // Remove from calendar
    const dateKey = content.scheduledTime.toISOString().split("T")[0];
    const event = this.calendar.get(dateKey);
    if (event) {
      event.content = event.content.filter((c) => c.id !== contentId);
      if (event.content.length === 0) {
        this.calendar.delete(dateKey);
      }
    }

    return true;
  }
}

// Export singleton instance
export const contentCalendarService = new ContentCalendarService();
