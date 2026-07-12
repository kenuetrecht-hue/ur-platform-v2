/**
 * ============================================================================
 * AI LEARNING SYSTEM WITH SAFEGUARDS
 * ============================================================================
 * Implements secure, auditable learning for all AI types with:
 * - Rate limiting to prevent abuse
 * - Pattern protection to block sensitive data learning
 * - Admin approval workflows
 * - Complete audit trails
 * - Rollback capabilities
 * ============================================================================
 */

import { z } from "zod";

// ============================================================================
// 1. LEARNING EVENT TYPES
// ============================================================================

export type LearningEventType = "interaction" | "feedback" | "correction" | "pattern_detection";
export type AIType = "platform" | "creator" | "helper" | "admin" | "doctor";

export interface LearningEvent {
  id: string;
  aiType: AIType;
  timestamp: number;
  eventType: LearningEventType;
  content: string;
  userId?: string;
  confidence: number; // 0-100
  approved: boolean;
  approvedBy?: string;
  approvalTimestamp?: number;
  rejectionReason?: string;
  auditTrail: {
    createdAt: number;
    modifiedAt: number;
    version: number;
    changedBy?: string;
  };
  tags: string[];
}

export interface LearningRateLimit {
  aiType: AIType;
  eventsThisHour: number;
  maxEventsPerHour: number;
  resetAt: number; // Unix timestamp
}

export interface ProtectedPattern {
  pattern: string;
  regex: RegExp;
  severity: "critical" | "high" | "medium";
  description: string;
}

// ============================================================================
// 2. PROTECTED PATTERNS (CANNOT BE LEARNED)
// ============================================================================

export const PROTECTED_PATTERNS: Record<AIType, ProtectedPattern[]> = {
  platform: [
    {
      pattern: "user_personal_data",
      regex: /(?:ssn|social.?security|phone|address|zip.?code|dob|date.?of.?birth)/i,
      severity: "critical",
      description: "Personal identification data",
    },
    {
      pattern: "financial_information",
      regex: /(?:credit.?card|cvv|routing.?number|account.?number|bank|wire.?transfer)/i,
      severity: "critical",
      description: "Financial account information",
    },
    {
      pattern: "health_records",
      regex: /(?:medical|diagnosis|prescription|treatment|health.?condition|disease)/i,
      severity: "high",
      description: "Protected health information (PHI)",
    },
    {
      pattern: "authentication_tokens",
      regex: /(?:api.?key|token|password|secret|bearer|authorization)/i,
      severity: "critical",
      description: "Authentication credentials",
    },
  ],
  creator: [
    {
      pattern: "user_personal_data",
      regex: /(?:ssn|social.?security|phone|address|zip.?code|dob|date.?of.?birth)/i,
      severity: "critical",
      description: "Personal identification data",
    },
    {
      pattern: "financial_information",
      regex: /(?:credit.?card|cvv|routing.?number|account.?number|bank|wire.?transfer)/i,
      severity: "critical",
      description: "Financial account information",
    },
    {
      pattern: "authentication_tokens",
      regex: /(?:api.?key|token|password|secret|bearer|authorization)/i,
      severity: "critical",
      description: "Authentication credentials",
    },
  ],
  helper: [
    {
      pattern: "authentication_tokens",
      regex: /(?:api.?key|token|password|secret|bearer|authorization)/i,
      severity: "critical",
      description: "Authentication credentials",
    },
    {
      pattern: "system_credentials",
      regex: /(?:database.?url|connection.?string|private.?key|secret.?key)/i,
      severity: "critical",
      description: "System credentials",
    },
    {
      pattern: "admin_commands",
      regex: /(?:delete|drop|truncate|alter.?table|exec|execute|shell|bash)/i,
      severity: "high",
      description: "Destructive admin commands",
    },
  ],
  admin: [
    {
      pattern: "authentication_tokens",
      regex: /(?:api.?key|token|password|secret|bearer|authorization)/i,
      severity: "critical",
      description: "Authentication credentials",
    },
    {
      pattern: "system_vulnerabilities",
      regex: /(?:vulnerability|exploit|zero.?day|cve|buffer.?overflow|injection)/i,
      severity: "critical",
      description: "Security vulnerabilities",
    },
  ],
  doctor: [
    {
      pattern: "user_personal_data",
      regex: /(?:ssn|social.?security|phone|address|zip.?code|dob|date.?of.?birth)/i,
      severity: "critical",
      description: "Personal identification data",
    },
    {
      pattern: "system_internals",
      regex: /(?:source.?code|repository|commit|branch|deployment|infrastructure)/i,
      severity: "high",
      description: "System internal information",
    },
    {
      pattern: "authentication_tokens",
      regex: /(?:api.?key|token|password|secret|bearer|authorization)/i,
      severity: "critical",
      description: "Authentication credentials",
    },
  ],
};

