/**
 * Real-Time Multi-User Synchronization for 3D Workspace
 * 
 * Handles real-time synchronization of workspace state across multiple users
 * using WebSockets, operational transformation, and conflict resolution.
 */

import { EventEmitter } from "events";

// Type definitions
interface WorkspaceObject {
  id: string;
  type: "wall" | "pipe" | "wire" | "beam" | "roof" | "floor" | "custom";
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  createdBy: string;
  createdAt: number;
}

interface AIAvatar {
  id: string;
  name: string;
  specialty: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  tool: string;
  isActive: boolean;
}

interface WorkspaceSession {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  participants: string[];
  objects: WorkspaceObject[];
  aiAvatars: AIAvatar[];
  cameraMode: "orbit" | "firstperson" | "topdown";
  isLive: boolean;
}

interface SyncMessage {
  type: "update" | "create" | "delete" | "move" | "rotate" | "scale" | "select" | "deselect";
  workspaceId: string;
  userId: string;
  timestamp: number;
  data: unknown;
  version: number;
}

interface ConflictResolution {
  strategy: "last-write-wins" | "operational-transform" | "crdt";
  priority: number;
}

class WorkspaceRealtimeSync extends EventEmitter {
  private workspaceSessions: Map<string, WorkspaceSession> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> workspaceIds
  private messageQueue: Map<string, SyncMessage[]> = new Map(); // workspaceId -> messages
  private versionControl: Map<string, number> = new Map(); // workspaceId -> version
  private conflictResolution: ConflictResolution = {
    strategy: "operational-transform",
    priority: 1,
  };

  constructor() {
    super();
    this.initializeSync();
  }

  private initializeSync(): void {
    // Initialize real-time synchronization system
    console.log("[WorkspaceSync] Initializing real-time synchronization system");
  }

  /**
   * Join a workspace session
   */
  public joinWorkspace(workspaceId: string, userId: string): void {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    this.userConnections.get(userId)!.add(workspaceId);

    // Send current workspace state to user
    const workspace = this.workspaceSessions.get(workspaceId);
    if (workspace) {
      this.emit("user-joined", {
        workspaceId,
        userId,
        workspace,
        participants: Array.from(this.userConnections.entries())
          .filter(([, workspaces]) => workspaces.has(workspaceId))
          .map(([id]) => id),
      });
    }

    console.log(`[WorkspaceSync] User ${userId} joined workspace ${workspaceId}`);
  }

  /**
   * Leave a workspace session
   */
  public leaveWorkspace(workspaceId: string, userId: string): void {
    this.userConnections.get(userId)?.delete(workspaceId);

    this.emit("user-left", {
      workspaceId,
      userId,
      participants: Array.from(this.userConnections.entries())
        .filter(([, workspaces]) => workspaces.has(workspaceId))
        .map(([id]) => id),
    });

    console.log(`[WorkspaceSync] User ${userId} left workspace ${workspaceId}`);
  }

  /**
   * Broadcast a change to all users in workspace
   */
  public broadcastChange(message: SyncMessage): void {
    const { workspaceId, userId } = message;

    // Add to message queue
    if (!this.messageQueue.has(workspaceId)) {
      this.messageQueue.set(workspaceId, []);
    }
    this.messageQueue.get(workspaceId)!.push(message);

    // Update version
    const currentVersion = this.versionControl.get(workspaceId) || 0;
    this.versionControl.set(workspaceId, currentVersion + 1);

    // Apply change to workspace
    this.applyChange(workspaceId, message);

    // Broadcast to all users in workspace
    this.emit("broadcast", {
      workspaceId,
      message,
      excludeUser: userId,
    });

    console.log(`[WorkspaceSync] Broadcasting ${message.type} to workspace ${workspaceId}`);
  }

  /**
   * Apply a change to workspace state
   */
  private applyChange(workspaceId: string, message: SyncMessage): void {
    const workspace = this.workspaceSessions.get(workspaceId);
    if (!workspace) return;

    switch (message.type) {
      case "create": {
        const obj = message.data as WorkspaceObject;
        workspace.objects.push(obj);
        break;
      }
      case "delete": {
        const { objectId } = message.data as { objectId: string };
        workspace.objects = workspace.objects.filter((obj: WorkspaceObject) => obj.id !== objectId);
        break;
      }
      case "move": {
        const { objectId, position } = message.data as {
          objectId: string;
          position: { x: number; y: number; z: number };
        };
        const obj = workspace.objects.find((o: WorkspaceObject) => o.id === objectId);
        if (obj) obj.position = position;
        break;
      }
      case "rotate": {
        const { objectId, rotation } = message.data as {
          objectId: string;
          rotation: { x: number; y: number; z: number };
        };
        const obj = workspace.objects.find((o: WorkspaceObject) => o.id === objectId);
        if (obj) obj.rotation = rotation;
        break;
      }
      case "scale": {
        const { objectId, scale } = message.data as {
          objectId: string;
          scale: { x: number; y: number; z: number };
        };
        const obj = workspace.objects.find((o: WorkspaceObject) => o.id === objectId);
        if (obj) obj.scale = scale;
        break;
      }
    }
  }

