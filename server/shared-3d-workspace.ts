import { z } from "zod";

/**
 * Shared 3D Workspace Architecture
 * 
 * Enables multiple AI specialists to work together in a shared 3D environment:
 * - Real-time 3D model synchronization
 * - Multi-user workspace management
 * - AI agent positioning and interaction
 * - Annotation and markup tools
 * - Collaboration history tracking
 */

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface AIAgent {
  aiId: string;
  displayName: string;
  position: Vector3D;
  rotation: Vector3D;
  avatarUrl: string;
  isActive: boolean;
  lastUpdate: Date;
}

export interface WorkspaceObject {
  objectId: string;
  type: "model" | "annotation" | "measurement" | "marker";
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  data: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
}

export interface WorkspaceAnnotation {
  annotationId: string;
  type: "comment" | "measurement" | "highlight" | "arrow";
  position: Vector3D;
  content: string;
  createdBy: string;
  aiId: string;
  createdAt: Date;
}

export interface Shared3DWorkspace {
  workspaceId: string;
  name: string;
  description: string;
  modelUrl: string;
  participants: AIAgent[];
  objects: WorkspaceObject[];
  annotations: WorkspaceAnnotation[];
  createdAt: Date;
  lastModified: Date;
  status: "active" | "archived" | "locked";
}

export interface WorkspaceEvent {
  eventId: string;
  workspaceId: string;
  type: "agent_joined" | "agent_left" | "object_added" | "object_modified" | "annotation_added" | "model_updated";
  aiId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// SHARED 3D WORKSPACE MANAGER
// ============================================================================

export class Shared3DWorkspaceManager {
  private workspaces: Map<string, Shared3DWorkspace> = new Map();
  private events: Map<string, WorkspaceEvent[]> = new Map();
  private workspaceCounter = 0;

  /**
   * Create a new shared 3D workspace
   */
  createWorkspace(
    name: string,
    description: string,
    modelUrl: string,
    participantAIs: string[]
  ): Shared3DWorkspace {
    const workspaceId = `workspace_${++this.workspaceCounter}_${Date.now()}`;

    // Position AIs around the workspace
    const participants: AIAgent[] = participantAIs.map((aiId, index) => ({
      aiId,
      displayName: this.getAIDisplayName(aiId),
      position: this.calculateAIPosition(index, participantAIs.length),
      rotation: { x: 0, y: 0, z: 0 },
      avatarUrl: `https://assets.urmedia.io/avatars/${aiId.toLowerCase()}.png`,
      isActive: true,
      lastUpdate: new Date(),
    }));

    const workspace: Shared3DWorkspace = {
      workspaceId,
      name,
      description,
      modelUrl,
      participants,
      objects: [],
      annotations: [],
      createdAt: new Date(),
      lastModified: new Date(),
      status: "active",
    };

    this.workspaces.set(workspaceId, workspace);
    this.events.set(workspaceId, []);

    // Log creation event
    this.logEvent(workspaceId, "workspace_created", undefined, { name, description });

    return workspace;
  }

  /**
   * Add AI agent to workspace
   */
  addAIToWorkspace(workspaceId: string, aiId: string): AIAgent | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    // Check if AI already in workspace
    if (workspace.participants.some((p) => p.aiId === aiId)) {
      return workspace.participants.find((p) => p.aiId === aiId) || null;
    }

    const agent: AIAgent = {
      aiId,
      displayName: this.getAIDisplayName(aiId),
      position: this.calculateAIPosition(workspace.participants.length, workspace.participants.length + 1),
      rotation: { x: 0, y: 0, z: 0 },
      avatarUrl: `https://assets.urmedia.io/avatars/${aiId.toLowerCase()}.png`,
      isActive: true,
      lastUpdate: new Date(),
    };

    workspace.participants.push(agent);
    workspace.lastModified = new Date();

    this.logEvent(workspaceId, "agent_joined", aiId, { agent });

    return agent;
  }

  /**
   * Remove AI agent from workspace
   */
  removeAIFromWorkspace(workspaceId: string, aiId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const index = workspace.participants.findIndex((p) => p.aiId === aiId);
    if (index === -1) return false;

    workspace.participants.splice(index, 1);
    workspace.lastModified = new Date();

    this.logEvent(workspaceId, "agent_left", aiId, {});

    return true;
  }

  /**
   * Update AI agent position
   */
  updateAIPosition(workspaceId: string, aiId: string, position: Vector3D): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const agent = workspace.participants.find((p) => p.aiId === aiId);
    if (!agent) return false;

