/**
 * Rate Limiter Service
 * Prevents API abuse and protects against DDoS attacks
 * Essential for handling millions of users
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyPrefix?: string;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
  isLimited: boolean;
}

export class RateLimiter {
  private buckets: Map<string, { requests: number; resetAt: Date }> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Register rate limit rule
   */
  registerRule(name: string, maxRequests: number, windowSeconds: number): void {
    this.configs.set(name, {
      maxRequests,
      windowSeconds,
      keyPrefix: name,
    });
  }

   /**
   * Check if request is allowed
   */
  isAllowed(userId: string, ruleName: string): RateLimitStatus {
    const config = this.configs.get(ruleName);
    if (!config) {
      throw new Error(`Rate limit rule not found: ${ruleName}`);
    }

    const key = `${config.keyPrefix}:${userId}`;
    const now = new Date();
    let bucket = this.buckets.get(key);

    // Create new bucket if expired or doesn't exist
    if (!bucket || now > bucket.resetAt) {
      bucket = {
        requests: 0,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      };
      this.buckets.set(key, bucket);
    }

    const isLimited = bucket.requests >= config.maxRequests;

    if (!isLimited) {
      bucket.requests++;
    }

    return {
      remaining: Math.max(0, config.maxRequests - bucket.requests),
      limit: config.maxRequests,
      resetAt: bucket.resetAt,
      isLimited,
    };
  }

  /**
   * Get rate limit status without incrementing
   */
  getStatus(userId: string, ruleName: string): RateLimitStatus {
    const config = this.configs.get(ruleName);
    if (!config) {
      throw new Error(`Rate limit rule not found: ${ruleName}`);
    }

    const key = `${config.keyPrefix}:${userId}`;
    const bucket = this.buckets.get(key);
    const now = new Date();

    if (!bucket || now > bucket.resetAt) {
      return {
        remaining: config.maxRequests,
        limit: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
        isLimited: false,
      };
    }

    return {
      remaining: Math.max(0, config.maxRequests - bucket.requests),
      limit: config.maxRequests,
      resetAt: bucket.resetAt,
      isLimited: bucket.requests >= config.maxRequests,
    };
  }

  /**
   * Reset rate limit for user
   */
  reset(userId: string, ruleName: string): boolean {
    const config = this.configs.get(ruleName);
    if (!config) return false;

    const key = `${config.keyPrefix}:${userId}`;
    return this.buckets.delete(key);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeBuckets: this.buckets.size,
      rules: Array.from(this.configs.entries()).map(([name, config]) => ({
        name,
        maxRequests: config.maxRequests,
        windowSeconds: config.windowSeconds,
      })),
    };
  }

  /**
   * Cleanup expired buckets
   */
  cleanup(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [key, bucket] of this.buckets.entries()) {
      if (now > bucket.resetAt) {
        this.buckets.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Adaptive Rate Limiter
 * Adjusts limits based on system load
 */
export class AdaptiveRateLimiter extends RateLimiter {
  private systemLoad: number = 0;
  private baseConfigs: Map<string, RateLimitConfig> = new Map();

  /**
   * Register rule with adaptive scaling
   */
  registerAdaptiveRule(name: string, maxRequests: number, windowSeconds: number): void {
    super.registerRule(name, maxRequests, windowSeconds);
    this.baseConfigs.set(name, { maxRequests, windowSeconds });
  }

  /**
   * Update system load (0-1)
   */
  setSystemLoad(load: number): void {
    this.systemLoad = Math.max(0, Math.min(1, load));
    this.updateLimits();
  }

  /**
   * Update limits based on system load
   */
  private updateLimits(): void {
    // Reduce limits as load increases
    const scaleFactor = 1 - this.systemLoad * 0.5; // 50% reduction at max load

    for (const [name, baseConfig] of this.baseConfigs.entries()) {
      const scaledMaxRequests = Math.floor(baseConfig.maxRequests * scaleFactor);
      this.registerRule(name, scaledMaxRequests, baseConfig.windowSeconds);
    }
  }

  /**
   * Get current system load
   */
  getSystemLoad(): number {
    return this.systemLoad;
  }
}

/**
 * IP-based Rate Limiter
 * Protects against DDoS from specific IPs
 */
export class IPRateLimiter extends RateLimiter {
  private ipBans: Map<string, Date> = new Map();
  private banDurationSeconds: number;

  constructor(banDurationSeconds: number = 3600) {
    super();
    this.banDurationSeconds = banDurationSeconds;
    this.registerRule('ip-default', 1000, 60); // 1000 requests per minute
  }

  /**
   * Check if IP is banned
   */
  isBanned(ip: string): boolean {
    const banExpiry = this.ipBans.get(ip);
    if (!banExpiry) return false;

    if (new Date() > banExpiry) {
      this.ipBans.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Ban IP address
   */
  banIP(ip: string): void {
    const banExpiry = new Date(Date.now() + this.banDurationSeconds * 1000);
    this.ipBans.set(ip, banExpiry);
  }

  /**
   * Unban IP address
   */
  unbanIP(ip: string): boolean {
    return this.ipBans.delete(ip);
  }

  /**
   * Get banned IPs
   */
  getBannedIPs(): Array<{ ip: string; expiresAt: Date }> {
    const now = new Date();
    const banned = [];

    for (const [ip, expiresAt] of this.ipBans.entries()) {
      if (now < expiresAt) {
        banned.push({ ip, expiresAt });
      } else {
        this.ipBans.delete(ip);
      }
    }

    return banned;
  }

  /**
   * Check request from IP
   */
  checkIPRequest(ip: string): RateLimitStatus | { blocked: true; reason: string } {
    if (this.isBanned(ip)) {
      return { blocked: true, reason: 'IP is banned' };
    }

    return this.isAllowed(ip, 'ip-default');
  }
}
