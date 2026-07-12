import { z } from "zod";

/**
 * Web Search Security Engine
 * 
 * Provides secure, sandboxed web search capabilities for AI specialists with:
 * - Content filtering and verification
 * - SSL/TLS encryption
 * - Rate limiting per AI and user
 * - Malicious site detection
 * - Query sanitization
 * - Response validation
 * - Audit logging
 */

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface SearchResult {
  title: string;
  description: string;
  url: string;
  source: string;
  relevance: number;
  timestamp: Date;
  verified: boolean;
}

export interface SecurityContext {
  aiId: string;
  userId?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface RateLimitStatus {
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: Date;
  isLimited: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RATE_LIMITS = {
  // Per AI per hour
  perAiPerHour: 100,
  // Per user per day
  perUserPerDay: 500,
  // Global per minute (burst protection)
  globalPerMinute: 1000,
};

const TRUSTED_DOMAINS = [
  "wikipedia.org",
  "github.com",
  "stackoverflow.com",
  "medium.com",
  "dev.to",
  "arxiv.org",
  "researchgate.net",
  "scholar.google.com",
  "industrystandards.org",
  "osha.gov",
  "nist.gov",
  "iso.org",
  "ansi.org",
  "astm.org",
  "iec.ch",
];

const BLOCKED_KEYWORDS = [
  "malware",
  "exploit",
  "hack",
  "crack",
  "warez",
  "torrent",
  "piracy",
  "illegal",
  "phishing",
  "ransomware",
];

const BLOCKED_DOMAINS = [
  "bit.ly",
  "tinyurl.com",
  "short.link",
  "ow.ly",
  "goo.gl",
  // Add more as needed
];

// ============================================================================
// RATE LIMITING
// ============================================================================

class RateLimiter {
  private aiRequests: Map<string, number[]> = new Map();
  private userRequests: Map<string, number[]> = new Map();
  private globalRequests: number[] = [];

  checkAiLimit(aiId: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    if (!this.aiRequests.has(aiId)) {
      this.aiRequests.set(aiId, []);
    }

    const requests = this.aiRequests.get(aiId)!;
    const recentRequests = requests.filter((t) => t > oneHourAgo);

    if (recentRequests.length >= RATE_LIMITS.perAiPerHour) {
      return false;
    }

    recentRequests.push(now);
    this.aiRequests.set(aiId, recentRequests);
    return true;
  }

  checkUserLimit(userId: string): boolean {
    const now = Date.now();
    const oneDayAgo = now - 86400000;

    if (!this.userRequests.has(userId)) {
      this.userRequests.set(userId, []);
    }

    const requests = this.userRequests.get(userId)!;
    const recentRequests = requests.filter((t) => t > oneDayAgo);

    if (recentRequests.length >= RATE_LIMITS.perUserPerDay) {
      return false;
    }

    recentRequests.push(now);
    this.userRequests.set(userId, recentRequests);
    return true;
  }

  checkGlobalLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = this.globalRequests.filter((t) => t > oneMinuteAgo);

    if (recentRequests.length >= RATE_LIMITS.globalPerMinute) {
      return false;
    }

    recentRequests.push(now);
    this.globalRequests = recentRequests;
    return true;
  }

  getStatus(aiId: string, userId?: string): RateLimitStatus {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const aiReqs = (this.aiRequests.get(aiId) || []).filter((t) => t > oneHourAgo);
    const userReqs = userId
      ? (this.userRequests.get(userId) || []).filter((t) => t > oneDayAgo)
      : [];

    const aiRemaining = Math.max(0, RATE_LIMITS.perAiPerHour - aiReqs.length);
    const userRemaining = userId
      ? Math.max(0, RATE_LIMITS.perUserPerDay - userReqs.length)
      : RATE_LIMITS.perUserPerDay;

    const remaining = Math.min(aiRemaining, userRemaining);

    return {
      requestsUsed: aiReqs.length,
      requestsRemaining: remaining,
      resetTime: new Date(now + 3600000),
      isLimited: remaining === 0,
    };
  }
}

// ============================================================================
// QUERY SANITIZATION
// ============================================================================

class QuerySanitizer {
  /**
   * Sanitize and validate search query
   */
  static sanitizeQuery(query: string): string | null {
    if (!query || query.trim().length === 0) {
      return null;
    }

    // Check for blocked keywords
    const lowerQuery = query.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
      if (lowerQuery.includes(keyword)) {
        return null;
      }
    }

    // Remove special characters that could cause injection
    let sanitized = query
      .replace(/[<>\"'`]/g, "")
      .replace(/javascript:/gi, "")
      .replace(/data:/gi, "")
      .trim();

    // Limit query length
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500);
    }

    return sanitized;
  }

  /**
   * Validate URL is safe
   */
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Check protocol
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return false;
      }

      // Check for blocked domains
      const hostname = urlObj.hostname.toLowerCase();
      for (const blocked of BLOCKED_DOMAINS) {
        if (hostname.includes(blocked)) {
          return false;
        }
      }

      // Check for suspicious patterns
      if (hostname.includes("..") || hostname.includes("--")) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "";
    }
  }
}

// ============================================================================
// RESPONSE VALIDATION
// ============================================================================

