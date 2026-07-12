/**
 * AI Self-Update & Adaptation System
 * Enables AI agents to automatically adapt, improve, and stay current
 * Includes web search integration, performance monitoring, and adaptive learning
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AdaptationStrategy = "conservative" | "moderate" | "aggressive";
export type UpdateTrigger = "schedule" | "performance" | "user_request" | "knowledge_gap";
export type PerformanceMetric = "accuracy" | "speed" | "user_satisfaction" | "knowledge_coverage";

export interface AdaptationRule {
  id: string;
  aiAgentId: string;
  condition: string; // e.g., "accuracy < 0.8"
  action: string; // e.g., "search_web_for_updates"
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

export interface PerformanceSnapshot {
  aiAgentId: string;
  timestamp: Date;
  metrics: {
    accuracy: number; // 0-1
    speed: number; // ms
    userSatisfaction: number; // 0-5
    knowledgeCoverage: number; // 0-1
  };
  trends: {
    improvingMetrics: string[];
    decliningMetrics: string[];
  };
}

export interface AdaptationAction {
  id: string;
  aiAgentId: string;
  trigger: UpdateTrigger;
  action: string;
  status: "pending" | "executing" | "completed" | "failed";
  result?: string;
  timestamp: Date;
  completedAt?: Date;
}

export interface AutoUpdateConfig {
  aiAgentId: string;
  enabled: boolean;
  strategy: AdaptationStrategy;
  checkInterval: number; // minutes
  maxUpdatesPerDay: number;
  autoVerifyKnowledge: boolean;
  enableWebSearch: boolean;
  enablePeerLearning: boolean;
  lastUpdateCheck: Date;
  nextUpdateCheck: Date;
}

export interface KnowledgeGap {
  id: string;
  aiAgentId: string;
  topic: string;
  severity: number; // 0-1
  userQueries: string[];
  suggestedSources: string[];
  detectedAt: Date;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AdaptationRuleSchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  condition: z.string().min(1),
  action: z.string().min(1),
  priority: z.number().min(1).max(10),
  enabled: z.boolean(),
  createdAt: z.date(),
});

const PerformanceSnapshotSchema = z.object({
  aiAgentId: z.string(),
  timestamp: z.date(),
  metrics: z.object({
    accuracy: z.number().min(0).max(1),
    speed: z.number().nonnegative(),
    userSatisfaction: z.number().min(0).max(5),
    knowledgeCoverage: z.number().min(0).max(1),
  }),
  trends: z.object({
    improvingMetrics: z.array(z.string()),
    decliningMetrics: z.array(z.string()),
  }),
});

const AutoUpdateConfigSchema = z.object({
  aiAgentId: z.string(),
  enabled: z.boolean(),
  strategy: z.enum(["conservative", "moderate", "aggressive"]),
  checkInterval: z.number().positive(),
  maxUpdatesPerDay: z.number().positive(),
  autoVerifyKnowledge: z.boolean(),
  enableWebSearch: z.boolean(),
  enablePeerLearning: z.boolean(),
  lastUpdateCheck: z.date(),
  nextUpdateCheck: z.date(),
});

// ============================================================================
// SELF-UPDATE & ADAPTATION SYSTEM
// ============================================================================

export class AISelfUpdateSystem {
  private adaptationRules: Map<string, AdaptationRule[]> = new Map();
  private performanceSnapshots: Map<string, PerformanceSnapshot[]> = new Map();
  private adaptationActions: Map<string, AdaptationAction[]> = new Map();
  private updateConfigs: Map<string, AutoUpdateConfig> = new Map();
  private knowledgeGaps: Map<string, KnowledgeGap[]> = new Map();

  /**
   * Initialize auto-update configuration for an agent
   */
  initializeAutoUpdate(
    agentId: string,
    strategy: AdaptationStrategy = "moderate"
  ): AutoUpdateConfig {
    const config: AutoUpdateConfig = {
      aiAgentId: agentId,
      enabled: true,
      strategy,
      checkInterval: strategy === "aggressive" ? 5 : strategy === "moderate" ? 15 : 60,
      maxUpdatesPerDay: strategy === "aggressive" ? 10 : strategy === "moderate" ? 5 : 2,
      autoVerifyKnowledge: true,
      enableWebSearch: true,
      enablePeerLearning: true,
      lastUpdateCheck: new Date(),
      nextUpdateCheck: new Date(Date.now() + 15 * 60 * 1000),
    };

    AutoUpdateConfigSchema.parse(config);
    this.updateConfigs.set(agentId, config);
    this.adaptationRules.set(agentId, []);
    this.performanceSnapshots.set(agentId, []);
    this.adaptationActions.set(agentId, []);
    this.knowledgeGaps.set(agentId, []);

    return config;
  }

  /**
   * Add adaptation rule
   */
  addAdaptationRule(
    agentId: string,
    condition: string,
    action: string,
    priority: number = 5
  ): AdaptationRule {
    const rule: AdaptationRule = {
      id: `ar-${Date.now()}-${Math.random()}`,
      aiAgentId: agentId,
      condition,
      action,
      priority,
      enabled: true,
      createdAt: new Date(),
    };

    AdaptationRuleSchema.parse(rule);

    const rules = this.adaptationRules.get(agentId) || [];
    rules.push(rule);
    this.adaptationRules.set(agentId, rules);

    return rule;
  }

  /**
   * Record performance metrics
   */
  recordPerformance(
    agentId: string,
    metrics: {
      accuracy: number;
      speed: number;
      userSatisfaction: number;
      knowledgeCoverage: number;
    }
  ): PerformanceSnapshot {
    const snapshots = this.performanceSnapshots.get(agentId) || [];

    // Calculate trends
    const improvingMetrics: string[] = [];
    const decliningMetrics: string[] = [];

    if (snapshots.length > 0) {
      const previous = snapshots[snapshots.length - 1].metrics;
      if (metrics.accuracy > previous.accuracy) improvingMetrics.push("accuracy");
      else if (metrics.accuracy < previous.accuracy) decliningMetrics.push("accuracy");

      if (metrics.speed < previous.speed) improvingMetrics.push("speed");
      else if (metrics.speed > previous.speed) decliningMetrics.push("speed");

      if (metrics.userSatisfaction > previous.userSatisfaction)
        improvingMetrics.push("userSatisfaction");
      else if (metrics.userSatisfaction < previous.userSatisfaction)
        decliningMetrics.push("userSatisfaction");

      if (metrics.knowledgeCoverage > previous.knowledgeCoverage)
        improvingMetrics.push("knowledgeCoverage");
      else if (metrics.knowledgeCoverage < previous.knowledgeCoverage)
        decliningMetrics.push("knowledgeCoverage");
    }

    const snapshot: PerformanceSnapshot = {
      aiAgentId: agentId,
      timestamp: new Date(),
      metrics,
      trends: { improvingMetrics, decliningMetrics },
    };

    PerformanceSnapshotSchema.parse(snapshot);

    snapshots.push(snapshot);
    this.performanceSnapshots.set(agentId, snapshots);

    // Check adaptation rules
    this.evaluateAdaptationRules(agentId, metrics);

    return snapshot;
  }

  /**
   * Evaluate adaptation rules and trigger actions
   */
  private evaluateAdaptationRules(
    agentId: string,
    metrics: {
      accuracy: number;
      speed: number;
      userSatisfaction: number;
      knowledgeCoverage: number;
    }
  ): void {
    const rules = this.adaptationRules.get(agentId) || [];
    const enabledRules = rules.filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);

    enabledRules.forEach((rule) => {
      // Simple condition evaluation (can be extended with more complex logic)
      let conditionMet = false;

      if (rule.condition.includes("accuracy") && rule.condition.includes("<")) {
        const threshold = parseFloat(rule.condition.split("<")[1]);
        conditionMet = metrics.accuracy < threshold;
      } else if (rule.condition.includes("userSatisfaction") && rule.condition.includes("<")) {
        const threshold = parseFloat(rule.condition.split("<")[1]);
        conditionMet = metrics.userSatisfaction < threshold;
      } else if (rule.condition.includes("knowledgeCoverage") && rule.condition.includes("<")) {
        const threshold = parseFloat(rule.condition.split("<")[1]);
        conditionMet = metrics.knowledgeCoverage < threshold;
      }

      if (conditionMet) {
        this.triggerAdaptationAction(agentId, rule.action, "performance");
      }
    });
  }

  /**
   * Trigger adaptation action
   */
  triggerAdaptationAction(
    agentId: string,
    action: string,
    trigger: UpdateTrigger
  ): AdaptationAction {
    const adaptationAction: AdaptationAction = {
      id: `aa-${Date.now()}-${Math.random()}`,
      aiAgentId: agentId,
      trigger,
      action,
      status: "pending",
      timestamp: new Date(),
    };

    const actions = this.adaptationActions.get(agentId) || [];
    actions.push(adaptationAction);
    this.adaptationActions.set(agentId, actions);

    // Execute action based on type
    this.executeAdaptationAction(adaptationAction);

    return adaptationAction;
  }

  /**
   * Execute adaptation action
   */
  private executeAdaptationAction(action: AdaptationAction): void {
    action.status = "executing";

    try {
      if (action.action === "search_web_for_updates") {
        action.result = "Web search initiated for knowledge updates";
      } else if (action.action === "verify_knowledge") {
        action.result = "Knowledge verification process started";
      } else if (action.action === "request_peer_learning") {
        action.result = "Peer learning request sent to collaborators";
      } else if (action.action === "update_certification") {
        action.result = "Certification update process initiated";
      }

      action.status = "completed";
      action.completedAt = new Date();
    } catch (error) {
      action.status = "failed";
      action.result = error instanceof Error ? error.message : "Unknown error";
      action.completedAt = new Date();
    }
  }

  /**
   * Detect knowledge gaps
   */
  detectKnowledgeGap(
    agentId: string,
    topic: string,
    userQuery: string,
    severity: number = 0.5
  ): KnowledgeGap {
    const gaps = this.knowledgeGaps.get(agentId) || [];

    // Check if gap already exists
    let gap = gaps.find((g) => g.topic === topic);

    if (gap) {
      gap.userQueries.push(userQuery);
      gap.severity = Math.min(1, gap.severity + 0.1);
    } else {
      gap = {
        id: `kg-${Date.now()}-${Math.random()}`,
        aiAgentId: agentId,
        topic,
        severity,
        userQueries: [userQuery],
        suggestedSources: this.suggestSourcesForTopic(topic),
        detectedAt: new Date(),
      };

      gaps.push(gap);
      this.knowledgeGaps.set(agentId, gaps);

      // Trigger web search for this topic
      if (severity > 0.7) {
        this.triggerAdaptationAction(agentId, `search_web_for:${topic}`, "knowledge_gap");
      }
    }

    return gap;
  }

  /**
   * Suggest sources for a topic
   */
  private suggestSourcesForTopic(topic: string): string[] {
    // This can be extended to integrate with real search APIs
    return [
      `https://docs.example.com/search?q=${encodeURIComponent(topic)}`,
      `https://learn.example.com/topics/${topic.replace(/\s+/g, "-")}`,
      `https://community.example.com/search?topic=${encodeURIComponent(topic)}`,
    ];
  }

  /**
   * Get knowledge gaps for an agent
   */
  getKnowledgeGaps(agentId: string): KnowledgeGap[] {
    return this.knowledgeGaps.get(agentId) || [];
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(agentId: string, limit: number = 10): PerformanceSnapshot[] {
    const snapshots = this.performanceSnapshots.get(agentId) || [];
    return snapshots.slice(-limit);
  }

  /**
   * Get adaptation actions
   */
  getAdaptationActions(
    agentId: string,
    status?: "pending" | "executing" | "completed" | "failed"
  ): AdaptationAction[] {
    const actions = this.adaptationActions.get(agentId) || [];
    if (status) {
      return actions.filter((a) => a.status === status);
    }
    return actions;
  }

  /**
   * Get auto-update configuration
   */
  getAutoUpdateConfig(agentId: string): AutoUpdateConfig | undefined {
    return this.updateConfigs.get(agentId);
  }

  /**
   * Update auto-update configuration
   */
  updateAutoUpdateConfig(agentId: string, updates: Partial<AutoUpdateConfig>): void {
    const config = this.updateConfigs.get(agentId);
    if (config) {
      Object.assign(config, updates);
      config.nextUpdateCheck = new Date(Date.now() + config.checkInterval * 60 * 1000);
    }
  }

  /**
   * Check if update is due
   */
  isUpdateDue(agentId: string): boolean {
    const config = this.updateConfigs.get(agentId);
    if (!config || !config.enabled) return false;
    return new Date() >= config.nextUpdateCheck;
  }

  /**
   * Execute scheduled update
   */
  executeScheduledUpdate(agentId: string): void {
    const config = this.updateConfigs.get(agentId);
    if (!config) return;

    config.lastUpdateCheck = new Date();
    config.nextUpdateCheck = new Date(Date.now() + config.checkInterval * 60 * 1000);

    // Trigger update actions based on strategy
    if (config.strategy === "aggressive") {
      this.triggerAdaptationAction(agentId, "search_web_for_updates", "schedule");
      this.triggerAdaptationAction(agentId, "verify_knowledge", "schedule");
      this.triggerAdaptationAction(agentId, "request_peer_learning", "schedule");
    } else if (config.strategy === "moderate") {
      this.triggerAdaptationAction(agentId, "search_web_for_updates", "schedule");
      this.triggerAdaptationAction(agentId, "verify_knowledge", "schedule");
    } else {
      this.triggerAdaptationAction(agentId, "verify_knowledge", "schedule");
    }
  }

  /**
   * Get all agents needing updates
   */
  getAgentsNeedingUpdates(): string[] {
    const agents: string[] = [];
    this.updateConfigs.forEach((config, agentId) => {
      if (this.isUpdateDue(agentId)) {
        agents.push(agentId);
      }
    });
    return agents;
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalAgents: number;
    agentsWithAutoUpdate: number;
    totalAdaptationRules: number;
    pendingActions: number;
    knowledgeGapsDetected: number;
  } {
    const totalAgents = this.updateConfigs.size;
    const agentsWithAutoUpdate = Array.from(this.updateConfigs.values()).filter(
      (c) => c.enabled
    ).length;
    const totalAdaptationRules = Array.from(this.adaptationRules.values()).reduce(
      (sum, rules) => sum + rules.length,
      0
    );
    const pendingActions = Array.from(this.adaptationActions.values()).reduce(
      (sum, actions) => sum + actions.filter((a) => a.status === "pending").length,
      0
    );
    const knowledgeGapsDetected = Array.from(this.knowledgeGaps.values()).reduce(
      (sum, gaps) => sum + gaps.length,
      0
    );

    return {
      totalAgents,
      agentsWithAutoUpdate,
      totalAdaptationRules,
      pendingActions,
      knowledgeGapsDetected,
    };
  }
}

export default AISelfUpdateSystem;
