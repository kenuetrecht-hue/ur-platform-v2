/**
 * AI Learning Engine
 * Enables all AI agents to learn, adapt, and stay current with real-time knowledge
 * Includes security safeguards and collaborative learning capabilities
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LearningSource = "user_feedback" | "web_search" | "peer_learning" | "certification" | "manual_update";
export type KnowledgeCategory = "technical" | "domain" | "procedure" | "regulation" | "best_practice" | "case_study";
export type SecurityLevel = "public" | "verified" | "restricted" | "internal";

export interface KnowledgeEntry {
  id: string;
  aiAgentId: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  source: LearningSource;
  sourceUrl?: string;
  confidence: number; // 0-1
  verificationStatus: "unverified" | "verified" | "trusted";
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface LearningInteraction {
  id: string;
  aiAgentId: string;
  userId: string;
  type: "question" | "feedback" | "correction" | "suggestion";
  content: string;
  response?: string;
  rating?: number; // 1-5
  timestamp: Date;
  processed: boolean;
}

export interface AIAgentProfile {
  id: string;
  name: string;
  specialty: string;
  version: string;
  lastUpdated: Date;
  knowledgeCount: number;
  interactionCount: number;
  averageRating: number;
  learningScore: number; // 0-100
  certifications: string[];
  collaborators: string[]; // IDs of other AI agents it learns from
}

export interface KnowledgeUpdate {
  id: string;
  aiAgentId: string;
  timestamp: Date;
  changes: {
    added: KnowledgeEntry[];
    updated: KnowledgeEntry[];
    removed: string[];
  };
  reason: string;
}

export interface LearningAnalytics {
  aiAgentId: string;
  totalInteractions: number;
  averageUserRating: number;
  knowledgeAccuracy: number; // 0-1
  updateFrequency: number; // updates per month
  topicsCovered: string[];
  improvementAreas: string[];
  lastAnalyzed: Date;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const KnowledgeEntrySchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  category: z.enum(["technical", "domain", "procedure", "regulation", "best_practice", "case_study"]),
  title: z.string().min(1),
  content: z.string().min(1),
  source: z.enum(["user_feedback", "web_search", "peer_learning", "certification", "manual_update"]),
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
  verificationStatus: z.enum(["unverified", "verified", "trusted"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().optional(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
});

const LearningInteractionSchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  userId: z.string(),
  type: z.enum(["question", "feedback", "correction", "suggestion"]),
  content: z.string().min(1),
  response: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  timestamp: z.date(),
  processed: z.boolean(),
});

const AIAgentProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  version: z.string(),
  lastUpdated: z.date(),
  knowledgeCount: z.number().nonnegative(),
  interactionCount: z.number().nonnegative(),
  averageRating: z.number().min(0).max(5),
  learningScore: z.number().min(0).max(100),
  certifications: z.array(z.string()),
  collaborators: z.array(z.string()),
});

// ============================================================================
// AI LEARNING ENGINE
// ============================================================================

export class AILearningEngine {
  private knowledgeBase: Map<string, KnowledgeEntry[]> = new Map();
  private interactions: Map<string, LearningInteraction[]> = new Map();
  private agentProfiles: Map<string, AIAgentProfile> = new Map();
  private updateHistory: Map<string, KnowledgeUpdate[]> = new Map();

  /**
   * Register a new AI agent
   */
  registerAgent(
    agentId: string,
    name: string,
    specialty: string,
    collaborators: string[] = []
  ): AIAgentProfile {
    const profile: AIAgentProfile = {
      id: agentId,
      name,
      specialty,
      version: "1.0.0",
      lastUpdated: new Date(),
      knowledgeCount: 0,
      interactionCount: 0,
      averageRating: 0,
      learningScore: 50,
      certifications: [],
      collaborators,
    };

    AIAgentProfileSchema.parse(profile);
    this.agentProfiles.set(agentId, profile);
    this.knowledgeBase.set(agentId, []);
    this.interactions.set(agentId, []);
    this.updateHistory.set(agentId, []);

    return profile;
  }

  /**
   * Add knowledge entry to agent's knowledge base
   */
  addKnowledge(
    agentId: string,
    category: KnowledgeCategory,
    title: string,
    content: string,
    source: LearningSource,
    options?: {
      sourceUrl?: string;
      confidence?: number;
      tags?: string[];
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    }
  ): KnowledgeEntry {
    const entry: KnowledgeEntry = {
      id: `ke-${Date.now()}-${Math.random()}`,
      aiAgentId: agentId,
      category,
      title,
      content,
      source,
      sourceUrl: options?.sourceUrl,
      confidence: options?.confidence ?? 0.8,
      verificationStatus: source === "certification" ? "trusted" : "unverified",
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options?.expiresAt,
      tags: options?.tags ?? [],
      metadata: options?.metadata ?? {},
    };

    KnowledgeEntrySchema.parse(entry);

    const knowledge = this.knowledgeBase.get(agentId) || [];
    knowledge.push(entry);
    this.knowledgeBase.set(agentId, knowledge);

    // Update profile
    const profile = this.agentProfiles.get(agentId);
    if (profile) {
      profile.knowledgeCount = knowledge.length;
      profile.lastUpdated = new Date();
    }

    return entry;
  }

  /**
   * Record learning interaction (feedback, corrections, suggestions)
   */
  recordInteraction(
    agentId: string,
    userId: string,
    type: "question" | "feedback" | "correction" | "suggestion",
    content: string,
    rating?: number
  ): LearningInteraction {
    const interaction: LearningInteraction = {
      id: `li-${Date.now()}-${Math.random()}`,
      aiAgentId: agentId,
      userId,
      type,
      content,
      rating,
      timestamp: new Date(),
      processed: false,
    };

    LearningInteractionSchema.parse(interaction);

    const interactions = this.interactions.get(agentId) || [];
    interactions.push(interaction);
    this.interactions.set(agentId, interactions);

    // Update profile
    const profile = this.agentProfiles.get(agentId);
    if (profile) {
      profile.interactionCount++;
      if (rating) {
        const allRatings = interactions
          .filter((i) => i.rating)
          .map((i) => i.rating as number);
        profile.averageRating =
          allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      }
    }

    return interaction;
  }

  /**
   * Process learning interactions and extract insights
   */
  processInteractions(agentId: string): string[] {
    const interactions = this.interactions.get(agentId) || [];
    const unprocessed = interactions.filter((i) => !i.processed);
    const insights: string[] = [];

    unprocessed.forEach((interaction) => {
      if (interaction.type === "correction") {
        insights.push(`Correction: ${interaction.content}`);
      } else if (interaction.type === "suggestion") {
        insights.push(`Suggestion: ${interaction.content}`);
      } else if (interaction.type === "feedback" && interaction.rating && interaction.rating < 3) {
        insights.push(`Improvement needed: ${interaction.content}`);
      }

      interaction.processed = true;
    });

    return insights;
  }

  /**
   * Get knowledge entries for an agent
   */
  getKnowledge(
    agentId: string,
    options?: {
      category?: KnowledgeCategory;
      tags?: string[];
      verificationStatus?: "unverified" | "verified" | "trusted";
    }
  ): KnowledgeEntry[] {
    let knowledge = this.knowledgeBase.get(agentId) || [];

    if (options?.category) {
      knowledge = knowledge.filter((k) => k.category === options.category);
    }

    if (options?.tags && options.tags.length > 0) {
      knowledge = knowledge.filter((k) =>
        options.tags!.some((tag) => k.tags.includes(tag))
      );
    }

    if (options?.verificationStatus) {
      knowledge = knowledge.filter(
        (k) => k.verificationStatus === options.verificationStatus
      );
    }

    // Filter out expired entries
    knowledge = knowledge.filter(
      (k) => !k.expiresAt || k.expiresAt > new Date()
    );

    return knowledge;
  }

  /**
   * Verify knowledge entry (increase confidence)
   */
  verifyKnowledge(entryId: string, agentId: string): void {
    const knowledge = this.knowledgeBase.get(agentId) || [];
    const entry = knowledge.find((k) => k.id === entryId);

    if (entry) {
      entry.verificationStatus = "verified";
      entry.confidence = Math.min(1, entry.confidence + 0.1);
      entry.updatedAt = new Date();
    }
  }

  /**
   * Enable collaborative learning between agents
   */
  shareKnowledge(
    sourceAgentId: string,
    targetAgentId: string,
    knowledgeIds: string[]
  ): void {
    const sourceKnowledge = this.knowledgeBase.get(sourceAgentId) || [];
    const targetKnowledge = this.knowledgeBase.get(targetAgentId) || [];

    knowledgeIds.forEach((id) => {
      const entry = sourceKnowledge.find((k) => k.id === id);
      if (entry && entry.verificationStatus === "verified") {
        const sharedEntry: KnowledgeEntry = {
          ...entry,
          id: `ke-${Date.now()}-${Math.random()}`,
          source: "peer_learning",
          confidence: Math.max(0.5, entry.confidence - 0.1),
        };

        targetKnowledge.push(sharedEntry);
      }
    });

    this.knowledgeBase.set(targetAgentId, targetKnowledge);
  }

  /**
   * Get agent profile
   */
  getAgentProfile(agentId: string): AIAgentProfile | undefined {
    return this.agentProfiles.get(agentId);
  }

  /**
   * Update agent version
   */
  updateAgentVersion(agentId: string, newVersion: string): void {
    const profile = this.agentProfiles.get(agentId);
    if (profile) {
      profile.version = newVersion;
      profile.lastUpdated = new Date();
    }
  }

  /**
   * Add certification to agent
   */
  addCertification(agentId: string, certification: string): void {
    const profile = this.agentProfiles.get(agentId);
    if (profile && !profile.certifications.includes(certification)) {
      profile.certifications.push(certification);
      profile.learningScore = Math.min(100, profile.learningScore + 5);
    }
  }

  /**
   * Calculate learning analytics
   */
  getAnalytics(agentId: string): LearningAnalytics {
    const profile = this.agentProfiles.get(agentId);
    const knowledge = this.knowledgeBase.get(agentId) || [];
    const interactions = this.interactions.get(agentId) || [];

    const verifiedKnowledge = knowledge.filter(
      (k) => k.verificationStatus === "verified"
    );
    const knowledgeAccuracy =
      knowledge.length > 0 ? verifiedKnowledge.length / knowledge.length : 0;

    const topics = new Set<string>();
    knowledge.forEach((k) => {
      k.tags.forEach((tag) => topics.add(tag));
    });

    const improvementAreas: string[] = [];
    const lowRatedInteractions = interactions.filter((i) => i.rating && i.rating < 3);
    if (lowRatedInteractions.length > 0) {
      improvementAreas.push("User satisfaction");
    }

    if (verifiedKnowledge.length < knowledge.length * 0.7) {
      improvementAreas.push("Knowledge verification");
    }

    return {
      aiAgentId: agentId,
      totalInteractions: interactions.length,
      averageUserRating: profile?.averageRating ?? 0,
      knowledgeAccuracy,
      updateFrequency: knowledge.length / 12, // Assume monthly average
      topicsCovered: Array.from(topics),
      improvementAreas,
      lastAnalyzed: new Date(),
    };
  }

  /**
   * Get all agents
   */
  getAllAgents(): AIAgentProfile[] {
    return Array.from(this.agentProfiles.values());
  }

  /**
   * Get learning statistics
   */
  getStatistics(): {
    totalAgents: number;
    totalKnowledgeEntries: number;
    totalInteractions: number;
    averageAgentScore: number;
  } {
    const agents = Array.from(this.agentProfiles.values());
    const totalKnowledge = Array.from(this.knowledgeBase.values()).reduce(
      (sum, k) => sum + k.length,
      0
    );
    const totalInteractions = Array.from(this.interactions.values()).reduce(
      (sum, i) => sum + i.length,
      0
    );
    const averageScore =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.learningScore, 0) / agents.length
        : 0;

    return {
      totalAgents: agents.length,
      totalKnowledgeEntries: totalKnowledge,
      totalInteractions,
      averageAgentScore: averageScore,
    };
  }
}

export default AILearningEngine;
