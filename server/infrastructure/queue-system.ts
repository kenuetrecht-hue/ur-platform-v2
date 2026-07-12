import { z } from "zod";

/**
 * Queue & Job Processing System
 * Phase 2 Important Infrastructure
 *
 * Handles long-running tasks without blocking API responses
 * - Message queue for async job processing
 * - Job scheduling
 * - Job retry logic
 * - Job prioritization
 * - Job monitoring
 * - Dead letter queue
 * - Job persistence
 */

// Job Status
export const JobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "retrying",
  "dead_letter",
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

// Job Priority
export const JobPrioritySchema = z.enum(["low", "normal", "high", "critical"]);
export type JobPriority = z.infer<typeof JobPrioritySchema>;

// Job
export const JobSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.any()),
  status: JobStatusSchema,
  priority: JobPrioritySchema,
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  attempts: z.number(),
  maxAttempts: z.number(),
  nextRetryAt: z.date().optional(),
  error: z.string().optional(),
  result: z.any().optional(),
  userId: z.string().optional(),
});

export type Job = z.infer<typeof JobSchema>;

// Job Handler
export type JobHandler = (job: Job) => Promise<any>;

// Job Metrics
export const JobMetricsSchema = z.object({
  totalJobs: z.number(),
  pendingJobs: z.number(),
  processingJobs: z.number(),
  completedJobs: z.number(),
  failedJobs: z.number(),
  deadLetterJobs: z.number(),
  averageProcessingTime: z.number(),
  successRate: z.number(),
});

export type JobMetrics = z.infer<typeof JobMetricsSchema>;

/**
 * Queue & Job Processing Manager
 */
export class QueueSystem {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = []; // job IDs in priority order
  private handlers: Map<string, JobHandler> = new Map();
  private deadLetterQueue: Set<string> = new Set();
  private metrics = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalProcessingTime: 0,
  };

  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds
  private processingInterval = 1000; // 1 second
  private isProcessing = false;
  private processorInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start job processor
    this.startJobProcessor();
  }

  /**
   * Enqueue job
   */
  enqueueJob(
    type: string,
    data: Record<string, any>,
    options?: {
      priority?: JobPriority;
      userId?: string;
      maxAttempts?: number;
    }
  ): Job {
    const job: Job = {
      id: `job_${Date.now()}_${Math.random()}`,
      type,
      data,
      status: "pending",
      priority: options?.priority || "normal",
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options?.maxAttempts || this.maxRetries,
      userId: options?.userId,
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this.metrics.totalJobs++;

    // Sort queue by priority
    this.sortQueue();

    return job;
  }

  /**
   * Register job handler
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  /**
   * Start job processor
   */
  private startJobProcessor(): void {
    this.processorInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processNextJob().catch((error) => {
          console.error("Job processing error:", error);
        });
      }
    }, this.processingInterval);
  }

  /**
   * Process next job
   */
  private async processNextJob(): Promise<void> {
    if (this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      const jobId = this.queue.shift();
      if (!jobId) return;

      const job = this.jobs.get(jobId);
      if (!job) return;

      // Check if job should be retried
      if (job.nextRetryAt && new Date() < job.nextRetryAt) {
        this.queue.push(jobId);
        return;
      }

      job.status = "processing";
      job.startedAt = new Date();
      job.attempts++;

      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      try {
        const result = await handler(job);
        job.status = "completed";
        job.completedAt = new Date();
        job.result = result;
        this.metrics.completedJobs++;

        if (job.startedAt) {
          this.metrics.totalProcessingTime += new Date().getTime() - job.startedAt.getTime();
        }
      } catch (error) {
        job.error = error instanceof Error ? error.message : "Unknown error";

        if (job.attempts < job.maxAttempts) {
          // Retry
          job.status = "retrying";
          job.nextRetryAt = new Date(Date.now() + this.retryDelay * job.attempts);
          this.queue.push(jobId);
        } else {
          // Send to dead letter queue
          job.status = "dead_letter";
          this.deadLetterQueue.add(jobId);
          this.metrics.failedJobs++;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    this.queue.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);

      if (!jobA || !jobB) return 0;

      const priorityA = priorityOrder[jobA.priority];
      const priorityB = priorityOrder[jobB.priority];

      return priorityA - priorityB;
    });
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(filter?: { status?: JobStatus; type?: string; userId?: string }): Job[] {
    let jobs = Array.from(this.jobs.values());

    if (filter?.status) {
      jobs = jobs.filter((j) => j.status === filter.status);
    }
    if (filter?.type) {
      jobs = jobs.filter((j) => j.type === filter.type);
    }
    if (filter?.userId) {
      jobs = jobs.filter((j) => j.userId === filter.userId);
    }

    return jobs;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): JobMetrics {
    const jobs = Array.from(this.jobs.values());
    const pending = jobs.filter((j) => j.status === "pending").length;
    const processing = jobs.filter((j) => j.status === "processing").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const deadLetter = this.deadLetterQueue.size;

    return {
      totalJobs: jobs.length,
      pendingJobs: pending,
      processingJobs: processing,
      completedJobs: completed,
      failedJobs: failed,
      deadLetterJobs: deadLetter,
      averageProcessingTime:
        this.metrics.completedJobs > 0
          ? this.metrics.totalProcessingTime / this.metrics.completedJobs
          : 0,
      successRate:
        this.metrics.totalJobs > 0
          ? (this.metrics.completedJobs / this.metrics.totalJobs) * 100
          : 0,
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): Job[] {
    return Array.from(this.deadLetterQueue).map((id) => this.jobs.get(id)!);
  }

  /**
   * Retry dead letter job
   */
  retryDeadLetterJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (this.deadLetterQueue.has(jobId)) {
      this.deadLetterQueue.delete(jobId);
      job.status = "pending";
      job.attempts = 0;
      job.error = undefined;
      this.queue.push(jobId);
      this.sortQueue();
    }
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === "pending") {
      const index = this.queue.indexOf(jobId);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
      job.status = "failed";
      job.error = "Cancelled by user";
    }
  }

  /**
   * Set max retries
   */
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }

  /**
   * Set retry delay
   */
  setRetryDelay(milliseconds: number): void {
    this.retryDelay = milliseconds;
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleared = 0;

    for (const [id, job] of this.jobs) {
      if (job.status === "completed" && job.completedAt && job.completedAt.getTime() < cutoffTime) {
        this.jobs.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get job by type
   */
  getJobsByType(type: string): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.type === type);
  }

  /**
   * Get pending jobs count
   */
  getPendingJobsCount(): number {
    return this.queue.length;
  }

  /**
   * Get processing jobs count
   */
  getProcessingJobsCount(): number {
    return Array.from(this.jobs.values()).filter((j) => j.status === "processing").length;
  }
}

// Global singleton instance
export const queueSystem = new QueueSystem();
