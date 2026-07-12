import { z } from "zod";
import { publicProcedure, router } from "@/server/_core/trpc";
import { loggingSystem } from "@/server/infrastructure/logging-system";
import { inputValidationSystem } from "@/server/infrastructure/input-validation";
import { transactionManager } from "@/server/infrastructure/transaction-manager";
import { gracefulShutdownManager } from "@/server/infrastructure/graceful-shutdown";
import { healthChecksManager } from "@/server/infrastructure/health-checks";
import { backupSystem } from "@/server/infrastructure/backup-system";
import { rateLimitingSystem } from "@/server/infrastructure/rate-limiting";
import { cacheInvalidationSystem } from "@/server/infrastructure/cache-invalidation";
import { queueSystem } from "@/server/infrastructure/queue-system";
import { securityHardeningSystem } from "@/server/infrastructure/security-hardening";

/**
 * Infrastructure tRPC Router
 * Integrates all 10 critical and important backend infrastructure systems
 */
export const infrastructureRouter = router({
  // ============ LOGGING & MONITORING ============

  getLogs: publicProcedure
    .input(
      z.object({
        level: z.enum(["debug", "info", "warn", "error", "fatal"]).optional(),
        limit: z.number().default(100),
      })
    )
    .query(({ input }) => {
      return loggingSystem.getLogs({ level: input.level, limit: input.limit });
    }),

  getAggregatedErrors: publicProcedure
    .input(
      z.object({
        resolved: z.boolean().optional(),
        severity: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return loggingSystem.getAggregatedErrors(input);
    }),

  getPerformanceStats: publicProcedure
    .input(z.object({ endpoint: z.string().optional() }))
    .query(({ input }) => {
      return loggingSystem.getPerformanceStats(input.endpoint);
    }),

  getAlertEvents: publicProcedure
    .input(
      z.object({
        acknowledged: z.boolean().optional(),
        severity: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return loggingSystem.getAlertEvents(input);
    }),

  // ============ HEALTH CHECKS ============

  getLivenessProbe: publicProcedure.query(() => {
    return healthChecksManager.getLivenessProbe();
  }),

  getReadinessProbe: publicProcedure.query(async () => {
    return await healthChecksManager.getReadinessProbe();
  }),

  getDetailedHealth: publicProcedure.query(async () => {
    return await healthChecksManager.getDetailedHealth();
  }),

  getMetrics: publicProcedure.query(() => {
    return healthChecksManager.getMetrics();
  }),

  // ============ BACKUP & DISASTER RECOVERY ============

  getBackupStats: publicProcedure.query(() => {
    return backupSystem.getBackupStats();
  }),

  getAllBackups: publicProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_progress", "completed", "failed", "verified"]).optional(),
        verified: z.boolean().optional(),
      })
    )
    .query(({ input }) => {
      return backupSystem.getAllBackups(input);
    }),

  getPointInTimeRecoveryOptions: publicProcedure.query(() => {
    return backupSystem.getPointInTimeRecoveryOptions();
  }),

  restoreFromBackup: publicProcedure
    .input(
      z.object({
        backupId: z.string(),
        targetTime: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await backupSystem.restoreFromBackup(input.backupId, input.targetTime);
    }),

  // ============ RATE LIMITING & QUOTAS ============

  checkRateLimit: publicProcedure
    .input(
      z.object({
        identifier: z.string(),
        type: z.enum(["user", "ip", "ai"]),
      })
    )
    .query(({ input }) => {
      return rateLimitingSystem.checkRateLimit(input.identifier, input.type);
    }),

  createQuota: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(["api_calls", "storage", "compute", "bandwidth"]),
        limit: z.number(),
        period: z.enum(["hourly", "daily", "monthly", "unlimited"]),
        aiId: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      return rateLimitingSystem.createQuota(
        input.userId,
        input.type,
        input.limit,
        input.period,
        input.aiId
      );
    }),

  useQuota: publicProcedure
    .input(
      z.object({
        quotaId: z.string(),
        amount: z.number().default(1),
      })
    )
    .mutation(({ input }) => {
      return rateLimitingSystem.useQuota(input.quotaId, input.amount);
    }),

  getQuotaStatus: publicProcedure
    .input(z.object({ quotaId: z.string() }))
    .query(({ input }) => {
      return rateLimitingSystem.getQuotaStatus(input.quotaId);
    }),

  getRateLimitStats: publicProcedure.query(() => {
    return rateLimitingSystem.getRateLimitStats();
  }),

  getDDoSStats: publicProcedure.query(() => {
    return rateLimitingSystem.getDDoSStats();
  }),

  // ============ CACHE MANAGEMENT ============

  getCacheMetrics: publicProcedure.query(() => {
    return cacheInvalidationSystem.getMetrics();
  }),

  getCacheSize: publicProcedure.query(() => {
    return cacheInvalidationSystem.getCacheSize();
  }),

  getCacheEntries: publicProcedure
    .input(
      z.object({
        tag: z.string().optional(),
        pattern: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return cacheInvalidationSystem.getCacheEntries(input);
    }),

  invalidateByTag: publicProcedure
    .input(z.object({ tag: z.string() }))
    .mutation(({ input }) => {
      return cacheInvalidationSystem.invalidateByTag(input.tag);
    }),

  invalidateByPattern: publicProcedure
    .input(z.object({ pattern: z.string() }))
    .mutation(({ input }) => {
      return cacheInvalidationSystem.invalidateByPattern(input.pattern);
    }),

  clearCache: publicProcedure.mutation(() => {
    cacheInvalidationSystem.clearCache();
    return { success: true };
  }),

  // ============ JOB QUEUE ============

  enqueueJob: publicProcedure
    .input(
      z.object({
        type: z.string(),
        data: z.record(z.string(), z.any()),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
        userId: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      return queueSystem.enqueueJob(input.type, input.data, {
        priority: input.priority,
        userId: input.userId,
      });
    }),

  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      return queueSystem.getJobStatus(input.jobId);
    }),

  getQueueStats: publicProcedure.query(() => {
    return queueSystem.getQueueStats();
  }),

  getDeadLetterQueue: publicProcedure.query(() => {
    return queueSystem.getDeadLetterQueue();
  }),

  retryDeadLetterJob: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(({ input }) => {
      queueSystem.retryDeadLetterJob(input.jobId);
      return { success: true };
    }),

  // ============ SECURITY ============

  getSecurityHeaders: publicProcedure.query(() => {
    return securityHardeningSystem.getSecurityHeaders();
  }),

  createApiKey: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        expiresInDays: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      return securityHardeningSystem.createApiKey(
        input.userId,
        input.name,
        input.expiresInDays
      );
    }),

  validateApiKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(({ input }) => {
      return securityHardeningSystem.validateApiKey(input.key);
    }),

  revokeApiKey: publicProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(({ input }) => {
      securityHardeningSystem.revokeApiKey(input.keyId);
      return { success: true };
    }),

  getSecurityAuditLog: publicProcedure
    .input(
      z.object({
        event: z.string().optional(),
        severity: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return securityHardeningSystem.getSecurityAuditLog(input);
    }),

  getVulnerabilities: publicProcedure
    .input(
      z.object({
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        package: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return securityHardeningSystem.getVulnerabilities(input);
    }),

  getSecurityScore: publicProcedure.query(() => {
    return securityHardeningSystem.getSecurityScore();
  }),

  rotateSecrets: publicProcedure.mutation(() => {
    return securityHardeningSystem.rotateSecrets();
  }),

  // ============ TRANSACTIONS ============

  getTransactionStats: publicProcedure.query(() => {
    return transactionManager.getTransactionStats();
  }),

  getAllTransactions: publicProcedure
    .input(
      z.object({
        status: z.enum(["pending", "executing", "committed", "rolled_back", "failed"]).optional(),
        userId: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return transactionManager.getAllTransactions(input);
    }),

  getAuditTrail: publicProcedure
    .input(
      z.object({
        table: z.string(),
        recordId: z.string(),
      })
    )
    .query(({ input }) => {
      return transactionManager.getAuditTrail(input.table, input.recordId);
    }),

  // ============ INFRASTRUCTURE STATUS ============

  getInfrastructureStatus: publicProcedure.query(async () => {
    const health = await healthChecksManager.getDetailedHealth();
    const backupStats = backupSystem.getBackupStats();
    const rateLimitStats = rateLimitingSystem.getRateLimitStats();
    const cacheMetrics = cacheInvalidationSystem.getMetrics();
    const queueStats = queueSystem.getQueueStats();
    const securityScore = securityHardeningSystem.getSecurityScore();

    return {
      health,
      backupStats,
      rateLimitStats,
      cacheMetrics,
      queueStats,
      securityScore,
      timestamp: new Date(),
    };
  }),

  // ============ SYSTEM STARTUP ============

  runStartupValidation: publicProcedure.mutation(async () => {
    return await gracefulShutdownManager.runStartupValidation();
  }),

  getStartupStatus: publicProcedure.query(() => {
    return gracefulShutdownManager.getStartupStatus();
  }),
});
