/**
 * Async Job Queue Worker
 * Processes background jobs for AI, video, audio, email, etc.
 */

import { jobQueue } from './job-queue';

export interface WorkerConfig {
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
}

export class JobQueueWorker {
  private config: WorkerConfig;
  private isRunning = false;
  private processedJobs = 0;
  private failedJobs = 0;

  constructor(config: WorkerConfig = { concurrency: 5, maxRetries: 3, retryDelay: 1000 }) {
    this.config = config;
  }

  /**
   * Start processing jobs
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Worker already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Job Queue Worker started (concurrency: ${this.config.concurrency})`);

    while (this.isRunning) {
      try {
        const jobs = jobQueue.getNextJobs(this.config.concurrency);
        
        if (jobs.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const promises = jobs.map(job => this.processJob(job));
        await Promise.all(promises);
      } catch (error) {
        console.error('❌ Worker error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Stop processing jobs
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Job Queue Worker stopped');
  }

  /**
   * Process individual job
   */
  private async processJob(job: any) {
    try {
      console.log(`⏳ Processing job: ${job.id} (${job.type})`);

      switch (job.type) {
        case 'ai_persona':
          await this.processAIPersona(job);
          break;
        case 'video_transcode':
          await this.processVideoTranscode(job);
          break;
        case 'audio_process':
          await this.processAudioProcess(job);
          break;
        case 'email_send':
          await this.processEmailSend(job);
          break;
        case 'image_optimize':
          await this.processImageOptimize(job);
          break;
        case 'content_moderation':
          await this.processModeration(job);
          break;
        case 'analytics_compute':
          await this.processAnalytics(job);
          break;
        case 'backup_create':
          await this.processBackup(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      jobQueue.completeJob(job.id);
      this.processedJobs++;
      console.log(`✅ Job completed: ${job.id}`);
    } catch (error: any) {
      console.error(`❌ Job failed: ${job.id}`, error.message);
      this.failedJobs++;
      jobQueue.failJob(job.id, error.message);
    }
  }

  private async processAIPersona(job: any) {
    console.log(`  → Training AI persona: ${job.data.personaId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async processVideoTranscode(job: any) {
    console.log(`  → Transcoding video: ${job.data.videoId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async processAudioProcess(job: any) {
    console.log(`  → Processing audio: ${job.data.audioId}`);
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  private async processEmailSend(job: any) {
    console.log(`  → Sending email to: ${job.data.email}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async processImageOptimize(job: any) {
    console.log(`  → Optimizing image: ${job.data.imageId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async processModeration(job: any) {
    console.log(`  → Moderating content: ${job.data.contentId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async processAnalytics(job: any) {
    console.log(`  → Computing analytics: ${job.data.period}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async processBackup(job: any) {
    console.log(`  → Creating backup: ${job.data.backupType}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Get worker statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      processedJobs: this.processedJobs,
      failedJobs: this.failedJobs,
      successRate: this.processedJobs > 0 ? ((this.processedJobs / (this.processedJobs + this.failedJobs)) * 100).toFixed(2) : '0',
    };
  }
}

export default JobQueueWorker;
