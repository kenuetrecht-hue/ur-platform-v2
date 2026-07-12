/**
 * Analytics Dashboard Service
 * Tracks and provides analytics for creator projects and activities
 */

export interface AnalyticsMetrics {
  projectId: string;
  creatorId: string;
  views: number;
  downloads: number;
  shares: number;
  likes: number;
  comments: number;
  engagementRate: number;
  totalTime: number; // in seconds
  averageSessionDuration: number; // in seconds
  lastUpdated: Date;
}

export interface CreatorStats {
  creatorId: string;
  totalProjects: number;
  totalUploads: number;
  totalEarnings: number;
  totalCollaborators: number;
  averageProjectEngagement: number;
  topProject: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EarningsData {
  creatorId: string;
  date: Date;
  source: string; // 'sales', 'collaboration', 'marketplace'
  amount: number;
  projectId?: string;
}

export class AnalyticsDashboard {
  private metrics: Map<string, AnalyticsMetrics> = new Map();
  private creatorStats: Map<string, CreatorStats> = new Map();
  private earnings: Map<string, EarningsData[]> = new Map();
  private uploadHistory: Map<string, { date: Date; fileName: string; size: number }[]> = new Map();
  private collaborationHistory: Map<string, { date: Date; collaborator: string; project: string }[]> = new Map();

  /**
   * Track project view
   */
  trackView(projectId: string, creatorId: string): AnalyticsMetrics {
    const key = `${creatorId}-${projectId}`;
    const metrics = this.getMetrics(projectId, creatorId);
    metrics.views++;
    metrics.lastUpdated = new Date();
    this.metrics.set(key, metrics);
    return metrics;
  }

  /**
   * Track project download
   */
  trackDownload(projectId: string, creatorId: string): AnalyticsMetrics {
    const key = `${creatorId}-${projectId}`;
    const metrics = this.getMetrics(projectId, creatorId);
    metrics.downloads++;
    metrics.lastUpdated = new Date();
    this.metrics.set(key, metrics);
    return metrics;
  }

  /**
   * Track project share
   */
  trackShare(projectId: string, creatorId: string): AnalyticsMetrics {
    const key = `${creatorId}-${projectId}`;
    const metrics = this.getMetrics(projectId, creatorId);
    metrics.shares++;
    metrics.lastUpdated = new Date();
    this.metrics.set(key, metrics);
    return metrics;
  }

  /**
   * Track engagement (likes, comments)
   */
  trackEngagement(projectId: string, creatorId: string, type: 'like' | 'comment', count: number = 1): AnalyticsMetrics {
    const key = `${creatorId}-${projectId}`;
    const metrics = this.getMetrics(projectId, creatorId);
    if (type === 'like') {
      metrics.likes += count;
    } else {
      metrics.comments += count;
    }
    metrics.engagementRate = ((metrics.likes + metrics.comments) / Math.max(metrics.views, 1)) * 100;
    metrics.lastUpdated = new Date();
    this.metrics.set(key, metrics);
    return metrics;
  }

  /**
   * Track session duration
   */
  trackSessionDuration(projectId: string, creatorId: string, duration: number): AnalyticsMetrics {
    const key = `${creatorId}-${projectId}`;
    const metrics = this.getMetrics(projectId, creatorId);
    metrics.totalTime += duration;
    metrics.averageSessionDuration = metrics.totalTime / Math.max(metrics.views, 1);
    metrics.lastUpdated = new Date();
    this.metrics.set(key, metrics);
    return metrics;
  }

