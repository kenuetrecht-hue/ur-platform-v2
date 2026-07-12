import { z } from "zod";

/**
 * WebSocket Synchronization Service
 * Handles real-time updates for chat, GPS tracking, and task status changes
 * Supports multiple concurrent team members with live position tracking
 */

export const WebSocketMessageSchema = z.object({
  type: z.enum(["chat", "gps-update", "task-update", "status-change", "photo-upload"]),
  userId: z.string(),
  propertyId: z.string(),
  timestamp: z.string(),
  data: z.record(z.string(), z.any()),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  sender: z.string(),
  senderId: z.string(),
  message: z.string(),
  timestamp: z.string(),
  propertyId: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const GPSUpdateSchema = z.object({
  userId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  timestamp: z.string(),
  propertyId: z.string(),
});

export type GPSUpdate = z.infer<typeof GPSUpdateSchema>;

export const TaskUpdateSchema = z.object({
  taskId: z.string(),
  status: z.enum(["pending", "in-progress", "completed"]),
  updatedBy: z.string(),
  timestamp: z.string(),
  propertyId: z.string(),
});

export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;

/**
 * WebSocket connection manager
 * Maintains active connections and routes messages
 */
export class WebSocketConnectionManager {
  private connections: Map<string, Set<any>> = new Map();
  private userLocations: Map<string, GPSUpdate> = new Map();
  private messageHistory: Map<string, ChatMessage[]> = new Map();

  /**
   * Register a new WebSocket connection for a property
   */
  registerConnection(propertyId: string, ws: any): void {
    if (!this.connections.has(propertyId)) {
      this.connections.set(propertyId, new Set());
    }
    this.connections.get(propertyId)!.add(ws);
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(propertyId: string, ws: any): void {
    const connections = this.connections.get(propertyId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.connections.delete(propertyId);
      }
    }
  }

  /**
   * Broadcast message to all connected clients for a property
   */
  broadcastToProperty(propertyId: string, message: WebSocketMessage): void {
    const connections = this.connections.get(propertyId);
    if (connections) {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  /**
   * Handle incoming chat message
   */
  handleChatMessage(message: ChatMessage): void {
    // Store in history
    if (!this.messageHistory.has(message.propertyId)) {
      this.messageHistory.set(message.propertyId, []);
    }
    this.messageHistory.get(message.propertyId)!.push(message);

    // Broadcast to all connected clients
    const wsMessage: WebSocketMessage = {
      type: "chat",
      userId: message.senderId,
      propertyId: message.propertyId,
      timestamp: message.timestamp,
      data: message,
    };

    this.broadcastToProperty(message.propertyId, wsMessage);
  }

  /**
   * Handle GPS location update
   */
  handleGPSUpdate(update: GPSUpdate): void {
    // Store latest location
    this.userLocations.set(update.userId, update);

    // Broadcast to all connected clients
    const wsMessage: WebSocketMessage = {
      type: "gps-update",
      userId: update.userId,
      propertyId: update.propertyId,
      timestamp: update.timestamp,
      data: update,
    };

    this.broadcastToProperty(update.propertyId, wsMessage);
  }

  /**
   * Handle task status update
   */
  handleTaskUpdate(update: TaskUpdate): void {
    const wsMessage: WebSocketMessage = {
      type: "task-update",
      userId: update.updatedBy,
      propertyId: update.propertyId,
      timestamp: update.timestamp,
      data: update,
    };

    this.broadcastToProperty(update.propertyId, wsMessage);
  }

  /**
   * Get all active team members for a property
   */
  getActiveTeamMembers(propertyId: string): GPSUpdate[] {
    const connections = this.connections.get(propertyId);
    if (!connections) return [];

    const activeMembers: GPSUpdate[] = [];
    this.userLocations.forEach((location) => {
      if (location.propertyId === propertyId) {
        activeMembers.push(location);
      }
    });

    return activeMembers;
  }

  /**
   * Get chat history for a property
   */
  getChatHistory(propertyId: string, limit: number = 50): ChatMessage[] {
    const history = this.messageHistory.get(propertyId) || [];
    return history.slice(-limit);
  }

  /**
   * Get user's current location
   */
  getUserLocation(userId: string): GPSUpdate | undefined {
    return this.userLocations.get(userId);
  }

  /**
   * Clear old data (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Remove stale locations (older than 24 hours)
    this.userLocations.forEach((location, userId) => {
      const locationTime = new Date(location.timestamp).getTime();
      if (now - locationTime > maxAge) {
        this.userLocations.delete(userId);
      }
    });

    // Trim message history (keep last 1000 messages per property)
    this.messageHistory.forEach((messages, propertyId) => {
      if (messages.length > 1000) {
        this.messageHistory.set(propertyId, messages.slice(-1000));
      }
    });
  }
}

/**
 * Create WebSocket server with Express integration
 */
export function createWebSocketServer(server: any) {
  const manager = new WebSocketConnectionManager();

  // Cleanup interval (every 1 hour)
  setInterval(() => manager.cleanup(), 60 * 60 * 1000);

  return {
    manager,
    handleConnection: (ws: any, propertyId: string, userId: string) => {
      manager.registerConnection(propertyId, ws);

      if (ws.on) {
        ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data);

          switch (message.type) {
            case "chat":
              const chatMsg: ChatMessage = {
                id: `msg_${Date.now()}`,
                sender: message.sender,
                senderId: userId,
                message: message.message,
                timestamp: new Date().toISOString(),
                propertyId,
              };
              manager.handleChatMessage(chatMsg);
              break;

            case "gps-update":
              const gpsUpdate: GPSUpdate = {
                userId,
                latitude: message.latitude,
                longitude: message.longitude,
                accuracy: message.accuracy,
                timestamp: new Date().toISOString(),
                propertyId,
              };
              manager.handleGPSUpdate(gpsUpdate);
              break;

            case "task-update":
              const taskUpdate: TaskUpdate = {
                taskId: message.taskId,
                status: message.status,
                updatedBy: userId,
                timestamp: new Date().toISOString(),
                propertyId,
              };
              manager.handleTaskUpdate(taskUpdate);
              break;
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

        ws.on("close", () => {
          manager.unregisterConnection(propertyId, ws);
        });

        ws.on("error", (error: any) => {
          console.error("WebSocket error:", error);
          manager.unregisterConnection(propertyId, ws);
        });
      }
    },
  };
}

/**
 * Client-side WebSocket hook (for React Native)
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private propertyId: string;
  private userId: string;
  private messageHandlers: Array<(msg: WebSocketMessage) => void> = [];

  constructor(url: string, propertyId: string, userId: string) {
    this.url = url;
    this.propertyId = propertyId;
    this.userId = userId;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use native WebSocket or ws library depending on environment
        const WSConstructor = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');
        this.ws = new WSConstructor(
          `${this.url}?propertyId=${this.propertyId}&userId=${this.userId}`
        );

        if (this.ws) {
          this.ws.onopen = () => {
            console.log("WebSocket connected");
            resolve();
          };

          this.ws.onmessage = (event: any) => {
            try {
              const message = JSON.parse(event.data);
              this.messageHandlers.forEach((handler) => handler(message));
            } catch (error) {
              console.error("WebSocket message parse error:", error);
            }
          };

          this.ws.onerror = (error: any) => {
            console.error("WebSocket error:", error);
            reject(error);
          };

          this.ws.onclose = () => {
            console.log("WebSocket disconnected");
          };
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(sender: string, message: string): void {
    this.send({
      type: "chat",
      sender,
      message,
    });
  }

  /**
   * Send GPS update
   */
  sendGPSUpdate(latitude: number, longitude: number, accuracy: number): void {
    this.send({
      type: "gps-update",
      latitude,
      longitude,
      accuracy,
    });
  }

  /**
   * Send task update
   */
  sendTaskUpdate(taskId: string, status: "pending" | "in-progress" | "completed"): void {
    this.send({
      type: "task-update",
      taskId,
      status,
    });
  }

  /**
   * Register message handler
   */
  onMessage(handler: (msg: WebSocketMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send raw message
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not connected");
    }
  }
}
