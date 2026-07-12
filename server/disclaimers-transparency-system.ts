/**
 * Educational Disclaimers & Transparency System
 * Ensures all AI responses include proper disclaimers
 * Maintains transparency about AI-generated content and limitations
 * Provides Terms of Service and Privacy Policy
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DisclaimerType = 
  | "general_ai"
  | "financial_advice"
  | "medical_advice"
  | "legal_advice"
  | "professional_services"
  | "educational_content"
  | "entertainment";

export type TransparencyLevel = "full" | "standard" | "minimal";

export interface Disclaimer {
  id: string;
  type: DisclaimerType;
  title: string;
  content: string;
  requiredBefore: boolean;
  requiredAfter: boolean;
  displayOrder: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIResponseWrapper {
  id: string;
  originalResponse: string;
  disclaimers: Disclaimer[];
  transparency: {
    isAIGenerated: boolean;
    confidenceLevel: number; // 0-1
    limitations: string[];
    sources: string[];
  };
  wrappedResponse: string;
  timestamp: Date;
}

export interface TermsOfService {
  id: string;
  version: string;
  lastUpdated: Date;
  sections: TermsSection[];
  acceptanceRequired: boolean;
}

export interface TermsSection {
  id: string;
  title: string;
  content: string;
  order: number;
  critical: boolean;
}

export interface PrivacyPolicy {
  id: string;
  version: string;
  lastUpdated: Date;
  sections: PrivacySection[];
  acceptanceRequired: boolean;
}

export interface PrivacySection {
  id: string;
  title: string;
  content: string;
  order: number;
  dataTypes?: string[];
}

export interface UserAgreement {
  userId: string;
  tosVersion: string;
  privacyVersion: string;
  acceptedAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface TransparencyReport {
  id: string;
  timestamp: Date;
  totalResponses: number;
  disclaimersIncluded: number;
  disclaimerCoverage: number; // percentage
  averageConfidenceLevel: number;
  responsesWithSources: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const DisclaimerSchema = z.object({
  id: z.string(),
  type: z.enum([
    "general_ai", "financial_advice", "medical_advice", "legal_advice",
    "professional_services", "educational_content", "entertainment"
  ]),
  title: z.string().min(1),
  content: z.string().min(1),
  requiredBefore: z.boolean(),
  requiredAfter: z.boolean(),
  displayOrder: z.number().nonnegative(),
  enabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const AIResponseWrapperSchema = z.object({
  id: z.string(),
  originalResponse: z.string(),
  disclaimers: z.array(DisclaimerSchema),
  transparency: z.object({
    isAIGenerated: z.boolean(),
    confidenceLevel: z.number().min(0).max(1),
    limitations: z.array(z.string()),
    sources: z.array(z.string()),
  }),
  wrappedResponse: z.string(),
  timestamp: z.date(),
});

const UserAgreementSchema = z.object({
  userId: z.string(),
  tosVersion: z.string(),
  privacyVersion: z.string(),
  acceptedAt: z.date(),
  ipAddress: z.string(),
  userAgent: z.string(),
});

// ============================================================================
// DISCLAIMERS & TRANSPARENCY SYSTEM
// ============================================================================

export class DisclaimersTransparencySystem {
  private disclaimers: Map<string, Disclaimer> = new Map();
  private termsOfService: TermsOfService | null = null;
  private privacyPolicy: PrivacyPolicy | null = null;
  private userAgreements: Map<string, UserAgreement[]> = new Map();
  private responseWrappers: AIResponseWrapper[] = [];
  private reports: TransparencyReport[] = [];

  constructor() {
    this.initializeDefaultDisclaimers();
    this.initializeTermsOfService();
    this.initializePrivacyPolicy();
  }

  /**
   * Initialize default disclaimers
   */
  private initializeDefaultDisclaimers(): void {
    const disclaimers: Disclaimer[] = [
      {
        id: "disc-general-ai",
        type: "general_ai",
        title: "AI-Generated Content Notice",
        content:
          "This response is AI-generated. While we strive for accuracy, AI systems can make mistakes. " +
          "Please verify important information independently before relying on it.",
        requiredBefore: false,
        requiredAfter: true,
        displayOrder: 1,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "disc-financial",
        type: "financial_advice",
        title: "Financial Disclaimer",
        content:
          "⚠️ IMPORTANT: This is NOT financial advice. This content is for educational purposes only. " +
          "Consult a qualified financial advisor before making investment decisions. Past performance " +
          "does not guarantee future results. All investments carry risk, including potential loss of principal.",
        requiredBefore: true,
        requiredAfter: true,
        displayOrder: 2,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "disc-medical",
        type: "medical_advice",
        title: "Medical Disclaimer",
        content:
          "⚠️ IMPORTANT: This is NOT medical advice. This content is for educational purposes only. " +
          "The application owner is not a doctor or medical professional. Always consult a licensed " +
          "healthcare provider for medical concerns. Do not delay seeking professional medical advice.",
        requiredBefore: true,
        requiredAfter: true,
        displayOrder: 3,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "disc-legal",
        type: "legal_advice",
        title: "Legal Disclaimer",
        content:
          "⚠️ IMPORTANT: This is NOT legal advice. This content is for educational purposes only. " +
          "The application owner is not a lawyer. Consult a licensed attorney for legal matters. " +
          "Laws vary by jurisdiction and situation.",
        requiredBefore: true,
        requiredAfter: true,
        displayOrder: 4,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "disc-professional",
        type: "professional_services",
        title: "Professional Services Disclaimer",
        content:
          "⚠️ IMPORTANT: This app does not provide professional services. The application owner does not " +
          "claim to be a doctor, lawyer, accountant, or other licensed professional. For professional " +
          "services, consult qualified professionals in your jurisdiction.",
        requiredBefore: true,
        requiredAfter: false,
        displayOrder: 5,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "disc-educational",
        type: "educational_content",
        title: "Educational Content Notice",
        content:
          "This content is provided for educational and learning purposes. It is designed to help users " +
          "build knowledge and skills for legitimate business and entrepreneurial endeavors.",
        requiredBefore: false,
        requiredAfter: false,
        displayOrder: 6,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "disc-entertainment",
        type: "entertainment",
        title: "Entertainment Content Notice",
        content:
          "This content is for entertainment purposes only. It should not be relied upon for making " +
          "important decisions or as a substitute for professional advice.",
        requiredBefore: false,
        requiredAfter: true,
        displayOrder: 7,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    disclaimers.forEach((disclaimer) => {
      DisclaimerSchema.parse(disclaimer);
      this.disclaimers.set(disclaimer.id, disclaimer);
    });
  }

  /**
   * Initialize Terms of Service
   */
  private initializeTermsOfService(): void {
    this.termsOfService = {
      id: "tos-1",
      version: "1.0",
      lastUpdated: new Date(),
      sections: [
        {
          id: "tos-1-1",
          title: "Acceptance of Terms",
          content:
            "By using this application, you agree to these Terms of Service. If you do not agree, " +
            "do not use the application.",
          order: 1,
          critical: true,
        },
        {
          id: "tos-1-2",
          title: "Educational Purpose",
          content:
            "This application is designed for educational and entrepreneurial purposes only. Users agree " +
            "to use the app only for legitimate, legal, and ethical purposes.",
          order: 2,
          critical: true,
        },
        {
          id: "tos-1-3",
          title: "AI-Generated Content",
          content:
            "Content generated by AI agents is for informational purposes. Users acknowledge that AI " +
            "can make mistakes and agree to verify important information independently.",
          order: 3,
          critical: true,
        },
        {
          id: "tos-1-4",
          title: "No Professional Advice",
          content:
            "The application owner does not provide professional services (medical, legal, financial, etc.). " +
            "Users must consult qualified professionals for such services.",
          order: 4,
          critical: true,
        },
        {
          id: "tos-1-5",
          title: "User Responsibility",
          content:
            "Users are responsible for their use of the application and any consequences thereof. " +
            "The application owner is not liable for user-generated content or third-party interactions.",
          order: 5,
          critical: true,
        },
        {
          id: "tos-1-6",
          title: "Prohibited Uses",
          content:
            "Users agree not to use the application for: illegal activities, harassment, fraud, " +
            "violence, exploitation, or any harmful purposes. Violations will result in account suspension or ban.",
          order: 6,
          critical: true,
        },
        {
          id: "tos-1-7",
          title: "Limitation of Liability",
          content:
            "The application owner is not liable for any damages arising from use of the application, " +
            "including but not limited to: financial losses, business interruption, or data loss.",
          order: 7,
          critical: false,
        },
        {
          id: "tos-1-8",
          title: "Third-Party Transactions",
          content:
            "The application owner is not liable for any financial issues or lawsuits arising from " +
            "interactions between users or third-party transactions. Users assume all responsibility.",
          order: 8,
          critical: false,
        },
      ],
      acceptanceRequired: true,
    };
  }

  /**
   * Initialize Privacy Policy
   */
  private initializePrivacyPolicy(): void {
    this.privacyPolicy = {
      id: "pp-1",
      version: "1.0",
      lastUpdated: new Date(),
      sections: [
        {
          id: "pp-1-1",
          title: "Data Collection",
          content:
            "We collect user activity data to improve the application and detect abuse. Data is collected " +
            "with user consent and in accordance with applicable laws.",
          order: 1,
          dataTypes: ["activity_logs", "user_preferences"],
        },
        {
          id: "pp-1-2",
          title: "Data Usage",
          content:
            "User data is used to: improve AI agents, detect abuse, provide personalized experiences, " +
            "and comply with legal obligations.",
          order: 2,
          dataTypes: ["activity_logs", "preferences"],
        },
        {
          id: "pp-1-3",
          title: "Data Protection",
          content:
            "We implement security measures to protect user data. However, no system is completely secure. " +
            "Users should use strong passwords and protect their accounts.",
          order: 3,
          dataTypes: ["all"],
        },
        {
          id: "pp-1-4",
          title: "Data Retention",
          content:
            "User data is retained as long as necessary to provide services. Users can request data deletion " +
            "in accordance with applicable laws.",
          order: 4,
          dataTypes: ["all"],
        },
        {
          id: "pp-1-5",
          title: "User Rights",
          content:
            "Users have the right to: access their data, correct inaccuracies, request deletion, " +
            "and opt-out of certain data collection (where applicable).",
          order: 5,
          dataTypes: ["all"],
        },
        {
          id: "pp-1-6",
          title: "Third-Party Sharing",
          content:
            "We do not sell user data. Data may be shared with service providers under strict confidentiality " +
            "agreements and only as necessary to provide services.",
          order: 6,
          dataTypes: ["all"],
        },
      ],
      acceptanceRequired: true,
    };
  }

  /**
   * Wrap AI response with disclaimers and transparency info
   */
  wrapAIResponse(
    originalResponse: string,
    responseType: DisclaimerType,
    options?: {
      confidenceLevel?: number;
      limitations?: string[];
      sources?: string[];
    }
  ): AIResponseWrapper {
    // Get required disclaimers
    const requiredDisclaimers = Array.from(this.disclaimers.values()).filter(
      (d) => d.enabled && (d.type === responseType || d.type === "general_ai")
    );

    // Build wrapped response
    let wrappedResponse = originalResponse;

    // Add before disclaimers
    const beforeDisclaimers = requiredDisclaimers.filter((d) => d.requiredBefore);
    if (beforeDisclaimers.length > 0) {
      const disclaimerText = beforeDisclaimers
        .map((d) => `**${d.title}**\n${d.content}`)
        .join("\n\n");
      wrappedResponse = `${disclaimerText}\n\n---\n\n${wrappedResponse}`;
    }

    // Add after disclaimers
    const afterDisclaimers = requiredDisclaimers.filter((d) => d.requiredAfter);
    if (afterDisclaimers.length > 0) {
      const disclaimerText = afterDisclaimers
        .map((d) => `**${d.title}**\n${d.content}`)
        .join("\n\n");
      wrappedResponse = `${wrappedResponse}\n\n---\n\n${disclaimerText}`;
    }

    const wrapper: AIResponseWrapper = {
      id: `arw-${Date.now()}-${Math.random()}`,
      originalResponse,
      disclaimers: requiredDisclaimers,
      transparency: {
        isAIGenerated: true,
        confidenceLevel: options?.confidenceLevel || 0.8,
        limitations: options?.limitations || [
          "AI can make mistakes",
          "Information may be outdated",
          "Context-dependent accuracy",
        ],
        sources: options?.sources || [],
      },
      wrappedResponse,
      timestamp: new Date(),
    };

    AIResponseWrapperSchema.parse(wrapper);
    this.responseWrappers.push(wrapper);

    return wrapper;
  }

  /**
   * Record user agreement
   */
  recordUserAgreement(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): UserAgreement {
    if (!this.termsOfService || !this.privacyPolicy) {
      throw new Error("Terms and Privacy Policy not initialized");
    }

    const agreement: UserAgreement = {
      userId,
      tosVersion: this.termsOfService.version,
      privacyVersion: this.privacyPolicy.version,
      acceptedAt: new Date(),
      ipAddress,
      userAgent,
    };

    UserAgreementSchema.parse(agreement);

    const agreements = this.userAgreements.get(userId) || [];
    agreements.push(agreement);
    this.userAgreements.set(userId, agreements);

    return agreement;
  }

  /**
   * Check if user has accepted current terms
   */
  hasUserAcceptedTerms(userId: string): boolean {
    if (!this.termsOfService || !this.privacyPolicy) return false;

    const agreements = this.userAgreements.get(userId) || [];
    return agreements.some(
      (a) =>
        a.tosVersion === this.termsOfService!.version &&
        a.privacyVersion === this.privacyPolicy!.version
    );
  }

  /**
   * Get Terms of Service
   */
  getTermsOfService(): TermsOfService | null {
    return this.termsOfService;
  }

  /**
   * Get Privacy Policy
   */
  getPrivacyPolicy(): PrivacyPolicy | null {
    return this.privacyPolicy;
  }

  /**
   * Generate transparency report
   */
  generateTransparencyReport(): TransparencyReport {
    const totalResponses = this.responseWrappers.length;
    const disclaimersIncluded = this.responseWrappers.filter(
      (r) => r.disclaimers.length > 0
    ).length;
    const disclaimerCoverage = totalResponses > 0 ? (disclaimersIncluded / totalResponses) * 100 : 0;
    const averageConfidenceLevel =
      totalResponses > 0
        ? this.responseWrappers.reduce((sum, r) => sum + r.transparency.confidenceLevel, 0) /
          totalResponses
        : 0;
    const responsesWithSources = this.responseWrappers.filter(
      (r) => r.transparency.sources.length > 0
    ).length;

    const report: TransparencyReport = {
      id: `tr-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      totalResponses,
      disclaimersIncluded,
      disclaimerCoverage,
      averageConfidenceLevel,
      responsesWithSources,
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalDisclaimers: number;
    totalResponses: number;
    averageDisclaimersPerResponse: number;
    averageConfidenceLevel: number;
  } {
    const totalDisclaimers = this.disclaimers.size;
    const totalResponses = this.responseWrappers.length;
    const averageDisclaimersPerResponse =
      totalResponses > 0
        ? this.responseWrappers.reduce((sum, r) => sum + r.disclaimers.length, 0) / totalResponses
        : 0;
    const averageConfidenceLevel =
      totalResponses > 0
        ? this.responseWrappers.reduce((sum, r) => sum + r.transparency.confidenceLevel, 0) /
          totalResponses
        : 0;

    return {
      totalDisclaimers,
      totalResponses,
      averageDisclaimersPerResponse,
      averageConfidenceLevel,
    };
  }
}

export default DisclaimersTransparencySystem;
