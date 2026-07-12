import { z } from "zod";

/**
 * Rate Limiting & Quota Management System
 * Phase 2 Important Infrastructure
 *
 * Prevents abuse, ensures fair resource allocation, protects against DDoS
 * - Per-user rate limiting
 * - Per-AI rate limiting
 * - Per-IP rate limiting
 * - Quota system with tracking
 * - Graceful degradation (queue instead of reject)
 * - Quota analytics
 * - Quota alerts
 * - DDoS protection
 */

// Rate Limit Status
export const RateLimitStatusSchema = z.enum(["allowed", "rate_limited", "quota_exceeded"]);
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;

// Rate Limit Record
export const RateLimitRecordSchema = z.object({
  id: z.string(),
  identifier: z.string(), // user_id, ip, or ai_id
  type: z.enum(["user", "ip", "ai"]),
  requestCount: z.number(),
  windowStart: z.date(),
  windowEnd: z.date(),
  limit: z.number(),
  status: RateLimitStatusSchema,
});

export type RateLimitRecord = z.infer<typeof RateLimitRecordSchema>;

// Quota
export const QuotaSchema = z.object({
  id: z.string(),
  userId: z.string(),
  aiId: z.string().optional(),
  type: z.enum(["api_calls", "storage", "compute", "bandwidth"]),
  limit: z.number(),
  used: z.number(),
  period: z.enum(["hourly", "daily", "monthly", "unlimited"]),
  resetAt: z.date(),
  alerts: z.array(z.number()), // percentage thresholds for alerts
});

export type Quota = z.infer<typeof QuotaSchema>;

// Quota Alert
export const QuotaAlertSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  userId: z.string(),
  quotaId: z.string(),
  percentageUsed: z.number(),
  message: z.string(),
  acknowledged: z.boolean(),
});

export type QuotaAlert = z.infer<typeof QuotaAlertSchema>;

// DDoS Detection
export const DDoSDetectionSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  sourceIp: z.string(),
  requestCount: z.number(),
  timeWindow: z.number(), // seconds
  severity: z.enum(["low", "medium", "high", "critical"]),
  blocked: z.boolean(),
  reason: z.string(),
});

export type DDoSDetection = z.infer<typeof DDoSDetectionSchema>;

/**
 * Rate Limiting & Quota Manager
 */
export class RateLimitingSystem {
  private rateLimits: Map<string, RateLimitRecord> = new Map();
  private quotas: Map<string, Quota> = new Map();
  private quotaAlerts: Map<string, QuotaAlert> = new Map();
  private ddosDetections: Map<string, DDoSDetection> = new Map();
  private requestQueue: Array<{ id: string; timestamp: number }> = [];

  // Configuration
  private userRateLimit = 1000; // requests per hour
  private ipRateLimit = 5000; // requests per hour
  private aiRateLimit = 10000; // requests per hour
  private ddosThreshold = 1000; // requests per minute from single IP

  /**
   * Check rate limit
   */
  checkRateLimit(identifier: string, type: "user" | "ip" | "ai"): RateLimitStatus {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour window
    const key = `${type}_${identifier}`;

    let record = this.rateLimits.get(key);

    if (!record || record.windowEnd < now) {
      // Create new record
      const limit =
        type === "user"
          ? this.userRateLimit
          : type === "ip"
            ? this.ipRateLimit
            : this.aiRateLimit;

      record = {
        id: `limit_${Date.now()}`,
        identifier,
        type,
        requestCount: 0,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
        limit,
        status: "allowed",
      };
    }

    // Increment request count
    record.requestCount++;

    // Check if rate limited
    if (record.requestCount > record.limit) {
      record.status = "rate_limited";
    } else {
      record.status = "allowed";
    }

    this.rateLimits.set(key, record);

    // Check for DDoS
    if (type === "ip") {
      this.checkDDoS(identifier);
    }

    return record.status;
  }

  /**
   * Check DDoS
   */
  private checkDDoS(sourceIp: string): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Count requests from this IP in the last minute
    const recentRequests = this.requestQueue.filter(
      (req) => req.id.includes(sourceIp) && req.timestamp > oneMinuteAgo
    );

