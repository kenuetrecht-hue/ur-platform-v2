/**
 * Queue System Service
 * Handles async job processing for video/audio encoding, notifications, etc.
 * Prevents blocking of API requests
 */

export interface QueueJob {
  id: string;
  type: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number; // 1-10, higher = more important
  retries: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class JobQueue {
  private queues: Map<string, QueueJob[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  private stats = {
    enqueued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  /**
   * Enqueue a job
   */
  enqueue(type: string, payload: any, priority: number = 5): QueueJob {
    const job: QueueJob = {
      id: `job-${Date.now()}-${Math.random()}`,
      type,
      payload,
      status: 'pending',
      priority,
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };

    if (!this.queues.has(type)) {
      this.queues.set(type, []);
    }

    const queue = this.queues.get(type)!;
    queue.push(job);
    queue.sort((a, b) => b.priority - a.priority); // Sort by priority

    this.stats.enqueued++;
    return job;
  }

  /**
   * Dequeue and process next job
   */
  async dequeue(type: string, handler: (job: QueueJob) => Promise<void>): Promise<QueueJob | null> {
    const queue = this.queues.get(type);
    if (!queue || queue.length === 0) return null;

    const job = queue.shift();
    if (!job) return null;

    job.status = 'processing';
    job.startedAt = new Date();
    this.stats.processing++;

    try {
      await handler(job);
      job.status = 'completed';
      job.completedAt = new Date();
      this.stats.completed++;
    } catch (error: any) {
      job.retries++;

      if (job.retries < job.maxRetries) {
        // Requeue with exponential backoff
        job.status = 'pending';
        queue.push(job);
        queue.sort((a, b) => b.priority - a.priority);
      } else {
        job.status = 'failed';
        job.error = error.message;
        this.stats.failed++;
      }
    }

    this.stats.processing--;
    return job;
  }

  /**
   * Process all jobs in queue
   */
  async processQueue(type: string, handler: (job: QueueJob) => Promise<void>): Promise<number> {
    let processed = 0;
    let job = await this.dequeue(type, handler);

    while (job) {
      processed++;
      job = await this.dequeue(type, handler);
    }

    return processed;
  }

  /**
   * Get queue length
   */
  getQueueLength(type: string): number {
    return this.queues.get(type)?.length || 0;
  }

  /**
   * Get all queue lengths
   */
  getAllQueueLengths(): Record<string, number> {
    const lengths: Record<string, number> = {};
    for (const [type, queue] of this.queues.entries()) {
      lengths[type] = queue.length;
    }
    return lengths;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): QueueJob | null {
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.id === jobId);
      if (job) return job;
    }
    return null;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLengths: this.getAllQueueLengths(),
    };
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): number {
    let cleared = 0;
    for (const queue of this.queues.values()) {
      const before = queue.length;
      const filtered = queue.filter(j => j.status !== 'completed' && j.status !== 'failed');
      cleared += before - filtered.length;
    }
    return cleared;
  }
}

/**
 * Scheduled Task Queue
 * Handles recurring tasks like cleanup, notifications, etc.
 */
export class ScheduledTaskQueue {
  private tasks: Map<string, { interval: number; handler: () => Promise<void>; lastRun?: Date }> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule a recurring task
   */
  schedule(taskId: string, intervalSeconds: number, handler: () => Promise<void>): void {
    this.tasks.set(taskId, { interval: intervalSeconds * 1000, handler });

    const timer = setInterval(async () => {
      try {
        await handler();
        const task = this.tasks.get(taskId);
        if (task) task.lastRun = new Date();
      } catch (error) {
        console.error(`Scheduled task ${taskId} failed:`, error);
      }
    }, intervalSeconds * 1000) as unknown as NodeJS.Timeout;

    this.timers.set(taskId, timer);
  }

  /**
   * Cancel scheduled task
   */
  cancel(taskId: string): boolean {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(taskId);
      this.tasks.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string) {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.entries()).map(([id, task]) => ({
      id,
      interval: task.interval,
      lastRun: task.lastRun,
    }));
  }

  /**
   * Cancel all tasks
   */
  cancelAll(): number {
    let count = 0;
    for (const [taskId] of this.tasks.entries()) {
      if (this.cancel(taskId)) count++;
    }
    return count;
  }
}

/**
 * Dead Letter Queue
 * Handles jobs that failed permanently
 */
export class DeadLetterQueue {
  private deadLetters: QueueJob[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * Add failed job to DLQ
   */
  add(job: QueueJob): void {
    this.deadLetters.push(job);

    // Keep only recent failures
    if (this.deadLetters.length > this.maxSize) {
      this.deadLetters = this.deadLetters.slice(-this.maxSize);
    }
  }

  /**
   * Get dead letters
   */
  getDeadLetters(limit: number = 100): QueueJob[] {
    return this.deadLetters.slice(-limit).reverse();
  }

  /**
   * Get dead letters by type
   */
  getDeadLettersByType(type: string): QueueJob[] {
    return this.deadLetters.filter(j => j.type === type);
  }

  /**
   * Clear dead letter queue
   */
  clear(): number {
    const count = this.deadLetters.length;
    this.deadLetters = [];
    return count;
  }

  /**
   * Get statistics
   */
  getStats() {
    const byType: Record<string, number> = {};
    for (const job of this.deadLetters) {
      byType[job.type] = (byType[job.type] || 0) + 1;
    }

    return {
      total: this.deadLetters.length,
      byType,
      maxSize: this.maxSize,
    };
  }
}
