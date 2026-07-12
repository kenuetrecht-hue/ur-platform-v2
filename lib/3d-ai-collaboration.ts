/**
 * 3D AI Collaboration System
 * 
 * Enables all 24 AI specialists to enter and collaborate in the 3D workspace
 * Features:
 * - Multi-AI collaboration in real-time
 * - Specialized AI capabilities for different project types
 * - AI-to-AI communication and coordination
 * - Joint problem-solving and design optimization
 * - Voice interaction with multiple AIs simultaneously
 */

import { AICreator } from "./ai-creators-system";

// ============================================================================
// AI COLLABORATION SESSION
// ============================================================================

export interface AIAgent {
  id: string;
  aiCreator: AICreator;
  status: "idle" | "active" | "working" | "waiting";
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  avatar: string;
  currentTask?: string;
  expertise: string[];
  isListening: boolean;
  isSpeaking: boolean;
  conversationHistory: Array<{
    speaker: string;
    message: string;
    timestamp: Date;
  }>;
}

export interface AI3DCollaborationSession {
  id: string;
  name: string;
  owner: string;
  sceneId: string;
  activeAIs: AIAgent[];
  maxAIs: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  
  // Collaboration settings
  allowVoiceChat: boolean;
  allowTextChat: boolean;
  allowDesignModification: boolean;
  allowPhysicsSimulation: boolean;
  allowMeasurements: boolean;
  
  // Project context
  projectType: "architecture" | "robotics" | "landscaping" | "3d_printing" | "general";
  projectDescription: string;
  objectives: string[];
  constraints: string[];
}

export interface AITaskAssignment {
  id: string;
  sessionId: string;
  aiId: string;
  taskType: "design" | "analysis" | "optimization" | "validation" | "rendering" | "consultation";
  description: string;
  targetObjects: string[]; // Mesh IDs
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  completedAt?: Date;
}

export interface AICommunication {
  id: string;
  sessionId: string;
  fromAI: string;
  toAI: string;
  type: "request" | "response" | "suggestion" | "warning" | "coordination";
  message: string;
  data?: any;
  timestamp: Date;
  acknowledged: boolean;
}

// ============================================================================
// AI SPECIALIZATIONS IN 3D
// ============================================================================

export const AI3DSpecializations: Record<string, string[]> = {
  wellness_coach: ["ergonomic_analysis", "spatial_comfort", "wellness_design"],
  fitness_trainer: ["space_planning", "equipment_layout", "movement_analysis"],
  crypto_analyst: ["data_visualization", "financial_modeling", "3d_charts"],
  news_daily: ["information_display", "presentation_design", "media_integration"],
  career_coach: ["workspace_design", "office_planning", "productivity_optimization"],
  creative_muse: ["artistic_design", "aesthetics", "creative_visualization"],
  author_muse: ["spatial_storytelling", "narrative_visualization", "scene_design"],
  coder_forge: ["technical_design", "parametric_modeling", "code_generation"],
  business_advisor: ["business_space_design", "workflow_optimization", "cost_analysis"],
  legal_reference: ["compliance_checking", "documentation", "legal_visualization"],
  real_estate_master: ["property_design", "valuation_visualization", "market_analysis"],
  electrician_expert: ["electrical_system_design", "wiring_layout", "safety_analysis"],
  contractor_pro: ["project_planning", "construction_sequencing", "budget_visualization"],
  hvac_specialist: ["system_design", "efficiency_analysis", "thermal_visualization"],
  landscaping_master: ["terrain_design", "plant_placement", "outdoor_planning"],
  attorney_ai: ["legal_space_design", "compliance_visualization", "documentation"],
  accountant_pro: ["financial_visualization", "cost_analysis", "budget_planning"],
  marketing_expert: ["presentation_design", "visual_marketing", "brand_visualization"],
  sales_master: ["product_visualization", "showroom_design", "sales_presentation"],
  hr_specialist: ["office_design", "workspace_planning", "team_coordination"],
  operations_manager: ["workflow_optimization", "process_visualization", "efficiency_analysis"],
  customer_service_pro: ["support_space_design", "customer_journey_visualization", "ux_design"],
  product_manager: ["product_visualization", "feature_design", "prototype_creation"],
  content_creator_helper: ["content_visualization", "media_integration", "presentation_design"],
};

// ============================================================================
// AI COLLABORATION MANAGER
// ============================================================================

export class AI3DCollaborationManager {
  private sessions: Map<string, AI3DCollaborationSession> = new Map();
  private aiAgents: Map<string, AIAgent> = new Map();
  private taskAssignments: Map<string, AITaskAssignment> = new Map();
  private communications: Map<string, AICommunication> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Create a new AI collaboration session
   */
  createSession(
    name: string,
    owner: string,
    sceneId: string,
    projectType: AI3DCollaborationSession["projectType"],
    projectDescription: string
  ): AI3DCollaborationSession {
    const session: AI3DCollaborationSession = {
      id: `collab_${Date.now()}`,
      name,
      owner,
      sceneId,
      activeAIs: [],
      maxAIs: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      allowVoiceChat: true,
      allowTextChat: true,
      allowDesignModification: true,
      allowPhysicsSimulation: true,
      allowMeasurements: true,
      projectType,
      projectDescription,
      objectives: [],
      constraints: [],
    };

    this.sessions.set(session.id, session);
    this.emit("sessionCreated", session);
    return session;
  }

