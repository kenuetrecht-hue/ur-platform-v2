/**
 * Health tRPC Router
 * Provides real-time health data, metrics, and healing actions
 * All data properly layered and stored for seamless frontend integration
 */

import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { HealthMaintenanceAI } from "@/server/health-maintenance-ai";

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const healthAI = new HealthMaintenanceAI();

// Start monitoring on initialization
if (typeof window === "undefined") {
  // Server-side only
  healthAI.startMonitoring(60000); // Check every 60 seconds
}

// ============================================================================
// SCHEMAS
// ============================================================================

const HealthCheckResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(["healthy", "warning", "critical", "failed"]),
  message: z.string(),
  severity: z.number(),
  timestamp: z.date(),
  autoFixed: z.boolean(),
});

const BugReportResponseSchema = z.object({
  id: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  component: z.string(),
  description: z.string(),
  stackTrace: z.string().optional(),
  detectedAt: z.date(),
  status: z.enum(["detected", "investigating", "fixing", "fixed", "ignored"]),
  autoFixAttempted: z.boolean(),
  fixResult: z.string().optional(),
});

const HealingActionResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  targetComponent: z.string(),
  description: z.string(),
  status: z.enum(["pending", "executing", "completed", "failed"]),
  result: z.string().optional(),
  timestamp: z.date(),
  duration: z.number().optional(),
});

const MigrationChecklistItemSchema = z.object({
  id: z.string(),
  item: z.string(),
  category: z.string(),
  status: z.enum(["pending", "passed", "failed", "warning"]),
  details: z.string().optional(),
  timestamp: z.date(),
});

const PerformanceMetricResponseSchema = z.object({
  timestamp: z.date(),
  responseTime: z.number(),
  throughput: z.number(),
  errorRate: z.number(),
  cpuUsage: z.number(),
  memoryUsage: z.number(),
  diskUsage: z.number(),
  activeConnections: z.number(),
  queuedRequests: z.number(),
});

const HealthSummaryResponseSchema = z.object({
  status: z.enum(["healthy", "warning", "critical"]),
  healthyChecks: z.number(),
  warningChecks: z.number(),
  criticalChecks: z.number(),
  activeBugs: z.number(),
  recentBugs: z.array(BugReportResponseSchema),
  healingActionsExecuted: z.number(),
});

// ============================================================================
// ROUTER
// ============================================================================

