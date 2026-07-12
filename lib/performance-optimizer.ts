/**
 * Performance Optimizer Service
 * Handles caching, media optimization, database query optimization, code splitting, and real-time sync
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface MediaOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
}

interface QueryOptimizationStats {
  totalQueries: number;
  cachedQueries: number;
  executionTime: number;
  savedTime: number;
}

export class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private queryStats: QueryOptimizationStats = {
    totalQueries: 0,
    cachedQueries: 0,
    executionTime: 0,
    savedTime: 0,
  };
  private mediaConfig: MediaOptimizationConfig = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'webp',
  };

  /**
   * Cache Management
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if cache has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }

  /**
   * Media Optimization
   */
  optimizeImage(
    width: number,
    height: number,
    quality: number = this.mediaConfig.quality
  ): { width: number; height: number; quality: number; format: string } {
    const maxWidth = this.mediaConfig.maxWidth;
    const maxHeight = this.mediaConfig.maxHeight;

    let optimizedWidth = width;
    let optimizedHeight = height;

    // Scale down if larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      if (width > maxWidth) {
        optimizedWidth = maxWidth;
        optimizedHeight = Math.round(maxWidth / aspectRatio);
      }
      if (optimizedHeight > maxHeight) {
        optimizedHeight = maxHeight;
        optimizedWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    return {
      width: optimizedWidth,
      height: optimizedHeight,
      quality: Math.min(quality, this.mediaConfig.quality),
      format: this.mediaConfig.format,
    };
  }

  setMediaConfig(config: Partial<MediaOptimizationConfig>): void {
    this.mediaConfig = { ...this.mediaConfig, ...config };
  }

  /**
   * Database Query Optimization
   */
  async optimizeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    this.queryStats.totalQueries++;

    // Check cache first
    const cached = this.get<T>(queryKey);
    if (cached) {
      this.queryStats.cachedQueries++;
      return cached;
    }

    // Execute query and cache result
    const startTime = Date.now();
    const result = await queryFn();
    const executionTime = Date.now() - startTime;

    this.queryStats.executionTime += executionTime;
    this.set(queryKey, result, ttlMs);

    // Calculate saved time (if this was cached, it would have been instant)
    this.queryStats.savedTime += executionTime * (this.queryStats.cachedQueries / this.queryStats.totalQueries);

    return result;
  }

  getQueryStats(): QueryOptimizationStats {
    return { ...this.queryStats };
  }

  resetQueryStats(): void {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      executionTime: 0,
      savedTime: 0,
    };
  }

  /**
   * Code Splitting & Lazy Loading
   */
  createLazyLoader<T>(loadFn: () => Promise<T>) {
    let loaded: T | null = null;
    let loading: Promise<T> | null = null;

    return {
      load: async (): Promise<T> => {
        if (loaded) return loaded;
        if (loading) return loading;

        loading = loadFn().then((result) => {
          loaded = result;
          loading = null;
          return result;
        });

        return loading;
      },
      isLoaded: () => loaded !== null,
      reset: () => {
        loaded = null;
        loading = null;
      },
    };
  }

  /**
   * Real-Time Sync Optimization
   */
  batchMessages(messages: any[], batchSize: number = 10): any[][] {
    const batches: any[][] = [];
    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Performance Metrics
   */
  getPerformanceMetrics() {
    const cacheStats = this.getCacheStats();
    const queryStats = this.getQueryStats();
    const cacheHitRate = queryStats.totalQueries > 0 ? (queryStats.cachedQueries / queryStats.totalQueries) * 100 : 0;

    return {
      cache: cacheStats,
      queries: queryStats,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      averageQueryTime: queryStats.totalQueries > 0 ? (queryStats.executionTime / queryStats.totalQueries).toFixed(2) + 'ms' : '0ms',
      timeSaved: queryStats.savedTime.toFixed(0) + 'ms',
    };
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
