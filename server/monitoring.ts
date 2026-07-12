/**
 * PHASE 6: MONITORING, LOGGING & ALERTING
 * 
 * Enterprise-grade monitoring stack for real-time visibility into
 * system health, performance, and errors.
 * 
 * Features:
 * - Real-time metrics collection
 * - Error tracking and reporting
 * - Performance monitoring
 * - Custom alerts and thresholds
 * - Audit logging
 */

import { redis } from './cache';

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  condition: string;
  threshold: number;
  triggered: boolean;
  triggeredAt?: number;
  resolvedAt?: number;
}

// Metrics collection
const metrics: Metric[] = [];

// Alert thresholds
export const ALERT_THRESHOLDS = {
  DATABASE_CPU: { threshold: 80, severity: 'critical' as const },
  DATABASE_MEMORY: { threshold: 90, severity: 'critical' as const },
  API_RESPONSE_TIME_P95: { threshold: 1000, severity: 'warning' as const }, // 1 second
  ERROR_RATE: { threshold: 1, severity: 'critical' as const }, // 1%
  REDIS_MEMORY: { threshold: 90, severity: 'critical' as const },
  DISK_SPACE: { threshold: 10, severity: 'critical' as const }, // 10% remaining
  QUEUE_DEPTH: { threshold: 10000, severity: 'warning' as const },
  CACHE_HIT_RATE: { threshold: 50, severity: 'warning' as const }, // < 50%
};

/**
 * Record a metric
 */
export function recordMetric(
  name: string,
  value: number,
  unit: string,
  tags?: Record<string, string>
): void {
  const metric: Metric = {
    name,
    value,
    unit,
    timestamp: Date.now(),
    tags,
  };

  metrics.push(metric);

  // Keep only last 1000 metrics in memory
  if (metrics.length > 1000) {
    metrics.shift();
  }

  // Store in Redis for persistence
  redis.zadd(
    `metrics:${name}`,
    metric.timestamp,
    JSON.stringify(metric)
  ).catch(err => console.error('Metric storage error:', err));
}

/**
 * Record API latency
 */
export function recordAPILatency(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
): void {
  recordMetric('api_latency', duration, 'ms', {
    endpoint,
    method,
    status: statusCode.toString(),
  });

  // Track percentiles
  if (duration > 1000) {
    recordMetric('api_latency_p95', duration, 'ms', { endpoint });
  }
}

/**
 * Record database query
 */
export function recordDatabaseQuery(
  query: string,
  duration: number,
  success: boolean
): void {
  recordMetric('db_query_duration', duration, 'ms', {
    success: success.toString(),
  });

  if (!success) {
    recordMetric('db_query_errors', 1, 'count');
  }
}

/**
 * Record error
 */
export function recordError(
  errorType: string,
  message: string,
  stack?: string
): void {
  recordMetric('errors', 1, 'count', { type: errorType });

  // Store error details
  const errorLog = {
    type: errorType,
    message,
    stack,
    timestamp: Date.now(),
  };

  redis.zadd(
    'errors',
    Date.now(),
    JSON.stringify(errorLog)
  ).catch(err => console.error('Error logging error:', err));
}

/**
 * Record cache operation
 */
export function recordCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  duration?: number
): void {
  recordMetric(`cache_${operation}`, 1, 'count', { key });

  if (duration) {
    recordMetric('cache_operation_duration', duration, 'ms', { operation });
  }
}

/**
 * Get metrics for time range
 */
export async function getMetrics(
  name: string,
  startTime: number,
  endTime: number
): Promise<Metric[]> {
  try {
    const results = await redis.zrangebyscore(
      `metrics:${name}`,
      startTime,
      endTime
    );

    return results.map(r => JSON.parse(r) as Metric);
  } catch (error) {
    console.error('Get metrics error:', error);
    return [];
  }
}

/**
 * Get current system health
 */
export async function getSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  checks: Record<string, boolean>;
  alerts: Alert[];
}> {
  try {
    const checks: Record<string, boolean> = {};
    const alerts: Alert[] = [];

    // Check Redis connection
    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
      alerts.push({
        id: 'redis_down',
        name: 'Redis Connection Failed',
        severity: 'critical',
        condition: 'redis.ping() failed',
        threshold: 0,
        triggered: true,
        triggeredAt: Date.now(),
      });
    }

    // Check database (would need actual DB connection check)
    checks.database = true; // Placeholder

    // Check API responsiveness
    checks.api = true; // Placeholder

    // Determine overall status
    const allHealthy = Object.values(checks).every(v => v);
    const status = allHealthy ? 'healthy' : alerts.length > 0 ? 'critical' : 'degraded';

    return {
      status,
      checks,
      alerts,
    };
  } catch (error) {
    console.error('Get system health error:', error);
    return {
      status: 'critical',
      checks: {},
      alerts: [],
    };
  }
}

