/**
 * WebSocket Real-Time Sync Service
 * Enables bidirectional real-time communication for live collaboration
 * Handles instant notifications, project changes, and multi-user synchronization
 */

interface WebSocketClient {
  id: string;
  userId: string;
  projectId: string;
  isConnected: boolean;
  lastHeartbeat: number;
}

interface SyncMessage {
  id: string;
  type: 'update' | 'notification' | 'presence' | 'heartbeat';
  projectId: string;
  userId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface ProjectChange {
  id: string;
  projectId: string;
  userId: string;
  changeType: 'edit' | 'delete' | 'create' | 'comment';
  resource: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: number;
}

export class WebSocketSyncService {
  private clients: Map<string, WebSocketClient> = new Map();
  private projectSubscriptions: Map<string, Set<string>> = new Map();
  private messageQueue: Map<string, SyncMessage[]> = new Map();
  private changeLog: ProjectChange[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MESSAGE_QUEUE_SIZE = 1000;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Register a new WebSocket client
   */
  registerClient(
    clientId: string,
    userId: string,
    projectId: string
  ): WebSocketClient {
    const client: WebSocketClient = {
      id: clientId,
      userId,
      projectId,
      isConnected: true,
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);

    // Subscribe to project updates
    if (!this.projectSubscriptions.has(projectId)) {
      this.projectSubscriptions.set(projectId, new Set());
    }
    this.projectSubscriptions.get(projectId)!.add(clientId);

    // Initialize message queue for this client
    if (!this.messageQueue.has(clientId)) {
      this.messageQueue.set(clientId, []);
    }

    return client;
  }

  /**
   * Disconnect a client
   */
  disconnectClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.isConnected = false;

    // Unsubscribe from project
    const subscribers = this.projectSubscriptions.get(client.projectId);
    if (subscribers) {
      subscribers.delete(clientId);
    }

    // Keep message queue for reconnection
    return true;
  }

  /**
   * Send a real-time update to all subscribers of a project
   */
  broadcastUpdate(
    projectId: string,
    userId: string,
    data: Record<string, unknown>
  ): number {
    const message: SyncMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      type: 'update',
      projectId,
      userId,
      data,
      timestamp: Date.now(),
    };

    const subscribers = this.projectSubscriptions.get(projectId) || new Set();
    let deliveredCount = 0;

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.isConnected) {
        const queue = this.messageQueue.get(clientId) || [];
        if (queue.length < this.MESSAGE_QUEUE_SIZE) {
          queue.push(message);
          this.messageQueue.set(clientId, queue);
          deliveredCount++;
        }
      }
    }

    // Log change
    this.changeLog.push({
      id: message.id,
      projectId,
      userId,
      changeType: 'edit',
      resource: data.resource as string,
      newValue: data,
      timestamp: Date.now(),
    });

    return deliveredCount;
  }

  /**
   * Send a notification to a specific user
   */
  sendNotification(
    userId: string,
    title: string,
    message: string
  ): number {
    const notification: SyncMessage = {
      id: `notif_${Date.now()}_${Math.random()}`,
      type: 'notification',
      projectId: '',
      userId,
      data: { title, message },
      timestamp: Date.now(),
    };

    let deliveredCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId && client.isConnected) {
        const queue = this.messageQueue.get(clientId) || [];
        if (queue.length < this.MESSAGE_QUEUE_SIZE) {
          queue.push(notification);
          this.messageQueue.set(clientId, queue);
          deliveredCount++;
        }
      }
    }

    return deliveredCount;
  }

  /**
   * Broadcast presence information (who's online in a project)
   */
  broadcastPresence(projectId: string): Record<string, unknown> {
    const subscribers = this.projectSubscriptions.get(projectId) || new Set();
    const presence: Record<string, unknown> = {};

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.isConnected) {
        presence[client.userId] = {
          clientId,
          isOnline: true,
          lastSeen: client.lastHeartbeat,
        };
      }
    }

    // Broadcast to all subscribers
    const message: SyncMessage = {
      id: `presence_${Date.now()}`,
      type: 'presence',
      projectId,
      userId: 'system',
      data: presence,
      timestamp: Date.now(),
    };

    for (const clientId of subscribers) {
      const queue = this.messageQueue.get(clientId) || [];
      if (queue.length < this.MESSAGE_QUEUE_SIZE) {
        queue.push(message);
        this.messageQueue.set(clientId, queue);
      }
    }

    return presence;
  }

  /**
   * Get pending messages for a client
   */
  getPendingMessages(clientId: string): SyncMessage[] {
    const messages = this.messageQueue.get(clientId) || [];
    this.messageQueue.set(clientId, []);
    return messages;
  }

  /**
   * Update client heartbeat
   */
  updateHeartbeat(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.lastHeartbeat = Date.now();
    client.isConnected = true;
    return true;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastHeartbeat > timeout) {
          this.disconnectClient(clientId);
        }
      }
    }, this.HEARTBEAT_INTERVAL) as unknown as NodeJS.Timeout;
  }

  /**
   * Get project change history
   */
  getChangeHistory(
    projectId: string,
    limit: number = 100
  ): ProjectChange[] {
    return this.changeLog
      .filter((change) => change.projectId === projectId)
      .slice(-limit);
  }

  /**
   * Get active clients for a project
   */
  getActiveClients(projectId: string): WebSocketClient[] {
    const subscribers = this.projectSubscriptions.get(projectId) || new Set();
    const activeClients: WebSocketClient[] = [];

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.isConnected) {
        activeClients.push(client);
      }
    }

    return activeClients;
  }

  /**
   * Get connection statistics
   */
  getStats(): Record<string, unknown> {
    let connectedClients = 0;
    let disconnectedClients = 0;

    for (const client of this.clients.values()) {
      if (client.isConnected) {
        connectedClients++;
      } else {
        disconnectedClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      connectedClients,
      disconnectedClients,
      activeProjects: this.projectSubscriptions.size,
      totalMessages: this.changeLog.length,
      messageQueueSize: Array.from(this.messageQueue.values()).reduce(
        (sum, queue) => sum + queue.length,
        0
      ),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.clear();
    this.projectSubscriptions.clear();
    this.messageQueue.clear();
    this.changeLog = [];
  }
}
