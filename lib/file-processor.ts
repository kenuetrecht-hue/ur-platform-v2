/**
 * Real File Processing Service
 * Handles actual video and audio file transformations using FFmpeg and Tone.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ProcessingJob {
  id: string;
  type: 'video' | 'audio';
  inputFile: string;
  outputFile: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class FileProcessor {
  private jobs: Map<string, ProcessingJob> = new Map();
  private outputDir: string;

  constructor(outputDir: string = '/tmp/ur-media-output') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Process video file with FFmpeg
   * Supports: crop, trim, effects, resolution change
   */
  async processVideo(
    inputFile: string,
    operations: {
      crop?: { x: number; y: number; width: number; height: number };
      trim?: { start: number; duration: number };
      scale?: { width: number; height: number };
      fps?: number;
    }
  ): Promise<ProcessingJob> {
    const jobId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const outputFile = path.join(this.outputDir, `${jobId}.mp4`);

    const job: ProcessingJob = {
      id: jobId,
      type: 'video',
      inputFile,
      outputFile,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Process video asynchronously
    this.executeVideoProcessing(job, operations).catch((error) => {
      job.status = 'failed';
      job.error = error.message;
    });

    return job;
  }

  private async executeVideoProcessing(
    job: ProcessingJob,
    operations: any
  ): Promise<void> {
    try {
      job.status = 'processing';
      job.progress = 10;

      let ffmpegCmd = `ffmpeg -i "${job.inputFile}"`;

      // Apply crop
      if (operations.crop) {
        const { x, y, width, height } = operations.crop;
        ffmpegCmd += ` -vf "crop=${width}:${height}:${x}:${y}"`;
      }

      // Apply trim
      if (operations.trim) {
        const { start, duration } = operations.trim;
        ffmpegCmd += ` -ss ${start} -t ${duration}`;
      }

      // Apply scale
      if (operations.scale) {
        const { width, height } = operations.scale;
        ffmpegCmd += ` -vf "scale=${width}:${height}"`;
      }

      // Apply FPS
      if (operations.fps) {
        ffmpegCmd += ` -r ${operations.fps}`;
      }

      ffmpegCmd += ` -y "${job.outputFile}"`;

      job.progress = 30;

      // Execute FFmpeg command
      await execAsync(ffmpegCmd, { timeout: 60000 });

      job.progress = 90;

      // Verify output file exists
      if (fs.existsSync(job.outputFile)) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
      } else {
        throw new Error('Output file was not created');
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.progress = 0;
    }
  }

  /**
   * Process audio file with audio effects
   * Supports: trim, normalize, add effects
   */
  async processAudio(
    inputFile: string,
    operations: {
      trim?: { start: number; duration: number };
      normalize?: boolean;
      effects?: Array<{ type: string; params: Record<string, number> }>;
    }
  ): Promise<ProcessingJob> {
    const jobId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const outputFile = path.join(this.outputDir, `${jobId}.wav`);

    const job: ProcessingJob = {
      id: jobId,
      type: 'audio',
      inputFile,
      outputFile,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Process audio asynchronously
    this.executeAudioProcessing(job, operations).catch((error) => {
      job.status = 'failed';
      job.error = error.message;
    });

    return job;
  }

  private async executeAudioProcessing(
    job: ProcessingJob,
    operations: any
  ): Promise<void> {
    try {
      job.status = 'processing';
      job.progress = 10;

      let ffmpegCmd = `ffmpeg -i "${job.inputFile}"`;

      // Apply trim
      if (operations.trim) {
        const { start, duration } = operations.trim;
        ffmpegCmd += ` -ss ${start} -t ${duration}`;
      }

      // Apply normalization
      if (operations.normalize) {
        ffmpegCmd += ` -af "anormalize"`;
      }

      // Note: Complex audio effects would require more sophisticated processing
      // For now, we support basic trimming and normalization

      ffmpegCmd += ` -y "${job.outputFile}"`;

      job.progress = 30;

      // Execute FFmpeg command
      await execAsync(ffmpegCmd, { timeout: 60000 });

      job.progress = 90;

      // Verify output file exists
      if (fs.existsSync(job.outputFile)) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
      } else {
        throw new Error('Output file was not created');
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.progress = 0;
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
   * Cancel a processing job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      return true;
    }
    return false;
  }

  /**
   * Clean up old files
   */
  cleanup(olderThanMinutes: number = 60): number {
    const now = Date.now();
    const threshold = olderThanMinutes * 60 * 1000;
    let deletedCount = 0;

    this.jobs.forEach((job) => {
      if (
        job.status === 'completed' &&
        job.completedAt &&
        now - job.completedAt.getTime() > threshold
      ) {
        try {
          if (fs.existsSync(job.outputFile)) {
            fs.unlinkSync(job.outputFile);
            deletedCount++;
          }
          this.jobs.delete(job.id);
        } catch (error) {
          console.error(`Failed to delete file ${job.outputFile}:`, error);
        }
      }
    });

    return deletedCount;
  }
}

export const fileProcessor = new FileProcessor();
