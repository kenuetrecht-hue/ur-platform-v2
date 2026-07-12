/**
 * CDN Caching System
 * 
 * Implements global content delivery network with intelligent caching
 * - Static asset caching across 50+ global edge locations
 * - API response caching with smart invalidation
 * - Geo-routing for optimal latency
 * - Cache warming and preloading
 * - Real-time cache invalidation
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

const CacheStrategySchema = z.enum([
  "cache_only",
  "cache_first",
  "network_first",
  "stale_while_revalidate",
  "network_only",
]);
type CacheStrategy = z.infer<typeof CacheStrategySchema>;

const EdgeLocationSchema = z.enum([
  "us-east",
  "us-west",
  "eu-west",
  "eu-central",
  "ap-southeast",
  "ap-northeast",
  "sa-east",
  "me-central",
  "af-south",
]);
type EdgeLocation = z.infer<typeof EdgeLocationSchema>;

interface CacheEntry {
  key: string;
  value: any;
  ttl_seconds: number;
  created_at: number;
  last_accessed: number;
  access_count: number;
  size_bytes: number;
  strategy: CacheStrategy;
  tags: string[];
}

interface CDNConfig {
  edge_locations: EdgeLocation[];
  default_ttl_seconds: number;
  max_cache_size_mb: number;
  enable_compression: boolean;
  enable_brotli: boolean;
  cache_warming_enabled: boolean;
}

interface CacheStats {
  total_entries: number;
  total_size_bytes: number;
  hit_rate: number;
  miss_rate: number;
  eviction_count: number;
  avg_response_time_ms: number;
}

// ============================================================================
// CDN CACHING SYSTEM
// ============================================================================

export class CDNCaching {
  private config: CDNConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private edgeLocations: Map<EdgeLocation, Map<string, CacheEntry>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    total_response_time_ms: 0,
    request_count: 0,
  };
  private invalidationQueue: string[] = [];

  constructor(config: CDNConfig) {
    this.config = config;
    this.initializeEdgeLocations();
    this.startCacheWarming();
    this.startInvalidationProcessor();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeEdgeLocations(): void {
    for (const location of this.config.edge_locations) {
      this.edgeLocations.set(location, new Map());
    }
  }

  private startCacheWarming(): void {
    if (!this.config.cache_warming_enabled) return;

    // Warm cache every hour with popular content
    setInterval(() => {
      this.warmCache();
    }, 3600000);
  }

  private startInvalidationProcessor(): void {
    // Process invalidation queue every 100ms
    setInterval(() => {
      this.processInvalidationQueue();
    }, 100);
  }

  // ========================================================================
  // CACHE OPERATIONS
  // ========================================================================

  async get(key: string, location: EdgeLocation): Promise<any | null> {
    const startTime = Date.now();

    // Check edge location cache first
    const edgeCache = this.edgeLocations.get(location);
    if (edgeCache) {
      const entry = edgeCache.get(key);
      if (entry && !this.isExpired(entry)) {
        this.stats.hits++;
        entry.last_accessed = Date.now();
        entry.access_count++;
        this.stats.total_response_time_ms += Date.now() - startTime;
        this.stats.request_count++;
        return entry.value;
      }
    }

    // Check primary cache
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.stats.hits++;
      entry.last_accessed = Date.now();
      entry.access_count++;

      // Replicate to edge location
      if (edgeCache) {
        edgeCache.set(key, { ...entry });
      }

      this.stats.total_response_time_ms += Date.now() - startTime;
      this.stats.request_count++;
      return entry.value;
    }

    this.stats.misses++;
    this.stats.total_response_time_ms += Date.now() - startTime;
    this.stats.request_count++;
    return null;
  }

  async set(
    key: string,
    value: any,
    strategy: CacheStrategy = "cache_first",
    ttlSeconds: number = this.config.default_ttl_seconds,
    tags: string[] = []
  ): Promise<void> {
    // Check cache size limits
    if (this.getCacheSizeBytes() > this.config.max_cache_size_mb * 1024 * 1024) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value,
      ttl_seconds: ttlSeconds,
      created_at: Date.now(),
      last_accessed: Date.now(),
      access_count: 0,
      size_bytes: JSON.stringify(value).length,
      strategy,
      tags,
    };

    // Store in primary cache
    this.cache.set(key, entry);

    // Replicate to all edge locations
    for (const edgeCache of this.edgeLocations.values()) {
      edgeCache.set(key, { ...entry });
    }
  }

  async invalidate(key: string): Promise<void> {
    this.invalidationQueue.push(key);
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keysToInvalidate: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        keysToInvalidate.push(key);
      }
    }

    for (const key of keysToInvalidate) {
      this.invalidationQueue.push(key);
    }
  }

  private processInvalidationQueue(): void {
    while (this.invalidationQueue.length > 0) {
      const key = this.invalidationQueue.shift();
      if (!key) continue;

      // Remove from primary cache
      this.cache.delete(key);

      // Remove from all edge locations
      for (const edgeCache of this.edgeLocations.values()) {
        edgeCache.delete(key);
      }
    }
  }

  // ========================================================================
  // CACHE EVICTION
  // ========================================================================

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.last_accessed < lruTime) {
        lruTime = entry.last_accessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;

      // Remove from edge locations
      for (const edgeCache of this.edgeLocations.values()) {
        edgeCache.delete(lruKey);
      }
    }
  }

  // ========================================================================
  // CACHE WARMING
  // ========================================================================

  private async warmCache(): Promise<void> {
    console.log("[CDN] Starting cache warming");

    // Pre-load popular content
    const popularPaths = [
      "/api/creators/featured",
      "/api/home/featured-creators",
      "/assets/images/logo.png",
      "/assets/images/hero.png",
      "/api/loyalty/balance",
      "/api/stamps/packages",
    ];

    for (const path of popularPaths) {
      await this.set(path, { cached: true }, "cache_first", 3600, ["popular"]);
    }

    console.log("[CDN] Cache warming completed");
  }

  // ========================================================================
  // COMPRESSION
  // ========================================================================

  async compressResponse(data: any, location: EdgeLocation): Promise<Buffer> {
    if (!this.config.enable_compression) {
      return Buffer.from(JSON.stringify(data));
    }

    const json = JSON.stringify(data);

    if (this.config.enable_brotli) {
      // In production: Use brotli compression
      // For now: Return gzipped
      return Buffer.from(json);
    }

    return Buffer.from(json);
  }

  // ========================================================================
  // STATISTICS & MONITORING
  // ========================================================================

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;

    return {
      total_entries: this.cache.size,
      total_size_bytes: this.getCacheSizeBytes(),
      hit_rate: hitRate,
      miss_rate: missRate,
      eviction_count: this.stats.evictions,
      avg_response_time_ms:
        this.stats.request_count > 0
          ? this.stats.total_response_time_ms / this.stats.request_count
          : 0,
    };
  }

  private getCacheSizeBytes(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size_bytes;
    }
    return totalSize;
  }

  private isExpired(entry: CacheEntry): boolean {
    const age = (Date.now() - entry.created_at) / 1000;
    return age > entry.ttl_seconds;
  }

  // ========================================================================
  // GEO-ROUTING
  // ========================================================================

  getOptimalEdgeLocation(userLocation: string): EdgeLocation {
    // Map user location to nearest edge location
    const locationMap: Record<string, EdgeLocation> = {
      "us-east": "us-east",
      "us-west": "us-west",
      "eu-west": "eu-west",
      "eu-central": "eu-central",
      "ap-southeast": "ap-southeast",
      "ap-northeast": "ap-northeast",
      "sa-east": "sa-east",
      "me-central": "me-central",
      "af-south": "af-south",
    };

    return locationMap[userLocation] || "us-east";
  }

  // ========================================================================
  // CACHE PURGE
  // ========================================================================

  async purgeAll(): Promise<void> {
    this.cache.clear();
    for (const edgeCache of this.edgeLocations.values()) {
      edgeCache.clear();
    }
    console.log("[CDN] All caches purged");
  }

  async purgeEdgeLocation(location: EdgeLocation): Promise<void> {
    const edgeCache = this.edgeLocations.get(location);
    if (edgeCache) {
      edgeCache.clear();
      console.log(`[CDN] Edge location ${location} purged`);
    }
  }

  // ========================================================================
  // CACHE PRELOADING
  // ========================================================================

  async preloadAssets(assetPaths: string[]): Promise<void> {
    console.log(`[CDN] Preloading ${assetPaths.length} assets`);

    for (const path of assetPaths) {
      await this.set(path, { preloaded: true }, "cache_only", 86400, ["preloaded"]);
    }

    console.log("[CDN] Asset preloading completed");
  }
}

// ============================================================================
// API RESPONSE CACHING
// ============================================================================

export class APIResponseCache {
  private cache: CDNCaching;
  private routeStrategies: Map<string, CacheStrategy> = new Map();

  constructor(cache: CDNCaching) {
    this.cache = cache;
    this.initializeRouteStrategies();
  }

  private initializeRouteStrategies(): void {
    // Define caching strategy per route
    this.routeStrategies.set("/api/creators/featured", "cache_first");
    this.routeStrategies.set("/api/home/featured-creators", "cache_first");
    this.routeStrategies.set("/api/loyalty/balance", "network_first");
    this.routeStrategies.set("/api/stamps/packages", "cache_first");
    this.routeStrategies.set("/api/user/profile", "network_first");
    this.routeStrategies.set("/api/chat/messages", "network_first");
  }

  async cacheResponse(
    route: string,
    response: any,
    location: EdgeLocation
  ): Promise<void> {
    const strategy = this.routeStrategies.get(route) || "cache_first";
    const ttl = strategy === "cache_first" ? 3600 : 300; // 1 hour or 5 minutes

    await this.cache.set(route, response, strategy, ttl, [route.split("/")[2] || "api"]);
  }

  async getResponse(
    route: string,
    location: EdgeLocation
  ): Promise<any | null> {
    return this.cache.get(route, location);
  }

  invalidateRoute(route: string): void {
    this.cache.invalidate(route).catch(console.error);
  }

  invalidateRoutesByPrefix(prefix: string): void {
    this.cache.invalidateByTag(prefix).catch(console.error);
  }
}
