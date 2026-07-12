/**
 * API Gateway Service
 * Central entry point for all API requests with routing, authentication, rate limiting, and logging
 */

export interface GatewayRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
  clientIp: string;
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  processingTime: number;
}

export interface RouteConfig {
  path: string;
  method: string;
  handler: (req: GatewayRequest) => Promise<GatewayResponse>;
  rateLimit?: number;
  requiresAuth?: boolean;
  timeout?: number;
}

export class APIGateway {
  private routes: Map<string, RouteConfig> = new Map();
  private requestLog: GatewayRequest[] = [];
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalProcessingTime: 0,
  };

  /**
   * Register route
   */
  registerRoute(config: RouteConfig): void {
    const key = `${config.method}:${config.path}`;
    this.routes.set(key, config);
  }

  /**
   * Handle incoming request
   */
  async handleRequest(req: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    this.requestLog.push(req);
    this.stats.totalRequests++;

    try {
      const key = `${req.method}:${req.path}`;
      const route = this.routes.get(key);

      if (!route) {
        this.stats.failedRequests++;
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Route not found' },
          processingTime: Date.now() - startTime,
        };
      }

      // Check authentication
      if (route.requiresAuth && !this.validateAuth(req)) {
        this.stats.failedRequests++;
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Unauthorized' },
          processingTime: Date.now() - startTime,
        };
      }

      // Execute handler with timeout
      const timeoutMs = route.timeout || 30000;
      const response = await Promise.race([
        route.handler(req),
        new Promise<GatewayResponse>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        ),
      ]);

      this.stats.successfulRequests++;
      response.processingTime = Date.now() - startTime;
      this.stats.totalProcessingTime += response.processingTime;

      return response;
    } catch (error) {
      this.stats.failedRequests++;
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal server error' },
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate authentication
   */
  private validateAuth(req: GatewayRequest): boolean {
    const authHeader = req.headers['authorization'];
    return !!authHeader && authHeader.startsWith('Bearer ');
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    const avgProcessingTime = this.stats.totalRequests > 0
      ? this.stats.totalProcessingTime / this.stats.totalRequests
      : 0;

    const successRate = this.stats.totalRequests > 0
      ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      avgProcessingTime: avgProcessingTime.toFixed(2),
      successRate,
      requestsPerSecond: (this.stats.totalRequests / (Date.now() / 1000)).toFixed(2),
    };
  }

  /**
   * Get request log
   */
  getRequestLog(limit: number = 100) {
    return this.requestLog.slice(-limit);
  }

  /**
   * Clear request log
   */
  clearRequestLog(): void {
    this.requestLog = [];
  }
}

/**
 * Request Router
 * Routes requests to appropriate microservices
 */
export class RequestRouter {
  private services: Map<string, string> = new Map();
  private loadBalancer: Map<string, number> = new Map();

  /**
   * Register service
   */
  registerService(name: string, url: string): void {
    this.services.set(name, url);
    this.loadBalancer.set(name, 0);
  }

  /**
   * Route request to service
   */
  routeToService(serviceName: string): string | null {
    const url = this.services.get(serviceName);
    if (!url) return null;

    // Update load counter
    const currentLoad = this.loadBalancer.get(serviceName) || 0;
    this.loadBalancer.set(serviceName, currentLoad + 1);

    return url;
  }

  /**
   * Get service health
   */
  getServiceHealth() {
    return Array.from(this.services.entries()).map(([name, url]) => ({
      name,
      url,
      load: this.loadBalancer.get(name) || 0,
    }));
  }
}

/**
 * Request Validator
 * Validates incoming requests
 */
export class RequestValidator {
  /**
   * Validate request body
   */
  validateBody(body: any, schema: Record<string, string>): boolean {
    if (!body) return false;

    for (const [field, type] of Object.entries(schema)) {
      if (!(field in body)) return false;
      if (typeof body[field] !== type) return false;
    }

    return true;
  }

  /**
   * Validate headers
   */
  validateHeaders(headers: Record<string, string>, required: string[]): boolean {
    for (const header of required) {
      if (!(header in headers)) return false;
    }
    return true;
  }

  /**
   * Sanitize input
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
}

/**
 * Request Logger
 * Logs all API requests and responses
 */
export class RequestLogger {
  private logs: any[] = [];
  private maxLogs = 10000;

  /**
   * Log request
   */
  logRequest(req: GatewayRequest, res: GatewayResponse): void {
    const log = {
      timestamp: req.timestamp,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      processingTime: res.processingTime,
      clientIp: req.clientIp,
    };

    this.logs.push(log);

    // Keep logs size manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get logs
   */
  getLogs(limit: number = 100) {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by path
   */
  getLogsByPath(path: string, limit: number = 100) {
    return this.logs.filter(log => log.path.includes(path)).slice(-limit);
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 100) {
    return this.logs.filter(log => log.statusCode >= 400).slice(-limit);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const avgTime = this.logs.length > 0
      ? this.logs.reduce((sum, log) => sum + log.processingTime, 0) / this.logs.length
      : 0;

    const p95Time = this.logs.length > 0
      ? this.logs
          .map(log => log.processingTime)
          .sort((a, b) => a - b)[Math.floor(this.logs.length * 0.95)]
      : 0;

    const p99Time = this.logs.length > 0
      ? this.logs
          .map(log => log.processingTime)
          .sort((a, b) => a - b)[Math.floor(this.logs.length * 0.99)]
      : 0;

    return {
      avgTime: avgTime.toFixed(2),
      p95Time,
      p99Time,
      totalRequests: this.logs.length,
    };
  }
}
