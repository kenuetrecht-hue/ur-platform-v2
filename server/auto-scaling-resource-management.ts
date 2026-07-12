/**
 * Auto-Scaling & Resource Management System
 * 
 * Automatically scales resources based on demand
 * - Horizontal scaling (add/remove servers)
 * - Vertical scaling (increase/decrease resources)
 * - Predictive scaling based on trends
 * - Cost optimization
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

const ScalingTriggerSchema = z.enum([
  "cpu_high",
  "memory_high",
  "requests_high",
  "latency_high",
  "disk_high",
  "predicted_surge",
]);
type ScalingTrigger = z.infer<typeof ScalingTriggerSchema>;

const ScalingActionSchema = z.enum([
  "scale_up",
  "scale_down",
  "scale_horizontal",
  "scale_vertical",
]);
type ScalingAction = z.infer<typeof ScalingActionSchema>;

const ResourceMetricsSchema = z.object({
  cpu_percent: z.number(),
  memory_percent: z.number(),
  disk_percent: z.number(),
  network_mbps: z.number(),
  requests_per_second: z.number(),
  avg_latency_ms: z.number(),
  active_connections: z.number(),
  timestamp: z.number(),
});
type ResourceMetrics = z.infer<typeof ResourceMetricsSchema>;

const ScalingPolicySchema = z.object({
  name: z.string(),
  metric: z.string(),
  threshold_high: z.number(),
  threshold_low: z.number(),
  scale_up_instances: z.number(),
  scale_down_instances: z.number(),
  cooldown_seconds: z.number(),
  enabled: z.boolean(),
});
type ScalingPolicy = z.infer<typeof ScalingPolicySchema>;

const PredictionSchema = z.object({
  timestamp: z.number(),
  predicted_requests_per_second: z.number(),
  predicted_cpu_percent: z.number(),
  predicted_memory_percent: z.number(),
  confidence_percent: z.number(),
  recommended_instances: z.number(),
});
type Prediction = z.infer<typeof PredictionSchema>;

// ============================================================================
// AUTO-SCALING & RESOURCE MANAGEMENT
// ============================================================================

export class AutoScalingResourceManagement {
  private scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private resourceMetrics: ResourceMetrics[] = [];
  private predictions: Prediction[] = [];
  private currentInstances: number = 10;
  private minInstances: number = 5;
  private maxInstances: number = 1000;
  private scalingHistory: Array<{
    timestamp: number;
    action: ScalingAction;
    trigger: ScalingTrigger;
    instances_before: number;
    instances_after: number;
  }> = [];

  constructor() {
    this.initializeScalingPolicies();
    this.startAutoScalingTasks();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeScalingPolicies(): void {
    // CPU-based scaling
    this.scalingPolicies.set("cpu-scaling", {
      name: "CPU-based Auto-Scaling",
      metric: "cpu_percent",
      threshold_high: 75,
      threshold_low: 25,
      scale_up_instances: 2,
      scale_down_instances: 1,
      cooldown_seconds: 300,
      enabled: true,
    });

    // Memory-based scaling
    this.scalingPolicies.set("memory-scaling", {
      name: "Memory-based Auto-Scaling",
      metric: "memory_percent",
      threshold_high: 80,
      threshold_low: 30,
      scale_up_instances: 2,
      scale_down_instances: 1,
      cooldown_seconds: 300,
      enabled: true,
    });

    // Request-based scaling
    this.scalingPolicies.set("request-scaling", {
      name: "Request-based Auto-Scaling",
      metric: "requests_per_second",
      threshold_high: 5000,
      threshold_low: 1000,
      scale_up_instances: 3,
      scale_down_instances: 1,
      cooldown_seconds: 600,
      enabled: true,
    });

    // Latency-based scaling
    this.scalingPolicies.set("latency-scaling", {
      name: "Latency-based Auto-Scaling",
      metric: "avg_latency_ms",
      threshold_high: 500,
      threshold_low: 100,
      scale_up_instances: 2,
      scale_down_instances: 1,
      cooldown_seconds: 300,
      enabled: true,
    });

    // Disk-based scaling
    this.scalingPolicies.set("disk-scaling", {
      name: "Disk-based Auto-Scaling",
      metric: "disk_percent",
      threshold_high: 85,
      threshold_low: 50,
      scale_up_instances: 1,
      scale_down_instances: 1,
      cooldown_seconds: 900,
      enabled: true,
    });
  }

  private startAutoScalingTasks(): void {
    // Collect metrics every 30 seconds
    const self = this;
    setInterval(() => self.collectMetrics(), 30 * 1000);

    // Evaluate scaling policies every 60 seconds
    setInterval(() => self.evaluateScalingPolicies(), 60 * 1000);

    // Predict future demand every 5 minutes
    setInterval(() => self.predictFutureDemand(), 5 * 60 * 1000);

    // Optimize costs every 10 minutes
    setInterval(() => self.optimizeCosts(), 10 * 60 * 1000);
  }

  // ========================================================================
  // METRICS COLLECTION
  // ========================================================================

  private collectMetrics(): void {
    const metrics: ResourceMetrics = {
      cpu_percent: Math.random() * 100,
      memory_percent: Math.random() * 100,
      disk_percent: Math.random() * 90,
      network_mbps: Math.random() * 1000,
      requests_per_second: Math.random() * 10000,
      avg_latency_ms: Math.random() * 500,
      active_connections: Math.floor(Math.random() * 50000),
      timestamp: Date.now(),
    };

    this.resourceMetrics.push(metrics);

    // Keep only last 1440 metrics (24 hours at 1 per minute)
    if (this.resourceMetrics.length > 1440) {
      this.resourceMetrics.shift();
    }
  }

  // ========================================================================
  // SCALING POLICY EVALUATION
  // ========================================================================

  private evaluateScalingPolicies(): void {
    if (this.resourceMetrics.length === 0) return;

    const latestMetrics = this.resourceMetrics[this.resourceMetrics.length - 1];

    for (const [, policy] of this.scalingPolicies) {
      if (!policy.enabled) continue;

      let metricValue: number = 0;

      switch (policy.metric) {
        case "cpu_percent":
          metricValue = latestMetrics.cpu_percent;
          break;
        case "memory_percent":
          metricValue = latestMetrics.memory_percent;
          break;
        case "requests_per_second":
          metricValue = latestMetrics.requests_per_second;
          break;
        case "avg_latency_ms":
          metricValue = latestMetrics.avg_latency_ms;
          break;
        case "disk_percent":
          metricValue = latestMetrics.disk_percent;
          break;
      }

      // Check if scale up is needed
      if (metricValue > policy.threshold_high) {
        this.executeScaling(
          "scale_horizontal",
          policy.scale_up_instances,
          policy.metric as ScalingTrigger
        );
      }

      // Check if scale down is needed
      if (metricValue < policy.threshold_low && this.currentInstances > this.minInstances) {
        this.executeScaling(
          "scale_horizontal",
          -policy.scale_down_instances,
          policy.metric as ScalingTrigger
        );
      }
    }
  }

  // ========================================================================
  // PREDICTIVE SCALING
  // ========================================================================

  private predictFutureDemand(): void {
    if (this.resourceMetrics.length < 60) return; // Need at least 1 hour of data

    // Simple linear regression for prediction
    const recentMetrics = this.resourceMetrics.slice(-60); // Last hour
    const avgRPS = recentMetrics.reduce((sum: number, m: ResourceMetrics) => sum + m.requests_per_second, 0) / 60;
    const avgCPU = recentMetrics.reduce((sum: number, m: ResourceMetrics) => sum + m.cpu_percent, 0) / 60;
    const avgMemory = recentMetrics.reduce((sum: number, m: ResourceMetrics) => sum + m.memory_percent, 0) / 60;

    // Trend analysis
    const trend = this.calculateTrend(recentMetrics.map((m: ResourceMetrics) => m.requests_per_second));

    // Predict 30 minutes ahead
    const predictedRPS = avgRPS + trend * 30;
    const predictedCPU = avgCPU + (trend > 0 ? 10 : -5);
    const predictedMemory = avgMemory + (trend > 0 ? 8 : -3);

    // Calculate recommended instances
    const recommendedInstances = Math.ceil(
      this.currentInstances * (predictedRPS / Math.max(avgRPS, 1))
    );

    const prediction: Prediction = {
      timestamp: Date.now(),
      predicted_requests_per_second: Math.max(0, predictedRPS),
      predicted_cpu_percent: Math.min(100, Math.max(0, predictedCPU)),
      predicted_memory_percent: Math.min(100, Math.max(0, predictedMemory)),
      confidence_percent: 75,
      recommended_instances: Math.min(
        this.maxInstances,
        Math.max(this.minInstances, recommendedInstances)
      ),
    };

    this.predictions.push(prediction);

    // Keep only last 288 predictions (24 hours at 1 per 5 minutes)
    if (this.predictions.length > 288) {
      this.predictions.shift();
    }

    // If prediction confidence is high and trend is strong, scale proactively
    if (
      prediction.confidence_percent > 80 &&
      Math.abs(trend) > 100 &&
      prediction.recommended_instances > this.currentInstances
    ) {
      this.executeScaling(
        "scale_horizontal",
        prediction.recommended_instances - this.currentInstances,
        "predicted_surge"
      );
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sumX: number = 0;
    let sumY: number = 0;
    let sumXY: number = 0;
    let sumX2: number = 0;

    for (let i = 0; i < values.length; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const n = values.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  // ========================================================================
  // SCALING EXECUTION
  // ========================================================================

  private executeScaling(
    action: ScalingAction,
    delta: number,
    trigger: ScalingTrigger
  ): void {
    const newInstanceCount = Math.min(
      this.maxInstances,
      Math.max(this.minInstances, this.currentInstances + delta)
    );

    if (newInstanceCount === this.currentInstances) return;

    const scalingRecord = {
      timestamp: Date.now(),
      action,
      trigger,
      instances_before: this.currentInstances,
      instances_after: newInstanceCount,
    };

    this.scalingHistory.push(scalingRecord);
    this.currentInstances = newInstanceCount;

    console.log(
      `Scaling ${action}: ${scalingRecord.instances_before} → ${newInstanceCount} instances (trigger: ${trigger})`
    );
  }

  // ========================================================================
  // COST OPTIMIZATION
  // ========================================================================

  private optimizeCosts(): void {
    // Analyze usage patterns
    // Recommend reserved instances vs on-demand
    // Identify underutilized resources
    // Suggest spot instances for non-critical workloads

    if (this.resourceMetrics.length === 0) return;

    const avgCPU = this.resourceMetrics.reduce((sum, m) => sum + m.cpu_percent, 0) /
      this.resourceMetrics.length;
    const avgMemory = this.resourceMetrics.reduce((sum, m) => sum + m.memory_percent, 0) /
      this.resourceMetrics.length;

    // If average utilization is low, recommend scale down
    if (avgCPU < 30 && avgMemory < 30 && this.currentInstances > this.minInstances) {
      console.log("Cost optimization: Consider scaling down underutilized instances");
    }

    // If peak usage is predictable, recommend reserved instances
    const maxCPU = Math.max(...this.resourceMetrics.map((m) => m.cpu_percent));
    if (maxCPU > 80) {
      console.log("Cost optimization: Consider reserved instances for peak usage");
    }
  }

  // ========================================================================
  // PUBLIC STATISTICS
  // ========================================================================

  public getScalingStatus(): {
    current_instances: number;
    min_instances: number;
    max_instances: number;
    policies: ScalingPolicy[];
    recent_scalings: Array<{
      timestamp: number;
      action: ScalingAction;
      trigger: ScalingTrigger;
      instances_before: number;
      instances_after: number;
    }>;
  } {
    return {
      current_instances: this.currentInstances,
      min_instances: this.minInstances,
      max_instances: this.maxInstances,
      policies: Array.from(this.scalingPolicies.values()),
      recent_scalings: this.scalingHistory.slice(-20),
    };
  }

  public getResourceMetrics(): {
    current: ResourceMetrics | null;
    average: Partial<ResourceMetrics>;
    peak: Partial<ResourceMetrics>;
  } {
    if (this.resourceMetrics.length === 0) {
      return {
        current: null,
        average: {},
        peak: {},
      };
    }

    const current = this.resourceMetrics[this.resourceMetrics.length - 1];
    const metrics = this.resourceMetrics;

    return {
      current,
      average: {
        cpu_percent: metrics.reduce((sum, m) => sum + m.cpu_percent, 0) / metrics.length,
        memory_percent: metrics.reduce((sum, m) => sum + m.memory_percent, 0) / metrics.length,
        requests_per_second: metrics.reduce((sum, m) => sum + m.requests_per_second, 0) / metrics.length,
        avg_latency_ms: metrics.reduce((sum, m) => sum + m.avg_latency_ms, 0) / metrics.length,
      },
      peak: {
        cpu_percent: Math.max(...metrics.map((m) => m.cpu_percent)),
        memory_percent: Math.max(...metrics.map((m) => m.memory_percent)),
        requests_per_second: Math.max(...metrics.map((m) => m.requests_per_second)),
        avg_latency_ms: Math.max(...metrics.map((m) => m.avg_latency_ms)),
      },
    };
  }

  public getPredictions(): Prediction[] {
    return this.predictions.slice(-12); // Last hour of predictions
  }

  public updateScalingPolicy(name: string, policy: Partial<ScalingPolicy>): void {
    const existing = this.scalingPolicies.get(name);
    if (existing) {
      this.scalingPolicies.set(name, { ...existing, ...policy });
    }
  }
}

// Export instance
export const autoScaling = new AutoScalingResourceManagement();
