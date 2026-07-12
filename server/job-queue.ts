/**
 * PHASE 4: ASYNC JOB QUEUE
 * 
 * Enterprise-grade job queue for long-running tasks (AI generation,
 * video transcoding, email sending, etc.)
 * 
 * Features:
 * - Async task processing
 * - Retry logic with exponential backoff
 * - Job status tracking
 * - Priority queues
 * - Dead letter queue for failed jobs
 */

import { redis } from './cache';

export enum JobType {
  AI_PERSONA_GENERATION = 'ai_persona_generation',
  VIDEO_TRANSCODING = 'video_transcoding',
  AUDIO_PROCESSING = 'audio_processing',
  EMAIL_SENDING = 'email_sending',
  IMAGE_OPTIMIZATION = 'image_optimization',
  CONTENT_MODERATION = 'content_moderation',
  ANALYTICS_PROCESSING = 'analytics_processing',
  BACKUP_CREATION = 'backup_creation',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number; // 1-10, higher = more important
  data: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  nextRetryAt?: number;
}

// Job configuration
const JOB_CONFIG = {
  [JobType.AI_PERSONA_GENERATION]: {
    maxRetries: 3,
    timeout: 30000, // 30 seconds
    priority: 8,
  },
  [JobType.VIDEO_TRANSCODING]: {
    maxRetries: 2,
    timeout: 300000, // 5 minutes
    priority: 6,
  },
  [JobType.AUDIO_PROCESSING]: {
    maxRetries: 2,
    timeout: 120000, // 2 minutes
    priority: 6,
  },
  [JobType.EMAIL_SENDING]: {
    maxRetries: 5,
    timeout: 10000, // 10 seconds
    priority: 3,
  },
  [JobType.IMAGE_OPTIMIZATION]: {
    maxRetries: 2,
    timeout: 60000, // 1 minute
    priority: 4,
  },
  [JobType.CONTENT_MODERATION]: {
    maxRetries: 1,
    timeout: 30000, // 30 seconds
    priority: 7,
  },
  [JobType.ANALYTICS_PROCESSING]: {
    maxRetries: 1,
    timeout: 60000, // 1 minute
    priority: 2,
  },
  [JobType.BACKUP_CREATION]: {
    maxRetries: 1,
    timeout: 600000, // 10 minutes
    priority: 1,
  },
};

/**
 * Create and enqueue a job
 */
