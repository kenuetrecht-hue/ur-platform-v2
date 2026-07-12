/**
 * Cache Layer Service
 * Implements Redis-like caching for database query optimization
 * Reduces database load for millions of users
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number; // Time to live in milliseconds
  createdAt: Date;
  expiresAt: Date;
}

export class CacheLayer {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    const ttlMs = ttlSeconds * 1000;
    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: ttlMs,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    // Auto-cleanup on expiry
    setTimeout(() => this.delete(key), ttlMs);
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      total,
      hitRate: hitRate.toFixed(2),
      size: this.cache.size,
    };
  }

  /**
   * Cache-aside pattern for database queries
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetchFn();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate cache pattern (for updates)
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getSizeBytes(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.value).length;
    }
    return size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let count = 0;
    const now = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }
}

/**
 * Query Optimizer
 * Optimizes database queries for scale
 */
export class QueryOptimizer {
  private cache: CacheLayer;

  constructor(cache: CacheLayer) {
    this.cache = cache;
  }

  /**
   * Get creator with caching
   */
  async getCreator(creatorId: string, fetchFn: () => Promise<any>) {
    return this.cache.getOrSet(
      `creator:${creatorId}`,
      fetchFn,
      3600 // 1 hour TTL
    );
  }

  /**
   * Get project with caching
   */
  async getProject(projectId: string, fetchFn: () => Promise<any>) {
    return this.cache.getOrSet(
      `project:${projectId}`,
      fetchFn,
      1800 // 30 minutes TTL
    );
  }

  /**
   * Get user feed with caching
   */
  async getUserFeed(userId: string, page: number, fetchFn: () => Promise<any>) {
    return this.cache.getOrSet(
      `feed:${userId}:page:${page}`,
      fetchFn,
      300 // 5 minutes TTL
    );
  }

  /**
   * Invalidate creator cache on update
   */
  invalidateCreator(creatorId: string): number {
    return this.cache.invalidatePattern(`creator:${creatorId}.*`);
  }

  /**
   * Invalidate project cache on update
   */
  invalidateProject(projectId: string): number {
    return this.cache.invalidatePattern(`project:${projectId}.*`);
  }

  /**
   * Invalidate user feed cache
   */
  invalidateUserFeed(userId: string): number {
    return this.cache.invalidatePattern(`feed:${userId}.*`);
  }
}

/**
 * Connection Pool Manager
 * Manages database connection pooling
 */
export class ConnectionPool {
  private connections: any[] = [];
  private availableConnections: any[] = [];
  private maxConnections: number;
  private stats = {
    created: 0,
    active: 0,
    idle: 0,
    errors: 0,
  };

  constructor(maxConnections: number = 100) {
    this.maxConnections = maxConnections;
    this.initializePool();
  }

  /**
   * Initialize connection pool
   */
  private initializePool(): void {
    for (let i = 0; i < this.maxConnections; i++) {
      const connection = { id: i, inUse: false };
      this.connections.push(connection);
      this.availableConnections.push(connection);
      this.stats.created++;
    }
  }

  /**
   * Get connection from pool
   */
  getConnection(): any {
    if (this.availableConnections.length === 0) {
      this.stats.errors++;
      throw new Error('No available connections in pool');
    }

    const connection = this.availableConnections.pop();
    if (connection) {
      connection.inUse = true;
      this.stats.active++;
      this.stats.idle--;
    }

    return connection;
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection: any): void {
    if (connection && connection.inUse) {
      connection.inUse = false;
      this.availableConnections.push(connection);
      this.stats.active--;
      this.stats.idle++;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      available: this.availableConnections.length,
      utilization: ((this.stats.active / this.maxConnections) * 100).toFixed(2),
    };
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections = [];
    this.availableConnections = [];
  }
}
