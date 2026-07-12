/**
 * AI Creator Dashboard Service
 * Manages individual AI creator dashboards and admin control panels
 */

import { aiCreatorSystem, AICreatorProfile, AdminAIControl } from './ai-creator-system';

export interface AICreatorDashboardStats {
  profile: AICreatorProfile | undefined;
  contentCount: number;
  audienceCount: number;
  monthlyEarnings: number;
  totalEarnings: number;
  averageRating: number;
  isMonitored: boolean;
  isPaused: boolean;
  contentApprovalRequired: boolean;
  allowedAds: boolean;
}

export interface AdminDashboardSummary {
  totalAICreators: number;
  activeAICreators: number;
  pausedAICreators: number;
  totalFollowers: number;
  totalEarnings: number;
  monthlyRevenue: number;
  averageRating: number;
  aiCreators: AICreatorProfile[];
}

export interface AICreatorControlPanel {
  aiCreatorId: string;
  name: string;
  specialty: string;
  isActive: boolean;
  isPaused: boolean;
  dailyInteractionLimit?: number;
  contentApprovalRequired: boolean;
  allowedAds: boolean;
  actions: {
    pause: () => void;
    resume: () => void;
    setInteractionLimit: (limit: number) => void;
    toggleContentApproval: () => void;
    toggleAds: () => void;
    updateNotes: (notes: string) => void;
  };
}

export class AICreatorDashboardService {
  /**
   * Get AI creator dashboard stats
   */
  getAICreatorDashboardStats(aiCreatorId: string): AICreatorDashboardStats {
    const dashboard = aiCreatorSystem.getAIDashboardData(aiCreatorId);
    const control = aiCreatorSystem.getAdminControl(aiCreatorId);

    return {
      profile: dashboard.profile,
      contentCount: dashboard.content.length,
      audienceCount: dashboard.audience.length,
      monthlyEarnings: dashboard.stats.monthlyEarnings,
      totalEarnings: dashboard.stats.monthlyEarnings,
      averageRating: dashboard.profile?.rating || 0,
      isMonitored: control?.isMonitored || false,
      isPaused: control?.isPaused || false,
      contentApprovalRequired: control?.contentApprovalRequired || false,
      allowedAds: control?.allowedAds || false,
    };
  }

  /**
   * Get admin dashboard summary
   */
  getAdminDashboardSummary(): AdminDashboardSummary {
    const data = aiCreatorSystem.getAdminDashboardData();

    return {
      totalAICreators: data.totalAICreators,
      activeAICreators: data.activeAIs,
      pausedAICreators: data.totalAICreators - data.activeAIs,
      totalFollowers: data.totalFollowers,
      totalEarnings: data.totalEarnings,
      monthlyRevenue: Math.floor(data.totalEarnings * 0.3), // Estimate 30% monthly
      averageRating: data.averageRating,
      aiCreators: data.aiCreators,
    };
  }

  /**
   * Get AI creator control panel
   */
  getAICreatorControlPanel(aiCreatorId: string): AICreatorControlPanel {
    const profile = aiCreatorSystem.getAICreator(aiCreatorId);
    const control = aiCreatorSystem.getAdminControl(aiCreatorId);

    if (!profile || !control) {
      throw new Error(`AI Creator ${aiCreatorId} not found`);
    }

    return {
      aiCreatorId,
      name: profile.name,
      specialty: profile.specialty,
      isActive: profile.isActive,
      isPaused: control.isPaused,
      dailyInteractionLimit: control.dailyInteractionLimit,
      contentApprovalRequired: control.contentApprovalRequired,
      allowedAds: control.allowedAds,
      actions: {
        pause: () => aiCreatorSystem.pauseAICreator(aiCreatorId),
        resume: () => aiCreatorSystem.resumeAICreator(aiCreatorId),
        setInteractionLimit: (limit: number) => {
          aiCreatorSystem.updateAdminControl(aiCreatorId, { dailyInteractionLimit: limit });
        },
        toggleContentApproval: () => {
          const current = aiCreatorSystem.getAdminControl(aiCreatorId);
          if (current) {
            aiCreatorSystem.updateAdminControl(aiCreatorId, {
              contentApprovalRequired: !current.contentApprovalRequired,
            });
          }
        },
        toggleAds: () => {
          const current = aiCreatorSystem.getAdminControl(aiCreatorId);
          if (current) {
            aiCreatorSystem.updateAdminControl(aiCreatorId, {
              allowedAds: !current.allowedAds,
            });
          }
        },
        updateNotes: (notes: string) => {
          aiCreatorSystem.updateAdminControl(aiCreatorId, { notes });
        },
      },
    };
  }