  /**
   * Add an AI specialist to the collaboration session
   */
  addAIToSession(
    sessionId: string,
    aiCreator: AICreator
  ): AIAgent {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.activeAIs.length >= session.maxAIs) {
      throw new Error("Maximum number of AIs reached");
    }

    const aiAgent: AIAgent = {
      id: `ai_agent_${Date.now()}`,
      aiCreator,
      status: "idle",
      position: {
        x: Math.random() * 20 - 10,
        y: 5,
        z: Math.random() * 20 - 10,
      },
      color: this.generateAIColor(aiCreator.id),
      avatar: aiCreator.avatar,
      expertise: AI3DSpecializations[aiCreator.id] || [],
      isListening: true,
      isSpeaking: false,
      conversationHistory: [],
    };

    this.aiAgents.set(aiAgent.id, aiAgent);
    session.activeAIs.push(aiAgent);
    session.updatedAt = new Date();

    this.emit("aiAdded", { sessionId, aiAgent });
    this.broadcastToSession(sessionId, {
      type: "ai_joined",
      ai: aiCreator.name,
      message: `${aiCreator.name} has joined the collaboration.`,
    });

    return aiAgent;
  }

  /**
   * Remove an AI from the session
   */
  removeAIFromSession(sessionId: string, aiAgentId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const aiIndex = session.activeAIs.findIndex((ai) => ai.id === aiAgentId);
    if (aiIndex > -1) {
      const ai = session.activeAIs[aiIndex];
      session.activeAIs.splice(aiIndex, 1);
      this.aiAgents.delete(aiAgentId);
      session.updatedAt = new Date();

      this.emit("aiRemoved", { sessionId, aiAgentId });
      this.broadcastToSession(sessionId, {
        type: "ai_left",
        ai: ai.aiCreator.name,
        message: `${ai.aiCreator.name} has left the collaboration.`,
      });
    }
  }

  /**
   * Assign a task to an AI
   */
  assignTask(
    sessionId: string,
    aiAgentId: string,
    taskType: AITaskAssignment["taskType"],
    description: string,
    targetObjects: string[]
  ): AITaskAssignment {
    const aiAgent = this.aiAgents.get(aiAgentId);
    if (!aiAgent) {
      throw new Error(`AI Agent ${aiAgentId} not found`);
    }

    const task: AITaskAssignment = {
      id: `task_${Date.now()}`,
      sessionId,
      aiId: aiAgentId,
      taskType,
      description,
      targetObjects,
      priority: "medium",
      status: "pending",
    };

    this.taskAssignments.set(task.id, task);
    aiAgent.status = "working";
    aiAgent.currentTask = task.id;

    this.emit("taskAssigned", task);
    this.broadcastToSession(sessionId, {
      type: "task_assigned",
      ai: aiAgent.aiCreator.name,
      task: description,
    });

    return task;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, result: any): void {
    const task = this.taskAssignments.get(taskId);
    if (!task) return;

    task.status = "completed";
    task.result = result;
    task.completedAt = new Date();

    const aiAgent = this.aiAgents.get(task.aiId);
    if (aiAgent) {
      aiAgent.status = "idle";
      aiAgent.currentTask = undefined;
    }

    this.emit("taskCompleted", task);
    this.broadcastToSession(task.sessionId, {
      type: "task_completed",
      ai: aiAgent?.aiCreator.name,
      task: task.description,
      result,
    });
  }

  /**
   * Send a message from one AI to another
   */
  sendAICommunication(
    sessionId: string,
    fromAIId: string,
    toAIId: string,
    type: AICommunication["type"],
    message: string,
    data?: any
  ): AICommunication {
    const comm: AICommunication = {
      id: `comm_${Date.now()}`,
      sessionId,
      fromAI: fromAIId,
      toAI: toAIId,
      type,
      message,
      data,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.communications.set(comm.id, comm);
    this.emit("aiCommunication", comm);

    return comm;
  }

  /**
   * Broadcast a message to all AIs in a session
   */
  broadcastToSession(sessionId: string, message: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.activeAIs.forEach((ai) => {
      ai.conversationHistory.push({
        speaker: "system",
        message: JSON.stringify(message),
        timestamp: new Date(),
      });
    });

    this.emit("broadcast", { sessionId, message });
  }

  /**
   * Get all AIs in a session
   */
  getSessionAIs(sessionId: string): AIAgent[] {
    const session = this.sessions.get(sessionId);
    return session?.activeAIs || [];
  }

  /**
   * Get AI recommendations for a project
   */
  getRecommendedAIs(
    projectType: AI3DCollaborationSession["projectType"],
    objectives: string[]
  ): AICreator[] {
    // This would integrate with the AI creators system to recommend relevant AIs
    const recommendations: AICreator[] = [];

    // Example logic - in production, this would be more sophisticated
    if (projectType === "architecture") {
      // Recommend architectural, design, and planning AIs
    } else if (projectType === "robotics") {
      // Recommend technical and engineering AIs
    } else if (projectType === "landscaping") {
      // Recommend design and environmental AIs
    } else if (projectType === "3d_printing") {
      // Recommend technical and optimization AIs
    }

    return recommendations;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AI3DCollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): AI3DCollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.updatedAt = new Date();
      this.emit("sessionClosed", session);
    }
  }

  /**
   * Generate a unique color for an AI
   */
  private generateAIColor(aiId: string): { r: number; g: number; b: number } {
    const hash = aiId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      r: (hash % 256) / 255,
      g: ((hash * 7) % 256) / 255,
      b: ((hash * 13) % 256) / 255,
    };
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

export const ai3DCollaborationManager = new AI3DCollaborationManager();
