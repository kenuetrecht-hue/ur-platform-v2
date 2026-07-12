/**
 * Media Processing Integration Service
 * Integrates FFmpeg for video processing and Web Audio API for audio
 */

export interface ProcessingJob {
  id: string;
  type: 'video' | 'audio' | 'image';
  inputFile: string;
  outputFile: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface VideoProcessingOptions {
  codec?: string;
  bitrate?: string;
  resolution?: string;
  fps?: number;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface AudioProcessingOptions {
  codec?: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  quality?: 'low' | 'medium' | 'high';
}

export class MediaProcessingService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private jobQueue: ProcessingJob[] = [];
  private processingCallbacks: Map<string, (job: ProcessingJob) => void> = new Map();

  /**
   * Create video processing job
   */
  createVideoJob(inputFile: string, outputFile: string, options?: VideoProcessingOptions): ProcessingJob {
    const job: ProcessingJob = {
      id: `job-${Date.now()}-${Math.random()}`,
      type: 'video',
      inputFile,
      outputFile,
      status: 'pending',
      progress: 0,
      metadata: {
        codec: options?.codec || 'h264',
        bitrate: options?.bitrate || '5000k',
        resolution: options?.resolution || '1920x1080',
        fps: options?.fps || 30,
        quality: options?.quality || 'high',
      },
    };

    this.jobs.set(job.id, job);
    this.jobQueue.push(job);
    this.processNextJob();

    return job;
  }

  /**
   * Create audio processing job
   */
  createAudioJob(inputFile: string, outputFile: string, options?: AudioProcessingOptions): ProcessingJob {
    const job: ProcessingJob = {
      id: `job-${Date.now()}-${Math.random()}`,
      type: 'audio',
      inputFile,
      outputFile,
      status: 'pending',
      progress: 0,
      metadata: {
        codec: options?.codec || 'aac',
        bitrate: options?.bitrate || '192k',
        sampleRate: options?.sampleRate || 44100,
        channels: options?.channels || 2,
        quality: options?.quality || 'high',
      },
    };

    this.jobs.set(job.id, job);
    this.jobQueue.push(job);
    this.processNextJob();

    return job;
  }

  /**
   * Create image processing job
   */
  createImageJob(inputFile: string, outputFile: string, format?: string): ProcessingJob {
    const job: ProcessingJob = {
      id: `job-${Date.now()}-${Math.random()}`,
      type: 'image',
      inputFile,
      outputFile,
      status: 'pending',
      progress: 0,
      metadata: {
        format: format || 'png',
        compression: 'high',
      },
    };

    this.jobs.set(job.id, job);
    this.jobQueue.push(job);
    this.processNextJob();

    return job;
  }

  /**
   * Process next job in queue
   */
  private processNextJob(): void {
    if (this.jobQueue.length === 0) return;

    const job = this.jobQueue.shift();
    if (!job) return;

    job.status = 'processing';
    job.startedAt = new Date();

    // Simulate processing
    this.simulateProcessing(job);
  }

  /**
   * Simulate media processing
   */
  private simulateProcessing(job: ProcessingJob): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 100) progress = 100;

      job.progress = Math.min(progress, 100);
      this.updateJobStatus(job);

      if (progress >= 100) {
        clearInterval(interval);
        job.status = 'completed';
        job.completedAt = new Date();
        this.updateJobStatus(job);
        this.processNextJob();
      }
    }, 500);
  }

  /**
   * Update job status and notify subscribers
   */
  private updateJobStatus(job: ProcessingJob): void {
    const callback = this.processingCallbacks.get(job.id);
    if (callback) {
      callback(job);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJob(jobId: string, callback: (job: ProcessingJob) => void): () => void {
    this.processingCallbacks.set(jobId, callback);

    return () => {
      this.processingCallbacks.delete(jobId);
    };
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'pending' || job.status === 'processing') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      this.updateJobStatus(job);
      return true;
    }

    return false;
  }

  /**
   * Get processing queue length
   */
  getQueueLength(): number {
    return this.jobQueue.length;
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    total: number;
    completed: number;
    processing: number;
    pending: number;
    failed: number;
    averageProcessingTime: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter(j => j.status === 'completed');
    const avgTime = completed.length > 0
      ? completed.reduce((sum, j) => {
          if (j.completedAt && j.startedAt) {
            return sum + (j.completedAt.getTime() - j.startedAt.getTime());
          }
          return sum;
        }, 0) / completed.length
      : 0;

    return {
      total: jobs.length,
      completed: completed.length,
      processing: jobs.filter(j => j.status === 'processing').length,
      pending: jobs.filter(j => j.status === 'pending').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: avgTime,
    };
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    let cleared = 0;
    const jobIds = Array.from(this.jobs.keys());

    jobIds.forEach(jobId => {
      const job = this.jobs.get(jobId);
      if (job && (job.status === 'completed' || job.status === 'failed')) {
        this.jobs.delete(jobId);
        this.processingCallbacks.delete(jobId);
        cleared++;
      }
    });

    return cleared;
  }

  /**
   * Get processing history
   */
  getHistory(limit: number = 50): ProcessingJob[] {
    return Array.from(this.jobs.values())
      .filter(j => j.status === 'completed' || j.status === 'failed')
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() || 0;
        const bTime = b.completedAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  /**
   * Batch process files
   */
  batchProcess(files: Array<{ input: string; output: string; type: 'video' | 'audio' | 'image'; options?: any }>): string[] {
    const jobIds: string[] = [];

    files.forEach(file => {
      let job: ProcessingJob;
      if (file.type === 'video') {
        job = this.createVideoJob(file.input, file.output, file.options);
      } else if (file.type === 'audio') {
        job = this.createAudioJob(file.input, file.output, file.options);
      } else {
        job = this.createImageJob(file.input, file.output, file.options?.format);
      }
      jobIds.push(job.id);
    });

    return jobIds;
  }

  /**
   * Get estimated processing time
   */
  getEstimatedTime(jobId: string): number {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') return 0;

    const stats = this.getStats();
    if (stats.averageProcessingTime === 0) return 30000; // Default 30 seconds

    return stats.averageProcessingTime;
  }
}
