/**
 * Security Hardening & DDoS Protection System
 * 
 * Protects app from attacks and security threats
 * - Rate limiting
 * - IP whitelisting/blacklisting
 * - Request validation
 * - DDoS detection & mitigation
 * - Security headers
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

const ThreatLevelSchema = z.enum(["low", "medium", "high", "critical"]);
type ThreatLevel = z.infer<typeof ThreatLevelSchema>;

const AttackTypeSchema = z.enum([
  "ddos",
  "brute_force",
  "sql_injection",
  "xss",
  "csrf",
  "rate_limit_abuse",
  "bot_traffic",
  "suspicious_pattern",
]);
type AttackType = z.infer<typeof AttackTypeSchema>;

const IPStatusSchema = z.enum(["trusted", "normal", "suspicious", "blocked"]);
type IPStatus = z.infer<typeof IPStatusSchema>;

const SecurityEventSchema = z.object({
  event_id: z.string(),
  timestamp: z.number(),
  ip_address: z.string(),
  attack_type: AttackTypeSchema,
  threat_level: ThreatLevelSchema,
  details: z.string(),
  blocked: z.boolean(),
  action_taken: z.string(),
});
type SecurityEvent = z.infer<typeof SecurityEventSchema>;

const RateLimitPolicySchema = z.object({
  name: z.string(),
  requests_per_minute: z.number(),
  requests_per_hour: z.number(),
  requests_per_day: z.number(),
  burst_limit: z.number(),
  enabled: z.boolean(),
});
type RateLimitPolicy = z.infer<typeof RateLimitPolicySchema>;

// ============================================================================
// SECURITY & DDoS PROTECTION SYSTEM
// ============================================================================

export class SecurityDDoSProtection {
  private ipReputations: Map<string, { status: IPStatus; score: number; lastSeen: number }> =
    new Map();
  private rateLimitBuckets: Map<string, { count: number; resetTime: number }> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private rateLimitPolicies: Map<string, RateLimitPolicy> = new Map();
  private blacklistedIPs: Set<string> = new Set();
  private whitelistedIPs: Set<string> = new Set();
  private suspiciousPatterns: string[] = [
    "union select",
    "drop table",
    "exec(",
    "<script",
    "javascript:",
    "onclick=",
  ];

  constructor() {
    this.initializeRateLimitPolicies();
    this.initializeSecurityLists();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeRateLimitPolicies(): void {
    // Standard user policy
    this.rateLimitPolicies.set("standard", {
      name: "Standard User",
      requests_per_minute: 60,
      requests_per_hour: 3000,
      requests_per_day: 50000,
      burst_limit: 100,
      enabled: true,
    });

    // Premium user policy
    this.rateLimitPolicies.set("premium", {
      name: "Premium User",
      requests_per_minute: 300,
      requests_per_hour: 15000,
      requests_per_day: 250000,
      burst_limit: 500,
      enabled: true,
    });

    // API policy
    this.rateLimitPolicies.set("api", {
      name: "API Client",
      requests_per_minute: 1000,
      requests_per_hour: 50000,
      requests_per_day: 1000000,
      burst_limit: 2000,
      enabled: true,
    });

    // Bot policy (strict)
    this.rateLimitPolicies.set("bot", {
      name: "Bot/Crawler",
      requests_per_minute: 10,
      requests_per_hour: 100,
      requests_per_day: 1000,
      burst_limit: 20,
      enabled: true,
    });
  }

  private initializeSecurityLists(): void {
    // Add some known malicious IPs (example)
    // this.blacklistedIPs.add("192.168.1.100");

    // Add trusted IPs
    this.whitelistedIPs.add("127.0.0.1");
    this.whitelistedIPs.add("::1");
  }

  // ========================================================================
  // REQUEST VALIDATION & SECURITY
  // ========================================================================

  public validateRequest(
    ip: string,
    path: string,
    method: string,
    body?: string,
    userType: string = "standard"
  ): {
    allowed: boolean;
    threat_level: ThreatLevel;
    reason?: string;
    action?: string;
  } {
    // Check if IP is whitelisted
    if (this.whitelistedIPs.has(ip)) {
      return { allowed: true, threat_level: "low" };
    }

    // Check if IP is blacklisted
    if (this.blacklistedIPs.has(ip)) {
      this.recordSecurityEvent(ip, "bot_traffic", "critical", "IP is blacklisted", true);
      return {
        allowed: false,
        threat_level: "critical",
        reason: "IP is blacklisted",
        action: "blocked",
      };
    }

    // Check rate limits
    const rateLimitCheck = this.checkRateLimit(ip, userType);
    if (!rateLimitCheck.allowed) {
      this.recordSecurityEvent(ip, "rate_limit_abuse", "high", "Rate limit exceeded", true);
      return {
        allowed: false,
        threat_level: "high",
        reason: "Rate limit exceeded",
        action: "throttled",
      };
    }

    // Check for suspicious patterns in request
    const patternCheck = this.checkSuspiciousPatterns(path, body);
    if (patternCheck.suspicious) {
      this.recordSecurityEvent(ip, patternCheck.type, "high", patternCheck.details, true);
      return {
        allowed: false,
        threat_level: "high",
        reason: patternCheck.details,
        action: "blocked",
      };
    }

    // Check for DDoS patterns
    const ddosCheck = this.checkDDoSPattern(ip);
    if (ddosCheck.isDDoS) {
      this.recordSecurityEvent(ip, "ddos", "critical", ddosCheck.details, true);
      return {
        allowed: false,
        threat_level: "critical",
        reason: ddosCheck.details,
        action: "blocked",
      };
    }

    // Update IP reputation
    this.updateIPReputation(ip, "normal", 0);

    return { allowed: true, threat_level: "low" };
  }

  // ========================================================================
  // RATE LIMITING
  // ========================================================================

  private checkRateLimit(
    ip: string,
    userType: string
  ): { allowed: boolean; remaining: number } {
    const policy = this.rateLimitPolicies.get(userType) || this.rateLimitPolicies.get("standard")!;

    if (!policy.enabled) {
      return { allowed: true, remaining: policy.requests_per_minute };
    }

    const bucketKey = `${ip}-${userType}`;
    const now = Date.now();
    let bucket = this.rateLimitBuckets.get(bucketKey);

    // Initialize or reset bucket
    if (!bucket || now > bucket.resetTime) {
      bucket = {
        count: 0,
        resetTime: now + 60000, // 1 minute
      };
    }

    bucket.count++;

    // Check limits
    if (bucket.count > policy.requests_per_minute) {
      this.rateLimitBuckets.set(bucketKey, bucket);
      return { allowed: false, remaining: 0 };
    }

    this.rateLimitBuckets.set(bucketKey, bucket);
    return { allowed: true, remaining: policy.requests_per_minute - bucket.count };
  }

  // ========================================================================
  // THREAT DETECTION
  // ========================================================================

  private checkSuspiciousPatterns(
    path: string,
    body?: string
  ): { suspicious: boolean; type: AttackType; details: string } {
    const content = `${path} ${body || ""}`.toLowerCase();

    for (const pattern of this.suspiciousPatterns) {
      if (content.includes(pattern)) {
        return {
          suspicious: true,
          type: "sql_injection",
          details: `Suspicious pattern detected: ${pattern}`,
        };
      }
    }

    return { suspicious: false, type: "sql_injection", details: "" };
  }

  private checkDDoSPattern(ip: string): { isDDoS: boolean; details: string } {
    const bucketKey = `ddos-check-${ip}`;
    let bucket = this.rateLimitBuckets.get(bucketKey);

    if (!bucket) {
      bucket = { count: 1, resetTime: Date.now() + 5000 }; // 5 second window
      this.rateLimitBuckets.set(bucketKey, bucket);
      return { isDDoS: false, details: "" };
    }

    bucket.count++;

    // If > 1000 requests in 5 seconds, likely DDoS
    if (bucket.count > 1000) {
      return { isDDoS: true, details: `Potential DDoS: ${bucket.count} requests in 5s` };
    }

    return { isDDoS: false, details: "" };
  }

  // ========================================================================
  // IP REPUTATION MANAGEMENT
  // ========================================================================

  private updateIPReputation(ip: string, status: IPStatus, scoreChange: number): void {
    let reputation = this.ipReputations.get(ip) || { status: "normal", score: 0, lastSeen: 0 };

    reputation.score += scoreChange;
    reputation.lastSeen = Date.now();

    // Determine status based on score
    if (reputation.score > 50) {
      reputation.status = "blocked";
      this.blacklistedIPs.add(ip);
    } else if (reputation.score > 25) {
      reputation.status = "suspicious";
    } else if (reputation.score < -10) {
      reputation.status = "trusted";
    } else {
      reputation.status = status;
    }

    this.ipReputations.set(ip, reputation);
  }

  public getIPReputation(ip: string): typeof this.ipReputations extends Map<string, infer T>
    ? T
    : never {
    return this.ipReputations.get(ip) || { status: "normal", score: 0, lastSeen: 0 };
  }

  public blockIP(ip: string, reason: string): void {
    this.blacklistedIPs.add(ip);
    this.updateIPReputation(ip, "blocked", 100);
    this.recordSecurityEvent(ip, "bot_traffic", "critical", `Manually blocked: ${reason}`, true);
  }

  public whitelistIP(ip: string): void {
    this.whitelistedIPs.add(ip);
    this.updateIPReputation(ip, "trusted", -50);
  }

  // ========================================================================
  // SECURITY HEADERS
  // ========================================================================

  public getSecurityHeaders(): Record<string, string> {
    return {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    };
  }

  // ========================================================================
  // SECURITY EVENTS
  // ========================================================================

  private recordSecurityEvent(
    ip: string,
    attackType: AttackType,
    threatLevel: ThreatLevel,
    details: string,
    blocked: boolean
  ): void {
    const event: SecurityEvent = {
      event_id: `${ip}-${Date.now()}`,
      timestamp: Date.now(),
      ip_address: ip,
      attack_type: attackType,
      threat_level: threatLevel,
      details,
      blocked,
      action_taken: blocked ? "blocked" : "logged",
    };

    this.securityEvents.push(event);

    // Keep only last 10000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents.shift();
    }

    console.log(`🔒 Security Event: ${threatLevel.toUpperCase()} - ${attackType} from ${ip}`);
  }

  // ========================================================================
  // PUBLIC STATISTICS
  // ========================================================================

  public getSecurityStatus(): {
    total_events: number;
    blocked_ips: number;
    whitelisted_ips: number;
    active_threats: SecurityEvent[];
    threat_summary: Record<string, number>;
  } {
    const threatSummary: Record<string, number> = {};
    const activeThreats: SecurityEvent[] = [];

    for (const event of this.securityEvents) {
      threatSummary[event.attack_type] = (threatSummary[event.attack_type] || 0) + 1;

      // Events from last hour
      if (Date.now() - event.timestamp < 3600000) {
        activeThreats.push(event);
      }
    }

    return {
      total_events: this.securityEvents.length,
      blocked_ips: this.blacklistedIPs.size,
      whitelisted_ips: this.whitelistedIPs.size,
      active_threats: activeThreats.slice(-50),
      threat_summary: threatSummary,
    };
  }

  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  public getRateLimitPolicies(): RateLimitPolicy[] {
    return Array.from(this.rateLimitPolicies.values());
  }

  public updateRateLimitPolicy(name: string, policy: Partial<RateLimitPolicy>): void {
    const existing = this.rateLimitPolicies.get(name);
    if (existing) {
      this.rateLimitPolicies.set(name, { ...existing, ...policy });
    }
  }
}

// Export instance
export const securityDDoS = new SecurityDDoSProtection();
