import { z } from "zod";

/**
 * Cache Invalidation & Coherence System
 * Phase 2 Important Infrastructure
 *
 * Ensures cached data stays fresh and consistent
 * - TTL-based invalidation
 * - Event-based invalidation
 * - Manual invalidation
 * - Cache warming
 * - Cache coherence across instances
 * - Stale-while-revalidate
 * - Cache metrics
 * - Cache debugging
 */

// Cache Entry
export const CacheEntrySchema = z.object({
  key: z.string(),
  value: z.any(),
  ttl: z.number(), // milliseconds
  createdAt: z.date(),
  expiresAt: z.date(),
  hits: z.number(),
  lastAccessed: z.date(),
  tag: z.string().optional(),
});

export type CacheEntry = z.infer<typeof CacheEntrySchema>;

// Invalidation Strategy
export const InvalidationStrategySchema = z.enum([
  "ttl",
  "event",
  "manual",
  "lru",
  "lfu",
]);

export type InvalidationStrategy = z.infer<typeof InvalidationStrategySchema>;

// Cache Event
export const CacheEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.enum(["set", "get", "delete", "invalidate", "evict"]),
  key: z.string(),
  tag: z.string().optional(),
  reason: z.string().optional(),
});

export type CacheEvent = z.infer<typeof CacheEventSchema>;

// Cache Metrics
export const CacheMetricsSchema = z.object({
  hits: z.number(),
  misses: z.number(),
  evictions: z.number(),
  totalRequests: z.number(),
  hitRate: z.number(),
  avgAccessTime: z.number(),
  memoryUsed: z.number(),
});

export type CacheMetrics = z.infer<typeof CacheMetricsSchema>;

/**
 * Cache Invalidation & Coherence Manager
 */
