/**
 * Real-Time Collaboration Service
 * Enables multiple creators to work on shared projects with live updates
 */

export interface CollaborationProject {
  id: string;
  name: string;
  owner: string;
  collaborators: CollaboratorInfo[];
  type: 'video' | 'audio' | 'content';
  status: 'active' | 'paused' | 'archived';
  sharedOperations: Record<string, any>;
  permissions: Record<string, string[]>; // creatorId -> ['read', 'write', 'delete']
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: string;
}

export interface CollaboratorInfo {
  creatorId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActive: Date;
  isOnline: boolean;
}

export interface CollaborationUpdate {
  projectId: string;
  creatorId: string;
  action: string;
  changes: Record<string, any>;
  timestamp: Date;
  version: number;
}

export interface RealtimeEvent {
  type: 'update' | 'join' | 'leave' | 'conflict' | 'sync';
  projectId: string;
  creatorId: string;
  data: any;
  timestamp: Date;
}

export class CollaborationService {
  private projects: Map<string, CollaborationProject> = new Map();
  private updateHistory: Map<string, CollaborationUpdate[]> = new Map();
  private activeConnections: Map<string, Set<string>> = new Map(); // projectId -> Set of creatorIds
  private eventListeners: Map<string, Function[]> = new Map();
  private conflictResolution: 'last-write-wins' | 'operational-transform' = 'last-write-wins';

