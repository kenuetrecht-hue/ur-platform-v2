/**
 * WebSocket Real-Time Sync Engine
 * Manages real-time synchronization of 3D workspace, AI avatars, and collaborative updates
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SyncMessageType =
  | "object_created"
  | "object_updated"
  | "object_deleted"
  | "agent_joined"
  | "agent_left"
  | "agent_moved"
  | "agent_speaking"
  | "agent_gesture"
  | "physics_test_started"
  | "physics_test_completed"
  | "workspace_state"
  | "user_action"
  | "error";

export interface SyncMessage {
  id: string;
  type: SyncMessageType;
  timestamp: Date;
  senderId: string; // User or AI agent ID
  workspaceId: string;
  payload: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "critical";
}

export interface SyncClient {
  clientId: string;
  userId: string;
  workspaceId: string;
  isConnected: boolean;
  lastHeartbeat: Date;
  messageQueue: SyncMessage[];
}

export interface SyncState {
  workspaceId: string;
  version: number;
  lastSync: Date;
  clients: SyncClient[];
  pendingMessages: SyncMessage[];
  conflictResolutions: Record<string, string>; // messageId -> resolution
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SyncMessageSchema = z.object({
  id: z.string(),
  type: z.enum([
    "object_created",
    "object_updated",
    "object_deleted",
    "agent_joined",
    "agent_left",
    "agent_moved",
    "agent_speaking",
    "agent_gesture",
    "physics_test_started",
    "physics_test_completed",
    "workspace_state",
    "user_action",
    "error",
  ]),
  timestamp: z.date(),
  senderId: z.string(),
  workspaceId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  priority: z.enum(["low", "normal", "high", "critical"]),
});

const SyncClientSchema = z.object({
  clientId: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  isConnected: z.boolean(),
  lastHeartbeat: z.date(),
  messageQueue: z.array(SyncMessageSchema),
});

const SyncStateSchema = z.object({
  workspaceId: z.string(),
  version: z.number(),
  lastSync: z.date(),
  clients: z.array(SyncClientSchema),
  pendingMessages: z.array(SyncMessageSchema),
  conflictResolutions: z.record(z.string(), z.string()),
});

// ============================================================================
// WEBSOCKET SYNC ENGINE
// ============================================================================

export class WebSocketSyncEngine {
  private syncStates: Map<string, SyncState> = new Map();
  private messageHistory: Map<string, SyncMessage[]> = new Map();
  private conflictLog: Map<string, string[]> = new Map();

  /**
   * Initialize sync for a workspace
   */
  initializeWorkspace(workspaceId: string): SyncState {
    const state: SyncState = {
      workspaceId,
      version: 1,
      lastSync: new Date(),
      clients: [],
      pendingMessages: [],
      conflictResolutions: {},
    };

    const validated = SyncStateSchema.parse(state);
    this.syncStates.set(workspaceId, validated);
    this.messageHistory.set(workspaceId, []);
    this.conflictLog.set(workspaceId, []);

    return validated;
  }

  /**
   * Register a client to the workspace
   */
  registerClient(workspaceId: string, clientId: string, userId: string): SyncClient {
    let state = this.syncStates.get(workspaceId);
    if (!state) {
      state = this.initializeWorkspace(workspaceId);
    }

    const client: SyncClient = {
      clientId,
      userId,
      workspaceId,
      isConnected: true,
      lastHeartbeat: new Date(),
      messageQueue: [],
    };

    const validated = SyncClientSchema.parse(client);
    state.clients.push(validated);
    this.syncStates.set(workspaceId, state);

    return validated;
  }

  /**
   * Unregister a client from the workspace
   */
  unregisterClient(workspaceId: string, clientId: string): boolean {
    const state = this.syncStates.get(workspaceId);
    if (!state) return false;

    const index = state.clients.findIndex((c) => c.clientId === clientId);
    if (index !== -1) {
      state.clients.splice(index, 1);
      this.syncStates.set(workspaceId, state);
      return true;
    }

    return false;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(message: SyncMessage): SyncMessage {
    const validated = SyncMessageSchema.parse(message);
    const state = this.syncStates.get(message.workspaceId);

    if (state) {
      state.pendingMessages.push(validated);
      state.version++;
      state.lastSync = new Date();
      this.syncStates.set(message.workspaceId, state);

      // Add to history
      const history = this.messageHistory.get(message.workspaceId) || [];
      history.push(validated);
      this.messageHistory.set(message.workspaceId, history);

      // Distribute to clients based on priority
      this.distributeToClients(message.workspaceId, validated);
    }

    return validated;
  }

  /**
   * Send message to specific client
   */
  sendToClient(workspaceId: string, clientId: string, message: SyncMessage): boolean {
    const state = this.syncStates.get(workspaceId);
    if (!state) return false;

    const client = state.clients.find((c) => c.clientId === clientId);
    if (!client) return false;

    const validated = SyncMessageSchema.parse(message);
    client.messageQueue.push(validated);

    return true;
  }

  /**
   * Get pending messages for a client
   */
  getPendingMessages(workspaceId: string, clientId: string): SyncMessage[] {
    const state = this.syncStates.get(workspaceId);
    if (!state) return [];

    const client = state.clients.find((c) => c.clientId === clientId);
    if (!client) return [];

    const messages = [...client.messageQueue];
    client.messageQueue = [];

    return messages;
  }

  /**
   * Handle heartbeat from client
   */
  handleHeartbeat(workspaceId: string, clientId: string): boolean {
    const state = this.syncStates.get(workspaceId);
    if (!state) return false;

    const client = state.clients.find((c) => c.clientId === clientId);
    if (!client) return false;

    client.lastHeartbeat = new Date();
    return true;
  }

  /**
   * Detect and resolve conflicts
   */
  resolveConflict(
    workspaceId: string,
    message1: SyncMessage,
    message2: SyncMessage
  ): SyncMessage {
    // Conflict resolution strategy: last-write-wins with timestamp
    const winner = message1.timestamp > message2.timestamp ? message1 : message2;

    const state = this.syncStates.get(workspaceId);
    if (state) {
      state.conflictResolutions[message1.id] = message2.id;
      const log = this.conflictLog.get(workspaceId) || [];
      log.push(`Conflict between ${message1.id} and ${message2.id}: ${winner.id} won`);
      this.conflictLog.set(workspaceId, log);
    }

    return winner;
  }

  /**
   * Get workspace sync state
   */
  getWorkspaceState(workspaceId: string): SyncState | null {
    return this.syncStates.get(workspaceId) || null;
  }

  /**
   * Get message history for workspace
   */
  getMessageHistory(workspaceId: string, limit: number = 100): SyncMessage[] {
    const history = this.messageHistory.get(workspaceId) || [];
    return history.slice(-limit);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(workspaceId: string): number {
    const state = this.syncStates.get(workspaceId);
    if (!state) return 0;

    return state.clients.filter((c) => c.isConnected).length;
  }

  /**
   * Cleanup stale clients (no heartbeat for 30 seconds)
   */
  cleanupStaleClients(workspaceId: string): number {
    const state = this.syncStates.get(workspaceId);
    if (!state) return 0;

    const now = new Date();
    const staleThreshold = 30000; // 30 seconds

    const staleClients = state.clients.filter(
      (c) => now.getTime() - c.lastHeartbeat.getTime() > staleThreshold
    );

    state.clients = state.clients.filter(
      (c) => now.getTime() - c.lastHeartbeat.getTime() <= staleThreshold
    );

    this.syncStates.set(workspaceId, state);

    return staleClients.length;
  }

  /**
   * Distribute message to clients based on priority
   */
  private distributeToClients(workspaceId: string, message: SyncMessage): void {
    const state = this.syncStates.get(workspaceId);
    if (!state) return;

    // Critical messages go to all clients immediately
    // High priority to connected clients
    // Normal/low priority can be batched

    const clients = state.clients.filter((c) => c.isConnected);

    if (message.priority === "critical") {
      clients.forEach((c) => {
        c.messageQueue.push(message);
      });
    } else if (message.priority === "high") {
      clients.slice(0, Math.ceil(clients.length / 2)).forEach((c) => {
        c.messageQueue.push(message);
      });
    } else {
      // Normal/low priority - sample clients
      const sampleSize = Math.max(1, Math.ceil(clients.length / 4));
      clients.slice(0, sampleSize).forEach((c) => {
        c.messageQueue.push(message);
      });
    }
  }

  /**
   * Get conflict log
   */
  getConflictLog(workspaceId: string): string[] {
    return this.conflictLog.get(workspaceId) || [];
  }

  /**
   * Clear workspace data
   */
  clearWorkspace(workspaceId: string): void {
    this.syncStates.delete(workspaceId);
    this.messageHistory.delete(workspaceId);
    this.conflictLog.delete(workspaceId);
  }
}

export default WebSocketSyncEngine;
