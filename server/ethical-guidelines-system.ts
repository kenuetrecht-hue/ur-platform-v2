/**
 * Ethical Guidelines & Compliance System
 * Ensures all AI agents operate within ethical boundaries
 * Enforces compliance with regulations and best practices
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EthicalPrinciple = 
  | "transparency"
  | "accountability"
  | "fairness"
  | "privacy"
  | "security"
  | "educational_focus"
  | "no_harm"
  | "legal_compliance";

export type ComplianceStandard = "gdpr" | "ccpa" | "hipaa" | "sox" | "educational_standards";
export type ResponseType = "advice" | "information" | "educational" | "entertainment" | "tool";

export interface EthicalGuideline {
  id: string;
  principle: EthicalPrinciple;
  description: string;
  rules: string[];
  examples: string[];
  violations: string[];
  enabled: boolean;
  createdAt: Date;
}

export interface ComplianceRequirement {
  id: string;
  standard: ComplianceStandard;
  requirement: string;
  description: string;
  checkpoints: string[];
  status: "compliant" | "non_compliant" | "in_progress";
  lastAudited: Date;
}

export interface AIResponseGuide {
  id: string;
  aiAgentId: string;
  responseType: ResponseType;
  requiredDisclaimer: string;
  allowedTopics: string[];
  restrictedTopics: string[];
  guidelines: string[];
  exampleResponses: string[];
}

export interface EthicalAudit {
  id: string;
  aiAgentId: string;
  timestamp: Date;
  principlesChecked: EthicalPrinciple[];
  violations: EthicalViolation[];
  score: number; // 0-100
  recommendations: string[];
  status: "passed" | "failed" | "warning";
}

export interface EthicalViolation {
  id: string;
  principle: EthicalPrinciple;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export interface EducationalDisclaimer {
  id: string;
  type: "general" | "financial" | "medical" | "legal" | "professional";
  text: string;
  requiredFor: string[];
  displayOrder: number;
}

export interface UserConsent {
  userId: string;
  consentType: "terms_of_service" | "privacy_policy" | "educational_use" | "data_collection";
  accepted: boolean;
  timestamp: Date;
  version: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const EthicalGuidelineSchema = z.object({
  id: z.string(),
  principle: z.enum([
    "transparency", "accountability", "fairness", "privacy", "security",
    "educational_focus", "no_harm", "legal_compliance"
  ]),
  description: z.string().min(1),
  rules: z.array(z.string()),
  examples: z.array(z.string()),
  violations: z.array(z.string()),
  enabled: z.boolean(),
  createdAt: z.date(),
});

const ComplianceRequirementSchema = z.object({
  id: z.string(),
  standard: z.enum(["gdpr", "ccpa", "hipaa", "sox", "educational_standards"]),
  requirement: z.string().min(1),
  description: z.string(),
  checkpoints: z.array(z.string()),
  status: z.enum(["compliant", "non_compliant", "in_progress"]),
  lastAudited: z.date(),
});

const AIResponseGuideSchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  responseType: z.enum(["advice", "information", "educational", "entertainment", "tool"]),
  requiredDisclaimer: z.string().min(1),
  allowedTopics: z.array(z.string()),
  restrictedTopics: z.array(z.string()),
  guidelines: z.array(z.string()),
  exampleResponses: z.array(z.string()),
});

const UserConsentSchema = z.object({
  userId: z.string(),
  consentType: z.enum(["terms_of_service", "privacy_policy", "educational_use", "data_collection"]),
  accepted: z.boolean(),
  timestamp: z.date(),
  version: z.string(),
});

// ============================================================================
// ETHICAL GUIDELINES & COMPLIANCE SYSTEM
// ============================================================================

export class EthicalGuidelinesSystem {
  private guidelines: Map<string, EthicalGuideline> = new Map();
  private complianceRequirements: Map<string, ComplianceRequirement> = new Map();
  private responseGuides: Map<string, AIResponseGuide> = new Map();
  private audits: EthicalAudit[] = [];
  private violations: EthicalViolation[] = [];
  private disclaimers: Map<string, EducationalDisclaimer> = new Map();
  private userConsents: Map<string, UserConsent[]> = new Map();

  constructor() {
    this.initializeDefaultGuidelines();
    this.initializeDefaultDisclaimers();
    this.initializeComplianceRequirements();
  }

  /**
   * Initialize default ethical guidelines
   */
  private initializeDefaultGuidelines(): void {
    const principles: Record<EthicalPrinciple, Omit<EthicalGuideline, "id">> = {
      transparency: {
        principle: "transparency",
        description: "All AI responses must be transparent about being AI-generated",
        rules: [
          "Always disclose that responses are AI-generated",
          "Clearly state limitations and uncertainties",
          "Explain reasoning when possible",
          "Provide sources for information",
        ],
        examples: [
          "Start with: 'As an AI, I...'",
          "End with: 'This is AI-generated content'",
          "Include confidence levels",
        ],
        violations: [
          "Pretending to be human",
          "Hiding AI origin",
          "Making false claims about capabilities",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      accountability: {
        principle: "accountability",
        description: "AI agents must be accountable for their outputs",
        rules: [
          "Log all significant decisions",
          "Maintain audit trails",
          "Allow user feedback and corrections",
          "Respond to safety concerns",
        ],
        examples: [
          "Track all recommendations made",
          "Record user corrections",
          "Maintain decision logs",
        ],
        violations: [
          "Deleting logs",
          "Ignoring user feedback",
          "Refusing to explain decisions",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      fairness: {
        principle: "fairness",
        description: "AI responses must be fair and unbiased",
        rules: [
          "Treat all users equally",
          "Avoid discriminatory content",
          "Acknowledge multiple perspectives",
          "Don't favor specific groups",
        ],
        examples: [
          "Present balanced viewpoints",
          "Acknowledge limitations",
          "Avoid stereotypes",
        ],
        violations: [
          "Discriminatory language",
          "Biased recommendations",
          "Unfair treatment of groups",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      privacy: {
        principle: "privacy",
        description: "User privacy must be protected",
        rules: [
          "Never share personal data",
          "Encrypt sensitive information",
          "Respect user preferences",
          "Follow data retention policies",
        ],
        examples: [
          "Anonymize user data",
          "Secure all communications",
          "Allow data deletion",
        ],
        violations: [
          "Sharing personal information",
          "Storing data without consent",
          "Selling user data",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      security: {
        principle: "security",
        description: "System security must be maintained",
        rules: [
          "Prevent unauthorized access",
          "Validate all inputs",
          "Use secure communications",
          "Regular security audits",
        ],
        examples: [
          "Use HTTPS for all connections",
          "Implement rate limiting",
          "Validate user inputs",
        ],
        violations: [
          "SQL injection vulnerabilities",
          "Unencrypted data transmission",
          "Weak authentication",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      educational_focus: {
        principle: "educational_focus",
        description: "App is for educational and entrepreneurial purposes only",
        rules: [
          "Prioritize learning and growth",
          "Provide educational context",
          "Encourage skill development",
          "Support legitimate business goals",
        ],
        examples: [
          "Teach business fundamentals",
          "Provide learning resources",
          "Support skill building",
        ],
        violations: [
          "Promoting illegal activities",
          "Encouraging harmful behavior",
          "Misleading users",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      no_harm: {
        principle: "no_harm",
        description: "Never assist with harmful, illegal, or unethical activities",
        rules: [
          "Block harmful requests",
          "Report violations",
          "Protect vulnerable users",
          "Refuse illegal activities",
        ],
        examples: [
          "Reject violence requests",
          "Block fraud assistance",
          "Refuse drug information",
        ],
        violations: [
          "Assisting with illegal activities",
          "Providing harm instructions",
          "Exploiting vulnerabilities",
        ],
        enabled: true,
        createdAt: new Date(),
      },
      legal_compliance: {
        principle: "legal_compliance",
        description: "All operations must comply with applicable laws",
        rules: [
          "Follow GDPR requirements",
          "Respect CCPA rights",
          "Comply with local regulations",
          "Honor legal requests",
        ],
        examples: [
          "Provide data access on request",
          "Honor deletion requests",
          "Maintain required records",
        ],
        violations: [
          "Violating data protection laws",
          "Ignoring legal requests",
          "Non-compliance with regulations",
        ],
        enabled: true,
        createdAt: new Date(),
      },
    };

    Object.entries(principles).forEach(([_, guideline]) => {
      const id = `eg-${guideline.principle}`;
      const fullGuideline: EthicalGuideline = {
        id,
        ...guideline,
      };

      EthicalGuidelineSchema.parse(fullGuideline);
      this.guidelines.set(id, fullGuideline);
    });
  }

  /**
   * Initialize default disclaimers
   */
  private initializeDefaultDisclaimers(): void {
    const disclaimers: EducationalDisclaimer[] = [
      {
        id: "disc-general",
        type: "general",
        text: "This is AI-generated content for educational purposes only. Not a substitute for professional advice.",
        requiredFor: ["all"],
        displayOrder: 1,
      },
      {
        id: "disc-financial",
        type: "financial",
        text: "This is not financial advice. Consult a financial advisor before making investment decisions.",
        requiredFor: ["financial_advice", "investment_guidance"],
        displayOrder: 2,
      },
      {
        id: "disc-medical",
        type: "medical",
        text: "This is not medical advice. Consult a healthcare professional for medical concerns.",
        requiredFor: ["health_information", "medical_guidance"],
        displayOrder: 3,
      },
      {
        id: "disc-legal",
        type: "legal",
        text: "This is not legal advice. Consult an attorney for legal matters.",
        requiredFor: ["legal_information", "legal_guidance"],
        displayOrder: 4,
      },
      {
        id: "disc-professional",
        type: "professional",
        text: "This is for educational purposes. Professional certification requires proper credentials.",
        requiredFor: ["professional_guidance", "certification"],
        displayOrder: 5,
      },
    ];

    disclaimers.forEach((disclaimer) => {
      this.disclaimers.set(disclaimer.id, disclaimer);
    });
  }

  /**
   * Initialize compliance requirements
   */
  private initializeComplianceRequirements(): void {
    const requirements: ComplianceRequirement[] = [
      {
        id: "comp-gdpr",
        standard: "gdpr",
        requirement: "User data must be protected and deletable",
        description: "GDPR compliance for EU users",
        checkpoints: ["Data encryption", "Deletion capability", "Consent tracking"],
        status: "compliant",
        lastAudited: new Date(),
      },
      {
        id: "comp-ccpa",
        standard: "ccpa",
        requirement: "California users have data access rights",
        description: "CCPA compliance for California users",
        checkpoints: ["Data access", "Opt-out capability", "Privacy notice"],
        status: "compliant",
        lastAudited: new Date(),
      },
      {
        id: "comp-educational",
        standard: "educational_standards",
        requirement: "Content must be educational and accurate",
        description: "Educational standards compliance",
        checkpoints: ["Content accuracy", "Learning objectives", "Age appropriateness"],
        status: "compliant",
        lastAudited: new Date(),
      },
    ];

    requirements.forEach((req) => {
      ComplianceRequirementSchema.parse(req);
      this.complianceRequirements.set(req.id, req);
    });
  }

  /**
   * Create AI response guide
   */
  createResponseGuide(
    aiAgentId: string,
    responseType: ResponseType,
    allowedTopics: string[],
    restrictedTopics: string[] = []
  ): AIResponseGuide {
    const guide: AIResponseGuide = {
      id: `rg-${Date.now()}-${Math.random()}`,
      aiAgentId,
      responseType,
      requiredDisclaimer: this.getRequiredDisclaimer(responseType),
      allowedTopics,
      restrictedTopics,
      guidelines: this.getGuidelinesForResponseType(responseType),
      exampleResponses: [],
    };

    AIResponseGuideSchema.parse(guide);
    this.responseGuides.set(guide.id, guide);

    return guide;
  }

  /**
   * Get required disclaimer for response type
   */
  private getRequiredDisclaimer(responseType: ResponseType): string {
    const disclaimerMap: Record<ResponseType, string> = {
      advice: "This is AI-generated educational content, not professional advice.",
      information: "This is AI-generated information for educational purposes.",
      educational: "This is AI-generated educational content.",
      entertainment: "This is AI-generated content for entertainment purposes.",
      tool: "This is an AI-powered tool for educational use.",
    };

    return disclaimerMap[responseType];
  }

  /**
   * Get guidelines for response type
   */
  private getGuidelinesForResponseType(responseType: ResponseType): string[] {
    const guidelinesMap: Record<ResponseType, string[]> = {
      advice: [
        "Always start with disclaimer",
        "Recommend professional consultation",
        "Provide multiple perspectives",
        "End with AI-generated notice",
      ],
      information: [
        "Provide accurate information",
        "Include sources",
        "Acknowledge limitations",
        "End with AI-generated notice",
      ],
      educational: [
        "Include learning objectives",
        "Provide examples",
        "Encourage questions",
        "End with AI-generated notice",
      ],
      entertainment: [
        "Clearly mark as entertainment",
        "Avoid misleading content",
        "Include disclaimers",
        "End with AI-generated notice",
      ],
      tool: [
        "Explain tool functionality",
        "Provide usage guidelines",
        "Include limitations",
        "End with AI-generated notice",
      ],
    };

    return guidelinesMap[responseType];
  }

  /**
   * Record user consent
   */
  recordUserConsent(
    userId: string,
    consentType: "terms_of_service" | "privacy_policy" | "educational_use" | "data_collection",
    accepted: boolean,
    version: string = "1.0"
  ): UserConsent {
    const consent: UserConsent = {
      userId,
      consentType,
      accepted,
      timestamp: new Date(),
      version,
    };

    UserConsentSchema.parse(consent);

    const consents = this.userConsents.get(userId) || [];
    consents.push(consent);
    this.userConsents.set(userId, consents);

    return consent;
  }

  /**
   * Check if user has given required consent
   */
  hasUserConsent(userId: string, consentType: string): boolean {
    const consents = this.userConsents.get(userId) || [];
    return consents.some((c) => c.consentType === consentType && c.accepted);
  }

  /**
   * Record ethical violation
   */
  recordViolation(
    principle: EthicalPrinciple,
    severity: "low" | "medium" | "high" | "critical",
    description: string,
    evidence: string
  ): EthicalViolation {
    const violation: EthicalViolation = {
      id: `ev-${Date.now()}-${Math.random()}`,
      principle,
      severity,
      description,
      evidence,
      timestamp: new Date(),
      resolved: false,
    };

    this.violations.push(violation);
    return violation;
  }

  /**
   * Conduct ethical audit
   */
  conductAudit(aiAgentId: string): EthicalAudit {
    const principlesChecked: EthicalPrinciple[] = Array.from(this.guidelines.keys()).map(
      (key) => this.guidelines.get(key)!.principle
    );

    const recentViolations = this.violations.filter(
      (v) => !v.resolved && v.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const score = Math.max(0, 100 - recentViolations.length * 10);
    const status = score >= 90 ? "passed" : score >= 70 ? "warning" : "failed";

    const audit: EthicalAudit = {
      id: `ea-${Date.now()}-${Math.random()}`,
      aiAgentId,
      timestamp: new Date(),
      principlesChecked,
      violations: recentViolations,
      score,
      recommendations: this.generateRecommendations(recentViolations),
      status,
    };

    this.audits.push(audit);
    return audit;
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: EthicalViolation[]): string[] {
    const recommendations: string[] = [];

    if (violations.some((v) => v.principle === "transparency")) {
      recommendations.push("Improve transparency in AI responses");
    }

    if (violations.some((v) => v.principle === "privacy")) {
      recommendations.push("Review and strengthen privacy practices");
    }

    if (violations.some((v) => v.principle === "no_harm")) {
      recommendations.push("Enhance content filtering and safety measures");
    }

    if (violations.some((v) => v.severity === "critical")) {
      recommendations.push("Conduct immediate security review");
    }

    return recommendations;
  }

  /**
   * Get all guidelines
   */
  getGuidelines(): EthicalGuideline[] {
    return Array.from(this.guidelines.values());
  }

  /**
   * Get compliance status
   */
  getComplianceStatus(): Map<string, ComplianceRequirement> {
    return this.complianceRequirements;
  }

  /**
   * Get recent audits
   */
  getRecentAudits(limit: number = 10): EthicalAudit[] {
    return this.audits.slice(-limit);
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalGuidelines: number;
    totalViolations: number;
    resolvedViolations: number;
    complianceScore: number;
  } {
    const totalViolations = this.violations.length;
    const resolvedViolations = this.violations.filter((v) => v.resolved).length;
    const complianceScore = Math.max(0, 100 - (totalViolations - resolvedViolations) * 5);

    return {
      totalGuidelines: this.guidelines.size,
      totalViolations,
      resolvedViolations,
      complianceScore,
    };
  }
}

export default EthicalGuidelinesSystem;