  /**
   * Handle conflicts using operational transformation
   */
  private resolveConflict(
    message1: SyncMessage,
    message2: SyncMessage
  ): SyncMessage {
    if (this.conflictResolution.strategy === "last-write-wins") {
      return message1.timestamp > message2.timestamp ? message1 : message2;
    }

    if (this.conflictResolution.strategy === "operational-transform") {
      // Operational transformation: transform message2 based on message1
      return this.operationalTransform(message1, message2);
    }

    // CRDT (Conflict-free Replicated Data Type)
    return this.crdtMerge(message1, message2);
  }

  /**
   * Operational transformation algorithm
   */
  private operationalTransform(message1: SyncMessage, message2: SyncMessage): SyncMessage {
    // If both messages affect different objects, no conflict
    if (
      (message1.data as any).objectId !== (message2.data as any).objectId
    ) {
      return message2;
    }

    // If same object, apply transformation
    const transformed = { ...message2 };

    // Transform based on operation type
    if (message1.type === "move" && message2.type === "move") {
      // Both are move operations - merge positions
      const pos1 = (message1.data as any).position;
      const pos2 = (message2.data as any).position;
      (transformed.data as any).position = {
        x: (pos1.x + pos2.x) / 2,
        y: (pos1.y + pos2.y) / 2,
        z: (pos1.z + pos2.z) / 2,
      };
    }

    return transformed;
  }

  /**
   * CRDT merge algorithm
   */
  private crdtMerge(message1: SyncMessage, message2: SyncMessage): SyncMessage {
    // Use timestamp and userId for deterministic ordering
    const key1 = `${message1.timestamp}-${message1.userId}`;
    const key2 = `${message2.timestamp}-${message2.userId}`;

    return key1 > key2 ? message1 : message2;
  }

  /**
   * Get workspace state
   */
  public getWorkspaceState(workspaceId: string): WorkspaceSession | undefined {
    return this.workspaceSessions.get(workspaceId);
  }

  /**
   * Create new workspace
   */
  public createWorkspace(workspace: WorkspaceSession): void {
    this.workspaceSessions.set(workspace.id, workspace);
    this.versionControl.set(workspace.id, 1);
    this.messageQueue.set(workspace.id, []);

    console.log(`[WorkspaceSync] Created workspace ${workspace.id}`);
  }

  /**
   * Get all participants in workspace
   */
  public getParticipants(workspaceId: string): string[] {
    return Array.from(this.userConnections.entries())
      .filter(([, workspaces]) => workspaces.has(workspaceId))
      .map(([userId]) => userId);
  }

  /**
   * Get message history for workspace
   */
  public getMessageHistory(workspaceId: string, limit: number = 100): SyncMessage[] {
    const messages = this.messageQueue.get(workspaceId) || [];
    return messages.slice(-limit);
  }

  /**
   * Get current version of workspace
   */
  public getVersion(workspaceId: string): number {
    return this.versionControl.get(workspaceId) || 0;
  }

  /**
   * Sync AI avatar position
   */
  public syncAIAvatarPosition(
    workspaceId: string,
    avatarId: string,
    position: { x: number; y: number; z: number }
  ): void {
    const workspace = this.workspaceSessions.get(workspaceId);
    if (!workspace) return;

    const avatar = workspace.aiAvatars.find((a: AIAvatar) => a.id === avatarId);
    if (avatar) {
      avatar.position = position;

      this.broadcastChange({
        type: "move",
        workspaceId,
        userId: "system",
        timestamp: Date.now(),
        data: { objectId: avatarId, position },
        version: this.getVersion(workspaceId),
      });
    }
  }

  /**
   * Sync AI avatar action
   */
  public syncAIAvatarAction(
    workspaceId: string,
    avatarId: string,
    action: string,
    details: unknown
  ): void {
    this.emit("ai-action", {
      workspaceId,
      avatarId,
      action,
      details,
      timestamp: Date.now(),
    });

    console.log(
      `[WorkspaceSync] AI ${avatarId} performed action: ${action} in workspace ${workspaceId}`
    );
  }
}

export const workspaceRealtimeSync = new WorkspaceRealtimeSync();