  /**
   * Create a new shared project
   */
  createProject(
    projectId: string,
    name: string,
    ownerId: string,
    type: 'video' | 'audio' | 'content'
  ): CollaborationProject {
    const project: CollaborationProject = {
      id: projectId,
      name,
      owner: ownerId,
      collaborators: [
        {
          creatorId: ownerId,
          role: 'owner',
          joinedAt: new Date(),
          lastActive: new Date(),
          isOnline: true,
        },
      ],
      type,
      status: 'active',
      sharedOperations: {},
      permissions: {
        [ownerId]: ['read', 'write', 'delete'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.projects.set(projectId, project);
    this.updateHistory.set(projectId, []);
    this.activeConnections.set(projectId, new Set([ownerId]));

    return project;
  }

  /**
   * Invite a collaborator to project
   */
  inviteCollaborator(
    projectId: string,
    creatorId: string,
    inviteeId: string,
    role: 'editor' | 'viewer' = 'editor'
  ): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    // Only owner can invite
    if (project.owner !== creatorId) return false;

    // Check if already collaborating
    if (project.collaborators.some((c) => c.creatorId === inviteeId)) {
      return false;
    }

    project.collaborators.push({
      creatorId: inviteeId,
      role,
      joinedAt: new Date(),
      lastActive: new Date(),
      isOnline: false,
    });

    project.permissions[inviteeId] = role === 'editor' ? ['read', 'write'] : ['read'];
    project.updatedAt = new Date();

    this.broadcastEvent({
      type: 'join',
      projectId,
      creatorId: inviteeId,
      data: { role },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Join an active collaboration session
   */
  joinSession(projectId: string, creatorId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const collaborator = project.collaborators.find((c) => c.creatorId === creatorId);
    if (!collaborator) return false;

    collaborator.isOnline = true;
    collaborator.lastActive = new Date();

    if (!this.activeConnections.has(projectId)) {
      this.activeConnections.set(projectId, new Set());
    }
    this.activeConnections.get(projectId)!.add(creatorId);

    this.broadcastEvent({
      type: 'join',
      projectId,
      creatorId,
      data: { isOnline: true },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Leave collaboration session
   */
  leaveSession(projectId: string, creatorId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const collaborator = project.collaborators.find((c) => c.creatorId === creatorId);
    if (!collaborator) return false;

    collaborator.isOnline = false;
    this.activeConnections.get(projectId)?.delete(creatorId);

    this.broadcastEvent({
      type: 'leave',
      projectId,
      creatorId,
      data: { isOnline: false },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Apply update to shared project
   */
  applyUpdate(
    projectId: string,
    creatorId: string,
    action: string,
    changes: Record<string, any>
  ): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const permissions = project.permissions[creatorId] || [];
    if (!permissions.includes('write')) return false;

    const history = this.updateHistory.get(projectId) || [];
    const version = history.length + 1;

    const update: CollaborationUpdate = {
      projectId,
      creatorId,
      action,
      changes,
      timestamp: new Date(),
      version,
    };

    // Apply changes to shared operations
    project.sharedOperations = { ...project.sharedOperations, ...changes };
    project.updatedAt = new Date();
    project.lastModifiedBy = creatorId;

    history.push(update);
    this.updateHistory.set(projectId, history);

    this.broadcastEvent({
      type: 'update',
      projectId,
      creatorId,
      data: { action, changes, version },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get project state
   */
  getProject(projectId: string): CollaborationProject | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Get active collaborators
   */
  getActiveCollaborators(projectId: string): CollaboratorInfo[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    return project.collaborators.filter((c) => c.isOnline);
  }

  /**
   * Get update history
   */
  getUpdateHistory(projectId: string, limit: number = 50): CollaborationUpdate[] {
    const history = this.updateHistory.get(projectId) || [];
    return history.slice(-limit);
  }

  /**
   * Resolve conflicts (last-write-wins strategy)
   */
  resolveConflict(projectId: string, updates: CollaborationUpdate[]): CollaborationUpdate {
    // Sort by timestamp, last one wins
    const sorted = [...updates].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted[0];
  }

  /**
   * Sync project state
   */
  syncProjectState(projectId: string, creatorId: string): CollaborationProject | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const permissions = project.permissions[creatorId];
    if (!permissions || !permissions.includes('read')) return null;

    return project;
  }

  /**
   * Subscribe to project events
   */
  subscribe(projectId: string, callback: Function): void {
    if (!this.eventListeners.has(projectId)) {
      this.eventListeners.set(projectId, []);
    }
    this.eventListeners.get(projectId)!.push(callback);
  }

  /**
   * Unsubscribe from project events
   */
  unsubscribe(projectId: string, callback: Function): void {
    const listeners = this.eventListeners.get(projectId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Broadcast event to all listeners
   */
  private broadcastEvent(event: RealtimeEvent): void {
    const listeners = this.eventListeners.get(event.projectId) || [];
    listeners.forEach((callback) => callback(event));
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): {
    totalCollaborators: number;
    activeCollaborators: number;
    totalUpdates: number;
    lastUpdate: Date | null;
  } {
    const project = this.projects.get(projectId);
    const history = this.updateHistory.get(projectId) || [];

    return {
      totalCollaborators: project?.collaborators.length || 0,
      activeCollaborators: project?.collaborators.filter((c) => c.isOnline).length || 0,
      totalUpdates: history.length,
      lastUpdate: history.length > 0 ? history[history.length - 1].timestamp : null,
    };
  }

  /**
   * Export project for sharing
   */
  exportProject(projectId: string): string | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    return JSON.stringify(
      {
        project,
        history: this.updateHistory.get(projectId),
      },
      null,
      2
    );
  }

  /**
   * Import shared project
   */
  importProject(data: string, newOwnerId: string): CollaborationProject | null {
    try {
      const parsed = JSON.parse(data);
      const project = parsed.project;

      // Create new project with new owner
      const newProject = this.createProject(
        `imported-${Date.now()}`,
        `${project.name} (Imported)`,
        newOwnerId,
        project.type
      );

      // Copy shared operations
      newProject.sharedOperations = project.sharedOperations;

      return newProject;
    } catch (error) {
      console.error('Failed to import project:', error);
      return null;
    }
  }

  /**
   * Get all projects for a creator
   */
  getCreatorProjects(creatorId: string): CollaborationProject[] {
    return Array.from(this.projects.values()).filter((p) =>
      p.collaborators.some((c) => c.creatorId === creatorId)
    );
  }

  /**
   * Remove collaborator from project
   */
  removeCollaborator(projectId: string, ownerId: string, collaboratorId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project || project.owner !== ownerId) return false;

    const index = project.collaborators.findIndex((c) => c.creatorId === collaboratorId);
    if (index === -1) return false;

    project.collaborators.splice(index, 1);
    delete project.permissions[collaboratorId];
    this.activeConnections.get(projectId)?.delete(collaboratorId);

    this.broadcastEvent({
      type: 'leave',
      projectId,
      creatorId: collaboratorId,
      data: { removed: true },
      timestamp: new Date(),
    });

    return true;
  }
}

export const collaborationService = new CollaborationService();