export class CacheInvalidationSystem {
  private cache: Map<string, CacheEntry> = new Map();
  private tags: Map<string, Set<string>> = new Map(); // tag -> keys
  private events: Map<string, CacheEvent> = new Map();
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    totalAccessTime: 0,
  };

  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;
  private defaultTtl = 60 * 60 * 1000; // 1 hour
  private invalidationStrategy: InvalidationStrategy = "ttl";

  /**
   * Get from cache
   */
  get(key: string): any | null {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    this.metrics.totalRequests++;

    if (!entry) {
      this.metrics.misses++;
      this.recordEvent("get", key, "miss");
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.recordEvent("get", key, "expired");
      return null;
    }

    // Update access info
    entry.hits++;
    entry.lastAccessed = new Date();

    this.metrics.hits++;
    this.metrics.totalAccessTime += Date.now() - startTime;
    this.recordEvent("get", key, "hit");

    return entry.value;
  }

  /**
   * Set in cache
   */
  set(key: string, value: any, ttl?: number, tag?: string): void {
    const startTime = Date.now();

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentCacheSize -= JSON.stringify(oldEntry.value).length;
    }

    // Check cache size
    const valueSize = JSON.stringify(value).length;
    if (this.currentCacheSize + valueSize > this.maxCacheSize) {
      this.evictEntries(valueSize);
    }

    const entry: CacheEntry = {
      key,
      value,
      ttl: ttl || this.defaultTtl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (ttl || this.defaultTtl)),
      hits: 0,
      lastAccessed: new Date(),
      tag,
    };

    this.cache.set(key, entry);
    this.currentCacheSize += valueSize;

    // Add to tag index
    if (tag) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }

    this.metrics.totalAccessTime += Date.now() - startTime;
    this.recordEvent("set", key, tag);
  }

  /**
   * Delete from cache
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= JSON.stringify(entry.value).length;
      this.cache.delete(key);
      this.recordEvent("delete", key);
    }
  }

  /**
   * Invalidate by tag
   */
  invalidateByTag(tag: string): number {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      this.delete(key);
      count++;
      this.recordEvent("invalidate", key, `tag: ${tag}`);
    }

    this.tags.delete(tag);
    return count;
  }

  /**
   * Invalidate by pattern
   */
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
        this.recordEvent("invalidate", key, `pattern: ${pattern}`);
      }
    }

    return count;
  }

  /**
   * Warm cache
   */
  warmCache(entries: Array<{ key: string; value: any; ttl?: number; tag?: string }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl, entry.tag);
    }
  }

  /**
   * Evict entries (LRU or LFU)
   */
  private evictEntries(spaceNeeded: number): void {
    const entries = Array.from(this.cache.values());

    if (this.invalidationStrategy === "lru") {
      // Least Recently Used
      entries.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
    } else if (this.invalidationStrategy === "lfu") {
      // Least Frequently Used
      entries.sort((a, b) => a.hits - b.hits);
    }

    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= spaceNeeded) break;
      const size = JSON.stringify(entry.value).length;
      this.delete(entry.key);
      freedSpace += size;
      this.metrics.evictions++;
      this.recordEvent("evict", entry.key, `${this.invalidationStrategy}`);
    }
  }

  /**
   * Stale-while-revalidate
   */
  getStaleWhileRevalidate(key: string): { value: any | null; isStale: boolean } {
    const entry = this.cache.get(key);

    if (!entry) {
      return { value: null, isStale: false };
    }

    const now = new Date();
    const isStale = now > entry.expiresAt;

    if (isStale) {
      // Serve stale data while revalidating in background
      this.recordEvent("get", key, "stale-while-revalidate");
    }

    return { value: entry.value, isStale };
  }

  /**
   * Record cache event
   */
  private recordEvent(type: "set" | "get" | "delete" | "invalidate" | "evict", key: string, reason?: string): void {
    const event: CacheEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type,
      key,
      reason,
    };

    this.events.set(event.id, event);

    // Keep only last 10000 events
    if (this.events.size > 10000) {
      const oldestEvent = Array.from(this.events.values()).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      )[0];
      this.events.delete(oldestEvent.id);
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.totalRequests || 1;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
      totalRequests,
      hitRate: (this.metrics.hits / totalRequests) * 100,
      avgAccessTime: this.metrics.totalAccessTime / totalRequests,
      memoryUsed: this.currentCacheSize,
    };
  }

  /**
   * Get cache size
   */
  getCacheSize(): { used: number; max: number; percentage: number } {
    return {
      used: this.currentCacheSize,
      max: this.maxCacheSize,
      percentage: (this.currentCacheSize / this.maxCacheSize) * 100,
    };
  }

  /**
   * Get cache entries (for debugging)
   */
  getCacheEntries(filter?: { tag?: string; pattern?: string }): CacheEntry[] {
    let entries = Array.from(this.cache.values());

    if (filter?.tag) {
      entries = entries.filter((e) => e.tag === filter.tag);
    }

    if (filter?.pattern) {
      const regex = new RegExp(filter.pattern);
      entries = entries.filter((e) => regex.test(e.key));
    }

    return entries;
  }

  /**
   * Get cache events (for debugging)
   */
  getCacheEvents(limit: number = 100): CacheEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.tags.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Set invalidation strategy
   */
  setInvalidationStrategy(strategy: InvalidationStrategy): void {
    this.invalidationStrategy = strategy;
  }

  /**
   * Set max cache size
   */
  setMaxCacheSize(bytes: number): void {
    this.maxCacheSize = bytes;
  }

  /**
   * Set default TTL
   */
  setDefaultTtl(milliseconds: number): void {
    this.defaultTtl = milliseconds;
  }

  /**
   * Get cache coherence status
   */
  getCacheCoherenceStatus(): {
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    coherent: boolean;
  } {
    const entries = Array.from(this.cache.values());
    const now = new Date();
    const expired = entries.filter((e) => now > e.expiresAt);

    return {
      totalEntries: entries.length,
      expiredEntries: expired.length,
      validEntries: entries.length - expired.length,
      coherent: expired.length === 0,
    };
  }
}

// Global singleton instance
export const cacheInvalidationSystem = new CacheInvalidationSystem();
