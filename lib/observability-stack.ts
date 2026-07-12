/**
 * Observability Stack Service
 * Prometheus metrics, Grafana dashboards, and distributed tracing
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface Trace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'error';
  tags: Record<string, any>;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment counter
   */
  incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.metrics.push({
      name,
      value: current + value,
      timestamp: new Date(),
      labels,
    });
  }

  /**
   * Set gauge
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.gauges.set(key, value);

    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      labels,
    });
  }

  /**
   * Record histogram
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * Get metrics
   */
  getMetrics(limit: number = 1000) {
    return this.metrics.slice(-limit);
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string) {
    const values = Array.from(this.histograms.values()).flat();
    if (values.length === 0) return null;

    const sorted = values.sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

export class DistributedTracer {
  private traces: Map<string, Trace[]> = new Map();
  private activeSpans: Map<string, Trace> = new Map();

  /**
   * Start trace
   */
  startTrace(traceId: string, operation: string): string {
    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const trace: Trace = {
      traceId,
      spanId,
      operation,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status: 'success',
      tags: {},
    };

    this.activeSpans.set(spanId, trace);

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }

    return spanId;
  }

  /**
   * End trace
   */
  endTrace(spanId: string, status: 'success' | 'error' = 'success'): void {
    const trace = this.activeSpans.get(spanId);
    if (!trace) return;

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.status = status;

    const traces = this.traces.get(trace.traceId) || [];
    traces.push(trace);
    this.traces.set(trace.traceId, traces);

    this.activeSpans.delete(spanId);
  }

  /**
   * Add tag to span
   */
  addTag(spanId: string, key: string, value: any): void {
    const trace = this.activeSpans.get(spanId);
    if (trace) {
      trace.tags[key] = value;
    }
  }

  /**
   * Get trace
   */
  getTrace(traceId: string) {
    return this.traces.get(traceId) || [];
  }

  /**
   * Get trace statistics
   */
  getTraceStats(traceId: string) {
    const traces = this.traces.get(traceId) || [];
    if (traces.length === 0) return null;

    const durations = traces.map(t => t.duration);
    const sorted = durations.sort((a, b) => a - b);

    return {
      spanCount: traces.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      errorCount: traces.filter(t => t.status === 'error').length,
    };
  }
}

export class HealthChecker {
  private checks: Map<string, { status: boolean; lastCheck: Date; message: string }> = new Map();

  /**
   * Register health check
   */
  registerCheck(name: string, check: () => Promise<boolean>, message: string = ''): void {
    this.checks.set(name, {
      status: true,
      lastCheck: new Date(),
      message,
    });
  }

  /**
   * Run health checks
   */
  async runChecks(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const [name, check] of this.checks.entries()) {
      try {
        const status = await (check as any)();
        results[name] = {
          status,
          lastCheck: new Date(),
          message: check.message || '',
        };
      } catch (error) {
        results[name] = {
          status: false,
          lastCheck: new Date(),
          message: (error as Error).message,
        };
      }
    }

    return results;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const checks = Array.from(this.checks.entries());
    const healthy = checks.filter(([_, c]) => c.status).length;
    const total = checks.length;

    return {
      healthy,
      total,
      healthPercent: (healthy / total) * 100,
      checks: Object.fromEntries(checks),
    };
  }
}

export class AlertManager {
  private alerts: any[] = [];
  private rules: Map<string, { threshold: number; condition: string }> = new Map();

  /**
   * Add alert rule
   */
  addRule(name: string, threshold: number, condition: string): void {
    this.rules.set(name, { threshold, condition });
  }

  /**
   * Check metrics against rules
   */
  checkMetrics(metricName: string, value: number): void {
    for (const [ruleName, rule] of this.rules.entries()) {
      let triggered = false;

      if (rule.condition === 'greater_than' && value > rule.threshold) {
        triggered = true;
      } else if (rule.condition === 'less_than' && value < rule.threshold) {
        triggered = true;
      }

      if (triggered) {
        this.createAlert(ruleName, metricName, value, rule.threshold);
      }
    }
  }

  /**
   * Create alert
   */
  private createAlert(ruleName: string, metric: string, value: number, threshold: number): void {
    this.alerts.push({
      id: `alert-${Date.now()}`,
      ruleName,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      severity: value > threshold * 2 ? 'critical' : 'warning',
    });
  }

  /**
   * Get alerts
   */
  getAlerts(limit: number = 100) {
    return this.alerts.slice(-limit);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts() {
    return this.alerts.filter(a => a.severity === 'critical');
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }
}

export class DashboardBuilder {
  private dashboards: Map<string, any> = new Map();

  /**
   * Create dashboard
   */
  createDashboard(name: string, panels: any[]): void {
    this.dashboards.set(name, {
      name,
      panels,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Add panel to dashboard
   */
  addPanel(dashboardName: string, panel: any): boolean {
    const dashboard = this.dashboards.get(dashboardName);
    if (!dashboard) return false;

    dashboard.panels.push(panel);
    dashboard.updatedAt = new Date();
    return true;
  }

  /**
   * Get dashboard
   */
  getDashboard(name: string) {
    return this.dashboards.get(name);
  }

  /**
   * Get all dashboards
   */
  getAllDashboards() {
    return Array.from(this.dashboards.values());
  }
}