export async function enqueueJob(
  type: JobType,
  data: Record<string, any>,
  priority?: number
): Promise<string> {
  try {
    const config = JOB_CONFIG[type];
    const jobId = `job:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    const job: Job = {
      id: jobId,
      type,
      status: JobStatus.PENDING,
      priority: priority || config.priority,
      data,
      retries: 0,
      maxRetries: config.maxRetries,
      createdAt: Date.now(),
    };

    // Store job
    await redis.hset(jobId, 'data', JSON.stringify(job));

    // Add to queue (sorted by priority, then creation time)
    const score = (10 - job.priority) * 1000000 + job.createdAt;
    await redis.zadd(`queue:${type}`, score, jobId);

    console.log(`Job enqueued: ${jobId} (type: ${type}, priority: ${job.priority})`);

    return jobId;
  } catch (error) {
    console.error('Enqueue job error:', error);
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<Job | null> {
  try {
    const data = await redis.hget(jobId, 'data');
    if (!data) return null;

    return JSON.parse(data) as Job;
  } catch (error) {
    console.error('Get job status error:', error);
    return null;
  }
}

/**
 * Mark job as processing
 */
export async function startJob(jobId: string): Promise<void> {
  try {
    const data = await redis.hget(jobId, 'data');
    if (!data) return;

    const job = JSON.parse(data) as Job;
    job.status = JobStatus.PROCESSING;
    job.startedAt = Date.now();

    await redis.hset(jobId, 'data', JSON.stringify(job));
  } catch (error) {
    console.error('Start job error:', error);
  }
}

/**
 * Mark job as completed
 */
export async function completeJob(
  jobId: string,
  result: Record<string, any>
): Promise<void> {
  try {
    const data = await redis.hget(jobId, 'data');
    if (!data) return;

    const job = JSON.parse(data) as Job;
    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.completedAt = Date.now();

    await redis.hset(jobId, 'data', JSON.stringify(job));
    console.log(`Job completed: ${jobId}`);
  } catch (error) {
    console.error('Complete job error:', error);
  }
}

/**
 * Mark job as failed with retry logic
 */
export async function failJob(
  jobId: string,
  error: string
): Promise<boolean> {
  try {
    const data = await redis.hget(jobId, 'data');
    if (!data) return false;

    const job = JSON.parse(data) as Job;

    if (job.retries < job.maxRetries) {
      // Retry with exponential backoff
      job.retries++;
      job.status = JobStatus.RETRYING;
      job.nextRetryAt = Date.now() + Math.pow(2, job.retries) * 1000;
      job.error = error;

      await redis.hset(jobId, 'data', JSON.stringify(job));

      // Re-add to queue with new priority
      const config = JOB_CONFIG[job.type];
      const score = (10 - job.priority) * 1000000 + job.nextRetryAt;
      await redis.zadd(`queue:${job.type}`, score, jobId);

      console.log(
        `Job retry scheduled: ${jobId} (attempt ${job.retries}/${job.maxRetries})`
      );
      return true;
    } else {
      // Max retries exceeded, move to dead letter queue
      job.status = JobStatus.FAILED;
      job.error = error;
      job.completedAt = Date.now();

      await redis.hset(jobId, 'data', JSON.stringify(job));
      await redis.zadd('queue:dead_letter', Date.now(), jobId);

      console.error(`Job failed permanently: ${jobId} - ${error}`);
      return false;
    }
  } catch (err) {
    console.error('Fail job error:', err);
    return false;
  }
}

/**
 * Get next job from queue
 */
export async function getNextJob(type: JobType): Promise<Job | null> {
  try {
    const jobIds = await redis.zrange(`queue:${type}`, 0, 0);
    if (jobIds.length === 0) return null;

    const jobId = jobIds[0];
    const data = await redis.hget(jobId, 'data');
    if (!data) return null;

    const job = JSON.parse(data) as Job;

    // Check if job is ready (for retries)
    if (job.nextRetryAt && job.nextRetryAt > Date.now()) {
      return null; // Not ready yet
    }

    // Remove from queue
    await redis.zrem(`queue:${type}`, jobId);

    return job;
  } catch (error) {
    console.error('Get next job error:', error);
    return null;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<Record<string, number>> {
  try {
    const stats: Record<string, number> = {};

    for (const type of Object.values(JobType)) {
      const count = await redis.zcard(`queue:${type}`);
      stats[type] = count;
    }

    const deadLetterCount = await redis.zcard('queue:dead_letter');
    stats['dead_letter'] = deadLetterCount;

    return stats;
  } catch (error) {
    console.error('Get queue stats error:', error);
    return {};
  }
}

/**
 * Get dead letter queue jobs
 */
export async function getDeadLetterJobs(limit = 100): Promise<Job[]> {
  try {
    const jobIds = await redis.zrange('queue:dead_letter', 0, limit - 1);
    const jobs: Job[] = [];

    for (const jobId of jobIds) {
      const data = await redis.hget(jobId, 'data');
      if (data) {
        jobs.push(JSON.parse(data) as Job);
      }
    }

    return jobs;
  } catch (error) {
    console.error('Get dead letter jobs error:', error);
    return [];
  }
}

/**
 * Retry a dead letter job
 */
export async function retryDeadLetterJob(jobId: string): Promise<boolean> {
  try {
    const data = await redis.hget(jobId, 'data');
    if (!data) return false;

    const job = JSON.parse(data) as Job;

    // Reset retry count and move back to queue
    job.retries = 0;
    job.status = JobStatus.PENDING;
    job.error = undefined;

    await redis.hset(jobId, 'data', JSON.stringify(job));
    await redis.zrem('queue:dead_letter', jobId);

    const config = JOB_CONFIG[job.type];
    const score = (10 - job.priority) * 1000000 + job.createdAt;
    await redis.zadd(`queue:${job.type}`, score, jobId);

    console.log(`Dead letter job retried: ${jobId}`);
    return true;
  } catch (error) {
    console.error('Retry dead letter job error:', error);
    return false;
  }
}

/**
 * Clear completed jobs older than specified time
 */
export async function clearOldJobs(ageMs = 86400000): Promise<number> {
  try {
    const cutoffTime = Date.now() - ageMs;
    let cleared = 0;

    // This is a simplified version - in production, you'd want to
    // iterate through all jobs and check their completion time
    // For now, we'll just track the count

    return cleared;
  } catch (error) {
    console.error('Clear old jobs error:', error);
    return 0;
  }
}
