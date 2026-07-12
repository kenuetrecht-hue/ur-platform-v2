import { z } from "zod";

/**
 * Advanced Error Logging & Monitoring System
 * Phase 1 Critical Infrastructure
 *
 * Catches bugs before users see them, traces issues to root cause
 * - Structured JSON logging with context and traceability
 * - Error aggregation and deduplication
 * - Stack trace analysis
 * - Performance monitoring
 * - Real-time alerts
 */

// Log Levels
export const LogLevelSchema = z.enum(["debug", "info", "warn", "error", "fatal"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

// Log Entry
export const LogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  level: LogLevelSchema,
  message: z.string(),
  context: z.record(z.string(), z.any()).optional(),
  stackTrace: z.string().optional(),
  userId: z.string().optional(),
  requestId: z.string().optional(),
  aiId: z.string().optional(),
  service: z.string(),
  environment: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  resolved: z.boolean().default(false),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

// Error Category
export const ErrorCategorySchema = z.enum([
  "validation_error",
  "database_error",
  "api_error",
  "auth_error",
  "permission_error",
  "not_found_error",
  "timeout_error",
  "rate_limit_error",
  "internal_error",
  "external_service_error",
  "unknown_error",
]);

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

// Error Aggregation
export const AggregatedErrorSchema = z.object({
  id: z.string(),
  category: ErrorCategorySchema,
  message: z.string(),
  stackTraceHash: z.string(),
  occurrences: z.number(),
  firstSeen: z.date(),
  lastSeen: z.date(),
  affectedUsers: z.array(z.string()),
  affectedAIs: z.array(z.string()),
  severity: z.enum(["low", "medium", "high", "critical"]),
  resolved: z.boolean(),
  resolution: z.string().optional(),
});

export type AggregatedError = z.infer<typeof AggregatedErrorSchema>;

// Performance Metric
export const PerformanceMetricSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  endpoint: z.string(),
  method: z.string(),
  responseTime: z.number(), // milliseconds
  statusCode: z.number(),
  userId: z.string().optional(),
  aiId: z.string().optional(),
  memoryUsed: z.number().optional(), // MB
  cpuUsage: z.number().optional(), // percentage
  dbQueryTime: z.number().optional(), // milliseconds
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

// Alert Configuration
export const AlertConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  condition: z.string(), // e.g., "error_rate > 5%", "response_time > 1000ms"
  threshold: z.number(),
  window: z.number(), // time window in seconds
  enabled: z.boolean(),
  channels: z.array(z.enum(["email", "slack", "pagerduty", "sms"])),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export type AlertConfig = z.infer<typeof AlertConfigSchema>;

// Alert Event
export const AlertEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  alertConfigId: z.string(),
  message: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  acknowledged: z.boolean(),
  resolvedAt: z.date().optional(),
});

export type AlertEvent = z.infer<typeof AlertEventSchema>;

/**
 * Logging System Class
 */
export class LoggingSystem {
  private logs: Map<string, LogEntry> = new Map();
  private aggregatedErrors: Map<string, AggregatedError> = new Map();
  private metrics: Map<string, PerformanceMetric> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();
  private alertEvents: Map<string, AlertEvent> = new Map();

  /**
   * Log a message
   */
  log(
    level: LogLevel,
    message: string,
    options?: {
      context?: Record<string, any>;
      stackTrace?: string;
      userId?: string;
      requestId?: string;
      aiId?: string;
      service?: string;
    }
  ): LogEntry {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      context: options?.context,
      stackTrace: options?.stackTrace,
      userId: options?.userId,
      requestId: options?.requestId,
      aiId: options?.aiId,
      service: options?.service || "unknown",
      environment: process.env.NODE_ENV || "development",
      severity: this.calculateSeverity(level, options?.context),
      resolved: false,
    };

    this.logs.set(entry.id, entry);

    // Auto-aggregate errors
    if (level === "error" || level === "fatal") {
      this.aggregateError(entry);
    }

    // Check alert conditions
    this.checkAlertConditions(entry);