  /**
   * Get metrics for a project
   */
  getMetrics(projectId: string, creatorId: string): AnalyticsMetrics {
    const key = `${creatorId}-${projectId}`;
    return this.metrics.get(key) || {
      projectId,
      creatorId,
      views: 0,
      downloads: 0,
      shares: 0,
      likes: 0,
      comments: 0,
      engagementRate: 0,
      totalTime: 0,
      averageSessionDuration: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get all metrics for creator
   */
  getCreatorMetrics(creatorId: string): AnalyticsMetrics[] {
    const creatorMetrics: AnalyticsMetrics[] = [];
    this.metrics.forEach((metric, key) => {
      if (metric.creatorId === creatorId) {
        creatorMetrics.push(metric);
      }
    });
    return creatorMetrics;
  }

  /**
   * Record upload
   */
  recordUpload(creatorId: string, fileName: string, fileSize: number): void {
    if (!this.uploadHistory.has(creatorId)) {
      this.uploadHistory.set(creatorId, []);
    }
    this.uploadHistory.get(creatorId)!.push({
      date: new Date(),
      fileName,
      size: fileSize,
    });
  }

  /**
   * Get upload history
   */
  getUploadHistory(creatorId: string, limit: number = 50): { date: Date; fileName: string; size: number }[] {
    const history = this.uploadHistory.get(creatorId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Record collaboration
   */
  recordCollaboration(creatorId: string, collaborator: string, project: string): void {
    if (!this.collaborationHistory.has(creatorId)) {
      this.collaborationHistory.set(creatorId, []);
    }
    this.collaborationHistory.get(creatorId)!.push({
      date: new Date(),
      collaborator,
      project,
    });
  }

  /**
   * Get collaboration history
   */
  getCollaborationHistory(creatorId: string, limit: number = 50): { date: Date; collaborator: string; project: string }[] {
    const history = this.collaborationHistory.get(creatorId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Record earnings
   */
  recordEarnings(creatorId: string, source: string, amount: number, projectId?: string): EarningsData {
    const earning: EarningsData = {
      creatorId,
      date: new Date(),
      source,
      amount,
      projectId,
    };

    if (!this.earnings.has(creatorId)) {
      this.earnings.set(creatorId, []);
    }
    this.earnings.get(creatorId)!.push(earning);

    return earning;
  }

  /**
   * Get earnings data
   */
  getEarnings(creatorId: string, days: number = 30): EarningsData[] {
    const allEarnings = this.earnings.get(creatorId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allEarnings.filter(e => e.date >= cutoffDate);
  }

  /**
   * Get total earnings
   */
  getTotalEarnings(creatorId: string, days?: number): number {
    const earnings = days ? this.getEarnings(creatorId, days) : this.earnings.get(creatorId) || [];
    return earnings.reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Get earnings by source
   */
  getEarningsBySource(creatorId: string, days: number = 30): Record<string, number> {
    const earnings = this.getEarnings(creatorId, days);
    const bySource: Record<string, number> = {};

    earnings.forEach(e => {
      bySource[e.source] = (bySource[e.source] || 0) + e.amount;
    });

    return bySource;
  }

  /**
   * Get creator statistics
   */
  getCreatorStats(creatorId: string): CreatorStats {
    const existing = this.creatorStats.get(creatorId);
    if (existing) return existing;

    const metrics = this.getCreatorMetrics(creatorId);
    const uploads = this.uploadHistory.get(creatorId) || [];
    const collaborations = this.collaborationHistory.get(creatorId) || [];
    const earnings = this.earnings.get(creatorId) || [];

    const stats: CreatorStats = {
      creatorId,
      totalProjects: metrics.length,
      totalUploads: uploads.length,
      totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
      totalCollaborators: new Set(collaborations.map(c => c.collaborator)).size,
      averageProjectEngagement: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length
        : 0,
      topProject: metrics.length > 0
        ? metrics.reduce((top, m) => m.views > top.views ? m : top).projectId
        : '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.creatorStats.set(creatorId, stats);
    return stats;
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(creatorId: string): {
    stats: CreatorStats;
    topProjects: AnalyticsMetrics[];
    recentUploads: { date: Date; fileName: string; size: number }[];
    earningsThisMonth: number;
    totalEngagement: number;
  } {
    const stats = this.getCreatorStats(creatorId);
    const metrics = this.getCreatorMetrics(creatorId);
    const topProjects = metrics.sort((a, b) => b.views - a.views).slice(0, 5);
    const recentUploads = this.getUploadHistory(creatorId, 5);
    const earningsThisMonth = this.getTotalEarnings(creatorId, 30);
    const totalEngagement = metrics.reduce((sum, m) => sum + m.likes + m.comments, 0);

    return {
      stats,
      topProjects,
      recentUploads,
      earningsThisMonth,
      totalEngagement,
    };
  }

  /**
   * Export analytics data
   */
  exportData(creatorId: string): string {
    const stats = this.getCreatorStats(creatorId);
    const metrics = this.getCreatorMetrics(creatorId);
    const earnings = this.getEarnings(creatorId, 365);

    const data = {
      creator: stats,
      projects: metrics,
      earnings,
      exportDate: new Date(),
    };

    return JSON.stringify(data, null, 2);
  }
}