export const healthRouter = router({
  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  /**
   * Get current health summary
   * Returns overall system health status with recent metrics
   */
  getHealthSummary: publicProcedure.query(async () => {
    const summary = healthAI.getHealthSummary();
    return HealthSummaryResponseSchema.parse(summary);
  }),

  /**
   * Get detailed health report
   * Returns comprehensive health information for admin dashboard
   */
  getHealthReport: publicProcedure.query(async () => {
    const summary = healthAI.getHealthSummary();
    return {
      summary: HealthSummaryResponseSchema.parse(summary),
      timestamp: new Date(),
      systemStatus: summary.status,
      lastUpdated: new Date(),
    };
  }),

  /**
   * Report a bug
   * Allows frontend to report bugs detected on client side
   */
  reportBug: publicProcedure
    .input(
      z.object({
        severity: z.enum(["low", "medium", "high", "critical"]),
        component: z.string(),
        description: z.string(),
        stackTrace: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const bug = healthAI.reportBug(
        input.severity,
        input.component,
        input.description,
        input.stackTrace
      );
      return BugReportResponseSchema.parse(bug);
    }),

  // ============================================================================
  // MIGRATION
  // ============================================================================

  /**
   * Generate pre-migration checklist
   * Creates comprehensive checklist before server migration
   */
  generateMigrationChecklist: publicProcedure.mutation(async () => {
    const checklist = healthAI.generateMigrationChecklist();
    return {
      items: checklist.map((item) => MigrationChecklistItemSchema.parse(item)),
      ready: healthAI.isMigrationReady(),
      timestamp: new Date(),
    };
  }),

  /**
   * Get migration status
   * Returns current migration readiness status
   */
  getMigrationStatus: publicProcedure.query(async () => {
    const status = healthAI.getMigrationStatus();
    return {
      ready: status.ready,
      passed: status.passed,
      failed: status.failed,
      warnings: status.warnings,
      items: status.items.map((item) => MigrationChecklistItemSchema.parse(item)),
      timestamp: new Date(),
    };
  }),

  /**
   * Check if migration is ready
   * Simple boolean check for migration readiness
   */
  isMigrationReady: publicProcedure.query(async () => {
    return {
      ready: healthAI.isMigrationReady(),
      timestamp: new Date(),
    };
  }),

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  /**
   * Record performance metric
   * Allows frontend to send performance data
   */
  recordPerformanceMetric: publicProcedure
    .input(
      z.object({
        responseTime: z.number(),
        throughput: z.number(),
        errorRate: z.number(),
        cpuUsage: z.number(),
        memoryUsage: z.number(),
        diskUsage: z.number(),
        activeConnections: z.number(),
        queuedRequests: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      healthAI.recordPerformanceMetric(input);
      return { success: true, timestamp: new Date() };
    }),

  /**
   * Get performance report
   * Returns performance metrics for specified time period
   */
  getPerformanceReport: publicProcedure
    .input(
      z.object({
        minutes: z.number().default(60).optional(),
      })
    )
    .query(async ({ input }) => {
      const report = healthAI.getPerformanceReport(input.minutes);
      if (!report) {
        return {
          available: false,
          message: "No performance data available",
          timestamp: new Date(),
        };
      }

      return {
        available: true,
        avgResponseTime: report.avgResponseTime,
        avgThroughput: report.avgThroughput,
        avgErrorRate: report.avgErrorRate,
        avgCpuUsage: report.avgCpuUsage,
        avgMemoryUsage: report.avgMemoryUsage,
        avgDiskUsage: report.avgDiskUsage,
        peakMetrics: PerformanceMetricResponseSchema.parse(report.peakMetrics),
        lowMetrics: PerformanceMetricResponseSchema.parse(report.lowMetrics),
        timestamp: new Date(),
      };
    }),

  // ============================================================================
  // MONITORING
  // ============================================================================

  /**
   * Start health monitoring
   * Begins continuous health checks
   */
  startMonitoring: publicProcedure
    .input(
      z.object({
        intervalMs: z.number().default(60000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      healthAI.startMonitoring(input.intervalMs);
      return {
        success: true,
        message: "Health monitoring started",
        intervalMs: input.intervalMs,
        timestamp: new Date(),
      };
    }),

  /**
   * Stop health monitoring
   * Stops continuous health checks
   */
  stopMonitoring: publicProcedure.mutation(async () => {
    healthAI.stopMonitoring();
    return {
      success: true,
      message: "Health monitoring stopped",
      timestamp: new Date(),
    };
  }),

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get health statistics
   * Returns comprehensive health statistics for dashboard
   */
  getHealthStatistics: publicProcedure.query(async () => {
    const summary = healthAI.getHealthSummary();
    return {
      overallStatus: summary.status,
      healthyPercentage: Math.round(
        (summary.healthyChecks / (summary.healthyChecks + summary.warningChecks + summary.criticalChecks)) * 100
      ),
      healthyChecks: summary.healthyChecks,
      warningChecks: summary.warningChecks,
      criticalChecks: summary.criticalChecks,
      activeBugs: summary.activeBugs,
      resolvedBugs: 0, // Would be calculated from bug history
      healingActionsExecuted: summary.healingActionsExecuted,
      timestamp: new Date(),
    };
  }),

  /**
   * Get system diagnostics
   * Comprehensive system diagnostics for troubleshooting
   */
  getSystemDiagnostics: publicProcedure.query(async () => {
    const summary = healthAI.getHealthSummary();
    const migrationStatus = healthAI.getMigrationStatus();
    const performanceReport = healthAI.getPerformanceReport(60);

    return {
      health: HealthSummaryResponseSchema.parse(summary),
      migration: {
        ready: migrationStatus.ready,
        passed: migrationStatus.passed,
        failed: migrationStatus.failed,
        warnings: migrationStatus.warnings,
      },
      performance: performanceReport
        ? {
            avgResponseTime: performanceReport.avgResponseTime,
            avgErrorRate: performanceReport.avgErrorRate,
            avgCpuUsage: performanceReport.avgCpuUsage,
            avgMemoryUsage: performanceReport.avgMemoryUsage,
          }
        : null,
      timestamp: new Date(),
    };
  }),
});

// ============================================================================
// EXPORT
// ============================================================================

export type HealthRouter = typeof healthRouter;