/**
 * Check alert thresholds
 */
export async function checkAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Get recent metrics
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Check error rate
    const errorMetrics = await getMetrics('errors', fiveMinutesAgo, now);
    const totalMetrics = await getMetrics('api_latency', fiveMinutesAgo, now);

    if (totalMetrics.length > 0) {
      const errorRate = (errorMetrics.length / totalMetrics.length) * 100;
      if (errorRate > ALERT_THRESHOLDS.ERROR_RATE.threshold) {
        alerts.push({
          id: 'high_error_rate',
          name: 'High Error Rate',
          severity: 'critical',
          condition: `error_rate > ${ALERT_THRESHOLDS.ERROR_RATE.threshold}%`,
          threshold: ALERT_THRESHOLDS.ERROR_RATE.threshold,
          triggered: true,
          triggeredAt: now,
        });
      }
    }

    // Check API response time
    const latencyMetrics = await getMetrics('api_latency_p95', fiveMinutesAgo, now);
    if (latencyMetrics.length > 0) {
      const avgLatency = latencyMetrics.reduce((sum, m) => sum + m.value, 0) / latencyMetrics.length;
      if (avgLatency > ALERT_THRESHOLDS.API_RESPONSE_TIME_P95.threshold) {
        alerts.push({
          id: 'high_latency',
          name: 'High API Latency',
          severity: 'warning',
          condition: `api_latency_p95 > ${ALERT_THRESHOLDS.API_RESPONSE_TIME_P95.threshold}ms`,
          threshold: ALERT_THRESHOLDS.API_RESPONSE_TIME_P95.threshold,
          triggered: true,
          triggeredAt: now,
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Check alerts error:', error);
    return [];
  }
}

/**
 * Get audit logs
 */
export async function getAuditLogs(
  limit = 100,
  offset = 0
): Promise<Array<{
  timestamp: number;
  action: string;
  userId?: number;
  details: Record<string, any>;
}>> {
  try {
    const logs = await redis.zrevrange('audit_logs', offset, offset + limit - 1);
    return logs.map(log => JSON.parse(log));
  } catch (error) {
    console.error('Get audit logs error:', error);
    return [];
  }
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  action: string,
  userId: number | undefined,
  details: Record<string, any>
): Promise<void> {
  try {
    const event = {
      timestamp: Date.now(),
      action,
      userId,
      details,
    };

    await redis.zadd('audit_logs', Date.now(), JSON.stringify(event));
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/**
 * Get performance dashboard data
 */
export async function getDashboardData(): Promise<{
  uptime: number;
  requestsPerSecond: number;
  errorRate: number;
  avgLatency: number;
  cacheHitRate: number;
  activeConnections: number;
  queueDepth: number;
}> {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const [
      apiMetrics,
      errorMetrics,
      cacheHits,
      cacheMisses,
    ] = await Promise.all([
      getMetrics('api_latency', oneHourAgo, now),
      getMetrics('errors', oneHourAgo, now),
      getMetrics('cache_hit', oneHourAgo, now),
      getMetrics('cache_miss', oneHourAgo, now),
    ]);

    const totalRequests = apiMetrics.length;
    const rps = totalRequests / 3600; // per second
    const errorRate = totalRequests > 0 ? (errorMetrics.length / totalRequests) * 100 : 0;
    const avgLatency = totalRequests > 0 ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / totalRequests : 0;
    const cacheHitRate = (cacheHits.length + cacheMisses.length) > 0 ? (cacheHits.length / (cacheHits.length + cacheMisses.length)) * 100 : 0;

    return {
      uptime: process.uptime(),
      requestsPerSecond: rps,
      errorRate,
      avgLatency,
      cacheHitRate,
      activeConnections: 0, // Would need actual connection tracking
      queueDepth: 0, // Would need actual queue tracking
    };
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return {
      uptime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      avgLatency: 0,
      cacheHitRate: 0,
      activeConnections: 0,
      queueDepth: 0,
    };
  }
}