// ============================================================================
// 3. LEARNING SYSTEM CLASS
// ============================================================================

export class AILearningSystem {
  private rateLimits: Map<AIType, LearningRateLimit> = new Map();
  private learningEvents: Map<string, LearningEvent> = new Map();
  private approvalQueue: Map<string, LearningEvent> = new Map();
  private auditLog: LearningEvent[] = [];

  constructor() {
    this.initializeRateLimits();
  }

  private initializeRateLimits() {
    const limits: Record<AIType, number> = {
      platform: 50,
      creator: 75,
      helper: 100,
      admin: 200,
      doctor: 150,
    };

    Object.entries(limits).forEach(([aiType, maxEvents]) => {
      this.rateLimits.set(aiType as AIType, {
        aiType: aiType as AIType,
        eventsThisHour: 0,
        maxEventsPerHour: maxEvents,
        resetAt: Date.now() + 3600000,
      });
    });
  }

  /**
   * Check if content contains protected patterns
   */
  private checkProtectedPatterns(aiType: AIType, content: string): ProtectedPattern | null {
    const patterns = PROTECTED_PATTERNS[aiType];

    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(aiType: AIType): boolean {
    const limit = this.rateLimits.get(aiType);
    if (!limit) return false;

    // Reset if hour has passed
    if (Date.now() > limit.resetAt) {
      limit.eventsThisHour = 0;
      limit.resetAt = Date.now() + 3600000;
    }

    return limit.eventsThisHour < limit.maxEventsPerHour;
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(aiType: AIType) {
    const limit = this.rateLimits.get(aiType);
    if (limit) {
      limit.eventsThisHour++;
    }
  }

  /**
   * Submit a learning event
   */
  async submitLearningEvent(
    aiType: AIType,
    eventType: LearningEventType,
    content: string,
    options?: {
      userId?: string;
      confidence?: number;
      tags?: string[];
      requiresApproval?: boolean;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
    requiresApproval?: boolean;
  }> {
    // Check rate limit
    if (!this.checkRateLimit(aiType)) {
      return {
        success: false,
        error: `Rate limit exceeded for ${aiType} AI (${this.rateLimits.get(aiType)?.maxEventsPerHour} events/hour)`,
      };
    }

    // Check protected patterns
    const protectedPattern = this.checkProtectedPatterns(aiType, content);
    if (protectedPattern) {
      return {
        success: false,
        error: `Cannot learn protected pattern: ${protectedPattern.description} (${protectedPattern.severity} severity)`,
      };
    }

    // Create learning event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event: LearningEvent = {
      id: eventId,
      aiType,
      timestamp: Date.now(),
      eventType,
      content,
      userId: options?.userId,
      confidence: options?.confidence ?? 50,
      approved: false,
      tags: options?.tags ?? [],
      auditTrail: {
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        version: 1,
      },
    };

    // Check if approval is required
    const requiresApproval = options?.requiresApproval ?? this.requiresApprovalForAI(aiType);

    if (requiresApproval) {
      this.approvalQueue.set(eventId, event);
      this.incrementRateLimit(aiType);
      return {
        success: true,
        eventId,
        requiresApproval: true,
      };
    }

    // Auto-approve if not required
    event.approved = true;
    event.approvalTimestamp = Date.now();
    this.learningEvents.set(eventId, event);
    this.auditLog.push(event);
    this.incrementRateLimit(aiType);

    return {
      success: true,
      eventId,
      requiresApproval: false,
    };
  }

  /**
   * Approve a pending learning event
   */
  async approveLearningEvent(
    eventId: string,
    approvedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const event = this.approvalQueue.get(eventId);
    if (!event) {
      return { success: false, error: "Event not found in approval queue" };
    }

    event.approved = true;
    event.approvedBy = approvedBy;
    event.approvalTimestamp = Date.now();
    event.auditTrail.modifiedAt = Date.now();
    event.auditTrail.version++;
    event.auditTrail.changedBy = approvedBy;

    this.approvalQueue.delete(eventId);
    this.learningEvents.set(eventId, event);
    this.auditLog.push(event);

    return { success: true };
  }

  /**
   * Reject a pending learning event
   */
  async rejectLearningEvent(
    eventId: string,
    rejectionReason: string,
    rejectedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const event = this.approvalQueue.get(eventId);
    if (!event) {
      return { success: false, error: "Event not found in approval queue" };
    }

    event.rejectionReason = rejectionReason;
    event.auditTrail.modifiedAt = Date.now();
    event.auditTrail.version++;
    event.auditTrail.changedBy = rejectedBy;

    this.approvalQueue.delete(eventId);
    this.auditLog.push(event);

    return { success: true };
  }

  /**
   * Get pending approvals for an AI type
   */
  getPendingApprovals(aiType?: AIType): LearningEvent[] {
    const events = Array.from(this.approvalQueue.values());
    return aiType ? events.filter((e) => e.aiType === aiType) : events;
  }

  /**
   * Get learning events for an AI type
   */
  getLearningEvents(aiType: AIType, limit: number = 100): LearningEvent[] {
    return Array.from(this.learningEvents.values())
      .filter((e) => e.aiType === aiType && e.approved)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get audit log
   */
  getAuditLog(aiType?: AIType, limit: number = 100): LearningEvent[] {
    let log = this.auditLog;
    if (aiType) {
      log = log.filter((e) => e.aiType === aiType);
    }
    return log.slice(-limit);
  }

  /**
   * Rollback a learning event
   */
  async rollbackLearningEvent(eventId: string, rolledBackBy: string): Promise<{ success: boolean; error?: string }> {
    const event = this.learningEvents.get(eventId);
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    event.approved = false;
    event.auditTrail.modifiedAt = Date.now();
    event.auditTrail.version++;
    event.auditTrail.changedBy = rolledBackBy;

    this.learningEvents.delete(eventId);
    this.auditLog.push(event);

    return { success: true };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(aiType: AIType): LearningRateLimit | undefined {
    return this.rateLimits.get(aiType);
  }

  /**
   * Check if AI type requires approval for learning
   */
  private requiresApprovalForAI(aiType: AIType): boolean {
    const requiresApproval: Record<AIType, boolean> = {
      platform: true,
      creator: false,
      helper: false,
      admin: true,
      doctor: true,
    };
    return requiresApproval[aiType];
  }

  /**
   * Get learning statistics
   */
  getStatistics(aiType?: AIType) {
    const events = aiType
      ? Array.from(this.learningEvents.values()).filter((e) => e.aiType === aiType)
      : Array.from(this.learningEvents.values());

    const avgConfidence =
      events.length > 0 ? events.reduce((sum, e) => sum + e.confidence, 0) / events.length : 0;

    return {
      totalEvents: events.length,
      averageConfidence: Math.round(avgConfidence),
      eventTypes: {
        interaction: events.filter((e) => e.eventType === "interaction").length,
        feedback: events.filter((e) => e.eventType === "feedback").length,
        correction: events.filter((e) => e.eventType === "correction").length,
        pattern_detection: events.filter((e) => e.eventType === "pattern_detection").length,
      },
      pendingApprovals: this.getPendingApprovals(aiType).length,
    };
  }
}

// ============================================================================
// 4. SINGLETON INSTANCE
// ============================================================================

export const aiLearningSystem = new AILearningSystem();

// ============================================================================
// 5. VALIDATION SCHEMAS
// ============================================================================

export const LearningEventSchema = z.object({
  id: z.string(),
  aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]),
  timestamp: z.number(),
  eventType: z.enum(["interaction", "feedback", "correction", "pattern_detection"]),
  content: z.string(),
  userId: z.string().optional(),
  confidence: z.number().min(0).max(100),
  approved: z.boolean(),
  approvedBy: z.string().optional(),
  approvalTimestamp: z.number().optional(),
  rejectionReason: z.string().optional(),
  auditTrail: z.object({
    createdAt: z.number(),
    modifiedAt: z.number(),
    version: z.number(),
    changedBy: z.string().optional(),
  }),
  tags: z.array(z.string()),
});

export const SubmitLearningEventSchema = z.object({
  aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]),
  eventType: z.enum(["interaction", "feedback", "correction", "pattern_detection"]),
  content: z.string(),
  userId: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
});