  /**
   * Get all AI creator control panels
   */
  getAllAICreatorControlPanels(): AICreatorControlPanel[] {
    const creators = aiCreatorSystem.getAllAICreators();
    return creators.map(creator => this.getAICreatorControlPanel(creator.id));
  }

  /**
   * Monitor AI creator activity
   */
  monitorAICreatorActivity(aiCreatorId: string): {
    recentContent: any[];
    recentAudience: any[];
    recentEarnings: any[];
    activityLevel: 'high' | 'medium' | 'low';
    lastActivityTime: Date;
  } {
    const dashboard = aiCreatorSystem.getAIDashboardData(aiCreatorId);

    const recentContent = dashboard.content.slice(-5).reverse();
    const recentAudience = dashboard.audience.slice(-5).reverse();
    const recentEarnings = dashboard.earnings.slice(-5).reverse();

    const contentActivity = recentContent.length;
    const audienceActivity = recentAudience.length;
    const earningsActivity = recentEarnings.length;

    const totalActivity = contentActivity + audienceActivity + earningsActivity;
    let activityLevel: 'high' | 'medium' | 'low' = 'low';
    if (totalActivity > 10) activityLevel = 'high';
    else if (totalActivity > 5) activityLevel = 'medium';

    const lastActivityTime = new Date();

    return {
      recentContent,
      recentAudience,
      recentEarnings,
      activityLevel,
      lastActivityTime,
    };
  }

  /**
   * Get AI creator performance metrics
   */
  getAICreatorPerformanceMetrics(aiCreatorId: string): {
    engagementRate: number;
    growthRate: number;
    conversionRate: number;
    retentionRate: number;
    averageSessionDuration: number;
    topContent: any;
  } {
    const dashboard = aiCreatorSystem.getAIDashboardData(aiCreatorId);

    const totalViews = dashboard.stats.totalViews || 1;
    const totalLikes = dashboard.stats.totalLikes || 0;
    const totalDownloads = dashboard.stats.totalDownloads || 0;

    const engagementRate = ((totalLikes + totalDownloads) / totalViews) * 100 || 0;
    const growthRate = (dashboard.audience.length / (dashboard.profile?.followers || 1)) * 100 || 0;
    const conversionRate = (totalDownloads / totalViews) * 100 || 0;
    const retentionRate = Math.min(100, (dashboard.audience.length * 2.5) % 100);
    const averageSessionDuration = 12.5; // minutes

    const topContent = dashboard.content.reduce((prev, current) =>
      prev.views > current.views ? prev : current
    );

    return {
      engagementRate: Math.round(engagementRate * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
      averageSessionDuration,
      topContent,
    };
  }

  /**
   * Export AI creator data
   */
  exportAICreatorData(aiCreatorId: string): {
    profile: AICreatorProfile | undefined;
    contentCount: number;
    audienceCount: number;
    totalEarnings: number;
    adRevenue: number;
    exportDate: Date;
  } {
    const dashboard = aiCreatorSystem.getAIDashboardData(aiCreatorId);

    return {
      profile: dashboard.profile,
      contentCount: dashboard.content.length,
      audienceCount: dashboard.audience.length,
      totalEarnings: dashboard.profile?.totalEarnings || 0,
      adRevenue: dashboard.stats.adRevenue,
      exportDate: new Date(),
    };
  }
}

// Export singleton instance
export const aiCreatorDashboardService = new AICreatorDashboardService();