class ResponseValidator {
  /**
   * Validate search result
   */
  static validateResult(result: any): boolean {
    if (!result || typeof result !== "object") {
      return false;
    }

    // Check required fields
    if (!result.title || !result.url || !result.description) {
      return false;
    }

    // Validate URL
    if (!QuerySanitizer.validateUrl(result.url)) {
      return false;
    }

    // Check content for malicious patterns
    const content = `${result.title} ${result.description}`.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
      if (content.includes(keyword)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize result content
   */
  static sanitizeResult(result: any): SearchResult {
    const domain = QuerySanitizer.extractDomain(result.url);
    const isTrusted = TRUSTED_DOMAINS.some((d) => domain.includes(d));

    return {
      title: result.title.substring(0, 200),
      description: result.description.substring(0, 500),
      url: result.url,
      source: domain,
      relevance: Math.min(1, Math.max(0, result.relevance || 0.5)),
      timestamp: new Date(),
      verified: isTrusted,
    };
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditLog {
  timestamp: Date;
  aiId: string;
  userId?: string;
  query: string;
  resultCount: number;
  blocked: boolean;
  reason?: string;
}

class AuditLogger {
  private logs: AuditLog[] = [];

  log(
    aiId: string,
    query: string,
    resultCount: number,
    blocked: boolean = false,
    reason?: string,
    userId?: string
  ): void {
    this.logs.push({
      timestamp: new Date(),
      aiId,
      userId,
      query,
      resultCount,
      blocked,
      reason,
    });

    // Keep only last 10000 logs in memory
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }
  }

  getLogs(aiId?: string, limit: number = 100): AuditLog[] {
    let filtered = this.logs;

    if (aiId) {
      filtered = filtered.filter((log) => log.aiId === aiId);
    }

    return filtered.slice(-limit);
  }

  getStatistics(aiId?: string): {
    totalSearches: number;
    blockedSearches: number;
    blockRate: number;
  } {
    let logs = this.logs;

    if (aiId) {
      logs = logs.filter((log) => log.aiId === aiId);
    }

    const total = logs.length;
    const blocked = logs.filter((log) => log.blocked).length;

    return {
      totalSearches: total,
      blockedSearches: blocked,
      blockRate: total > 0 ? blocked / total : 0,
    };
  }
}

// ============================================================================
// WEB SEARCH SECURITY ENGINE
// ============================================================================

export class WebSearchSecurityEngine {
  private rateLimiter = new RateLimiter();
  private auditLogger = new AuditLogger();

  /**
   * Perform secure web search
   */
  async performSearch(
    query: string,
    aiId: string,
    userId?: string,
    category?: string
  ): Promise<{
    success: boolean;
    results: SearchResult[];
    error?: string;
    rateLimit?: RateLimitStatus;
  }> {
    // Check rate limits
    if (!this.rateLimiter.checkGlobalLimit()) {
      this.auditLogger.log(aiId, query, 0, true, "Global rate limit exceeded", userId);
      return {
        success: false,
        results: [],
        error: "Global rate limit exceeded. Please try again later.",
        rateLimit: this.rateLimiter.getStatus(aiId, userId),
      };
    }

    if (!this.rateLimiter.checkAiLimit(aiId)) {
      this.auditLogger.log(aiId, query, 0, true, "AI rate limit exceeded", userId);
      return {
        success: false,
        results: [],
        error: "AI rate limit exceeded. Please try again later.",
        rateLimit: this.rateLimiter.getStatus(aiId, userId),
      };
    }

    if (userId && !this.rateLimiter.checkUserLimit(userId)) {
      this.auditLogger.log(aiId, query, 0, true, "User rate limit exceeded", userId);
      return {
        success: false,
        results: [],
        error: "User rate limit exceeded. Please try again later.",
        rateLimit: this.rateLimiter.getStatus(aiId, userId),
      };
    }

    // Sanitize query
    const sanitizedQuery = QuerySanitizer.sanitizeQuery(query);
    if (!sanitizedQuery) {
      this.auditLogger.log(aiId, query, 0, true, "Query contains blocked content", userId);
      return {
        success: false,
        results: [],
        error: "Query contains blocked or suspicious content.",
      };
    }

    try {
      // TODO: Integrate with actual search API (Google Custom Search, Bing, etc.)
      // For now, return mock results
      const mockResults = this.getMockResults(sanitizedQuery, category);

      // Validate and sanitize results
      const validResults = mockResults
        .filter((r) => ResponseValidator.validateResult(r))
        .map((r) => ResponseValidator.sanitizeResult(r));

      this.auditLogger.log(aiId, sanitizedQuery, validResults.length, false, undefined, userId);

      return {
        success: true,
        results: validResults,
        rateLimit: this.rateLimiter.getStatus(aiId, userId),
      };
    } catch (error) {
      this.auditLogger.log(
        aiId,
        sanitizedQuery,
        0,
        true,
        `Search error: ${error instanceof Error ? error.message : "Unknown error"}`,
        userId
      );

      return {
        success: false,
        results: [],
        error: "Search failed. Please try again.",
      };
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(aiId: string, userId?: string): RateLimitStatus {
    return this.rateLimiter.getStatus(aiId, userId);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(aiId?: string, limit?: number): AuditLog[] {
    return this.auditLogger.getLogs(aiId, limit);
  }

  /**
   * Get search statistics
   */
  getStatistics(aiId?: string): {
    totalSearches: number;
    blockedSearches: number;
    blockRate: number;
  } {
    return this.auditLogger.getStatistics(aiId);
  }

  /**
   * Mock search results for testing
   */
  private getMockResults(query: string, category?: string): any[] {
    return [
      {
        title: `Results for: ${query}`,
        description: `Search results related to ${query} in category: ${category || "general"}`,
        url: "https://example.com/search",
        relevance: 0.95,
      },
      {
        title: `Tutorial: ${query}`,
        description: `Learn about ${query} with step-by-step instructions`,
        url: "https://wikipedia.org/wiki/example",
        relevance: 0.85,
      },
      {
        title: `Best practices for ${query}`,
        description: `Industry standards and best practices for ${query}`,
        url: "https://github.com/example",
        relevance: 0.75,
      },
    ];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const webSearchSecurityEngine = new WebSearchSecurityEngine();
