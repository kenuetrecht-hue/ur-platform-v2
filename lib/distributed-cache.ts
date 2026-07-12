/**
 * Distributed Cache Service
 * Redis-like distributed caching for session storage and data caching
 */

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export class DistributedCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * Set cache value
   */
  set(key: string, value: any, ttlSeconds: number = 3600): void {
    const entry: CacheEntry = {
      key,
      value,
      ttl: ttlSeconds,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Get cache value
   */
  get(key: string): any {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    const ageSeconds = (Date.now() - entry.createdAt.getTime()) / 1000;
    if (ageSeconds > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.lastAccessed = new Date();
    entry.accessCount++;
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Delete cache value
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): number {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = (this.stats.hits + this.stats.misses) > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate,
      cacheSize: this.cache.size,
      totalMemory: this.calculateMemoryUsage(),
    };
  }

  /**
   * Calculate memory usage
   */
  private calculateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += JSON.stringify(entry.value).length;
    }
    return total;
  }

  /**
   * Get cache entries
   */
  getEntries(limit: number = 100) {
    return Array.from(this.cache.values()).slice(-limit);
  }

  /**
   * Evict expired entries
   */
  evictExpired(): number {
    let evicted = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const ageSeconds = (now - entry.createdAt.getTime()) / 1000;
      if (ageSeconds > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * LRU eviction
   */
  evictLRU(targetSize: number): number {
    if (this.cache.size <= targetSize) return 0;

    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    let evicted = 0;
    for (let i = 0; i < entries.length && this.cache.size > targetSize; i++) {
      this.cache.delete(entries[i].key);
      evicted++;
    }

    return evicted;
  }
}

/**
 * Session Store
 * Distributed session storage
 */
export class SessionStore {
  private sessions: Map<string, any> = new Map();
  private sessionTTL = 3600; // 1 hour

  /**
   * Create session
   */
  createSession(userId: string, data: any): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(sessionId, {
      userId,
      data,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
    return sessionId;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): any {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    // Check TTL
    const ageSeconds = (Date.now() - session.createdAt) / 1000;
    if (ageSeconds > this.sessionTTL) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, data: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.data = { ...session.data, ...data };
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): number {
    let active = 0;
    for (const session of this.sessions.values()) {
      const ageSeconds = (Date.now() - session.createdAt) / 1000;
      if (ageSeconds <= this.sessionTTL) {
        active++;
      }
    }
    return active;
  }
}

/**
 * Cache Cluster
 * Multiple cache nodes for distributed caching
 */
export class CacheCluster {
  private nodes: Map<string, DistributedCache> = new Map();
  private nodeCount = 3;

  constructor() {
    for (let i = 0; i < this.nodeCount; i++) {
      this.nodes.set(`node-${i}`, new DistributedCache());
    }
  }

  /**
   * Get node for key (consistent hashing)
   */
  private getNode(key: string): DistributedCache {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }

    const nodeIndex = Math.abs(hash) % this.nodeCount;
    const nodeId = `node-${nodeIndex}`;
    return this.nodes.get(nodeId)!;
  }

  /**
   * Set value across cluster
   */
  set(key: string, value: any, ttl: number = 3600): void {
    const node = this.getNode(key);
    node.set(key, value, ttl);
  }

  /**
   * Get value from cluster
   */
  get(key: string): any {
    const node = this.getNode(key);
    return node.get(key);
  }

  /**
   * Delete value from cluster
   */
  delete(key: string): boolean {
    const node = this.getNode(key);
    return node.delete(key);
  }

  /**
   * Get cluster statistics
   */
  getClusterStats() {
    const stats: any = { nodes: [] };
    let totalHits = 0;
    let totalMisses = 0;

    for (const [nodeId, node] of this.nodes.entries()) {
      const nodeStats = node.getStats();
      stats.nodes.push({
        nodeId,
        ...nodeStats,
      });
      totalHits += nodeStats.hits;
      totalMisses += nodeStats.misses;
    }

    stats.totalHitRate = (totalHits + totalMisses) > 0
      ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
      : 0;

    return stats;
  }
}
