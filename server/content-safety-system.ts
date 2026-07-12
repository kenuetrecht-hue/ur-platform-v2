/**
 * Content Safety & Filtering System
 * Prevents harmful, illegal, or unethical content from being generated or shared
 * Ensures the app is used only for educational and legitimate entrepreneurial purposes
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HarmCategory = 
  | "violence"
  | "illegal_activity"
  | "sexual_content"
  | "hate_speech"
  | "harassment"
  | "misinformation"
  | "fraud"
  | "drugs"
  | "self_harm"
  | "exploitation";

export type SafetyLevel = "safe" | "warning" | "blocked";
export type ContentType = "text" | "image" | "audio" | "video" | "code";

export interface ContentAnalysis {
  id: string;
  content: string;
  contentType: ContentType;
  safetyLevel: SafetyLevel;
  harmCategories: HarmCategory[];
  confidence: number; // 0-1
  riskScore: number; // 0-100
  flaggedPhrases: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface SafetyPolicy {
  id: string;
  name: string;
  description: string;
  rules: SafetyRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyRule {
  id: string;
  policyId: string;
  pattern: string; // regex or keyword
  category: HarmCategory;
  action: "block" | "warn" | "flag_for_review";
  severity: number; // 1-10
  enabled: boolean;
}

export interface UserSafetyProfile {
  userId: string;
  warningCount: number;
  blockedAttempts: number;
  lastWarning?: Date;
  lastBlocked?: Date;
  status: "active" | "warned" | "suspended" | "banned";
  trustScore: number; // 0-100
}

export interface EducationalContext {
  id: string;
  topic: string;
  allowedKeywords: string[];
  blockedContexts: string[];
  description: string;
}

export interface SafetyReport {
  id: string;
  reportedBy: string;
  content: string;
  reason: HarmCategory;
  description: string;
  timestamp: Date;
  status: "pending" | "reviewed" | "resolved";
  action?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ContentAnalysisSchema = z.object({
  id: z.string(),
  content: z.string(),
  contentType: z.enum(["text", "image", "audio", "video", "code"]),
  safetyLevel: z.enum(["safe", "warning", "blocked"]),
  harmCategories: z.array(z.enum([
    "violence", "illegal_activity", "sexual_content", "hate_speech",
    "harassment", "misinformation", "fraud", "drugs", "self_harm", "exploitation"
  ])),
  confidence: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(100),
  flaggedPhrases: z.array(z.string()),
  recommendations: z.array(z.string()),
  timestamp: z.date(),
});

const SafetyRuleSchema = z.object({
  id: z.string(),
  policyId: z.string(),
  pattern: z.string().min(1),
  category: z.enum([
    "violence", "illegal_activity", "sexual_content", "hate_speech",
    "harassment", "misinformation", "fraud", "drugs", "self_harm", "exploitation"
  ]),
  action: z.enum(["block", "warn", "flag_for_review"]),
  severity: z.number().min(1).max(10),
  enabled: z.boolean(),
});

const UserSafetyProfileSchema = z.object({
  userId: z.string(),
  warningCount: z.number().nonnegative(),
  blockedAttempts: z.number().nonnegative(),
  lastWarning: z.date().optional(),
  lastBlocked: z.date().optional(),
  status: z.enum(["active", "warned", "suspended", "banned"]),
  trustScore: z.number().min(0).max(100),
});

// ============================================================================
// CONTENT SAFETY SYSTEM
// ============================================================================

export class ContentSafetySystem {
  private policies: Map<string, SafetyPolicy> = new Map();
  private rules: Map<string, SafetyRule[]> = new Map();
  private userProfiles: Map<string, UserSafetyProfile> = new Map();
  private analysisHistory: Map<string, ContentAnalysis[]> = new Map();
  private safetyReports: SafetyReport[] = [];
  private educationalContexts: Map<string, EducationalContext> = new Map();

  // Default harmful keywords and patterns
  private readonly HARMFUL_PATTERNS = {
    violence: [
      /kill|murder|assault|attack|bomb|weapon|gun|shoot/gi,
      /hurt|injure|wound|stab|slash|cut/gi,
    ],
    illegal_activity: [
      /steal|robbery|theft|smuggle|trafficking|money launder/gi,
      /hack|breach|crack password|unauthorized access/gi,
    ],
    sexual_content: [
      /explicit sexual|pornographic|xxx|adult content/gi,
      /child exploitation|pedophil|abuse child/gi,
    ],
    hate_speech: [
      /racist|sexist|homophobic|transphobic/gi,
      /slur|derogatory|discriminat/gi,
    ],
    harassment: [
      /bully|harass|threaten|intimidate|stalk/gi,
      /doxx|expose personal info|shame/gi,
    ],
    fraud: [
      /scam|fraud|con|fake|counterfeit/gi,
      /phishing|identity theft|pyramid scheme/gi,
    ],
    drugs: [
      /cocaine|heroin|meth|fentanyl|illegal drug/gi,
      /how to make|recipe for|synthesis/gi,
    ],
    self_harm: [
      /suicide|self-harm|self-injury|cutting/gi,
      /overdose|poison yourself/gi,
    ],
  };

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default safety policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicy: SafetyPolicy = {
      id: "policy-default",
      name: "Default Safety Policy",
      description: "Default policy for educational and entrepreneurial content",
      rules: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(defaultPolicy.id, defaultPolicy);
    this.rules.set(defaultPolicy.id, []);

    // Add default rules
    Object.entries(this.HARMFUL_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach((pattern, index) => {
        const rule: SafetyRule = {
          id: `rule-${category}-${index}`,
          policyId: defaultPolicy.id,
          pattern: pattern.source,
          category: category as HarmCategory,
          action: "block",
          severity: 8,
          enabled: true,
        };

        SafetyRuleSchema.parse(rule);
        const policyRules = this.rules.get(defaultPolicy.id) || [];
        policyRules.push(rule);
        this.rules.set(defaultPolicy.id, policyRules);
      });
    });
  }

  /**
   * Analyze content for safety
   */
  analyzeContent(
    content: string,
    contentType: ContentType = "text",
    userId?: string
  ): ContentAnalysis {
    const analysis: ContentAnalysis = {
      id: `ca-${Date.now()}-${Math.random()}`,
      content: content.substring(0, 500), // Store truncated version
      contentType,
      safetyLevel: "safe",
      harmCategories: [],
      confidence: 0.95,
      riskScore: 0,
      flaggedPhrases: [],
      recommendations: [],
      timestamp: new Date(),
    };

    // Check against all rules
    const allRules: SafetyRule[] = [];
    this.rules.forEach((rules) => {
      allRules.push(...rules.filter((r) => r.enabled));
    });

    let maxSeverity = 0;
    allRules.forEach((rule) => {
      try {
        const regex = new RegExp(rule.pattern, "gi");
        const matches = content.match(regex);

        if (matches) {
          analysis.flaggedPhrases.push(...matches);
          if (!analysis.harmCategories.includes(rule.category)) {
            analysis.harmCategories.push(rule.category);
          }
          maxSeverity = Math.max(maxSeverity, rule.severity);
        }
      } catch (error) {
        // Invalid regex, skip
      }
    });

    // Determine safety level and risk score
    if (maxSeverity >= 8) {
      analysis.safetyLevel = "blocked";
      analysis.riskScore = 90;
      analysis.recommendations.push("This content violates safety policies and cannot be processed");
    } else if (maxSeverity >= 5) {
      analysis.safetyLevel = "warning";
      analysis.riskScore = 60;
      analysis.recommendations.push("This content may violate safety policies. Please review before proceeding.");
    } else {
      analysis.safetyLevel = "safe";
      analysis.riskScore = 0;
      analysis.recommendations.push("Content is safe for processing");
    }

    ContentAnalysisSchema.parse(analysis);

    // Store in history
    if (userId) {
      const history = this.analysisHistory.get(userId) || [];
      history.push(analysis);
      this.analysisHistory.set(userId, history);

      // Update user safety profile
      if (analysis.safetyLevel === "blocked") {
        this.recordBlockedAttempt(userId);
      } else if (analysis.safetyLevel === "warning") {
        this.recordWarning(userId);
      }
    }

    return analysis;
  }

  /**
   * Record blocked attempt
   */
  private recordBlockedAttempt(userId: string): void {
    const profile = this.getUserSafetyProfile(userId);
    profile.blockedAttempts++;
    profile.lastBlocked = new Date();

    if (profile.blockedAttempts > 5) {
      profile.status = "suspended";
    }
  }

  /**
   * Record warning
   */
  private recordWarning(userId: string): void {
    const profile = this.getUserSafetyProfile(userId);
    profile.warningCount++;
    profile.lastWarning = new Date();
    profile.trustScore = Math.max(0, profile.trustScore - 10);

    if (profile.warningCount > 3) {
      profile.status = "warned";
    }
  }

  /**
   * Get or create user safety profile
   */
  getUserSafetyProfile(userId: string): UserSafetyProfile {
    if (!this.userProfiles.has(userId)) {
      const profile: UserSafetyProfile = {
        userId,
        warningCount: 0,
        blockedAttempts: 0,
        status: "active",
        trustScore: 100,
      };

      UserSafetyProfileSchema.parse(profile);
      this.userProfiles.set(userId, profile);
    }

    return this.userProfiles.get(userId)!;
  }

  /**
   * Register educational context
   */
  registerEducationalContext(
    topic: string,
    allowedKeywords: string[],
    blockedContexts: string[] = []
  ): EducationalContext {
    const context: EducationalContext = {
      id: `ec-${Date.now()}-${Math.random()}`,
      topic,
      allowedKeywords,
      blockedContexts,
      description: `Educational context for ${topic}`,
    };

    this.educationalContexts.set(context.id, context);
    return context;
  }

  /**
   * File safety report
   */
  fileSafetyReport(
    reportedBy: string,
    content: string,
    reason: HarmCategory,
    description: string
  ): SafetyReport {
    const report: SafetyReport = {
      id: `sr-${Date.now()}-${Math.random()}`,
      reportedBy,
      content,
      reason,
      description,
      timestamp: new Date(),
      status: "pending",
    };

    this.safetyReports.push(report);
    return report;
  }

  /**
   * Get pending safety reports
   */
  getPendingReports(): SafetyReport[] {
    return this.safetyReports.filter((r) => r.status === "pending");
  }

  /**
   * Resolve safety report
   */
  resolveSafetyReport(reportId: string, action: string): void {
    const report = this.safetyReports.find((r) => r.id === reportId);
    if (report) {
      report.status = "resolved";
      report.action = action;
    }
  }

  /**
   * Check if user can perform action
   */
  canUserPerformAction(userId: string): boolean {
    const profile = this.getUserSafetyProfile(userId);
    return profile.status === "active";
  }

  /**
   * Get user analysis history
   */
  getUserAnalysisHistory(userId: string, limit: number = 10): ContentAnalysis[] {
    const history = this.analysisHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Get safety statistics
   */
  getStatistics(): {
    totalAnalyses: number;
    blockedContent: number;
    warningContent: number;
    suspendedUsers: number;
    pendingReports: number;
  } {
    let totalAnalyses = 0;
    let blockedContent = 0;
    let warningContent = 0;

    this.analysisHistory.forEach((analyses) => {
      totalAnalyses += analyses.length;
      blockedContent += analyses.filter((a) => a.safetyLevel === "blocked").length;
      warningContent += analyses.filter((a) => a.safetyLevel === "warning").length;
    });

    const suspendedUsers = Array.from(this.userProfiles.values()).filter(
      (p) => p.status === "suspended" || p.status === "banned"
    ).length;

    const pendingReports = this.safetyReports.filter((r) => r.status === "pending").length;

    return {
      totalAnalyses,
      blockedContent,
      warningContent,
      suspendedUsers,
      pendingReports,
    };
  }

  /**
   * Add custom safety rule
   */
  addCustomRule(
    policyId: string,
    pattern: string,
    category: HarmCategory,
    action: "block" | "warn" | "flag_for_review" = "warn",
    severity: number = 5
  ): SafetyRule {
    const rule: SafetyRule = {
      id: `rule-${Date.now()}-${Math.random()}`,
      policyId,
      pattern,
      category,
      action,
      severity,
      enabled: true,
    };

    SafetyRuleSchema.parse(rule);

    const rules = this.rules.get(policyId) || [];
    rules.push(rule);
    this.rules.set(policyId, rules);

    return rule;
  }
}

export default ContentSafetySystem;
