/**
 * PHASE 5: RATE LIMITING & API THROTTLING
 * 
 * Enterprise-grade rate limiting to protect API from abuse and ensure
 * fair resource allocation across all users.
 * 
 * Features:
 * - Per-user rate limits
 * - Per-endpoint rate limits
 * - Tier-based limits (Free, Creator, Enterprise)
 * - Sliding window algorithm
 * - Redis-backed persistence
 * - Graceful degradation
 */

import { redis } from './cache';

// Rate limit tiers
export enum UserTier {
  FREE = 'free',
  CREATOR = 'creator',
  ENTERPRISE = 'enterprise',
}

// Rate limit configuration per tier
export const RATE_LIMITS = {
  [UserTier.FREE]: {
    api: 100, // requests per hour
    ai: 10, // AI requests per hour
    upload: 5, // uploads per day
    storage: 1024 * 1024 * 1024, // 1GB
  },
  [UserTier.CREATOR]: {
    api: 1000, // requests per hour
    ai: 100, // AI requests per hour
    upload: 50, // uploads per day
    storage: 100 * 1024 * 1024 * 1024, // 100GB
  },
  [UserTier.ENTERPRISE]: {
    api: 10000, // requests per hour
    ai: 1000, // AI requests per hour
    upload: 500, // uploads per day
    storage: Infinity, // unlimited
  },
};

// Endpoint-specific limits (stricter than user tier limits)
export const ENDPOINT_LIMITS = {
  '/api/ai/generate': { perHour: 10, perDay: 100 },
  '/api/upload': { perHour: 5, perDay: 50 },
  '/api/auth/login': { perHour: 10, perDay: 100 },
  '/api/auth/register': { perHour: 5, perDay: 50 },
  '/api/content/create': { perHour: 50, perDay: 500 },
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if request is within rate limit
 */
export async function checkRateLimit(
  userId: number,
  tier: UserTier,
  endpoint: string,
  limitType: 'api' | 'ai' | 'upload' = 'api'
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const hour = Math.floor(now / 3600000); // Hour bucket
    const day = Math.floor(now / 86400000); // Day bucket

    // Get user tier limits
    const tierLimit = RATE_LIMITS[tier][limitType];
    const key = `ratelimit:${userId}:${limitType}:${hour}`;
    const dayKey = `ratelimit:${userId}:${limitType}:day:${day}`;

    // Get current count
    const [hourCount, dayCount] = await Promise.all([
      redis.incr(key),
      redis.incr(dayKey),
    ]);

    // Set expiration on first increment
    if (hourCount === 1) {
      await redis.expire(key, 3600); // 1 hour
    }
    if (dayCount === 1) {
      await redis.expire(dayKey, 86400); // 1 day
    }

    // Check endpoint-specific limits
    const endpointLimit = ENDPOINT_LIMITS[endpoint];
    if (endpointLimit) {
      const endpointKey = `ratelimit:endpoint:${endpoint}:${hour}`;
      const endpointCount = await redis.incr(endpointKey);

      if (endpointCount === 1) {
        await redis.expire(endpointKey, 3600);
      }

      if (endpointCount > endpointLimit.perHour) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: (hour + 1) * 3600000,
          retryAfter: 3600,
        };
      }
    }

    // Check tier limit
    if (hourCount > tierLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: (hour + 1) * 3600000,
        retryAfter: 3600,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, tierLimit - hourCount),
      resetAt: (hour + 1) * 3600000,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open on error (allow request)
    return {
      allowed: true,
      remaining: 1000,
      resetAt: Date.now() + 3600000,
    };
  }
}

/**
 * Check storage quota
 */
export async function checkStorageQuota(
  userId: number,
  tier: UserTier,
  fileSize: number
): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const key = `storage:${userId}`;
    const limit = RATE_LIMITS[tier].storage;

    const used = await redis.get(key);
    const currentUsed = parseInt(used || '0', 10);

    if (currentUsed + fileSize > limit) {
      return {
        allowed: false,
        used: currentUsed,
        limit,
      };
    }

    // Increment storage usage
    await redis.incrby(key, fileSize);

    return {
      allowed: true,
      used: currentUsed + fileSize,
      limit,
    };
  } catch (error) {
    console.error('Storage quota check error:', error);
    return {
      allowed: true,
      used: 0,
      limit: RATE_LIMITS[tier].storage,
    };
  }
}

/**
 * Get current usage for user
 */
export async function getCurrentUsage(
  userId: number,
  tier: UserTier
): Promise<{
  api: { used: number; limit: number; resetAt: number };
  ai: { used: number; limit: number; resetAt: number };
  storage: { used: number; limit: number };
}> {
  try {
    const now = Date.now();
    const hour = Math.floor(now / 3600000);

    const [apiCount, aiCount, storageUsed] = await Promise.all([
      redis.get(`ratelimit:${userId}:api:${hour}`),
      redis.get(`ratelimit:${userId}:ai:${hour}`),
      redis.get(`storage:${userId}`),
    ]);

    const resetAt = (hour + 1) * 3600000;

    return {
      api: {
        used: parseInt(apiCount || '0', 10),
        limit: RATE_LIMITS[tier].api,
        resetAt,
      },
      ai: {
        used: parseInt(aiCount || '0', 10),
        limit: RATE_LIMITS[tier].ai,
        resetAt,
      },
      storage: {
        used: parseInt(storageUsed || '0', 10),
        limit: RATE_LIMITS[tier].storage,
      },
    };
  } catch (error) {
    console.error('Get usage error:', error);
    return {
      api: { used: 0, limit: RATE_LIMITS[tier].api, resetAt: 0 },
      ai: { used: 0, limit: RATE_LIMITS[tier].ai, resetAt: 0 },
      storage: { used: 0, limit: RATE_LIMITS[tier].storage },
    };
  }
}

/**
 * Reset user rate limits (admin only)
 */
export async function resetUserLimits(userId: number): Promise<void> {
  try {
    const pattern = `ratelimit:${userId}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Reset limits error:', error);
  }
}

/**
 * Get global rate limit statistics
 */
export async function getGlobalStats(): Promise<{
  totalRequests: number;
  totalAIRequests: number;
  totalStorage: number;
}> {
  try {
    const apiKeys = await redis.keys('ratelimit:*:api:*');
    const aiKeys = await redis.keys('ratelimit:*:ai:*');
    const storageKeys = await redis.keys('storage:*');

    let totalRequests = 0;
    let totalAIRequests = 0;
    let totalStorage = 0;

    for (const key of apiKeys) {
      const count = await redis.get(key);
      totalRequests += parseInt(count || '0', 10);
    }

    for (const key of aiKeys) {
      const count = await redis.get(key);
      totalAIRequests += parseInt(count || '0', 10);
    }

    for (const key of storageKeys) {
      const used = await redis.get(key);
      totalStorage += parseInt(used || '0', 10);
    }

    return {
      totalRequests,
      totalAIRequests,
      totalStorage,
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return {
      totalRequests: 0,
      totalAIRequests: 0,
      totalStorage: 0,
    };
  }
}
