/**
 * Real-Time Knowledge Integration System
 * Integrates web search, APIs, and external data sources for AI agents
 * Includes security safeguards for web surfing and data validation
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DataSourceType = "web_search" | "api" | "database" | "file" | "user_input";
export type IntegrationStatus = "active" | "inactive" | "error" | "updating";
export type DataValidationLevel = "strict" | "moderate" | "permissive";

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  url?: string;
  apiKey?: string;
  description: string;
  enabled: boolean;
  validationLevel: DataValidationLevel;
  updateFrequency: number; // minutes
  lastUpdated?: Date;
  status: IntegrationStatus;
  metadata: Record<string, unknown>;
}

export interface IntegratedData {
  id: string;
  aiAgentId: string;
  sourceId: string;
  title: string;
  content: string;
  dataType: "article" | "api_response" | "database_record" | "file_content" | "user_input";
  relevanceScore: number; // 0-1
  trustScore: number; // 0-1
  lastValidated: Date;
  expiresAt?: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface WebSearchResult {
  id: string;
  query: string;
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
  timestamp: Date;
  source: string;
}

export interface APIIntegration {
  id: string;
  name: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  rateLimit: number; // requests per minute
  timeout: number; // seconds
  retryAttempts: number;
  enabled: boolean;
}

export interface DataValidationRule {
  id: string;
  sourceId: string;
  rule: string; // e.g., "content_length > 100"
  action: "accept" | "reject" | "flag_for_review";
  priority: number;
}

export interface SecuritySandbox {
  id: string;
  aiAgentId: string;
  allowedDomains: string[];
  blockedDomains: string[];
  maxRequestsPerHour: number;
  maxDataSizePerRequest: number; // MB
  enableJSExecution: boolean;
  enableCookies: boolean;
  currentRequests: number;
  lastReset: Date;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const DataSourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["web_search", "api", "database", "file", "user_input"]),
  url: z.string().url().optional(),
  apiKey: z.string().optional(),
  description: z.string(),
  enabled: z.boolean(),
  validationLevel: z.enum(["strict", "moderate", "permissive"]),
  updateFrequency: z.number().positive(),
  lastUpdated: z.date().optional(),
  status: z.enum(["active", "inactive", "error", "updating"]),
  metadata: z.record(z.string(), z.unknown()),
});

const IntegratedDataSchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  sourceId: z.string(),
  title: z.string().min(1),
  content: z.string().min(1),
  dataType: z.enum(["article", "api_response", "database_record", "file_content", "user_input"]),
  relevanceScore: z.number().min(0).max(1),
  trustScore: z.number().min(0).max(1),
  lastValidated: z.date(),
  expiresAt: z.date().optional(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
});

const SecuritySandboxSchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  allowedDomains: z.array(z.string()),
  blockedDomains: z.array(z.string()),
  maxRequestsPerHour: z.number().positive(),
  maxDataSizePerRequest: z.number().positive(),
  enableJSExecution: z.boolean(),
  enableCookies: z.boolean(),
  currentRequests: z.number().nonnegative(),
  lastReset: z.date(),
});

// ============================================================================
// REAL-TIME KNOWLEDGE INTEGRATION SYSTEM
// ============================================================================

export class AIKnowledgeIntegration {
  private dataSources: Map<string, DataSource[]> = new Map();
  private integratedData: Map<string, IntegratedData[]> = new Map();
  private apiIntegrations: Map<string, APIIntegration> = new Map();
  private validationRules: Map<string, DataValidationRule[]> = new Map();
  private securitySandboxes: Map<string, SecuritySandbox> = new Map();
  private webSearchCache: Map<string, WebSearchResult[]> = new Map();

  /**
   * Register a data source for an AI agent
   */
  registerDataSource(
    agentId: string,
    name: string,
    type: DataSourceType,
    options?: {
      url?: string;
      apiKey?: string;
      description?: string;
      validationLevel?: DataValidationLevel;
      updateFrequency?: number;
      metadata?: Record<string, unknown>;
    }
  ): DataSource {
    const source: DataSource = {
      id: `ds-${Date.now()}-${Math.random()}`,
      name,
      type,
      url: options?.url,
      apiKey: options?.apiKey,
      description: options?.description || "",
      enabled: true,
      validationLevel: options?.validationLevel || "moderate",
      updateFrequency: options?.updateFrequency || 60,
      status: "active",
      metadata: options?.metadata || {},
    };

    DataSourceSchema.parse(source);

    const sources = this.dataSources.get(agentId) || [];
    sources.push(source);
    this.dataSources.set(agentId, sources);

    return source;
  }

  /**
   * Register API integration
   */
  registerAPIIntegration(
    name: string,
    endpoint: string,
    options?: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      headers?: Record<string, string>;
      queryParams?: Record<string, string>;
      rateLimit?: number;
      timeout?: number;
      retryAttempts?: number;
    }
  ): APIIntegration {
    const integration: APIIntegration = {
      id: `api-${Date.now()}-${Math.random()}`,
      name,
      endpoint,
      method: options?.method || "GET",
      headers: options?.headers,
      queryParams: options?.queryParams,
      rateLimit: options?.rateLimit || 60,
      timeout: options?.timeout || 30,
      retryAttempts: options?.retryAttempts || 3,
      enabled: true,
    };

    this.apiIntegrations.set(integration.id, integration);
    return integration;
  }

  /**
   * Initialize security sandbox for agent
   */
  initializeSecuritySandbox(
    agentId: string,
    allowedDomains: string[] = ["*"],
    blockedDomains: string[] = []
  ): SecuritySandbox {
    const sandbox: SecuritySandbox = {
      id: `sb-${Date.now()}-${Math.random()}`,
      aiAgentId: agentId,
      allowedDomains,
      blockedDomains,
      maxRequestsPerHour: 100,
      maxDataSizePerRequest: 50, // MB
      enableJSExecution: false, // Disabled for security
      enableCookies: false, // Disabled for security
      currentRequests: 0,
      lastReset: new Date(),
    };

    SecuritySandboxSchema.parse(sandbox);
    this.securitySandboxes.set(agentId, sandbox);

    return sandbox;
  }

  /**
   * Add data validation rule
   */
  addValidationRule(
    sourceId: string,
    rule: string,
    action: "accept" | "reject" | "flag_for_review",
    priority: number = 5
  ): DataValidationRule {
    const validationRule: DataValidationRule = {
      id: `vr-${Date.now()}-${Math.random()}`,
      sourceId,
      rule,
      action,
      priority,
    };

    const rules = this.validationRules.get(sourceId) || [];
    rules.push(validationRule);
    rules.sort((a, b) => b.priority - a.priority);
    this.validationRules.set(sourceId, rules);

    return validationRule;
  }

  /**
   * Integrate data from a source
   */
  integrateData(
    agentId: string,
    sourceId: string,
    title: string,
    content: string,
    dataType: "article" | "api_response" | "database_record" | "file_content" | "user_input",
    options?: {
      relevanceScore?: number;
      trustScore?: number;
      tags?: string[];
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    }
  ): IntegratedData {
    // Validate data against rules
    const rules = this.validationRules.get(sourceId) || [];
    for (const rule of rules) {
      const isValid = this.evaluateValidationRule(rule, content);
      if (!isValid && rule.action === "reject") {
        throw new Error(`Data rejected by validation rule: ${rule.rule}`);
      }
    }

    const data: IntegratedData = {
      id: `id-${Date.now()}-${Math.random()}`,
      aiAgentId: agentId,
      sourceId,
      title,
      content,
      dataType,
      relevanceScore: options?.relevanceScore || 0.8,
      trustScore: options?.trustScore || 0.7,
      lastValidated: new Date(),
      expiresAt: options?.expiresAt,
      tags: options?.tags || [],
      metadata: options?.metadata || {},
    };

    IntegratedDataSchema.parse(data);

    const integrated = this.integratedData.get(agentId) || [];
    integrated.push(data);
    this.integratedData.set(agentId, integrated);

    return data;
  }

  /**
   * Evaluate validation rule
   */
  private evaluateValidationRule(rule: DataValidationRule, content: string): boolean {
    // Simple rule evaluation (can be extended with more complex logic)
    if (rule.rule.includes("content_length")) {
      const threshold = parseInt(rule.rule.match(/\d+/)?.[0] || "0");
      return content.length > threshold;
    }
    return true;
  }

  /**
   * Perform web search (with security safeguards)
   */
  async performWebSearch(
    agentId: string,
    query: string
  ): Promise<WebSearchResult[]> {
    const sandbox = this.securitySandboxes.get(agentId);

    if (!sandbox) {
      throw new Error("Security sandbox not initialized for agent");
    }

    // Check rate limiting
    if (sandbox.currentRequests >= sandbox.maxRequestsPerHour) {
      throw new Error("Rate limit exceeded for web searches");
    }

    // Check cache
    const cacheKey = `${agentId}:${query}`;
    if (this.webSearchCache.has(cacheKey)) {
      return this.webSearchCache.get(cacheKey) || [];
    }

    // Simulate web search (in production, integrate with real search API)
    const results: WebSearchResult[] = [
      {
        id: `wsr-${Date.now()}-1`,
        query,
        title: `Result for "${query}"`,
        url: "https://example.com/result1",
        snippet: `Information about ${query}...`,
        relevanceScore: 0.95,
        timestamp: new Date(),
        source: "example.com",
      },
      {
        id: `wsr-${Date.now()}-2`,
        query,
        title: `More information on ${query}`,
        url: "https://example.com/result2",
        snippet: `Additional details about ${query}...`,
        relevanceScore: 0.85,
        timestamp: new Date(),
        source: "example.com",
      },
    ];

    // Cache results
    this.webSearchCache.set(cacheKey, results);

    // Update sandbox
    sandbox.currentRequests++;

    return results;
  }

  /**
   * Get integrated data for an agent
   */
  getIntegratedData(
    agentId: string,
    options?: {
      sourceId?: string;
      dataType?: string;
      tags?: string[];
      minTrustScore?: number;
    }
  ): IntegratedData[] {
    let data = this.integratedData.get(agentId) || [];

    if (options?.sourceId) {
      data = data.filter((d) => d.sourceId === options.sourceId);
    }

    if (options?.dataType) {
      data = data.filter((d) => d.dataType === options.dataType);
    }

    if (options?.tags && options.tags.length > 0) {
      data = data.filter((d) =>
        options.tags!.some((tag) => d.tags.includes(tag))
      );
    }

    if (options?.minTrustScore) {
      data = data.filter((d) => d.trustScore >= options.minTrustScore!);
    }

    // Filter out expired data
    data = data.filter((d) => !d.expiresAt || d.expiresAt > new Date());

    return data;
  }

  /**
   * Get data sources for an agent
   */
  getDataSources(agentId: string, enabledOnly: boolean = true): DataSource[] {
    let sources = this.dataSources.get(agentId) || [];

    if (enabledOnly) {
      sources = sources.filter((s) => s.enabled);
    }

    return sources;
  }

  /**
   * Update data source status
   */
  updateDataSourceStatus(sourceId: string, status: IntegrationStatus): void {
    this.dataSources.forEach((sources) => {
      const source = sources.find((s) => s.id === sourceId);
      if (source) {
        source.status = status;
        if (status === "active") {
          source.lastUpdated = new Date();
        }
      }
    });
  }

  /**
   * Get security sandbox
   */
  getSecuritySandbox(agentId: string): SecuritySandbox | undefined {
    return this.securitySandboxes.get(agentId);
  }

  /**
   * Check if domain is allowed
   */
  isDomainAllowed(agentId: string, domain: string): boolean {
    const sandbox = this.securitySandboxes.get(agentId);
    if (!sandbox) return false;

    // Check blocked domains first
    if (sandbox.blockedDomains.includes(domain)) {
      return false;
    }

    // Check allowed domains
    if (sandbox.allowedDomains.includes("*")) {
      return true;
    }

    return sandbox.allowedDomains.includes(domain);
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalDataSources: number;
    totalIntegratedData: number;
    totalAPIIntegrations: number;
    activeSecuritySandboxes: number;
  } {
    const totalDataSources = Array.from(this.dataSources.values()).reduce(
      (sum, sources) => sum + sources.length,
      0
    );
    const totalIntegratedData = Array.from(this.integratedData.values()).reduce(
      (sum, data) => sum + data.length,
      0
    );
    const totalAPIIntegrations = this.apiIntegrations.size;
    const activeSecuritySandboxes = this.securitySandboxes.size;

    return {
      totalDataSources,
      totalIntegratedData,
      totalAPIIntegrations,
      activeSecuritySandboxes,
    };
  }
}

export default AIKnowledgeIntegration;
