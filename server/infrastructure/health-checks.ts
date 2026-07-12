import { z } from "zod";

/**
 * Health Checks & Monitoring Endpoints
 * Phase 1 Critical Infrastructure
 *
 * Provides readiness and liveness probes for Kubernetes and monitoring
 * - Liveness probe (is the server running?)
 * - Readiness probe (is the server ready to accept requests?)
 * - Startup probe (did the server start successfully?)
 * - Detailed health metrics
 */

// Probe Status
export const ProbeStatusSchema = z.enum(["success", "failure", "degraded"]);
export type ProbeStatus = z.infer<typeof ProbeStatusSchema>;

// Probe Response
export const ProbeResponseSchema = z.object({
  status: ProbeStatusSchema,
  timestamp: z.date(),
  uptime: z.number(), // seconds
  checks: z.record(z.string(), z.boolean()),
  details: z.record(z.string(), z.any()).optional(),
});

export type ProbeResponse = z.infer<typeof ProbeResponseSchema>;

// Detailed Health Response
export const DetailedHealthResponseSchema = z.object({
  status: ProbeStatusSchema,
  timestamp: z.date(),
  uptime: z.number(),
  version: z.string(),
  environment: z.string(),
  services: z.record(
    z.string(),
    z.object({
      status: ProbeStatusSchema,
      responseTime: z.number(),
      details: z.any().optional(),
    })
  ),
  metrics: z.object({
    memory: z.object({
      heapUsed: z.number(),
      heapTotal: z.number(),
      external: z.number(),
      rss: z.number(),
    }),
    uptime: z.number(),
    cpu: z.object({
      user: z.number(),
      system: z.number(),
    }),
  }),
});

export type DetailedHealthResponse = z.infer<typeof DetailedHealthResponseSchema>;

/**
 * Health Checks Manager
 */
export class HealthChecksManager {
  private startTime: number = Date.now();
  private lastChecks: Map<string, { status: ProbeStatus; timestamp: Date }> = new Map();

  /**
   * Liveness Probe
   * Returns 200 if the server is running, 503 otherwise
   */
  getLivenessProbe(): ProbeResponse {
    const checks = {
      server_running: true,
      process_alive: process.uptime() > 0,
    };

    return {
      status: Object.values(checks).every((v) => v) ? "success" : "failure",
      timestamp: new Date(),
      uptime: process.uptime(),
      checks,
    };
  }

  /**
   * Readiness Probe
   * Returns 200 if the server is ready to accept requests, 503 otherwise
   */
  async getReadinessProbe(): Promise<ProbeResponse> {
    const checks: Record<string, boolean> = {
      database_connected: await this.checkDatabaseConnected(),
      redis_connected: await this.checkRedisConnected(),
      disk_space_available: await this.checkDiskSpace(),
      memory_available: await this.checkMemoryAvailable(),
    };

    const allHealthy = Object.values(checks).every((v) => v);

    return {
      status: allHealthy ? "success" : "degraded",
      timestamp: new Date(),
      uptime: process.uptime(),
      checks,
      details: {
        message: allHealthy
          ? "Server is ready to accept requests"
          : "Server is degraded or not ready",
      },
    };
  }

  /**
   * Startup Probe
   * Returns 200 if the server started successfully, 503 otherwise
   */
  async getStartupProbe(): Promise<ProbeResponse> {
    const checks: Record<string, boolean> = {
      migrations_completed: await this.checkMigrationsCompleted(),
      config_loaded: await this.checkConfigLoaded(),
      services_initialized: await this.checkServicesInitialized(),
    };

    const allHealthy = Object.values(checks).every((v) => v);

    return {
      status: allHealthy ? "success" : "failure",
      timestamp: new Date(),
      uptime: process.uptime(),
      checks,
      details: {
        message: allHealthy
          ? "Server started successfully"
          : "Server failed to start",
      },
    };
  }

  /**
   * Detailed Health Check
   * Returns comprehensive health information
   */
  async getDetailedHealth(): Promise<DetailedHealthResponse> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const services: Record<
      string,
      {
        status: ProbeStatus;
        responseTime: number;
        details?: any;
      }
    > = {
      database: await this.checkServiceHealth("database"),
      redis: await this.checkServiceHealth("redis"),
      file_storage: await this.checkServiceHealth("file_storage"),
      external_apis: await this.checkServiceHealth("external_apis"),
    };

    const allHealthy = Object.values(services).every((s) => s.status === "success");

    return {
      status: allHealthy ? "success" : "degraded",
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services,
      metrics: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        uptime: process.uptime(),
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    };
  }

  /**
   * Check if database is connected
   */
  private async checkDatabaseConnected(): Promise<boolean> {
    try {
      // In production, run actual database query
      // For now, simulate success
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Redis is connected
   */
  private async checkRedisConnected(): Promise<boolean> {
    try {
      // In production, run actual Redis ping
      // For now, simulate success
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      // In production, check actual disk space
      // For now, simulate success
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check memory available
   */
  private async checkMemoryAvailable(): Promise<boolean> {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      return heapUsedPercent < 90; // Healthy if less than 90% used
    } catch {
      return false;
    }
  }

  /**
   * Check if migrations are completed
   */
  private async checkMigrationsCompleted(): Promise<boolean> {
    try {
      // In production, check migration status
      // For now, simulate success
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if config is loaded
   */
  private async checkConfigLoaded(): Promise<boolean> {
    try {
      // Check required environment variables
      const required = ["NODE_ENV", "DATABASE_URL"];
      return required.every((key) => !!process.env[key]);
    } catch {
      return false;
    }
  }

  /**
   * Check if services are initialized
   */
  private async checkServicesInitialized(): Promise<boolean> {
    try {
      // In production, check that all services are initialized
      // For now, simulate success
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(
    service: string
  ): Promise<{ status: ProbeStatus; responseTime: number; details?: any }> {
    const startTime = Date.now();

    try {
      let isHealthy = false;

      switch (service) {
        case "database":
          isHealthy = await this.checkDatabaseConnected();
          break;
        case "redis":
          isHealthy = await this.checkRedisConnected();
          break;
        case "file_storage":
          // In production, check S3 or file storage
          isHealthy = true;
          break;
        case "external_apis":
          // In production, check critical external APIs
          isHealthy = true;
          break;
        default:
          isHealthy = false;
      }

      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? "success" : "failure",
        responseTime,
        details: {
          service,
          checked_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: "failure",
        responseTime: Date.now() - startTime,
        details: {
          service,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Get health metrics for monitoring
   */
  getMetrics(): {
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      heapUsedPercent: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  } {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsedPercent: Math.round(
          (memUsage.heapUsed / memUsage.heapTotal) * 100
        ),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    };
  }

  /**
   * Get server info
   */
  getServerInfo(): {
    version: string;
    environment: string;
    uptime: number;
    startTime: Date;
    nodeVersion: string;
  } {
    return {
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      startTime: new Date(this.startTime),
      nodeVersion: process.version,
    };
  }
}

// Global singleton instance
export const healthChecksManager = new HealthChecksManager();
