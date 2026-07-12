/**
 * Admin AI Master Controller
 * Oversees all 14 Tier 1 Educational AIs with full administrative control
 * Manages learning, coordination, performance, and enforcement
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const AIAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    "realtor",
    "electrician",
    "contractor",
    "hvac",
    "landscaper",
    "attorney",
    "accountant",
    "coder",
    "marketer",
    "sales",
    "hr",
    "operations",
    "customer_service",
    "product",
  ]),
  status: z.enum(["active", "suspended", "learning", "maintenance"]),
  performanceScore: z.number().min(0).max(100),
  learningScore: z.number().min(0).max(100),
  certifications: z.array(z.string()),
  activeUsers: z.number(),
  totalInteractions: z.number(),
  lastUpdated: z.date(),
});

const AdminActionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "monitor",
    "update_knowledge",
    "adjust_performance",
    "suspend",
    "resume",
    "audit",
    "coordinate",
    "enforce_policy",
  ]),
  targetAI: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "executing", "completed", "failed"]),
  result: z.string().optional(),
  timestamp: z.date(),
});

const AdminAccessSchema = z.object({
  userId: z.string(),
  accessLevel: z.enum(["viewer", "editor", "admin", "super_admin"]),
  aiAccess: z.array(z.string()), // AI IDs they can access
  permissions: z.array(
    z.enum([
      "view_all_ais",
      "manage_ais",
      "view_analytics",
      "modify_settings",
      "suspend_ais",
      "view_learning_data",
      "manage_users",
      "system_admin",
    ])
  ),
  grantedAt: z.date(),
  expiresAt: z.date().optional(),
});

const AICoordinationSchema = z.object({
  id: z.string(),
  primaryAI: z.string(),
  collaboratingAIs: z.array(z.string()),
  taskType: z.string(),
  status: z.enum(["planned", "executing", "completed", "failed"]),
  result: z.string().optional(),
  timestamp: z.date(),
});

// ============================================================================
// TYPES
// ============================================================================

type AIAgent = z.infer<typeof AIAgentSchema>;
type AdminAction = z.infer<typeof AdminActionSchema>;
type AdminAccess = z.infer<typeof AdminAccessSchema>;
type AICoordination = z.infer<typeof AICoordinationSchema>;

// ============================================================================
// ADMIN AI MASTER CONTROLLER
// ============================================================================

export class AdminAIMasterController {
  private aiAgents: Map<string, AIAgent> = new Map();
  private adminActions: AdminAction[] = [];
  private adminAccess: Map<string, AdminAccess> = new Map();
  private aiCoordinations: AICoordination[] = [];

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  constructor() {
    this.initializeAIAgents();
  }

  private initializeAIAgents(): void {
    const agents = [
      {
        id: "realtor-001",
        name: "Real Estate Master",
        type: "realtor" as const,
      },
      {
        id: "electrician-001",
        name: "Electrician Expert",
        type: "electrician" as const,
      },
      {
        id: "contractor-001",
        name: "Contractor Pro",
        type: "contractor" as const,
      },
      { id: "hvac-001", name: "HVAC Specialist", type: "hvac" as const },
      {
        id: "landscaper-001",
        name: "Landscaping Master",
        type: "landscaper" as const,
      },
      { id: "attorney-001", name: "Attorney AI", type: "attorney" as const },
      {
        id: "accountant-001",
        name: "Accountant Pro",
        type: "accountant" as const,
      },
      { id: "coder-001", name: "Coder AI", type: "coder" as const },
      { id: "marketer-001", name: "Marketing Expert", type: "marketer" as const },
      { id: "sales-001", name: "Sales Master", type: "sales" as const },
      { id: "hr-001", name: "HR Specialist", type: "hr" as const },
      {
        id: "operations-001",
        name: "Operations Manager",
        type: "operations" as const,
      },
      {
        id: "customer_service-001",
        name: "Customer Service Pro",
        type: "customer_service" as const,
      },
      {
        id: "product-001",
        name: "Product Manager",
        type: "product" as const,
      },
    ];

    agents.forEach((agent) => {
      const fullAgent: AIAgent = {
        ...agent,
        status: "active",
        performanceScore: 85,
        learningScore: 75,
        certifications: [],
        activeUsers: 0,
        totalInteractions: 0,
        lastUpdated: new Date(),
      };
      this.aiAgents.set(agent.id, fullAgent);
    });
  }

  // ============================================================================
  // ADMIN ACCESS MANAGEMENT
  // ============================================================================

  grantAdminAccess(
    userId: string,
    accessLevel: "viewer" | "editor" | "admin" | "super_admin",
    aiIds: string[] = []
  ): AdminAccess {
    const permissions: AdminAccess["permissions"] = [];

    if (accessLevel === "viewer") {
      permissions.push("view_all_ais", "view_analytics");
    } else if (accessLevel === "editor") {
      permissions.push(
        "view_all_ais",
        "manage_ais",
        "view_analytics",
        "modify_settings"
      );
    } else if (accessLevel === "admin") {
      permissions.push(
        "view_all_ais",
        "manage_ais",
        "view_analytics",
        "modify_settings",
        "suspend_ais",
        "view_learning_data",
        "manage_users"
      );
    } else if (accessLevel === "super_admin") {
      permissions.push(
        "view_all_ais",
        "manage_ais",
        "view_analytics",
        "modify_settings",
        "suspend_ais",
        "view_learning_data",
        "manage_users",
        "system_admin"
      );
    }

    const access: AdminAccess = {
      userId,
      accessLevel,
      aiAccess: aiIds.length > 0 ? aiIds : Array.from(this.aiAgents.keys()),
      permissions,
      grantedAt: new Date(),
    };

    this.adminAccess.set(userId, access);
    return access;
  }

  revokeAdminAccess(userId: string): boolean {
    return this.adminAccess.delete(userId);
  }

  getAdminAccess(userId: string): AdminAccess | undefined {
    return this.adminAccess.get(userId);
  }

  // ============================================================================
  // AI AGENT MANAGEMENT
  // ============================================================================

  getAllAIAgents(): AIAgent[] {
    return Array.from(this.aiAgents.values());
  }

  getAIAgent(aiId: string): AIAgent | undefined {
    return this.aiAgents.get(aiId);
  }

  updateAIStatus(
    aiId: string,
    status: "active" | "suspended" | "learning" | "maintenance"
  ): AIAgent | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    agent.status = status;
    agent.lastUpdated = new Date();
    this.aiAgents.set(aiId, agent);

    this.logAdminAction({
      type: "adjust_performance",
      targetAI: aiId,
      description: `Status changed to ${status}`,
      priority: "high",
    });

    return agent;
  }

  suspendAI(aiId: string, reason: string): AIAgent | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    agent.status = "suspended";
    agent.lastUpdated = new Date();
    this.aiAgents.set(aiId, agent);

    this.logAdminAction({
      type: "suspend",
      targetAI: aiId,
      description: `Suspended: ${reason}`,
      priority: "critical",
    });

    return agent;
  }

  resumeAI(aiId: string): AIAgent | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    agent.status = "active";
    agent.lastUpdated = new Date();
    this.aiAgents.set(aiId, agent);

    this.logAdminAction({
      type: "resume",
      targetAI: aiId,
      description: "AI resumed",
      priority: "high",
    });

    return agent;
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  updateAIPerformance(
    aiId: string,
    performanceScore: number,
    learningScore: number
  ): AIAgent | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    agent.performanceScore = Math.max(0, Math.min(100, performanceScore));
    agent.learningScore = Math.max(0, Math.min(100, learningScore));
    agent.lastUpdated = new Date();
    this.aiAgents.set(aiId, agent);

    this.logAdminAction({
      type: "monitor",
      targetAI: aiId,
      description: `Performance: ${performanceScore}, Learning: ${learningScore}`,
      priority: "medium",
    });

    return agent;
  }

  getAIPerformanceReport(aiId: string): {
    aiId: string;
    name: string;
    performanceScore: number;
    learningScore: number;
    status: string;
    activeUsers: number;
    totalInteractions: number;
  } | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    return {
      aiId: agent.id,
      name: agent.name,
      performanceScore: agent.performanceScore,
      learningScore: agent.learningScore,
      status: agent.status,
      activeUsers: agent.activeUsers,
      totalInteractions: agent.totalInteractions,
    };
  }

  getAllPerformanceReports(): Array<{
    aiId: string;
    name: string;
    performanceScore: number;
    learningScore: number;
    status: string;
    activeUsers: number;
    totalInteractions: number;
  }> {
    return Array.from(this.aiAgents.values()).map((agent) => ({
      aiId: agent.id,
      name: agent.name,
      performanceScore: agent.performanceScore,
      learningScore: agent.learningScore,
      status: agent.status,
      activeUsers: agent.activeUsers,
      totalInteractions: agent.totalInteractions,
    }));
  }

  // ============================================================================
  // KNOWLEDGE MANAGEMENT
  // ============================================================================

  updateAIKnowledge(aiId: string, knowledgeUpdate: string): boolean {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return false;

    agent.lastUpdated = new Date();
    this.aiAgents.set(aiId, agent);

    this.logAdminAction({
      type: "update_knowledge",
      targetAI: aiId,
      description: knowledgeUpdate,
      priority: "high",
    });

    return true;
  }

  addAICertification(aiId: string, certification: string): AIAgent | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    if (!agent.certifications.includes(certification)) {
      agent.certifications.push(certification);
      agent.lastUpdated = new Date();
      this.aiAgents.set(aiId, agent);
    }

    return agent;
  }

  // ============================================================================
  // AI COORDINATION
  // ============================================================================

  coordinateAIs(
    primaryAiId: string,
    collaboratingAiIds: string[],
    taskType: string
  ): AICoordination {
    const coordination: AICoordination = {
      id: `coord-${Date.now()}`,
      primaryAI: primaryAiId,
      collaboratingAIs: collaboratingAiIds,
      taskType,
      status: "planned",
      timestamp: new Date(),
    };

    this.aiCoordinations.push(coordination);

    this.logAdminAction({
      type: "coordinate",
      targetAI: primaryAiId,
      description: `Coordinating with ${collaboratingAiIds.join(", ")} for ${taskType}`,
      priority: "medium",
    });

    return coordination;
  }

  completeCoordination(coordinationId: string, result: string): boolean {
    const coordination = this.aiCoordinations.find((c) => c.id === coordinationId);
    if (!coordination) return false;

    coordination.status = "completed";
    coordination.result = result;
    return true;
  }

  getCoordinationHistory(): AICoordination[] {
    return [...this.aiCoordinations];
  }

  // ============================================================================
  // ADMIN ACTIONS & LOGGING
  // ============================================================================

  private logAdminAction(action: Omit<AdminAction, "id" | "status" | "timestamp">): AdminAction {
    const adminAction: AdminAction = {
      id: `action-${Date.now()}`,
      ...action,
      status: "completed",
      timestamp: new Date(),
    };

    this.adminActions.push(adminAction);
    return adminAction;
  }

  getAdminActionHistory(limit: number = 100): AdminAction[] {
    return this.adminActions.slice(-limit);
  }

  getAdminActionsByType(type: AdminAction["type"]): AdminAction[] {
    return this.adminActions.filter((action) => action.type === type);
  }

  getAdminActionsByAI(aiId: string): AdminAction[] {
    return this.adminActions.filter((action) => action.targetAI === aiId);
  }

  // ============================================================================
  // SYSTEM STATISTICS
  // ============================================================================

  getSystemStatistics(): {
    totalAIs: number;
    activeAIs: number;
    suspendedAIs: number;
    averagePerformance: number;
    averageLearning: number;
    totalAdmins: number;
    totalActions: number;
    lastUpdated: Date;
  } {
    const agents = Array.from(this.aiAgents.values());
    const activeAIs = agents.filter((a) => a.status === "active").length;
    const suspendedAIs = agents.filter((a) => a.status === "suspended").length;
    const avgPerformance =
      agents.reduce((sum, a) => sum + a.performanceScore, 0) / agents.length;
    const avgLearning =
      agents.reduce((sum, a) => sum + a.learningScore, 0) / agents.length;

    return {
      totalAIs: agents.length,
      activeAIs,
      suspendedAIs,
      averagePerformance: Math.round(avgPerformance),
      averageLearning: Math.round(avgLearning),
      totalAdmins: this.adminAccess.size,
      totalActions: this.adminActions.length,
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // AUDIT & COMPLIANCE
  // ============================================================================

  auditAI(aiId: string): {
    aiId: string;
    name: string;
    status: string;
    performanceScore: number;
    learningScore: number;
    certifications: string[];
    activeUsers: number;
    totalInteractions: number;
    recentActions: AdminAction[];
    recommendations: string[];
  } | null {
    const agent = this.aiAgents.get(aiId);
    if (!agent) return null;

    const recentActions = this.getAdminActionsByAI(aiId).slice(-10);
    const recommendations: string[] = [];

    if (agent.performanceScore < 70) {
      recommendations.push("Performance score is low. Consider maintenance.");
    }
    if (agent.learningScore < 60) {
      recommendations.push("Learning score is below threshold. Update knowledge.");
    }
    if (agent.status === "suspended") {
      recommendations.push("AI is suspended. Review suspension reason.");
    }
    if (agent.activeUsers === 0) {
      recommendations.push("No active users. Check if AI needs promotion.");
    }

    return {
      aiId: agent.id,
      name: agent.name,
      status: agent.status,
      performanceScore: agent.performanceScore,
      learningScore: agent.learningScore,
      certifications: agent.certifications,
      activeUsers: agent.activeUsers,
      totalInteractions: agent.totalInteractions,
      recentActions,
      recommendations,
    };
  }

  auditAllAIs(): Array<{
    aiId: string;
    name: string;
    status: string;
    performanceScore: number;
    learningScore: number;
    certifications: string[];
    activeUsers: number;
    totalInteractions: number;
    recentActions: AdminAction[];
    recommendations: string[];
  }> {
    return Array.from(this.aiAgents.keys())
      .map((aiId) => this.auditAI(aiId))
      .filter((audit): audit is NonNullable<ReturnType<typeof this.auditAI>> => audit !== null);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export { AIAgent, AdminAction, AdminAccess, AICoordination };
