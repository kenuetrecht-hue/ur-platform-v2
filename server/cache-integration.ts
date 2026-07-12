/**
 * Redis Cache Integration for tRPC API
 * Integrates caching layer into all API endpoints
 */

import { cache } from './cache';

export interface CacheConfig {
  ttl: number;
  key: string;
  invalidateOn?: string[];
}

/**
 * Cache middleware for tRPC procedures
 */
export function withCache(config: CacheConfig) {
  return async (input: any, ctx: any, next: any) => {
    const cacheKey = `${config.key}:${JSON.stringify(input)}`;
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    // Execute procedure
    const result = await next();
    
    // Store in cache
    cache.set(cacheKey, result, config.ttl);
    console.log(`💾 Cached: ${cacheKey} (TTL: ${config.ttl}ms)`);
    
    return result;
  };
}

/**
 * Invalidate cache patterns
 */
export function invalidateCache(patterns: string[]) {
  patterns.forEach(pattern => {
    cache.invalidatePattern(new RegExp(pattern));
    console.log(`🗑️  Invalidated cache pattern: ${pattern}`);
  });
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    entries: cache.getStats().entries,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    hitRate: cache.getStats().hitRate,
  };
}

export default { withCache, invalidateCache, getCacheStats };
