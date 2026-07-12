/**
 * Monitoring & Logging Infrastructure
 * Essential for tracking system health and debugging issues at scale
 */

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  message?: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number;
  private logLevel: string;

  constructor(maxLogs: number = 100000, logLevel: string = 'info') {
    this.maxLogs = maxLogs;
    this.logLevel = logLevel;
  }

  /**
   * Log message
   */
  private log(level: string, service: string, message: string, metadata?: Record<string, any>, stackTrace?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: level as any,
      service,
      message,
      metadata,
      stackTrace,
    };

    this.logs.push(entry);
    console.log(`[${level.toUpperCase()}] [${service}] ${message}`, metadata || '');

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  debug(service: string, message: string, metadata?: Record<string, any>): void {
    this.log('debug', service, message, metadata);
  }

  info(service: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', service, message, metadata);
  }

  warn(service: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', service, message, metadata);
  }

  error(service: string, message: string, metadata?: Record<string, any>, stackTrace?: string): void {
    this.log('error', service, message, metadata, stackTrace);
  }

  fatal(service: string, message: string, metadata?: Record<string, any>, stackTrace?: string): void {
    this.log('fatal', service, message, metadata, stackTrace);
  }

  /**
   * Get logs
   */
  getLogs(filter?: { level?: string; service?: string; limit?: number }): LogEntry[] {
    let filtered = this.logs;

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter?.service) {
      filtered = filtered.filter(log => log.service === filter.service);
    }

    const limit = filter?.limit || 100;
    return filtered.slice(-limit);
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = [];
  }
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private maxMetrics: number;
  private aggregates: Map<string, { sum: number; count: number; min: number; max: number }> = new Map();

  constructor(maxMetrics: number = 1000000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);

    // Update aggregate
    if (!this.aggregates.has(name)) {
      this.aggregates.set(name, { sum: 0, count: 0, min: value, max: value });
    }

    const agg = this.aggregates.get(name)!;
    agg.sum += value;
    agg.count++;
    agg.min = Math.min(agg.min, value);
    agg.max = Math.max(agg.max, value);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(name?: string, limit: number = 100): Metric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get aggregates
   */
  getAggregates(name?: string) {
    if (name) {
      return this.aggregates.get(name);
    }

    return Object.fromEntries(this.aggregates);
  }

  /**
   * Get average
   */
  getAverage(name: string): number {
    const agg = this.aggregates.get(name);
    return agg ? agg.sum / agg.count : 0;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
    this.aggregates.clear();
  }
}

export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register health check
   */
  registerCheck(
    service: string,
    checkFn: () => Promise<boolean>,
    intervalSeconds: number = 30
  ): void {
    const runCheck = async () => {
      const startTime = Date.now();

      try {
        const isHealthy = await checkFn();
        const responseTime = Date.now() - startTime;

        this.checks.set(service, {
          service,
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          message: isHealthy ? 'OK' : 'Check failed',
        });
      } catch (error: any) {
        const responseTime = Date.now() - startTime;

        this.checks.set(service, {
          service,
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          message: error.message,
        });
      }
    };

    // Run immediately
    runCheck();

    // Schedule recurring checks
    const interval = setInterval(runCheck, intervalSeconds * 1000) as unknown as NodeJS.Timeout;
    this.checkIntervals.set(service, interval);
  }

  /**
   * Get health status
   */
  getStatus(service?: string): HealthCheck | HealthCheck[] | null {
    if (service) {
      return this.checks.get(service) || null;
    }

    return Array.from(this.checks.values());
  }

  /**
   * Get overall system health
   */
  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const checks = Array.from(this.checks.values());

    if (checks.length === 0) return 'healthy';

    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Stop health checks
   */
  stopCheck(service: string): boolean {
    const interval = this.checkIntervals.get(service);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(service);
      return true;
    }
    return false;
  }

  /**
   * Stop all health checks
   */
  stopAll(): number {
    let count = 0;
    for (const [service] of this.checkIntervals.entries()) {
      if (this.stopCheck(service)) count++;
    }
    return count;
  }
}

/**
 * Centralized Monitoring System
 */
export class MonitoringSystem {
  logger: Logger;
  metrics: MetricsCollector;
  health: HealthMonitor;

  constructor() {
    this.logger = new Logger();
    this.metrics = new MetricsCollector();
    this.health = new HealthMonitor();
  }

  /**
   * Get system status report
   */
  getStatusReport() {
    return {
      timestamp: new Date(),
      health: this.health.getOverallHealth(),
      services: this.health.getStatus(),
      metrics: this.metrics.getAggregates(),
      recentLogs: this.logger.getLogs({ limit: 50 }),
    };
  }
}
