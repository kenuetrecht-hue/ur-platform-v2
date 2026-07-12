/**
 * Multi-AI Daily Broadcast Service
 * Manages daily disclosures for users with multiple AI creator subscriptions
 * Ensures each AI sends its own daily disclosure with proper spacing
 */

export interface BroadcastSchedule {
  userId: string;
  creatorIds: string[];
  broadcastTime: Date;
  disclosures: Map<string, { creatorId: string; creatorName: string; sent: boolean; sentAt?: Date }>;
  broadcastId: string;
}

export interface BroadcastLog {
  broadcastId: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  sentAt: Date;
  disclosureContent: string;
  status: 'sent' | 'failed' | 'pending';
  acknowledgedAt?: Date;
}

class MultiAIBroadcastService {
  private broadcastSchedules: Map<string, BroadcastSchedule> = new Map();
  private broadcastLogs: BroadcastLog[] = [];
  private userSubscriptions: Map<string, Set<string>> = new Map();

  /**
   * Register user subscription to AI creator
   */
  registerSubscription(userId: string, creatorId: string): void {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId)!.add(creatorId);
  }

  /**
   * Unregister user subscription from AI creator
   */
  unregisterSubscription(userId: string, creatorId: string): void {
    const subscriptions = this.userSubscriptions.get(userId);
    if (subscriptions) {
      subscriptions.delete(creatorId);
    }
  }

  /**
   * Get user's AI subscriptions
   */
  getUserSubscriptions(userId: string): string[] {
    const subscriptions = this.userSubscriptions.get(userId);
    return subscriptions ? Array.from(subscriptions) : [];
  }

  /**
   * Create daily broadcast schedule for user
   */
  createDailyBroadcastSchedule(userId: string, creatorIds: string[], creatorNames: Record<string, string>): BroadcastSchedule {
    const broadcastId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const broadcastTime = new Date();

    const disclosures = new Map<string, { creatorId: string; creatorName: string; sent: boolean; sentAt?: Date }>();

    for (const creatorId of creatorIds) {
      disclosures.set(creatorId, {
        creatorId,
        creatorName: creatorNames[creatorId] || 'AI Creator',
        sent: false,
      });
    }

    const schedule: BroadcastSchedule = {
      userId,
      creatorIds,
      broadcastTime,
      disclosures,
      broadcastId,
    };

    this.broadcastSchedules.set(broadcastId, schedule);

    return schedule;
  }

  /**
   * Send disclosure for specific creator in broadcast
   */
  sendBroadcastDisclosure(broadcastId: string, creatorId: string, disclosureContent: string): BroadcastLog {
    const schedule = this.broadcastSchedules.get(broadcastId);

    if (!schedule) {
      throw new Error(`Broadcast schedule not found: ${broadcastId}`);
    }

    const disclosure = schedule.disclosures.get(creatorId);

    if (!disclosure) {
      throw new Error(`Creator not in broadcast: ${creatorId}`);
    }

    const log: BroadcastLog = {
      broadcastId,
      userId: schedule.userId,
      creatorId,
      creatorName: disclosure.creatorName,
      sentAt: new Date(),
      disclosureContent,
      status: 'sent',
    };

    // Update schedule
    disclosure.sent = true;
    disclosure.sentAt = new Date();

    // Log broadcast
    this.broadcastLogs.push(log);

    return log;
  }

  /**
   * Get broadcast status
   */
  getBroadcastStatus(broadcastId: string): { totalCreators: number; sentCount: number; pendingCount: number; status: 'in_progress' | 'completed' | 'failed' } {
    const schedule = this.broadcastSchedules.get(broadcastId);

    if (!schedule) {
      return {
        totalCreators: 0,
        sentCount: 0,
        pendingCount: 0,
        status: 'failed',
      };
    }

    const sentCount = Array.from(schedule.disclosures.values()).filter(d => d.sent).length;
    const pendingCount = schedule.disclosures.size - sentCount;
    const status = pendingCount === 0 ? 'completed' : 'in_progress';

    return {
      totalCreators: schedule.disclosures.size,
      sentCount,
      pendingCount,
      status,
    };
  }

  /**
   * Get today's broadcasts for user
   */
  getTodaysBroadcasts(userId: string): BroadcastLog[] {
    const today = new Date();

    return this.broadcastLogs.filter(log => {
      const logDate = new Date(log.sentAt);
      return (
        log.userId === userId &&
        today.getFullYear() === logDate.getFullYear() &&
        today.getMonth() === logDate.getMonth() &&
        today.getDate() === logDate.getDate()
      );
    });
  }

  /**
   * Get user's broadcast history
   */
  getUserBroadcastHistory(userId: string, limit: number = 30): BroadcastLog[] {
    return this.broadcastLogs.filter(log => log.userId === userId).slice(-limit);
  }

  /**
   * Acknowledge broadcast disclosure
   */
  acknowledgeBroadcastDisclosure(broadcastId: string, creatorId: string): void {
    const log = this.broadcastLogs.find(l => l.broadcastId === broadcastId && l.creatorId === creatorId);

    if (log) {
      log.acknowledgedAt = new Date();
    }
  }

  /**
   * Get broadcast statistics for user
   */
  getBroadcastStatistics(userId: string): { totalBroadcasts: number; totalDisclosuresSent: number; averageCreatorsPerBroadcast: number; acknowledgmentRate: number } {
    const userLogs = this.broadcastLogs.filter(log => log.userId === userId);

    const broadcastIds = new Set(userLogs.map(log => log.broadcastId));
    const totalBroadcasts = broadcastIds.size;
    const totalDisclosuresSent = userLogs.length;
    const averageCreatorsPerBroadcast = totalBroadcasts > 0 ? totalDisclosuresSent / totalBroadcasts : 0;
    const acknowledgedCount = userLogs.filter(log => log.acknowledgedAt).length;
    const acknowledgmentRate = totalDisclosuresSent > 0 ? (acknowledgedCount / totalDisclosuresSent) * 100 : 0;

    return {
      totalBroadcasts,
      totalDisclosuresSent,
      averageCreatorsPerBroadcast: Math.round(averageCreatorsPerBroadcast * 100) / 100,
      acknowledgmentRate: Math.round(acknowledgmentRate * 100) / 100,
    };
  }

  /**
   * Check if user needs daily broadcast
   */
  userNeedsDailyBroadcast(userId: string): boolean {
    const today = new Date();
    const todaysBroadcasts = this.getTodaysBroadcasts(userId);

    if (todaysBroadcasts.length === 0) return true;

    // Check if all creators have sent disclosures today
    const subscriptions = this.getUserSubscriptions(userId);
    const creatorsSentToday = new Set(todaysBroadcasts.map(log => log.creatorId));

    return subscriptions.some(creatorId => !creatorsSentToday.has(creatorId));
  }

  /**
   * Get pending creators for user's daily broadcast
   */
  getPendingCreators(userId: string): string[] {
    const subscriptions = this.getUserSubscriptions(userId);
    const todaysBroadcasts = this.getTodaysBroadcasts(userId);
    const creatorsSentToday = new Set(todaysBroadcasts.map(log => log.creatorId));

    return subscriptions.filter(creatorId => !creatorsSentToday.has(creatorId));
  }

  /**
   * Generate broadcast summary
   */
  generateBroadcastSummary(broadcastId: string): string {
    const schedule = this.broadcastSchedules.get(broadcastId);

    if (!schedule) return 'Broadcast not found';

    const status = this.getBroadcastStatus(broadcastId);
    const logs = this.broadcastLogs.filter(log => log.broadcastId === broadcastId);

    let summary = `📢 **Daily AI Broadcast Summary**\n\n`;
    summary += `Broadcast ID: ${broadcastId}\n`;
    summary += `Date: ${schedule.broadcastTime.toLocaleDateString()}\n`;
    summary += `Status: ${status.status}\n\n`;
    summary += `Disclosures: ${status.sentCount}/${status.totalCreators} sent\n\n`;

    summary += `**Creators:**\n`;
    for (const log of logs) {
      summary += `✅ ${log.creatorName} - Sent at ${new Date(log.sentAt).toLocaleTimeString()}\n`;
    }

    if (status.pendingCount > 0) {
      summary += `\n**Pending:**\n`;
      for (const [creatorId, disclosure] of schedule.disclosures.entries()) {
        if (!disclosure.sent) {
          summary += `⏳ ${disclosure.creatorName}\n`;
        }
      }
    }

    return summary;
  }

  /**
   * Get compliance report for multi-AI broadcasts
   */
  getMultiAIComplianceReport(userId: string): { totalSubscriptions: number; broadcastsCompleted: number; complianceRate: number; lastBroadcastDate: Date | null } {
    const subscriptions = this.getUserSubscriptions(userId);
    const userLogs = this.broadcastLogs.filter(log => log.userId === userId);
    const broadcastIds = new Set(userLogs.map(log => log.broadcastId));

    let completedBroadcasts = 0;
    for (const broadcastId of broadcastIds) {
      const status = this.getBroadcastStatus(broadcastId);
      if (status.status === 'completed') {
        completedBroadcasts++;
      }
    }

    const complianceRate = broadcastIds.size > 0 ? (completedBroadcasts / broadcastIds.size) * 100 : 0;
    const lastBroadcastDate = userLogs.length > 0 ? new Date(userLogs[userLogs.length - 1].sentAt) : null;

    return {
      totalSubscriptions: subscriptions.length,
      broadcastsCompleted: completedBroadcasts,
      complianceRate: Math.round(complianceRate * 100) / 100,
      lastBroadcastDate,
    };
  }
}

export const multiAIBroadcastService = new MultiAIBroadcastService();
