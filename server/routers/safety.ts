/**
 * Safety tRPC Router
 * Wraps all AI responses with content filtering, disclaimers, and legitimacy checks
 * Ensures every response meets safety and ethical standards before delivery
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import ContentSafetySystem from "../content-safety-system";
import EthicalGuidelinesSystem from "../ethical-guidelines-system";
import UsageMonitoringSystem from "../usage-monitoring-system";
import DisclaimersTransparencySystem from "../disclaimers-transparency-system";
import EntrepreneurialFocusSystem from "../entrepreneurial-focus-system";

// Initialize safety systems
const contentSafety = new ContentSafetySystem();
const ethicalGuidelines = new EthicalGuidelinesSystem();
const usageMonitoring = new UsageMonitoringSystem();
const disclaimers = new DisclaimersTransparencySystem();
const entrepreneurialFocus = new EntrepreneurialFocusSystem();

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const ProcessAIResponseSchema = z.object({
  userId: z.string(),
  aiAgentId: z.string(),
  responseType: z.enum(["advice", "information", "educational", "entertainment", "tool"]),
  originalResponse: z.string(),
  contentType: z.enum(["text", "image", "audio", "video", "code"]).default("text"),
  confidenceLevel: z.number().min(0).max(1).optional(),
  sources: z.array(z.string()).optional(),
});

const CheckContentSafetySchema = z.object({
  userId: z.string(),
  content: z.string(),
  contentType: z.enum(["text", "image", "audio", "video", "code"]).default("text"),
});

const ValidateUserActivitySchema = z.object({
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const GetSafetyStatusSchema = z.object({
  userId: z.string(),
});

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

const SafeAIResponseSchema = z.object({
  id: z.string(),
  originalResponse: z.string(),
  wrappedResponse: z.string(),
  safetyLevel: z.enum(["safe", "warning", "blocked"]),
  disclaimers: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
  transparency: z.object({
    isAIGenerated: z.boolean(),
    confidenceLevel: z.number(),
    limitations: z.array(z.string()),
    sources: z.array(z.string()),
  }),
  blocked: z.boolean(),
  blockReason: z.string().optional(),
  timestamp: z.date(),
});

const ContentAnalysisResultSchema = z.object({
  id: z.string(),
  safetyLevel: z.enum(["safe", "warning", "blocked"]),
  riskScore: z.number(),
  harmCategories: z.array(z.string()),
  flaggedPhrases: z.array(z.string()),
  recommendations: z.array(z.string()),
  timestamp: z.date(),
});

const UserSafetyStatusSchema = z.object({
  userId: z.string(),
  safetyProfile: z.object({
    status: z.enum(["active", "warned", "suspended", "banned"]),
    trustScore: z.number(),
    warningCount: z.number(),
    blockedAttempts: z.number(),
  }),
  abusePatterns: z.array(z.object({
    type: z.string(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    frequency: z.number(),
  })),
  canPerformAction: z.boolean(),
});

// ============================================================================
// SAFETY ROUTER
// ============================================================================

export const safetyRouter = router({
  /**
   * Process AI response through all safety filters
   */
  processAIResponse: publicProcedure
    .input(ProcessAIResponseSchema)
    .output(SafeAIResponseSchema)
    .mutation(async ({ input }) => {
      const {
        userId,
        aiAgentId,
        responseType,
        originalResponse,
        contentType,
        confidenceLevel,
        sources,
      } = input;

      // 1. Check content safety
      const contentAnalysis = contentSafety.analyzeContent(
        originalResponse,
        contentType,
        userId
      );

      // If content is blocked, return immediately
      if (contentAnalysis.safetyLevel === "blocked") {
        return {
          id: `sar-${Date.now()}-${Math.random()}`,
          originalResponse,
          wrappedResponse: "This response violates safety policies and cannot be displayed.",
          safetyLevel: "blocked",
          disclaimers: [],
          transparency: {
            isAIGenerated: true,
            confidenceLevel: 0,
            limitations: ["Content blocked due to safety violation"],
            sources: [],
          },
          blocked: true,
          blockReason: `Detected harmful content: ${contentAnalysis.harmCategories.join(", ")}`,
          timestamp: new Date(),
        };
      }

      // 2. Record activity
      usageMonitoring.recordActivity(
        userId,
        "ai_response_generated",
        aiAgentId,
        contentAnalysis.safetyLevel === "warning" ? "blocked" : "success",
        { responseType, contentType, harmCategories: contentAnalysis.harmCategories }
      );

      // 3. Check rate limits
      const policyId = contentAnalysis.safetyLevel === "warning" ? "policy-suspicious" : "policy-standard";
      if (!usageMonitoring.checkRateLimit(userId, policyId)) {
        return {
          id: `sar-${Date.now()}-${Math.random()}`,
          originalResponse,
          wrappedResponse: "Rate limit exceeded. Please try again later.",
          safetyLevel: "blocked",
          disclaimers: [],
          transparency: {
            isAIGenerated: true,
            confidenceLevel: 0,
            limitations: ["Rate limit exceeded"],
            sources: [],
          },
          blocked: true,
          blockReason: "Rate limit exceeded",
          timestamp: new Date(),
        };
      }

      // 4. Wrap response with disclaimers
      const wrappedResponse = disclaimers.wrapAIResponse(
        originalResponse,
        responseType as any,
        {
          confidenceLevel: confidenceLevel || 0.8,
          sources: sources || [],
        }
      );

      // 5. Get ethical guidelines
      const responseGuide = ethicalGuidelines.createResponseGuide(
        aiAgentId,
        responseType as any,
        [],
        []
      );

      return {
        id: wrappedResponse.id,
        originalResponse,
        wrappedResponse: wrappedResponse.wrappedResponse,
        safetyLevel: contentAnalysis.safetyLevel,
        disclaimers: wrappedResponse.disclaimers.map((d) => ({
          title: d.title,
          content: d.content,
        })),
        transparency: wrappedResponse.transparency,
        blocked: false,
        timestamp: wrappedResponse.timestamp,
      };
    }),

  /**
   * Check content safety without processing
   */
  checkContentSafety: publicProcedure
    .input(CheckContentSafetySchema)
    .output(ContentAnalysisResultSchema)
    .query(async ({ input }) => {
      const { userId, content, contentType } = input;

      const analysis = contentSafety.analyzeContent(content, contentType, userId);

      return {
        id: analysis.id,
        safetyLevel: analysis.safetyLevel,
        riskScore: analysis.riskScore,
        harmCategories: analysis.harmCategories,
        flaggedPhrases: analysis.flaggedPhrases,
        recommendations: analysis.recommendations,
        timestamp: analysis.timestamp,
      };
    }),

  /**
   * Validate user activity for abuse patterns
   */
  validateUserActivity: publicProcedure
    .input(ValidateUserActivitySchema)
    .output(
      z.object({
        allowed: z.boolean(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]),
        message: z.string(),
        timestamp: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, action, resource, metadata } = input;

      // Check if user can perform action
      const userPatterns = usageMonitoring.getAbusePatterns(userId);
      const hasCriticalPatterns = userPatterns.some((p) => p.riskLevel === "critical" && p.status === "active");
      if (hasCriticalPatterns) {
        return {
          allowed: false,
          riskLevel: "critical",
          message: "User account is restricted. Contact support.",
          timestamp: new Date(),
        };
      }

      // Record activity
      usageMonitoring.recordActivity(userId, action, resource, "success", metadata);

      // Check for abuse patterns
      const patterns = userPatterns;
      const activePatterns = patterns.filter((p) => p.status === "active");

      if (activePatterns.length > 0) {
        const maxRisk = activePatterns.reduce(
          (max, p) => {
            const riskMap = { low: 1, medium: 2, high: 3, critical: 4 };
            return Math.max(max, riskMap[p.riskLevel]);
          },
          0
        );
        const riskLevels: ("low" | "medium" | "high" | "critical")[] = [
          "low",
          "medium",
          "high",
          "critical",
        ];
        const riskLevel = riskLevels[maxRisk - 1] || "low";

        return {
          allowed: true,
          riskLevel,
          message: `Activity recorded. ${activePatterns.length} abuse pattern(s) detected.`,
          timestamp: new Date(),
        };
      }

      return {
        allowed: true,
        riskLevel: "low",
        message: "Activity recorded successfully.",
        timestamp: new Date(),
      };
    }),

  /**
   * Get user safety status
   */
  getUserSafetyStatus: publicProcedure
    .input(GetSafetyStatusSchema)
    .output(UserSafetyStatusSchema)
    .query(async ({ input }) => {
      const { userId } = input;

      const patterns = usageMonitoring.getAbusePatterns(userId);
      const activePatterns = patterns.filter((p) => p.status === "active");
      const hasCriticalPatterns = activePatterns.some((p) => p.riskLevel === "critical");

      return {
        userId,
        safetyProfile: {
          status: hasCriticalPatterns ? "suspended" : "active",
          trustScore: Math.max(0, 100 - activePatterns.length * 10),
          warningCount: activePatterns.filter((p) => p.riskLevel === "high").length,
          blockedAttempts: activePatterns.filter((p) => p.riskLevel === "critical").length,
        },
        abusePatterns: activePatterns.map((p) => ({
          type: p.abuseType,
          riskLevel: p.riskLevel,
          frequency: p.frequency,
        })),
        canPerformAction: !hasCriticalPatterns,
      };
    }),

  /**
   * Get system safety statistics
   */
  getSafetyStatistics: publicProcedure
    .output(
      z.object({
        contentSafety: z.object({
          totalAnalyses: z.number(),
          blockedContent: z.number(),
          warningContent: z.number(),
          suspendedUsers: z.number(),
        }),
        usageMonitoring: z.object({
          totalActivities: z.number(),
          activeAbusePatterns: z.number(),
          activeEnforcementActions: z.number(),
        }),
        ethics: z.object({
          totalGuidelines: z.number(),
          totalViolations: z.number(),
          complianceScore: z.number(),
        }),
        entrepreneurialFocus: z.object({
          totalGoals: z.number(),
          highLegitimacyGoals: z.number(),
          blockedGoals: z.number(),
        }),
      })
    )
    .query(async () => {
      const contentStats = contentSafety.getStatistics();
      const usageStats = usageMonitoring.getStatistics();
      const ethicsStats = ethicalGuidelines.getStatistics();
      const entrepreneurialStats = entrepreneurialFocus.getStatistics();

      return {
        contentSafety: {
          totalAnalyses: contentStats.totalAnalyses,
          blockedContent: contentStats.blockedContent,
          warningContent: contentStats.warningContent,
          suspendedUsers: contentStats.suspendedUsers,
        },
        usageMonitoring: {
          totalActivities: usageStats.totalActivities,
          activeAbusePatterns: usageStats.activeAbusePatterns,
          activeEnforcementActions: usageStats.activeEnforcementActions,
        },
        ethics: {
          totalGuidelines: ethicsStats.totalGuidelines,
          totalViolations: ethicsStats.totalViolations,
          complianceScore: ethicsStats.complianceScore,
        },
        entrepreneurialFocus: {
          totalGoals: entrepreneurialStats.totalGoals,
          highLegitimacyGoals: entrepreneurialStats.highLegitimacyGoals,
          blockedGoals: entrepreneurialStats.blockedGoals,
        },
      };
    }),

  /**
   * Report safety concern
   */
  reportSafetyConcern: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        concernType: z.string(),
        description: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
      })
    )
    .output(
      z.object({
        id: z.string(),
        status: z.string(),
        timestamp: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, concernType, description, severity } = input;

      // Record violation
      const violation = entrepreneurialFocus.recordViolation(
        userId,
        concernType,
        description,
        severity
      );

      return {
        id: violation.id,
        status: "reported",
        timestamp: violation.timestamp,
      };
    }),
});

export type SafetyRouter = typeof safetyRouter;