    return entry;
  }

  /**
   * Log error with stack trace
   */
  logError(error: Error, context?: Record<string, any>, options?: { userId?: string; requestId?: string; aiId?: string }): LogEntry {
    return this.log("error", error.message, {
      stackTrace: error.stack,
      context: {
        ...context,
        errorName: error.name,
      },
      ...options,
    });
  }

  /**
   * Log fatal error
   */
  logFatal(error: Error, context?: Record<string, any>): LogEntry {
    return this.log("fatal", error.message, {
      stackTrace: error.stack,
      context: {
        ...context,
        errorName: error.name,
      },
    });
  }

  /**
   * Calculate severity based on level and context
   */
  private calculateSeverity(level: LogLevel, context?: Record<string, any>): "low" | "medium" | "high" | "critical" {
    if (level === "fatal") return "critical";
    if (level === "error") {
      if (context?.affectsMultipleUsers) return "high";
      if (context?.dataLoss) return "critical";
      return "medium";
    }
    if (level === "warn") return "low";
    return "low";
  }

  /**
   * Aggregate errors for deduplication
   */
  private aggregateError(entry: LogEntry): void {
    const stackTraceHash = this.hashStackTrace(entry.stackTrace || "");
    const key = `${entry.level}_${entry.message}_${stackTraceHash}`;

    const existing = this.aggregatedErrors.get(key);
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = new Date();
      if (entry.userId && !existing.affectedUsers.includes(entry.userId)) {
        existing.affectedUsers.push(entry.userId);
      }
      if (entry.aiId && !existing.affectedAIs.includes(entry.aiId)) {
        existing.affectedAIs.push(entry.aiId);
      }
    } else {
      const aggregated: AggregatedError = {
        id: `agg_${Date.now()}`,
        category: this.categorizeError(entry.message),
        message: entry.message,
        stackTraceHash,
        occurrences: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        affectedUsers: entry.userId ? [entry.userId] : [],
        affectedAIs: entry.aiId ? [entry.aiId] : [],
        severity: entry.severity,
        resolved: false,
      };
      this.aggregatedErrors.set(key, aggregated);
    }
  }

  /**
   * Hash stack trace for deduplication
   */
  private hashStackTrace(stackTrace: string): string {
    let hash = 0;
    for (let i = 0; i < stackTrace.length; i++) {
      const char = stackTrace.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Categorize error
   */
  private categorizeError(message: string): ErrorCategory {
    if (message.includes("validation") || message.includes("invalid")) return "validation_error";
    if (message.includes("database") || message.includes("query")) return "database_error";
    if (message.includes("api") || message.includes("request")) return "api_error";
    if (message.includes("auth") || message.includes("unauthorized")) return "auth_error";
    if (message.includes("permission") || message.includes("forbidden")) return "permission_error";
    if (message.includes("not found")) return "not_found_error";
    if (message.includes("timeout")) return "timeout_error";
    if (message.includes("rate limit")) return "rate_limit_error";
    if (message.includes("external") || message.includes("service")) return "external_service_error";
    return "internal_error";
  }

  /**
   * Record performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, "id">): PerformanceMetric {
    const entry: PerformanceMetric = {
      ...metric,
      id: `metric_${Date.now()}`,
    };
    this.metrics.set(entry.id, entry);
    return entry;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(endpoint?: string): {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    requestCount: number;
  } {
    const relevantMetrics = Array.from(this.metrics.values()).filter(
      (m) => !endpoint || m.endpoint === endpoint
    );

    if (relevantMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
      };
    }

    const responseTimes = relevantMetrics
      .map((m) => m.responseTime)
      .sort((a, b) => a - b);
    const errorCount = relevantMetrics.filter((m) => m.statusCode >= 400).length;

    return {
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      errorRate: errorCount / relevantMetrics.length,
      requestCount: relevantMetrics.length,
    };
  }

  /**
   * Register alert configuration
   */
  registerAlert(config: Omit<AlertConfig, "id">): AlertConfig {
    const alert: AlertConfig = {
      ...config,
      id: `alert_${Date.now()}`,
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(entry: LogEntry): void {
    for (const [, alert] of this.alerts) {
      if (!alert.enabled) continue;

      let shouldAlert = false;

      // Check various conditions
      if (alert.condition.includes("error_rate")) {
        const stats = this.getPerformanceStats();
        const threshold = alert.threshold / 100;
        shouldAlert = stats.errorRate > threshold;
      } else if (alert.condition.includes("response_time")) {
        const stats = this.getPerformanceStats();
        shouldAlert = stats.avgResponseTime > alert.threshold;
      } else if (alert.condition.includes("error_count")) {
        const errorCount = Array.from(this.aggregatedErrors.values()).filter(
          (e) => !e.resolved
        ).length;
        shouldAlert = errorCount > alert.threshold;
      }

      if (shouldAlert) {
        this.createAlert(alert, entry);
      }
    }
  }

  /**
   * Create alert event
   */
  private createAlert(config: AlertConfig, trigger: LogEntry): void {
    const event: AlertEvent = {
      id: `alert_event_${Date.now()}`,
      timestamp: new Date(),
      alertConfigId: config.id,
      message: `Alert: ${config.name} triggered by ${trigger.message}`,
      severity: config.severity,
      acknowledged: false,
    };
    this.alertEvents.set(event.id, event);

    // In production, send to alert channels (email, Slack, PagerDuty, SMS)
    console.log(`🚨 ALERT: ${event.message}`);
  }

  /**
   * Get all errors
   */
  getAggregatedErrors(filter?: { resolved?: boolean; severity?: string }): AggregatedError[] {
    return Array.from(this.aggregatedErrors.values()).filter((error) => {
      if (filter?.resolved !== undefined && error.resolved !== filter.resolved) return false;
      if (filter?.severity && error.severity !== filter.severity) return false;
      return true;
    });
  }

  /**
   * Resolve error
   */
  resolveError(errorId: string, resolution: string): void {
    const error = Array.from(this.aggregatedErrors.values()).find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;
    }
  }

  /**
   * Get logs
   */
  getLogs(filter?: { level?: LogLevel; userId?: string; aiId?: string; limit?: number }): LogEntry[] {
    let logs = Array.from(this.logs.values());

    if (filter?.level) {
      logs = logs.filter((l) => l.level === filter.level);
    }
    if (filter?.userId) {
      logs = logs.filter((l) => l.userId === filter.userId);
    }
    if (filter?.aiId) {
      logs = logs.filter((l) => l.aiId === filter.aiId);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  /**
   * Get alert events
   */
  getAlertEvents(filter?: { acknowledged?: boolean; severity?: string }): AlertEvent[] {
    return Array.from(this.alertEvents.values()).filter((event) => {
      if (filter?.acknowledged !== undefined && event.acknowledged !== filter.acknowledged)
        return false;
      if (filter?.severity && event.severity !== filter.severity) return false;
      return true;
    });
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alertEvents.get(alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
}

// Global singleton instance
export const loggingSystem = new LoggingSystem();
