/**
 * Load Balancing Service
 * Distributes traffic across multiple servers
 * Essential for handling millions of concurrent users
 */

export interface Server {
  id: string;
  host: string;
  port: number;
  healthy: boolean;
  connections: number;
  responseTime: number;
  weight: number; // For weighted round-robin
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheckInterval: number;
  maxConnections: number;
}

export class LoadBalancer {
  private servers: Map<string, Server> = new Map();
  private currentIndex: number = 0;
  private config: LoadBalancerConfig;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
  };

  constructor(config: LoadBalancerConfig) {
    this.config = config;
  }

  /**
   * Add server to load balancer
   */
  addServer(server: Server): void {
    this.servers.set(server.id, server);
  }

  /**
   * Remove server from load balancer
   */
  removeServer(serverId: string): boolean {
    return this.servers.delete(serverId);
  }

  /**
   * Get next server using round-robin
   */
  private roundRobin(): Server | null {
    const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
    if (healthyServers.length === 0) return null;

    const server = healthyServers[this.currentIndex % healthyServers.length];
    this.currentIndex++;
    return server;
  }

  /**
   * Get server with least connections
   */
  private leastConnections(): Server | null {
    const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
    if (healthyServers.length === 0) return null;

    return healthyServers.reduce((min, server) =>
      server.connections < min.connections ? server : min
    );
  }

  /**
   * Get server using weighted distribution
   */
  private weighted(): Server | null {
    const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
    if (healthyServers.length === 0) return null;

    const totalWeight = healthyServers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const server of healthyServers) {
      random -= server.weight;
      if (random <= 0) return server;
    }

    return healthyServers[0];
  }

  /**
   * Get server using IP hash
   */
  private ipHash(clientIp: string): Server | null {
    const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
    if (healthyServers.length === 0) return null;

    const hash = clientIp.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    return healthyServers[hash % healthyServers.length];
  }

  /**
   * Route request to appropriate server
   */
  route(clientIp?: string): Server | null {
    let server: Server | null = null;

    switch (this.config.algorithm) {
      case 'round-robin':
        server = this.roundRobin();
        break;
      case 'least-connections':
        server = this.leastConnections();
        break;
      case 'weighted':
        server = this.weighted();
        break;
      case 'ip-hash':
        server = clientIp ? this.ipHash(clientIp) : this.roundRobin();
        break;
    }

    if (server) {
      server.connections++;
      this.stats.totalRequests++;
    }

    return server;
  }

  /**
   * Release connection
   */
  releaseConnection(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server && server.connections > 0) {
      server.connections--;
    }
  }

  /**
   * Mark request as successful
   */
  markSuccess(serverId: string, responseTime: number): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.responseTime = responseTime;
      this.stats.successfulRequests++;
    }
  }

  /**
   * Mark request as failed
   */
  markFailure(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.healthy = false;
      this.stats.failedRequests++;
    }
  }

  /**
   * Get server status
   */
  getServerStatus(): Server[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get load balancer statistics
   */
  getStats() {
    const servers = Array.from(this.servers.values());
    const totalConnections = servers.reduce((sum, s) => sum + s.connections, 0);
    const avgResponseTime = servers.reduce((sum, s) => sum + s.responseTime, 0) / servers.length;

    return {
      ...this.stats,
      totalServers: servers.length,
      healthyServers: servers.filter(s => s.healthy).length,
      totalConnections,
      avgResponseTime,
      successRate: this.stats.totalRequests > 0
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2)
        : 0,
    };
  }

  /**
   * Health check all servers
   */
  async healthCheck(checkFn: (server: Server) => Promise<boolean>): Promise<void> {
    for (const server of this.servers.values()) {
      try {
        server.healthy = await checkFn(server);
      } catch (error) {
        server.healthy = false;
      }
    }
  }
}

/**
 * Sticky Session Manager
 * Maintains session affinity for stateful applications
 */
export class StickySessionManager {
  private sessions: Map<string, { serverId: string; createdAt: Date; lastAccess: Date }> = new Map();
  private sessionTimeout: number;

  constructor(sessionTimeoutSeconds: number = 3600) {
    this.sessionTimeout = sessionTimeoutSeconds * 1000;
  }

  /**
   * Create sticky session
   */
  createSession(sessionId: string, serverId: string): void {
    const now = new Date();
    this.sessions.set(sessionId, {
      serverId,
      createdAt: now,
      lastAccess: now,
    });
  }

  /**
   * Get sticky server for session
   */
  getServer(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session expired
    if (new Date().getTime() - session.lastAccess.getTime() > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastAccess = new Date();
    return session.serverId;
  }

  /**
   * Remove session
   */
  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cleanup expired sessions
   */
  cleanup(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastAccess.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      sessionTimeout: this.sessionTimeout,
    };
  }
}

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private lastFailureTime?: Date;

  constructor(failureThreshold: number = 5, successThreshold: number = 2, timeoutSeconds: number = 60) {
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeout = timeoutSeconds * 1000;
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (this.lastFailureTime && new Date().getTime() - this.lastFailureTime.getTime() > this.timeout) {
        this.state = 'half-open';
        this.successCount = 0;
        return true;
      }
      return false;
    }

    return this.state === 'half-open';
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Get circuit breaker state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}