    agent.position = position;
    agent.lastUpdate = new Date();
    workspace.lastModified = new Date();

    return true;
  }

  /**
   * Add object to workspace
   */
  addObject(
    workspaceId: string,
    type: "model" | "annotation" | "measurement" | "marker",
    position: Vector3D,
    createdBy: string,
    data: Record<string, any>
  ): WorkspaceObject | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const object: WorkspaceObject = {
      objectId: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      data,
      createdBy,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    workspace.objects.push(object);
    workspace.lastModified = new Date();

    this.logEvent(workspaceId, "object_added", createdBy, { object });

    return object;
  }

  /**
   * Add annotation to workspace
   */
  addAnnotation(
    workspaceId: string,
    type: "comment" | "measurement" | "highlight" | "arrow",
    position: Vector3D,
    content: string,
    aiId: string
  ): WorkspaceAnnotation | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const annotation: WorkspaceAnnotation = {
      annotationId: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      content,
      createdBy: aiId,
      aiId,
      createdAt: new Date(),
    };

    workspace.annotations.push(annotation);
    workspace.lastModified = new Date();

    this.logEvent(workspaceId, "annotation_added", aiId, { annotation });

    return annotation;
  }

  /**
   * Get workspace details
   */
  getWorkspace(workspaceId: string): Shared3DWorkspace | null {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * List active workspaces
   */
  listWorkspaces(limit: number = 10): Shared3DWorkspace[] {
    const workspaces = Array.from(this.workspaces.values());
    return workspaces.filter((w) => w.status === "active").slice(-limit);
  }

  /**
   * Get workspace events
   */
  getWorkspaceEvents(workspaceId: string, limit: number = 100): WorkspaceEvent[] {
    const events = this.events.get(workspaceId) || [];
    return events.slice(-limit);
  }

  /**
   * Export workspace state
   */
  exportWorkspaceState(workspaceId: string): Record<string, any> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return {};

    return {
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      description: workspace.description,
      modelUrl: workspace.modelUrl,
      participants: workspace.participants.map((p) => ({
        aiId: p.aiId,
        displayName: p.displayName,
        position: p.position,
        rotation: p.rotation,
      })),
      objects: workspace.objects,
      annotations: workspace.annotations,
      createdAt: workspace.createdAt,
      lastModified: workspace.lastModified,
    };
  }

  /**
   * Import workspace state
   */
  importWorkspaceState(workspaceId: string, state: Record<string, any>): Shared3DWorkspace | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    // Update workspace properties
    if (state.name) workspace.name = state.name;
    if (state.description) workspace.description = state.description;
    if (state.modelUrl) workspace.modelUrl = state.modelUrl;

    // Update objects and annotations
    if (state.objects) workspace.objects = state.objects;
    if (state.annotations) workspace.annotations = state.annotations;

    workspace.lastModified = new Date();

    this.logEvent(workspaceId, "workspace_imported", undefined, { state });

    return workspace;
  }

  /**
   * Archive workspace
   */
  archiveWorkspace(workspaceId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    workspace.status = "archived";
    workspace.lastModified = new Date();

    this.logEvent(workspaceId, "workspace_archived", undefined, {});

    return true;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private getAIDisplayName(aiId: string): string {
    const names: Record<string, string> = {
      AI_3D_SPECIALIST: "AI 3D Specialist",
      AI_ELECTRICIAN: "AI Electrician",
      AI_MECHANIC: "AI Mechanic",
      AI_ENGINEER: "AI Engineer",
      AI_ROOFING: "AI Roofing",
      AI_REAL_ESTATE: "AI Real Estate",
    };

    return names[aiId] || aiId;
  }

  private calculateAIPosition(index: number, total: number): Vector3D {
    // Arrange AIs in a circle around the workspace center
    const radius = 5;
    const angle = (index / total) * Math.PI * 2;

    return {
      x: Math.cos(angle) * radius,
      y: 2, // Eye level
      z: Math.sin(angle) * radius,
    };
  }

  private logEvent(
    workspaceId: string,
    type: string,
    aiId: string | undefined,
    data: Record<string, any>
  ): void {
    const event: WorkspaceEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      type: type as any,
      aiId,
      data,
      timestamp: new Date(),
    };

    if (!this.events.has(workspaceId)) {
      this.events.set(workspaceId, []);
    }

    this.events.get(workspaceId)!.push(event);

    // Keep only last 1000 events per workspace
    const events = this.events.get(workspaceId)!;
    if (events.length > 1000) {
      this.events.set(workspaceId, events.slice(-500));
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const shared3DWorkspaceManager = new Shared3DWorkspaceManager();
