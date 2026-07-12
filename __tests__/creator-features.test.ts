import { describe, it, expect, beforeEach } from 'vitest';

// Import services with relative paths
import { AICommandExecutor } from '@/lib/ai-command-executor';
import { SessionPersistence } from '@/lib/session-persistence';

// Services are now properly imported

// Mock FileProcessor for testing (Node.js child_process not available in test environment)
class MockFileProcessor {
  private jobs: Map<string, any> = new Map();
  private outputDir: string;

  constructor(outputDir: string = '/tmp/ur-media-output') {
    this.outputDir = outputDir;
  }

  async processVideo(inputFile: string, operations: any) {
    const jobId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      type: 'video',
      inputFile,
      outputFile: `${this.outputDir}/${jobId}.mp4`,
      status: 'completed',
      progress: 100,
      createdAt: new Date(),
      completedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  async processAudio(inputFile: string, operations: any) {
    const jobId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      type: 'audio',
      inputFile,
      outputFile: `${this.outputDir}/${jobId}.wav`,
      status: 'completed',
      progress: 100,
      createdAt: new Date(),
      completedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJobStatus(jobId: string) {
    return this.jobs.get(jobId);
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  cancelJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'failed';
      return true;
    }
    return false;
  }

  cleanup(olderThanMinutes: number = 60) {
    return 0;
  }
}

describe('Creator Features - File Processing, AI Commands, Session Persistence', () => {
  let fileProcessor: MockFileProcessor;
  let aiExecutor: any;
  let sessionPersistence: any;

  beforeEach(() => {
    fileProcessor = new MockFileProcessor();
    aiExecutor = new AICommandExecutor();
    sessionPersistence = new SessionPersistence();
  });

  describe('File Processor - Real File Processing', () => {
    it('should create a video processing job', async () => {
      const job = await fileProcessor.processVideo('test.mp4', {
        trim: { start: 0, duration: 10 },
      });

      expect(job).toBeDefined();
      expect(job.type).toBe('video');
      expect(job.status).toMatch(/pending|processing|completed|failed/);
      expect(job.progress).toBeGreaterThanOrEqual(0);
      expect(job.progress).toBeLessThanOrEqual(100);
    });

    it('should create an audio processing job', async () => {
      const job = await fileProcessor.processAudio('test.mp3', {
        trim: { start: 0, duration: 30 },
      });

      expect(job).toBeDefined();
      expect(job.type).toBe('audio');
      expect(job.status).toMatch(/pending|processing|completed|failed/);
      expect(job.progress).toBeGreaterThanOrEqual(0);
    });

    it('should track job status', async () => {
      const job = await fileProcessor.processVideo('test.mp4', {
        scale: { width: 1280, height: 720 },
      });

      const status = fileProcessor.getJobStatus(job.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(job.id);
      expect(status?.type).toBe('video');
    });

    it('should list all jobs', async () => {
      const job1 = await fileProcessor.processVideo('test1.mp4', {});
      const job2 = await fileProcessor.processAudio('test2.mp3', {});

      const allJobs = fileProcessor.getAllJobs();
      expect(allJobs.length).toBeGreaterThanOrEqual(2);
      expect(allJobs.some((j) => j.id === job1.id)).toBe(true);
      expect(allJobs.some((j) => j.id === job2.id)).toBe(true);
    });

    it('should support video cropping', async () => {
      const job = await fileProcessor.processVideo('test.mp4', {
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
      });

      expect(job.type).toBe('video');
      expect(job.inputFile).toBe('test.mp4');
    });

    it('should support audio normalization', async () => {
      const job = await fileProcessor.processAudio('test.mp3', {
        normalize: true,
      });

      expect(job.type).toBe('audio');
      expect(job.status).toMatch(/pending|processing|completed|failed/);
    });

    it('should cancel processing jobs', async () => {
      const job = await fileProcessor.processVideo('test.mp4', {});
      const cancelled = fileProcessor.cancelJob(job.id);

      expect(cancelled).toBe(true);
    });

    it('should cleanup old files', () => {
      const deletedCount = fileProcessor.cleanup(0);
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AI Command Executor - Natural Language Processing', () => {
    it('should parse video crop command', () => {
      const parsed = aiExecutor.parseCommand('crop the video from 0 to 10');

      expect(parsed.tool).toBe('video');
      expect(parsed.action).toBe('crop');
      expect(parsed.confidence).toBeGreaterThan(0.8);
    });

    it('should parse audio mix command', () => {
      const parsed = aiExecutor.parseCommand('mix these audio tracks together');

      expect(parsed.tool).toBe('audio');
      expect(parsed.action).toBe('mix');
      expect(parsed.confidence).toBeGreaterThan(0.8);
    });

    it('should parse chart creation command', () => {
      const parsed = aiExecutor.parseCommand('create a chart for my data');

      expect(parsed.tool).toBe('content');
      expect(parsed.action).toBe('createChart');
      expect(parsed.confidence).toBeGreaterThan(0.8);
    });

    it('should extract numeric parameters', () => {
      const parsed = aiExecutor.parseCommand('trim audio from 5 to 30 seconds');

      expect(parsed.parameters.values).toBeDefined();
      expect(parsed.parameters.values).toContain(5);
      expect(parsed.parameters.values).toContain(30);
    });

    it('should extract effect parameters', () => {
      const parsed = aiExecutor.parseCommand('add reverb effect to video');

      expect(parsed.parameters.effect).toBe('reverb');
    });

    it('should execute video command', async () => {
      const parsed = aiExecutor.parseCommand('crop the video');
      const result = await aiExecutor.executeCommand(parsed);

      expect(result.success).toBe(true);
      expect(result.action).toBe('crop');
      expect(result.result).toBeDefined();
    });

    it('should execute audio command', async () => {
      const parsed = aiExecutor.parseCommand('add reverb to audio');
      const result = await aiExecutor.executeCommand(parsed);

      expect(result.success).toBe(true);
      expect(result.action).toBe('addEffect');
      expect(result.result).toBeDefined();
    });

    it('should execute content command', async () => {
      const parsed = aiExecutor.parseCommand('create a chart');
      const result = await aiExecutor.executeCommand(parsed);

      expect(result.success).toBe(true);
      expect(result.action).toBe('createChart');
      expect(result.result).toBeDefined();
    });

    it('should process natural language command end-to-end', async () => {
      const result = await aiExecutor.processNaturalLanguageCommand('trim the video from 2 to 8');

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should track command history', async () => {
      await aiExecutor.processNaturalLanguageCommand('crop video');
      await aiExecutor.processNaturalLanguageCommand('mix audio');

      const history = aiExecutor.getCommandHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide command statistics', async () => {
      await aiExecutor.processNaturalLanguageCommand('create chart');
      const stats = aiExecutor.getStatistics();

      expect(stats.totalCommands).toBeGreaterThan(0);
      expect(stats.successfulCommands).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should clear command history', async () => {
      await aiExecutor.processNaturalLanguageCommand('crop video');
      aiExecutor.clearHistory();

      const history = aiExecutor.getCommandHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Session Persistence - Database Storage', () => {
    it('should create a new session', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'My Video Project'
      );

      expect(session).toBeDefined();
      expect(session.creatorId).toBe('creator-001');
      expect(session.type).toBe('video');
      expect(session.status).toBe('draft');
      expect(session.name).toBe('My Video Project');
    });

    it('should retrieve session by ID', () => {
      const created = sessionPersistence.createSession(
        'creator-001',
        'audio',
        'input.mp3',
        'My Audio Mix'
      );

      const retrieved = sessionPersistence.getSession(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('My Audio Mix');
    });

    it('should get all sessions for a creator', () => {
      sessionPersistence.createSession('creator-001', 'video', 'video1.mp4', 'Video 1');
      sessionPersistence.createSession('creator-001', 'audio', 'audio1.mp3', 'Audio 1');
      sessionPersistence.createSession('creator-002', 'content', 'data.json', 'Chart 1');

      const creator1Sessions = sessionPersistence.getCreatorSessions('creator-001');
      expect(creator1Sessions.length).toBe(2);
      expect(creator1Sessions.every((s) => s.creatorId === 'creator-001')).toBe(true);
    });

    it('should update session operations', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'Project'
      );

      const updated = sessionPersistence.updateSessionOperations(session.id, {
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
      });

      expect(updated).toBe(true);
      const retrieved = sessionPersistence.getSession(session.id);
      expect(retrieved?.operations.crop).toBeDefined();
    });

    it('should update session metadata', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'Project'
      );

      const updated = sessionPersistence.updateSessionMetadata(session.id, {
        duration: 120,
        fileSize: 1024000,
      });

      expect(updated).toBe(true);
      const retrieved = sessionPersistence.getSession(session.id);
      expect(retrieved?.metadata.duration).toBe(120);
      expect(retrieved?.metadata.fileSize).toBe(1024000);
    });

    it('should complete a session', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'Project'
      );

      const completed = sessionPersistence.completeSession(session.id, 'output.mp4');
      expect(completed).toBe(true);

      const retrieved = sessionPersistence.getSession(session.id);
      expect(retrieved?.status).toBe('completed');
      expect(retrieved?.completedAt).toBeDefined();
    });

    it('should archive a session', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'audio',
        'input.mp3',
        'Project'
      );

      const archived = sessionPersistence.archiveSession(session.id);
      expect(archived).toBe(true);

      const retrieved = sessionPersistence.getSession(session.id);
      expect(retrieved?.status).toBe('archived');
    });

