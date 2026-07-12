import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { webSearchSecurityEngine } from "./web-search-security";

/**
 * Web Search Router
 * 
 * Provides secure web search endpoints for all AI specialists with:
 * - Rate limiting (per AI, per user, global)
 * - Query sanitization
 * - Result validation
 * - SSL/TLS encryption
 * - Audit logging
 * - Malicious site detection
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const WebSearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  aiId: z.string(),
  category: z.enum(["materials", "tools", "techniques", "pricing", "standards", "general"]).optional(),
  limit: z.number().min(1).max(20).default(10),
});

const RateLimitCheckSchema = z.object({
  aiId: z.string(),
});

const AuditLogQuerySchema = z.object({
  aiId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

const SearchResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().url(),
  source: z.string(),
  relevance: z.number().min(0).max(1),
  timestamp: z.date(),
  verified: z.boolean(),
});

const WebSearchResponseSchema = z.object({
  success: z.boolean(),
  results: z.array(SearchResultSchema),
  query: z.string(),
  resultCount: z.number(),
  error: z.string().optional(),
  rateLimit: z.object({
    requestsUsed: z.number(),
    requestsRemaining: z.number(),
    resetTime: z.date(),
    isLimited: z.boolean(),
  }).optional(),
  timestamp: z.date(),
});

const RateLimitStatusSchema = z.object({
  aiId: z.string(),
  requestsUsed: z.number(),
  requestsRemaining: z.number(),
  resetTime: z.date(),
  isLimited: z.boolean(),
  percentageUsed: z.number(),
});

const AuditLogSchema = z.object({
  timestamp: z.date(),
  aiId: z.string(),
  userId: z.string().optional(),
  query: z.string(),
  resultCount: z.number(),
  blocked: z.boolean(),
  reason: z.string().optional(),
});

const StatisticsSchema = z.object({
  aiId: z.string().optional(),
  totalSearches: z.number(),
  blockedSearches: z.number(),
  blockRate: z.number(),
  successRate: z.number(),
});

// ============================================================================
// ROUTER PROCEDURES
// ============================================================================

export const webSearchRouter = router({
  /**
   * Perform secure web search
   * - Sanitizes query
   * - Checks rate limits
   * - Validates results
   * - Returns verified sources
   */
  search: publicProcedure
    .input(WebSearchInputSchema)
    .output(WebSearchResponseSchema)
    .mutation(async ({ input }: any) => {
      const startTime = Date.now();

      const result = await webSearchSecurityEngine.performSearch(
        input.query,
        input.aiId,
        undefined,
        input.category
      );

      return {
        success: result.success,
        results: result.results.slice(0, input.limit),
        query: input.query,
        resultCount: result.results.length,
        error: result.error,
        rateLimit: result.rateLimit,
        timestamp: new Date(),
      };
    }),

  /**
   * Get rate limit status for an AI
   * - Shows requests used and remaining
   * - Indicates if rate limited
   * - Shows reset time
   */
  getRateLimitStatus: publicProcedure
    .input(RateLimitCheckSchema)
    .output(RateLimitStatusSchema)
    .query(({ input }: any) => {
      const status = webSearchSecurityEngine.getRateLimitStatus(input.aiId);

      const totalLimit = 100; // Per hour
      const percentageUsed = (status.requestsUsed / totalLimit) * 100;

      return {
        aiId: input.aiId,
        requestsUsed: status.requestsUsed,
        requestsRemaining: status.requestsRemaining,
        resetTime: status.resetTime,
        isLimited: status.isLimited,
        percentageUsed,
      };
    }),

  /**
   * Get audit logs for web searches
   * - Shows all searches performed
   * - Indicates blocked searches and reasons
   * - Useful for debugging and monitoring
   */
  getAuditLogs: protectedProcedure
    .input(AuditLogQuerySchema)
    .output(z.array(AuditLogSchema))
    .query(({ input }: any) => {
      const logs = webSearchSecurityEngine.getAuditLogs(input.aiId, input.limit);
      return logs.map((log: any) => ({
        timestamp: log.timestamp,
        aiId: log.aiId,
        userId: log.userId,
        query: log.query,
        resultCount: log.resultCount,
        blocked: log.blocked,
        reason: log.reason,
      }));
    }),

  /**
   * Get search statistics
   * - Total searches performed
   * - Number of blocked searches
   * - Block rate percentage
   * - Success rate
   */
  getStatistics: protectedProcedure
    .input(z.object({ aiId: z.string().optional() }))
    .output(StatisticsSchema)
    .query(({ input }: any) => {
      const stats = webSearchSecurityEngine.getStatistics(input.aiId);
      const successRate = stats.totalSearches > 0 
        ? ((stats.totalSearches - stats.blockedSearches) / stats.totalSearches) * 100
        : 0;

      return {
        aiId: input.aiId,
        totalSearches: stats.totalSearches,
        blockedSearches: stats.blockedSearches,
        blockRate: stats.blockRate * 100,
        successRate,
      };
    }),

  /**
   * Search with category filter
   * - Materials: search for materials and supplies
   * - Tools: search for tools and equipment
   * - Techniques: search for methods and procedures
   * - Pricing: search for cost information
   * - Standards: search for industry standards
   */
  searchByCategory: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      aiId: z.string(),
      category: z.enum(["materials", "tools", "techniques", "pricing", "standards"]),
      limit: z.number().min(1).max(20).default(10),
    }))
    .output(WebSearchResponseSchema)
    .mutation(async ({ input }: any) => {
      const result = await webSearchSecurityEngine.performSearch(
        input.query,
        input.aiId,
        undefined,
        input.category
      );

      return {
        success: result.success,
        results: result.results.slice(0, input.limit),
        query: input.query,
        resultCount: result.results.length,
        error: result.error,
        rateLimit: result.rateLimit,
        timestamp: new Date(),
      };
    }),

  /**
   * Verify if a URL is safe
   * - Checks against blocked domains
   * - Validates SSL/TLS
   * - Checks for suspicious patterns
   */
  verifyUrl: publicProcedure
    .input(z.object({
      url: z.string().url(),
      aiId: z.string(),
    }))
    .output(z.object({
      url: z.string(),
      safe: z.boolean(),
      reason: z.string().optional(),
      verified: z.boolean(),
    }))
    .query(({ input }: any) => {
      // TODO: Implement URL verification logic
      // For now, return basic validation
      const url = new URL(input.url);
      const isSafe = url.protocol === "https:" && !url.hostname.includes("..");
      const isTrusted = [
        "wikipedia.org",
        "github.com",
        "stackoverflow.com",
        "osha.gov",
        "nist.gov",
      ].some((domain) => url.hostname.includes(domain));

      return {
        url: input.url,
        safe: isSafe,
        reason: isSafe ? undefined : "URL does not meet security requirements",
        verified: isTrusted,
      };
    }),

  /**
   * Get search recommendations based on AI type
   * - Suggests relevant search queries
   * - Based on AI specialty
   * - Helps users find information faster
   */
  getSearchRecommendations: publicProcedure
    .input(z.object({
      aiId: z.string(),
      topic: z.string().optional(),
    }))
    .output(z.object({
      aiId: z.string(),
      recommendations: z.array(z.object({
        query: z.string(),
        description: z.string(),
        category: z.string(),
      })),
    }))
    .query(({ input }: any) => {
      // TODO: Implement AI-specific recommendations
      // For now, return generic recommendations
      const recommendations = [
        {
          query: "industry standards and best practices",
          description: "Learn about current industry standards",
          category: "standards",
        },
        {
          query: "latest tools and equipment",
          description: "Discover new tools in this field",
          category: "tools",
        },
        {
          query: "cost estimation and pricing",
          description: "Find current pricing information",
          category: "pricing",
        },
      ];

      return {
        aiId: input.aiId,
        recommendations,
      };
    }),
});
