/**
 * Usage Monitoring & Abuse Prevention System
 * Monitors user activity, detects abuse patterns, and prevents misuse
 * Ensures app is used for legitimate educational and entrepreneurial purposes
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AbuseType = 
  | "spam"
  | "harassment"
  | "fraud"
  | "illegal_content"
  | "rate_limit_abuse"
  | "data_scraping"
  | "account_takeover"
  | "policy_violation";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ActionType = "warning" | "throttle" | "suspend" | "ban";

export interface UserActivity {
  userId: string;
  timestamp: Date;
  action: string;
  resource: string;
  status: "success" | "failed" | "blocked";
  metadata: Record<string, unknown>;
}

export interface AbusePattern {
  id: string;
  userId: string;
  abuseType: AbuseType;
  riskLevel: RiskLevel;
  indicators: string[];
  frequency: number; // occurrences per hour
  firstDetected: Date;
  lastDetected: Date;
  status: "active" | "resolved" | "investigating";
}

export interface RateLimitPolicy {
  id: string;
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  enabled: boolean;
}

export interface UsageQuota {
  userId: string;
  quotaType: "requests" | "data" | "storage";
  limit: number;
  used: number;
  resetDate: Date;
  exceeded: boolean;
}

export interface AnomalyDetection {
  id: string;
  userId: string;
  anomalyType: string;
  severity: RiskLevel;
  description: string;
  detectedAt: Date;
  resolved: boolean;
}

export interface EnforcementAction {
  id: string;
  userId: string;
  abusePatternId: string;
  actionType: ActionType;
  reason: string;
  duration?: number; // minutes
  timestamp: Date;
  appliedAt?: Date;
  removedAt?: Date;
}

export interface MonitoringReport {
  id: string;
  timestamp: Date;
  totalUsers: number;
  activeAbusers: number;
  blockedRequests: number;
  suspendedAccounts: number;
  enforcementActions: number;
  riskScore: number; // 0-100
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UserActivitySchema = z.object({
  userId: z.string(),
  timestamp: z.date(),
  action: z.string().min(1),
  resource: z.string(),
  status: z.enum(["success", "failed", "blocked"]),
  metadata: z.record(z.string(), z.unknown()),
});

const AbusePatternSchema = z.object({
  id: z.string(),
  userId: z.string(),
  abuseType: z.enum([
    "spam", "harassment", "fraud", "illegal_content",
    "rate_limit_abuse", "data_scraping", "account_takeover", "policy_violation"
  ]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  indicators: z.array(z.string()),
  frequency: z.number().nonnegative(),
  firstDetected: z.date(),
  lastDetected: z.date(),
  status: z.enum(["active", "resolved", "investigating"]),
});

const RateLimitPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  requestsPerMinute: z.number().positive(),
  requestsPerHour: z.number().positive(),
  requestsPerDay: z.number().positive(),
  burstLimit: z.number().positive(),
  enabled: z.boolean(),
});

// ============================================================================
// USAGE MONITORING & ABUSE PREVENTION SYSTEM
// ============================================================================

export class UsageMonitoringSystem {
  private activities: Map<string, UserActivity[]> = new Map();
  private abusePatterns: Map<string, AbusePattern[]> = new Map();
  private rateLimitPolicies: Map<string, RateLimitPolicy> = new Map();
  private usageQuotas: Map<string, UsageQuota> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private enforcementActions: EnforcementAction[] = [];
  private reports: MonitoringReport[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default rate limit policies
   */
  private initializeDefaultPolicies(): void {
    const policies: RateLimitPolicy[] = [
      {
        id: "policy-standard",
        name: "Standard User",
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 100,
        enabled: true,
      },
      {
        id: "policy-premium",
        name: "Premium User",
        requestsPerMinute: 120,
        requestsPerHour: 5000,
        requestsPerDay: 50000,
        burstLimit: 200,
        enabled: true,
      },
      {
        id: "policy-suspicious",
        name: "Suspicious User",
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 500,
        burstLimit: 20,
        enabled: true,
      },
    ];

    policies.forEach((policy) => {
      RateLimitPolicySchema.parse(policy);
      this.rateLimitPolicies.set(policy.id, policy);
    });
  }

  /**
   * Record user activity
   */
  recordActivity(
    userId: string,
    action: string,
    resource: string,
    status: "success" | "failed" | "blocked" = "success",
    metadata: Record<string, unknown> = {}
  ): UserActivity {
    const activity: UserActivity = {
      userId,
      timestamp: new Date(),
      action,
      resource,
      status,
      metadata,
    };

    UserActivitySchema.parse(activity);

    const activities = this.activities.get(userId) || [];
    activities.push(activity);
    this.activities.set(userId, activities);

    // Check for abuse patterns
    this.analyzeActivityForAbuse(userId, activity);

    return activity;
  }

  /**
   * Analyze activity for abuse patterns
   */
  private analyzeActivityForAbuse(userId: string, activity: UserActivity): void {
    const activities = this.activities.get(userId) || [];
    const recentActivities = activities.slice(-100); // Last 100 activities

    // Check for spam (many requests in short time)
    const lastMinute = recentActivities.filter(
      (a) => a.timestamp > new Date(Date.now() - 60 * 1000)
    );
    if (lastMinute.length > 60) {
      this.detectAbusePattern(userId, "spam", "high", [
        `${lastMinute.length} requests in 1 minute`,
      ]);
    }

    // Check for rate limit abuse
    const lastHour = recentActivities.filter(
      (a) => a.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );
    if (lastHour.length > 1000) {
      this.detectAbusePattern(userId, "rate_limit_abuse", "high", [
        `${lastHour.length} requests in 1 hour`,
      ]);
    }

    // Check for data scraping patterns
    if (activity.action === "bulk_export" || activity.action === "data_download") {
      const recentExports = recentActivities.filter(
        (a) =>
          (a.action === "bulk_export" || a.action === "data_download") &&
          a.timestamp > new Date(Date.now() - 60 * 60 * 1000)
      );
      if (recentExports.length > 5) {
        this.detectAbusePattern(userId, "data_scraping", "medium", [
          `${recentExports.length} bulk exports in 1 hour`,
        ]);
      }
    }
  }

  /**
   * Detect and record abuse pattern
   */
  private detectAbusePattern(
    userId: string,
    abuseType: AbuseType,
    riskLevel: RiskLevel,
    indicators: string[]
  ): void {
    const patterns = this.abusePatterns.get(userId) || [];

    // Check if pattern already exists
    let pattern = patterns.find((p) => p.abuseType === abuseType && p.status === "active");

    if (pattern) {
      pattern.lastDetected = new Date();
      pattern.frequency++;
      pattern.indicators.push(...indicators);
    } else {
      pattern = {
        id: `ap-${Date.now()}-${Math.random()}`,
        userId,
        abuseType,
        riskLevel,
        indicators,
        frequency: 1,
        firstDetected: new Date(),
        lastDetected: new Date(),
        status: "active",
      };

      AbusePatternSchema.parse(pattern);
      patterns.push(pattern);
      this.abusePatterns.set(userId, patterns);

      // Take action based on risk level
      this.takeEnforcementAction(userId, pattern);
    }
  }

  /**
   * Take enforcement action
   */
  private takeEnforcementAction(userId: string, pattern: AbusePattern): void {
    let actionType: ActionType;
    let duration: number | undefined;

    switch (pattern.riskLevel) {
      case "critical":
        actionType = "ban";
        break;
      case "high":
        actionType = "suspend";
        duration = 60; // 1 hour
        break;
      case "medium":
        actionType = "throttle";
        duration = 30; // 30 minutes
        break;
      case "low":
        actionType = "warning";
        break;
    }

    const action: EnforcementAction = {
      id: `ea-${Date.now()}-${Math.random()}`,
      userId,
      abusePatternId: pattern.id,
      actionType,
      reason: `Detected ${pattern.abuseType}: ${pattern.indicators.join(", ")}`,
      duration,
      timestamp: new Date(),
    };

    this.enforcementActions.push(action);

    // Apply action immediately for high/critical
    if (pattern.riskLevel === "high" || pattern.riskLevel === "critical") {
      action.appliedAt = new Date();
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(userId: string, policyId: string = "policy-standard"): boolean {
    const policy = this.rateLimitPolicies.get(policyId);
    if (!policy || !policy.enabled) return true;

    const activities = this.activities.get(userId) || [];

    // Check burst limit (last minute)
    const lastMinute = activities.filter(
      (a) => a.timestamp > new Date(Date.now() - 60 * 1000)
    );
    if (lastMinute.length >= policy.burstLimit) {
      return false;
    }

    // Check hourly limit
    const lastHour = activities.filter(
      (a) => a.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );
    if (lastHour.length >= policy.requestsPerHour) {
      return false;
    }

    // Check daily limit
    const lastDay = activities.filter(
      (a) => a.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    if (lastDay.length >= policy.requestsPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Detect anomaly
   */
  detectAnomaly(
    userId: string,
    anomalyType: string,
    severity: RiskLevel,
    description: string
  ): AnomalyDetection {
    const anomaly: AnomalyDetection = {
      id: `ad-${Date.now()}-${Math.random()}`,
      userId,
      anomalyType,
      severity,
      description,
      detectedAt: new Date(),
      resolved: false,
    };

    this.anomalies.push(anomaly);

    // Alert if critical
    if (severity === "critical") {
      console.warn(`CRITICAL ANOMALY: ${description} for user ${userId}`);
    }

    return anomaly;
  }

  /**
   * Get user activity history
   */
  getUserActivity(userId: string, limit: number = 50): UserActivity[] {
    const activities = this.activities.get(userId) || [];
    return activities.slice(-limit);
  }

  /**
   * Get abuse patterns for user
   */
  getAbusePatterns(userId: string): AbusePattern[] {
    return this.abusePatterns.get(userId) || [];
  }

  /**
   * Get active enforcement actions
   */
  getActiveEnforcementActions(userId: string): EnforcementAction[] {
    return this.enforcementActions.filter(
      (a) => a.userId === userId && a.appliedAt && !a.removedAt
    );
  }

  /**
   * Remove enforcement action
   */
  removeEnforcementAction(actionId: string): void {
    const action = this.enforcementActions.find((a) => a.id === actionId);
    if (action) {
      action.removedAt = new Date();
    }
  }

  /**
   * Generate monitoring report
   */
  generateMonitoringReport(): MonitoringReport {
    const totalUsers = this.activities.size;
    const activeAbusers = Array.from(this.abusePatterns.values()).reduce(
      (sum, patterns) => sum + (patterns.some((p) => p.status === "active") ? 1 : 0),
      0
    );

    const blockedRequests = Array.from(this.activities.values()).reduce(
      (sum, activities) => sum + activities.filter((a) => a.status === "blocked").length,
      0
    );

    const suspendedAccounts = this.enforcementActions.filter(
      (a) => a.actionType === "suspend" && a.appliedAt && !a.removedAt
    ).length;

    const enforcementActions = this.enforcementActions.filter((a) => a.appliedAt).length;

    const riskScore = Math.min(100, (activeAbusers / Math.max(1, totalUsers)) * 100);

    const report: MonitoringReport = {
      id: `mr-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      totalUsers,
      activeAbusers,
      blockedRequests,
      suspendedAccounts,
      enforcementActions,
      riskScore,
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalActivities: number;
    totalAbusePatterns: number;
    activeAbusePatterns: number;
    totalEnforcementActions: number;
    activeEnforcementActions: number;
    totalAnomalies: number;
  } {
    const totalActivities = Array.from(this.activities.values()).reduce(
      (sum, activities) => sum + activities.length,
      0
    );

    const totalAbusePatterns = Array.from(this.abusePatterns.values()).reduce(
      (sum, patterns) => sum + patterns.length,
      0
    );

    const activeAbusePatterns = Array.from(this.abusePatterns.values()).reduce(
      (sum, patterns) => sum + patterns.filter((p) => p.status === "active").length,
      0
    );

    const totalEnforcementActions = this.enforcementActions.length;
    const activeEnforcementActions = this.enforcementActions.filter(
      (a) => a.appliedAt && !a.removedAt
    ).length;

    const totalAnomalies = this.anomalies.length;

    return {
      totalActivities,
      totalAbusePatterns,
      activeAbusePatterns,
      totalEnforcementActions,
      activeEnforcementActions,
      totalAnomalies,
    };
  }
}

export default UsageMonitoringSystem;