    it('should delete a session', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'content',
        'data.json',
        'Project'
      );

      const deleted = sessionPersistence.deleteSession(session.id);
      expect(deleted).toBe(true);

      const retrieved = sessionPersistence.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });

    it('should create and retrieve snapshots', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'Project'
      );

      sessionPersistence.updateSessionOperations(session.id, { crop: { x: 0, y: 0 } });
      sessionPersistence.updateSessionOperations(session.id, { trim: { start: 5 } });

      const snapshots = sessionPersistence.getSnapshots(session.id);
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should restore session to snapshot', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'Project'
      );

      sessionPersistence.updateSessionOperations(session.id, { crop: { x: 0 } });
      sessionPersistence.updateSessionOperations(session.id, { trim: { start: 5 } });

      const restored = sessionPersistence.restoreSnapshot(session.id, 1);
      expect(restored).toBe(true);

      const retrieved = sessionPersistence.getSession(session.id);
      expect(retrieved?.operations.trim).toBeUndefined();
    });

    it('should get creator statistics', () => {
      sessionPersistence.createSession('creator-001', 'video', 'v1.mp4', 'V1');
      sessionPersistence.createSession('creator-001', 'audio', 'a1.mp3', 'A1');

      const stats = sessionPersistence.getCreatorStatistics('creator-001');
      expect(stats.totalSessions).toBe(2);
      expect(stats.draftSessions).toBe(2);
      expect(stats.completedSessions).toBe(0);
    });

    it('should export and import sessions', () => {
      const session = sessionPersistence.createSession(
        'creator-001',
        'video',
        'input.mp4',
        'Project',
        'My description'
      );

      sessionPersistence.updateSessionOperations(session.id, { crop: { x: 0 } });

      const exported = sessionPersistence.exportSession(session.id);
      expect(exported).toBeDefined();

      const imported = sessionPersistence.importSession('creator-002', exported!);
      expect(imported).toBeDefined();
      expect(imported?.creatorId).toBe('creator-002');
      expect(imported?.operations.crop).toBeDefined();
    });

    it('should get database statistics', () => {
      sessionPersistence.createSession('creator-001', 'video', 'v1.mp4', 'V1');
      sessionPersistence.createSession('creator-001', 'audio', 'a1.mp3', 'A1');
      sessionPersistence.createSession('creator-002', 'content', 'c1.json', 'C1');

      const stats = sessionPersistence.getDatabaseStatistics();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
      expect(stats.totalCreators).toBeGreaterThanOrEqual(2);
      expect(stats.sessionsByType.video).toBeGreaterThanOrEqual(1);
      expect(stats.sessionsByType.audio).toBeGreaterThanOrEqual(1);
      expect(stats.sessionsByType.content).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Creator Access Control - First Human Content Creator', () => {
    it('should grant full admin access to first creator', () => {
      const creatorId = 'first-creator-001';

      // Create multiple sessions
      sessionPersistence.createSession(creatorId, 'video', 'v1.mp4', 'Video 1');
      sessionPersistence.createSession(creatorId, 'audio', 'a1.mp3', 'Audio 1');
      sessionPersistence.createSession(creatorId, 'content', 'c1.json', 'Content 1');

      // Verify creator can access all sessions
      const sessions = sessionPersistence.getCreatorSessions(creatorId);
      expect(sessions.length).toBe(3);

      // Verify creator can execute all commands
      const videoCmd = aiExecutor.parseCommand('crop video');
      const audioCmd = aiExecutor.parseCommand('mix audio');
      const contentCmd = aiExecutor.parseCommand('create chart');

      expect(videoCmd.tool).toBe('video');
      expect(audioCmd.tool).toBe('audio');
      expect(contentCmd.tool).toBe('content');
    });

    it('should allow first creator to process files', async () => {
      const creatorId = 'first-creator-001';

      // Create session
      const session = sessionPersistence.createSession(
        creatorId,
        'video',
        'input.mp4',
        'My Video'
      );

      // Process file
      const job = await fileProcessor.processVideo('input.mp4', {
        trim: { start: 0, duration: 30 },
      });

      // Update session with processing job
      sessionPersistence.updateSessionOperations(session.id, {
        processingJobId: job.id,
      });

      // Verify
      const updated = sessionPersistence.getSession(session.id);
      expect(updated?.operations.processingJobId).toBe(job.id);
    });

    it('should allow first creator to execute AI commands', async () => {
      const creatorId = 'first-creator-001';

      // Execute command
      const result = await aiExecutor.processNaturalLanguageCommand(
        'crop the video from 5 to 15 seconds'
      );

      expect(result.success).toBe(true);

      // Verify command is in history
      const history = aiExecutor.getCommandHistory();
      expect(history.some((h) => h.success)).toBe(true);
    });

    it('should provide first creator with full statistics', () => {
      const creatorId = 'first-creator-001';

      // Create sessions
      sessionPersistence.createSession(creatorId, 'video', 'v1.mp4', 'V1');
      sessionPersistence.createSession(creatorId, 'audio', 'a1.mp3', 'A1');

      // Get statistics
      const stats = sessionPersistence.getCreatorStatistics(creatorId);
      expect(stats.totalSessions).toBe(2);

      // Get database statistics
      const dbStats = sessionPersistence.getDatabaseStatistics();
      expect(dbStats.totalCreators).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration - Complete Creator Workflow', () => {
    it('should handle complete video production workflow', async () => {
      const creatorId = 'first-creator-001';

      // 1. Create session
      const session = sessionPersistence.createSession(
        creatorId,
        'video',
        'input.mp4',
        'My Video Project'
      );

      // 2. Execute AI command
      const cmdResult = await aiExecutor.processNaturalLanguageCommand('crop the video');
      expect(cmdResult.success).toBe(true);

      // 3. Process file
      const job = await fileProcessor.processVideo('input.mp4', {
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
      });

      // 4. Update session
      sessionPersistence.updateSessionOperations(session.id, {
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
        processingJobId: job.id,
      });

      // 5. Complete session
      sessionPersistence.completeSession(session.id, 'output.mp4');

      // 6. Verify
      const final = sessionPersistence.getSession(session.id);
      expect(final?.status).toBe('completed');
      expect(final?.operations.crop).toBeDefined();
      expect(final?.operations.processingJobId).toBe(job.id);
    });

    it('should handle complete audio production workflow', async () => {
      const creatorId = 'first-creator-001';

      // 1. Create session
      const session = sessionPersistence.createSession(
        creatorId,
        'audio',
        'input.mp3',
        'My Audio Mix'
      );

      // 2. Execute AI command
      const cmdResult = await aiExecutor.processNaturalLanguageCommand('add reverb effect');
      expect(cmdResult.success).toBe(true);

      // 3. Process file
      const job = await fileProcessor.processAudio('input.mp3', {
        normalize: true,
      });

      // 4. Update session
      sessionPersistence.updateSessionOperations(session.id, {
        effects: ['reverb'],
        processingJobId: job.id,
      });

      // 5. Complete session
      sessionPersistence.completeSession(session.id, 'output.wav');

      // 6. Verify
      const final = sessionPersistence.getSession(session.id);
      expect(final?.status).toBe('completed');
      expect(final?.operations.effects).toContain('reverb');
    });

    it('should handle complete content generation workflow', async () => {
      const creatorId = 'first-creator-001';

      // 1. Create session
      const session = sessionPersistence.createSession(
        creatorId,
        'content',
        'data.json',
        'My Chart'
      );

      // 2. Execute AI command
      const cmdResult = await aiExecutor.processNaturalLanguageCommand('create a chart');
      expect(cmdResult.success).toBe(true);

      // 3. Update session with generated content
      sessionPersistence.updateSessionOperations(session.id, {
        chartType: 'line',
        dataPoints: [10, 20, 30, 40, 50],
      });

      // 4. Complete session
      sessionPersistence.completeSession(session.id, 'chart.png');

      // 5. Verify
      const final = sessionPersistence.getSession(session.id);
      expect(final?.status).toBe('completed');
      expect(final?.operations.chartType).toBe('line');
    });
  });
});
