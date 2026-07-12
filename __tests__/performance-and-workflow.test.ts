import { describe, it, expect, beforeEach } from 'vitest';
import { performanceOptimizer } from '../lib/performance-optimizer';
import { creatorWorkflowOptimizer } from '../lib/creator-workflow-optimizer';

describe('Performance Optimizer', () => {
  beforeEach(() => {
    performanceOptimizer.clearCache();
    performanceOptimizer.resetQueryStats();
  });

  describe('Cache Management', () => {
    it('should set and get cached data', () => {
      performanceOptimizer.set('test_key', { data: 'test' }, 60000);
      const result = performanceOptimizer.get('test_key');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for expired cache', () => {
      performanceOptimizer.set('test_key', { data: 'test' }, 1);
      setTimeout(() => {
        const result = performanceOptimizer.get('test_key');
        expect(result).toBeNull();
      }, 10);
    });

    it('should check cache existence', () => {
      performanceOptimizer.set('test_key', { data: 'test' }, 60000);
      expect(performanceOptimizer.has('test_key')).toBe(true);
      expect(performanceOptimizer.has('nonexistent')).toBe(false);
    });

    it('should invalidate specific cache keys', () => {
      performanceOptimizer.set('test_key_1', { data: 'test1' }, 60000);
      performanceOptimizer.set('test_key_2', { data: 'test2' }, 60000);
      performanceOptimizer.invalidate('test_key_1');
      expect(performanceOptimizer.has('test_key_1')).toBe(false);
      expect(performanceOptimizer.has('test_key_2')).toBe(true);
    });

    it('should invalidate cache by pattern', () => {
      performanceOptimizer.set('user_1', { data: 'user1' }, 60000);
      performanceOptimizer.set('user_2', { data: 'user2' }, 60000);
      performanceOptimizer.set('product_1', { data: 'product1' }, 60000);
      performanceOptimizer.invalidatePattern(/^user_/);
      expect(performanceOptimizer.has('user_1')).toBe(false);
      expect(performanceOptimizer.has('user_2')).toBe(false);
      expect(performanceOptimizer.has('product_1')).toBe(true);
    });

    it('should clear all cache', () => {
      performanceOptimizer.set('key1', { data: 'test1' }, 60000);
      performanceOptimizer.set('key2', { data: 'test2' }, 60000);
      performanceOptimizer.clearCache();
      expect(performanceOptimizer.has('key1')).toBe(false);
      expect(performanceOptimizer.has('key2')).toBe(false);
    });
  });

  describe('Media Optimization', () => {
    it('should optimize large images', () => {
      const result = performanceOptimizer.optimizeImage(3840, 2160);
      expect(result.width).toBeLessThanOrEqual(1920);
      expect(result.height).toBeLessThanOrEqual(1080);
    });

    it('should maintain aspect ratio', () => {
      const result = performanceOptimizer.optimizeImage(1920, 1080);
      const aspectRatio = result.width / result.height;
      expect(aspectRatio).toBeCloseTo(1920 / 1080, 1);
    });

    it('should not upscale small images', () => {
      const result = performanceOptimizer.optimizeImage(800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should set media config', () => {
      performanceOptimizer.setMediaConfig({ quality: 0.9, format: 'jpeg' });
      const result = performanceOptimizer.optimizeImage(1920, 1080);
      expect(result.quality).toBeLessThanOrEqual(0.9);
      expect(result.format).toBe('jpeg');
    });
  });

  describe('Query Optimization', () => {
    it('should cache query results', async () => {
      let callCount = 0;
      const queryFn = async () => {
        callCount++;
        return { data: 'test' };
      };

      const result1 = await performanceOptimizer.optimizeQuery('query_1', queryFn);
      const result2 = await performanceOptimizer.optimizeQuery('query_1', queryFn);

      expect(result1).toEqual(result2);
      expect(callCount).toBe(1); // Should only be called once
    });

    it('should track query statistics', async () => {
      const queryFn = async () => ({ data: 'test' });

      await performanceOptimizer.optimizeQuery('query_1', queryFn);
      await performanceOptimizer.optimizeQuery('query_1', queryFn);
      await performanceOptimizer.optimizeQuery('query_2', queryFn);

      const stats = performanceOptimizer.getQueryStats();
      expect(stats.totalQueries).toBeGreaterThanOrEqual(2);
      expect(stats.cachedQueries).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate cache hit rate', async () => {
      const queryFn = async () => ({ data: 'test' });

      await performanceOptimizer.optimizeQuery('query_1', queryFn);
      await performanceOptimizer.optimizeQuery('query_1', queryFn);

      const metrics = performanceOptimizer.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toContain('50');
    });

    it('should report cache statistics', () => {
      performanceOptimizer.set('key1', { data: 'test1' }, 60000);
      performanceOptimizer.set('key2', { data: 'test2' }, 60000);

      const metrics = performanceOptimizer.getPerformanceMetrics();
      expect(metrics.cache.entries).toBe(2);
    });
  });
});

describe('Creator Workflow Optimizer', () => {
  beforeEach(() => {
    creatorWorkflowOptimizer.initializeTemplates();
  });

  describe('One-Click Scheduling', () => {
    it('should schedule content with optimal time', async () => {
      creatorWorkflowOptimizer.setCreatorProfile('creator_1', { niche: 'tech', audience: 1000 });

      const scheduled = await creatorWorkflowOptimizer.quickSchedule('content_1', ['youtube', 'tiktok'], 'creator_1');

      expect(scheduled.id).toBeDefined();
      expect(scheduled.contentId).toBe('content_1');
      expect(scheduled.platforms).toContain('youtube');
      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.scheduledTime).toBeInstanceOf(Date);
    });

    it('should add to schedule queue', async () => {
      creatorWorkflowOptimizer.setCreatorProfile('creator_1', { niche: 'tech' });

      await creatorWorkflowOptimizer.quickSchedule('content_1', ['youtube'], 'creator_1');
      await creatorWorkflowOptimizer.quickSchedule('content_2', ['tiktok'], 'creator_1');

      const queue = creatorWorkflowOptimizer.getScheduleQueue();
      expect(queue.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Drag-and-Drop Management', () => {
    it('should initialize drag-drop items', () => {
      const items = [
        { id: '1', title: 'Intro', type: 'video' as const, order: 0 },
        { id: '2', title: 'Content', type: 'video' as const, order: 1 },
        { id: '3', title: 'Outro', type: 'video' as const, order: 2 },
      ];

      creatorWorkflowOptimizer.initializeDragDrop('project_1', items);
      const result = creatorWorkflowOptimizer.getDragDropItems('project_1');

      expect(result.length).toBe(3);
      expect(result[0].title).toBe('Intro');
    });

    it('should reorder items', () => {
      const items = [
        { id: '1', title: 'Intro', type: 'video' as const, order: 0 },
        { id: '2', title: 'Content', type: 'video' as const, order: 1 },
        { id: '3', title: 'Outro', type: 'video' as const, order: 2 },
      ];

      creatorWorkflowOptimizer.initializeDragDrop('project_1', items);
      const reordered = creatorWorkflowOptimizer.reorderItems('project_1', 0, 2);

      expect(reordered[0].title).toBe('Content');
      expect(reordered[2].title).toBe('Intro');
    });
  });

  describe('AI Content Suggestions', () => {
    it('should generate content suggestions', () => {
      creatorWorkflowOptimizer.setCreatorProfile('creator_1', { niche: 'tech', audience: 5000 });

      const suggestions = creatorWorkflowOptimizer.generateContentSuggestions('creator_1', 3);

      expect(suggestions.length).toBe(3);
      suggestions.forEach((s) => {
        expect(s.topic).toBeDefined();
        expect(s.format).toBeDefined();
        expect(s.bestTime).toBeInstanceOf(Date);
        expect(s.estimatedEngagement).toBeGreaterThan(0);
        expect(s.reasoning).toBeDefined();
      });
    });
  });

  describe('Batch Upload', () => {
    it('should start batch upload job', async () => {
      const items = [{ id: '1', file: 'video1.mp4' }, { id: '2', file: 'video2.mp4' }];

      const job = await creatorWorkflowOptimizer.startBatchUpload('creator_1', items);

      expect(job.id).toBeDefined();
      expect(job.totalItems).toBe(2);
      expect(job.status).toBe('completed');
      expect(job.progress).toBe(100);
    });

    it('should track batch upload progress', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i), file: `video${i}.mp4` }));
      let lastProgress = 0;

      const job = await creatorWorkflowOptimizer.startBatchUpload('creator_1', items, (progress) => {
        lastProgress = progress;
      });

      expect(lastProgress).toBe(100);
      expect(job.processedItems).toBe(5);
    });

    it('should get batch upload status', async () => {
      const items = [{ id: '1', file: 'video1.mp4' }];

      const job = await creatorWorkflowOptimizer.startBatchUpload('creator_1', items);
      const status = creatorWorkflowOptimizer.getBatchUploadStatus(job.id);

      expect(status).toBeDefined();
      expect(status?.status).toBe('completed');
    });
  });

  describe('Smart Templates', () => {
    it('should get all templates', () => {
      const templates = creatorWorkflowOptimizer.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', () => {
      const templates = creatorWorkflowOptimizer.getTemplates('educational');
      expect(templates.every((t) => t.category === 'educational')).toBe(true);
    });

    it('should customize template for creator', () => {
      const templates = creatorWorkflowOptimizer.getTemplates();
      const templateId = templates[0].id;

      const customized = creatorWorkflowOptimizer.customizeTemplate('creator_1', templateId);

      expect(customized).toBeDefined();
      expect(customized?.aiCustomized).toBe(true);
      expect(customized?.id).not.toBe(templateId);
    });
  });

  describe('Workflow Statistics', () => {
    it('should get workflow statistics', async () => {
      creatorWorkflowOptimizer.setCreatorProfile('creator_1', { niche: 'tech' });

      await creatorWorkflowOptimizer.quickSchedule('content_1', ['youtube'], 'creator_1');

      const stats = creatorWorkflowOptimizer.getWorkflowStats('creator_1');

      expect(stats.scheduledContent).toBeGreaterThan(0);
      expect(stats.availableTemplates).toBeGreaterThan(0);
    });
  });
});
