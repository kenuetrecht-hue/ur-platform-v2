/**
 * Creator Dashboard Service
 * Provides analytics, metrics, and insights for content creators
 */

export interface DashboardMetrics {
  creatorId: string;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  totalCollaborations: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  loyaltyPoints: number;
  subscriptionStatus: string;
}

export interface ProjectAnalytics {
  projectId: string;
  name: string;
  type: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  collaborators: number;
  views: number;
  downloads: number;
  earnings: number;
}

export interface CreatorStats {
  creatorId: string;
  totalViews: number;
  totalDownloads: number;
  totalEarnings: number;
  averageProjectValue: number;
  topProject: ProjectAnalytics | null;
  growthRate: number; // percentage month-over-month
  engagementScore: number; // 0-100
}

export interface ActivityLog {
  id: string;
  creatorId: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceInsight {
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

export class CreatorDashboard {
  private metrics: Map<string, DashboardMetrics> = new Map();
  private projectAnalytics: Map<string, ProjectAnalytics> = new Map();
  private creatorStats: Map<string, CreatorStats> = new Map();
  private activityLogs: ActivityLog[] = [];
  private insights: Map<string, PerformanceInsight[]> = new Map();

  /**
   * Initialize dashboard for creator
   */
  initializeDashboard(creatorId: string): DashboardMetrics {
    if (!this.metrics.has(creatorId)) {
      this.metrics.set(creatorId, {
        creatorId,
        totalProjects: 0,
        completedProjects: 0,
        activeProjects: 0,
        totalCollaborations: 0,
        totalEarnings: 0,
        thisMonthEarnings: 0,
        loyaltyPoints: 0,
        subscriptionStatus: 'free',
      });

      this.creatorStats.set(creatorId, {
        creatorId,
        totalViews: 0,
        totalDownloads: 0,
        totalEarnings: 0,
        averageProjectValue: 0,
        topProject: null,
        growthRate: 0,
        engagementScore: 0,
      });
    }

    return this.metrics.get(creatorId)!;
  }

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics(creatorId: string): DashboardMetrics {
    return this.initializeDashboard(creatorId);
  }

  /**
   * Update project analytics
   */
  updateProjectAnalytics(
    projectId: string,
    name: string,
    type: string,
    creatorId: string
  ): ProjectAnalytics {
    const analytics: ProjectAnalytics = {
      projectId,
      name,
      type,
      status: 'active',
      createdAt: new Date(),
      collaborators: 1,
      views: 0,
      downloads: 0,
      earnings: 0,
    };

    this.projectAnalytics.set(projectId, analytics);

    const metrics = this.initializeDashboard(creatorId);
    metrics.totalProjects += 1;
    metrics.activeProjects += 1;

    this.logActivity(creatorId, 'project_created', {
      projectId,
      name,
      type,
    });

    return analytics;
  }

  /**
   * Complete project
   */
  completeProject(projectId: string, creatorId: string): boolean {
    const analytics = this.projectAnalytics.get(projectId);
    if (!analytics) return false;

    analytics.status = 'completed';
    analytics.completedAt = new Date();

    const metrics = this.metrics.get(creatorId);
    if (metrics) {
      metrics.completedProjects += 1;
      metrics.activeProjects = Math.max(0, metrics.activeProjects - 1);
    }

    this.logActivity(creatorId, 'project_completed', {
      projectId,
      name: analytics.name,
    });

    return true;
  }

  /**
   * Record view
   */
  recordView(projectId: string, creatorId: string): boolean {
    const analytics = this.projectAnalytics.get(projectId);
    if (!analytics) return false;

    analytics.views += 1;
    this.updateCreatorStats(creatorId);

    return true;
  }

  /**
   * Record download
   */
  recordDownload(projectId: string, creatorId: string): boolean {
    const analytics = this.projectAnalytics.get(projectId);
    if (!analytics) return false;

    analytics.downloads += 1;
    this.updateCreatorStats(creatorId);

    return true;
  }

  /**
   * Record earnings
   */
  recordEarnings(projectId: string, creatorId: string, amount: number): boolean {
    const analytics = this.projectAnalytics.get(projectId);
    if (!analytics) return false;

    analytics.earnings += amount;

    const metrics = this.metrics.get(creatorId);
    if (metrics) {
      metrics.totalEarnings += amount;
      metrics.thisMonthEarnings += amount;
    }

    this.updateCreatorStats(creatorId);
    this.logActivity(creatorId, 'earnings_recorded', {
      projectId,
      amount,
    });

    return true;
  }

  /**
   * Add collaborator
   */
  addCollaborator(projectId: string, creatorId: string): boolean {
    const analytics = this.projectAnalytics.get(projectId);
    if (!analytics) return false;

    analytics.collaborators += 1;

    const metrics = this.metrics.get(creatorId);
    if (metrics) {
      metrics.totalCollaborations += 1;
    }

    return true;
  }

  /**
   * Update creator stats
   */
  private updateCreatorStats(creatorId: string): void {
    const stats = this.creatorStats.get(creatorId);
    if (!stats) return;

    const projects = Array.from(this.projectAnalytics.values()).filter(
      (p) => this.getProjectCreator(p.projectId) === creatorId
    );

    stats.totalViews = projects.reduce((sum, p) => sum + p.views, 0);
    stats.totalDownloads = projects.reduce((sum, p) => sum + p.downloads, 0);
    stats.totalEarnings = projects.reduce((sum, p) => sum + p.earnings, 0);

    if (projects.length > 0) {
      stats.averageProjectValue = stats.totalEarnings / projects.length;
      stats.topProject = projects.reduce((top, p) =>
        p.earnings > (top?.earnings || 0) ? p : top
      );
    }

    stats.engagementScore = Math.min(
      100,
      Math.floor((stats.totalViews + stats.totalDownloads * 2) / 10)
    );

    this.generateInsights(creatorId);
  }

  /**
   * Get creator stats
   */
  getCreatorStats(creatorId: string): CreatorStats {
    this.initializeDashboard(creatorId);
    return this.creatorStats.get(creatorId)!;
  }

  /**
   * Get project analytics
   */
  getProjectAnalytics(projectId: string): ProjectAnalytics | null {
    return this.projectAnalytics.get(projectId) || null;
  }

  /**
   * Get all projects for creator
   */
  getCreatorProjects(creatorId: string): ProjectAnalytics[] {
    return Array.from(this.projectAnalytics.values()).filter(
      (p) => this.getProjectCreator(p.projectId) === creatorId
    );
  }

  /**
   * Helper to get project creator (in real app, would query database)
   */
  private getProjectCreator(projectId: string): string {
    // This is a placeholder - in real implementation, would look up from database
    // For now, assume first creator owns all projects
    return 'first-creator-001';
  }

  /**
   * Generate performance insights
   */
  private generateInsights(creatorId: string): void {
    const stats = this.creatorStats.get(creatorId);
    if (!stats) return;

    const insights: PerformanceInsight[] = [];

    // View insight
    insights.push({
      metric: 'Views',
      value: stats.totalViews,
      trend: stats.totalViews > 100 ? 'up' : stats.totalViews > 50 ? 'stable' : 'down',
      recommendation:
        stats.totalViews < 50
          ? 'Share your projects more to increase visibility'
          : 'Great engagement! Keep creating quality content',
    });

    // Download insight
    insights.push({
      metric: 'Downloads',
      value: stats.totalDownloads,
      trend:
        stats.totalDownloads > stats.totalViews * 0.2
          ? 'up'
          : stats.totalDownloads > stats.totalViews * 0.1
            ? 'stable'
            : 'down',
      recommendation:
        stats.totalDownloads < 10
          ? 'Make your projects more shareable and valuable'
          : 'Your content is valuable! Consider monetizing',
    });

    // Earnings insight
    insights.push({
      metric: 'Earnings',
      value: stats.totalEarnings,
      trend: stats.totalEarnings > 100 ? 'up' : 'down',
      recommendation:
        stats.totalEarnings === 0
          ? 'Enable monetization on your projects to earn'
          : 'Great! Keep improving your content quality',
    });

    // Engagement insight
    insights.push({
      metric: 'Engagement Score',
      value: stats.engagementScore,
      trend: stats.engagementScore > 50 ? 'up' : 'down',
      recommendation:
        stats.engagementScore < 30
          ? 'Focus on creating more engaging content'
          : 'Excellent engagement! You\'re doing great',
    });

    this.insights.set(creatorId, insights);
  }

  /**
   * Get insights
   */
  getInsights(creatorId: string): PerformanceInsight[] {
    this.generateInsights(creatorId);
    return this.insights.get(creatorId) || [];
  }

  /**
   * Log activity
   */
  private logActivity(creatorId: string, action: string, details: Record<string, any>): void {
    this.activityLogs.push({
      id: `log-${Date.now()}`,
      creatorId,
      action,
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Get activity log
   */
  getActivityLog(creatorId: string, limit: number = 50): ActivityLog[] {
    return this.activityLogs
      .filter((log) => log.creatorId === creatorId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(creatorId: string): {
    metrics: DashboardMetrics;
    stats: CreatorStats;
    insights: PerformanceInsight[];
    recentActivity: ActivityLog[];
  } {
    return {
      metrics: this.getDashboardMetrics(creatorId),
      stats: this.getCreatorStats(creatorId),
      insights: this.getInsights(creatorId),
      recentActivity: this.getActivityLog(creatorId, 10),
    };
  }

  /**
   * Get trending projects
   */
  getTrendingProjects(limit: number = 5): ProjectAnalytics[] {
    return Array.from(this.projectAnalytics.values())
      .sort((a, b) => b.views + b.downloads - (a.views + a.downloads))
      .slice(0, limit);
  }

  /**
   * Get top creators by earnings
   */
  getTopCreators(limit: number = 10): CreatorStats[] {
    return Array.from(this.creatorStats.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  /**
   * Export dashboard data
   */
  exportDashboard(creatorId: string): string {
    const summary = this.getDashboardSummary(creatorId);
    return JSON.stringify(summary, null, 2);
  }
}

export const creatorDashboard = new CreatorDashboard();