    if (recentRequests.length > this.ddosThreshold) {
      const detection: DDoSDetection = {
        id: `ddos_${Date.now()}`,
        timestamp: new Date(),
        sourceIp,
        requestCount: recentRequests.length,
        timeWindow: 60,
        severity:
          recentRequests.length > this.ddosThreshold * 5
            ? "critical"
            : recentRequests.length > this.ddosThreshold * 3
              ? "high"
              : "medium",
        blocked: true,
        reason: "Excessive requests detected",
      };

      this.ddosDetections.set(detection.id, detection);
      console.warn(`🚨 DDoS detected from ${sourceIp}: ${recentRequests.length} requests in 60s`);
    }
  }

  /**
   * Create quota for user
   */
  createQuota(
    userId: string,
    type: "api_calls" | "storage" | "compute" | "bandwidth",
    limit: number,
    period: "hourly" | "daily" | "monthly" | "unlimited",
    aiId?: string
  ): Quota {
    const quota: Quota = {
      id: `quota_${Date.now()}`,
      userId,
      aiId,
      type,
      limit,
      used: 0,
      period,
      resetAt: this.calculateResetTime(period),
      alerts: [50, 75, 90, 100], // Alert at 50%, 75%, 90%, 100%
    };

    this.quotas.set(quota.id, quota);
    return quota;
  }

  /**
   * Calculate reset time
   */
  private calculateResetTime(period: "hourly" | "daily" | "monthly" | "unlimited"): Date {
    const now = new Date();

    switch (period) {
      case "hourly":
        return new Date(now.getTime() + 60 * 60 * 1000);
      case "daily":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "monthly":
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case "unlimited":
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Use quota
   */
  useQuota(quotaId: string, amount: number = 1): { allowed: boolean; remaining: number; percentageUsed: number } {
    const quota = this.quotas.get(quotaId);
    if (!quota) throw new Error("Quota not found");

    // Check if quota has reset
    if (new Date() > quota.resetAt) {
      quota.used = 0;
      quota.resetAt = this.calculateResetTime(quota.period);
    }

    const newUsed = quota.used + amount;
    const allowed = newUsed <= quota.limit;
    const percentageUsed = (newUsed / quota.limit) * 100;

    if (allowed) {
      quota.used = newUsed;
    }

    // Check for alerts
    for (const threshold of quota.alerts) {
      if (percentageUsed >= threshold && percentageUsed - (amount / quota.limit) * 100 < threshold) {
        this.createQuotaAlert(quotaId, percentageUsed);
      }
    }

    return {
      allowed,
      remaining: Math.max(0, quota.limit - newUsed),
      percentageUsed,
    };
  }

  /**
   * Create quota alert
   */
  private createQuotaAlert(quotaId: string, percentageUsed: number): void {
    const quota = this.quotas.get(quotaId);
    if (!quota) return;

    const alert: QuotaAlert = {
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
      userId: quota.userId,
      quotaId,
      percentageUsed,
      message: `You have used ${Math.round(percentageUsed)}% of your ${quota.type} quota`,
      acknowledged: false,
    };

    this.quotaAlerts.set(alert.id, alert);
  }

  /**
   * Get quota status
   */
  getQuotaStatus(quotaId: string): {
    quota: Quota;
    used: number;
    remaining: number;
    percentageUsed: number;
    resetsAt: Date;
  } {
    const quota = this.quotas.get(quotaId);
    if (!quota) throw new Error("Quota not found");

    const percentageUsed = (quota.used / quota.limit) * 100;

    return {
      quota,
      used: quota.used,
      remaining: quota.limit - quota.used,
      percentageUsed,
      resetsAt: quota.resetAt,
    };
  }

  /**
   * Get user quotas
   */
  getUserQuotas(userId: string): Quota[] {
    return Array.from(this.quotas.values()).filter((q) => q.userId === userId);
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): {
    totalRequests: number;
    rateLimitedRequests: number;
    rateLimitPercentage: number;
    topLimitedIdentifiers: Array<{ identifier: string; count: number }>;
  } {
    const records = Array.from(this.rateLimits.values());
    const rateLimited = records.filter((r) => r.status === "rate_limited");

    const topLimited: Map<string, number> = new Map();
    for (const record of rateLimited) {
      topLimited.set(record.identifier, (topLimited.get(record.identifier) || 0) + 1);
    }

    return {
      totalRequests: records.reduce((sum, r) => sum + r.requestCount, 0),
      rateLimitedRequests: rateLimited.length,
      rateLimitPercentage: records.length > 0 ? (rateLimited.length / records.length) * 100 : 0,
      topLimitedIdentifiers: Array.from(topLimited.entries())
        .map(([identifier, count]) => ({ identifier, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Get DDoS statistics
   */
  getDDoSStats(): {
    totalDetections: number;
    blockedIps: string[];
    criticalDetections: number;
    highDetections: number;
  } {
    const detections = Array.from(this.ddosDetections.values());
    const blocked = detections.filter((d) => d.blocked);
    const critical = detections.filter((d) => d.severity === "critical");
    const high = detections.filter((d) => d.severity === "high");

    return {
      totalDetections: detections.length,
      blockedIps: [...new Set(blocked.map((d) => d.sourceIp))],
      criticalDetections: critical.length,
      highDetections: high.length,
    };
  }

  /**
   * Get quota alerts
   */
  getQuotaAlerts(userId?: string, acknowledged?: boolean): QuotaAlert[] {
    let alerts = Array.from(this.quotaAlerts.values());

    if (userId) {
      alerts = alerts.filter((a) => a.userId === userId);
    }
    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === acknowledged);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge quota alert
   */
  acknowledgeQuotaAlert(alertId: string): void {
    const alert = this.quotaAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Set rate limits
   */
  setRateLimits(userLimit: number, ipLimit: number, aiLimit: number): void {
    this.userRateLimit = userLimit;
    this.ipRateLimit = ipLimit;
    this.aiRateLimit = aiLimit;
  }

  /**
   * Set DDoS threshold
   */
  setDDoSThreshold(threshold: number): void {
    this.ddosThreshold = threshold;
  }

  /**
   * Is IP blocked
   */
  isIpBlocked(ip: string): boolean {
    const detections = Array.from(this.ddosDetections.values()).filter(
      (d) => d.sourceIp === ip && d.blocked
    );
    return detections.length > 0;
  }

  /**
   * Unblock IP
   */
  unblockIp(ip: string): void {
    for (const [, detection] of this.ddosDetections) {
      if (detection.sourceIp === ip) {
        detection.blocked = false;
      }
    }
  }
}

// Global singleton instance
export const rateLimitingSystem = new RateLimitingSystem();
