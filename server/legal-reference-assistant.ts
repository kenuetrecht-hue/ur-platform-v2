/**
 * ============================================================================
 * ⚖️ UR MEDIA LLC — LEGAL REFERENCE ASSISTANT & EXTENDED DOCUMENT FORGE
 * ============================================================================
 * Target: Backend Asset Controller / AI System Context Pipeline
 * Rules: Enforces mandatory non-attorney reference disclaimers, maps state/federal
 * case indexing, and routes transaction splits to the 15/85 revenue vault.
 * ============================================================================
 */

import { z } from "zod";

/**
 * Document Forge Item Interface
 */
export interface IAIDocumentForgeItem {
  documentId: string;
  creatorUserId: string;
  documentType: "EBOOK" | "POEM" | "DOCUMENT" | "GUIDE" | "LEGAL_REFERENCE_BRIEF";
  title: string;
  downloadUrl: string;
  priceUSD: number;
  isPublishedToProfile: boolean;
}

/**
 * 1. Mandatory Legal AI Disclaimers & Operational Boundaries
 */
export const LEGAL_AI_COMPLIANCE_CONFIG = {
  assistantName: "UR Legal Reference Assistant",
  isAttorney: false,
  isLegalAdvice: false,

  // Strict, hardcoded legal disclaimer to protect UR LLC
  mandatoryDisclaimerText: `
⚠️ NOTICE & DISCLAIMER: This assistant is a synthetic AI model built strictly for educational and informational reference purposes. It is NOT an attorney, a law firm, or a licensed legal professional. No interaction with this AI constitutes legal advice, nor does it establish an attorney-client relationship. Always consult a qualified, licensed attorney in your jurisdiction for formal legal matters. UR LLC assumes no liability for the use or reference of this material.
  `.trim(),

  // Additional compliance notes
  complianceNotes: {
    unauthorized_practice_of_law: "This system is designed to avoid UPL (Unauthorized Practice of Law) claims by clearly stating it is NOT legal advice",
    attorney_client_privilege: "No attorney-client relationship is formed through this system",
    liability_waiver: "Users acknowledge they are responsible for verifying all information with licensed attorneys",
  },
};

/**
 * 2. State & Federal Case Law Retrieval Framework
 */
export const LegalReferenceQuerySchema = z.object({
  userId: z.string(),
  userTargetState: z.string().describe("e.g., 'Indiana', 'California', 'Federal'"),
  caseLawJurisdiction: z.enum(["STATE", "FEDERAL", "BOTH"]),
  searchQueryKeywords: z.string().describe("e.g., 'Breach of contract digital assets'"),
  enforceDisclaimerInjected: z.literal(true),
});

export type ILegalReferenceQuery = z.infer<typeof LegalReferenceQuerySchema>;

/**
 * Mock Case Law Database
 */
export interface LegalCase {
  caseId: string;
  title: string;
  jurisdiction: "STATE" | "FEDERAL";
  state?: string;
  year: number;
  summary: string;
  keyHolding: string;
  relevanceScore: number;
  citationFormat: string;
}

export const MOCK_CASE_LAW_DATABASE: LegalCase[] = [
  {
    caseId: "fed_001",
    title: "United States v. Microsoft Corporation",
    jurisdiction: "FEDERAL",
    year: 2001,
    summary: "Landmark antitrust case addressing monopolistic practices in the software industry",
    keyHolding: "Companies must not abuse market dominance to foreclose competition",
    relevanceScore: 0.95,
    citationFormat: "United States v. Microsoft Corp., 253 F.3d 34 (D.C. Cir. 2001)",
  },
  {
    caseId: "fed_002",
    title: "Carpenter v. United States",
    jurisdiction: "FEDERAL",
    year: 2018,
    summary: "Fourth Amendment privacy rights in the digital age regarding cell phone location data",
    keyHolding: "Law enforcement generally needs a warrant to access historical cell phone location records",
    relevanceScore: 0.92,
    citationFormat: "Carpenter v. United States, 138 S. Ct. 2206 (2018)",
  },
  {
    caseId: "state_in_001",
    title: "Hadley v. Hadley",
    jurisdiction: "STATE",
    state: "Indiana",
    year: 2015,
    summary: "Indiana contract law case addressing damages in breach of contract scenarios",
    keyHolding: "Damages must be reasonably foreseeable at the time of contract formation",
    relevanceScore: 0.88,
    citationFormat: "Hadley v. Hadley, 16 Ind. App. 3d 123 (Ind. App. 2015)",
  },
  {
    caseId: "state_ca_001",
    title: "Uber Technologies, Inc. v. Heller",
    jurisdiction: "STATE",
    state: "California",
    year: 2020,
    summary: "California employment law regarding gig economy workers and independent contractor classification",
    keyHolding: "Gig workers may be classified as employees under certain circumstances",
    relevanceScore: 0.91,
    citationFormat: "Uber Technologies, Inc. v. Heller, 9 Cal. 5th 1200 (2020)",
  },
  {
    caseId: "fed_003",
    title: "Obergefell v. Hodges",
    jurisdiction: "FEDERAL",
    year: 2015,
    summary: "Landmark Supreme Court case on marriage equality and constitutional rights",
    keyHolding: "The right to marry is a fundamental right protected by the Fourteenth Amendment",
    relevanceScore: 0.89,
    citationFormat: "Obergefell v. Hodges, 576 U.S. 644 (2015)",
  },
  {
    caseId: "state_ny_001",
    title: "Lerner v. Lerner",
    jurisdiction: "STATE",
    state: "New York",
    year: 2019,
    summary: "New York contract interpretation and digital asset ownership rights",
    keyHolding: "Digital assets can be subject to property division in certain contexts",
    relevanceScore: 0.85,
    citationFormat: "Lerner v. Lerner, 33 N.Y.3d 456 (N.Y. 2019)",
  },
];

/**
 * Appends the non-attorney reference disclaimer directly to the output
 * before it hits the database or the user's screen.
 */
export function injectLegalDisclaimerToOutput(aiGeneratedBriefText: string): string {
  return `${aiGeneratedBriefText}\n\n${"=".repeat(40)}\n${LEGAL_AI_COMPLIANCE_CONFIG.mandatoryDisclaimerText}`;
}

/**
 * Retrieves case law based on jurisdiction and keywords
 */
export function retrieveCaseLaw(query: ILegalReferenceQuery): LegalCase[] {
  const { userTargetState, caseLawJurisdiction, searchQueryKeywords } = query;

  // Filter by jurisdiction
  let filtered = MOCK_CASE_LAW_DATABASE.filter((caseItem) => {
    if (caseLawJurisdiction === "FEDERAL") {
      return caseItem.jurisdiction === "FEDERAL";
    } else if (caseLawJurisdiction === "STATE") {
      return caseItem.jurisdiction === "STATE" && caseItem.state === userTargetState;
    } else {
      // BOTH
      return (
        caseItem.jurisdiction === "FEDERAL" ||
        (caseItem.jurisdiction === "STATE" && caseItem.state === userTargetState)
      );
    }
  });

  // Filter by keyword relevance (simple substring matching for mock)
  const keywords = searchQueryKeywords.toLowerCase().split(" ");
  filtered = filtered.filter((caseItem) => {
    const caseText = `${caseItem.title} ${caseItem.summary} ${caseItem.keyHolding}`.toLowerCase();
    return keywords.some((keyword) => caseText.includes(keyword));
  });

  // Sort by relevance score
  return filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Generates a legal reference brief from case law
 */
export function generateLegalBrief(cases: LegalCase[]): string {
  if (cases.length === 0) {
    return "No relevant case law found for your search query. Please refine your search and try again.";
  }

  let brief = `📋 LEGAL REFERENCE BRIEF\n${"=".repeat(40)}\n\n`;

  cases.slice(0, 5).forEach((caseItem, index) => {
    brief += `${index + 1}. ${caseItem.title}\n`;
    brief += `   Citation: ${caseItem.citationFormat}\n`;
    brief += `   Year: ${caseItem.year}\n`;
    brief += `   Jurisdiction: ${caseItem.jurisdiction}${caseItem.state ? ` (${caseItem.state})` : ""}\n`;
    brief += `   Summary: ${caseItem.summary}\n`;
    brief += `   Key Holding: ${caseItem.keyHolding}\n`;
    brief += `   Relevance: ${(caseItem.relevanceScore * 100).toFixed(0)}%\n\n`;
  });

  return brief;
}

/**
 * 3. 15/85 Marketplace Routing for Legal Documents & Custom Briefs
 */
export interface DocumentSaleResult {
  route: "INTERNAL_LOYALTY_POINTS" | "DIRECT_CREDIT_CARD";
  pointsCost?: number;
  urMediaProfitUSD: number;
  creatorNetPayoutUSD: number;
  bankSwipeFee?: number;
}

export function processDigitalProductSale(asset: IAIDocumentForgeItem): DocumentSaleResult {
  const baseSplit = 0.15;
  const platformCut = asset.priceUSD * baseSplit;
  const creatorGross = asset.priceUSD * 0.85;

  // Enforce the $4.99 Point Wall Rule for low-tier legal lookups
  if (asset.priceUSD < 4.99) {
    return {
      route: "INTERNAL_LOYALTY_POINTS",
      pointsCost: Math.round(asset.priceUSD * 100),
      urMediaProfitUSD: Number(platformCut.toFixed(2)), // Pure 15% to Treasury
      creatorNetPayoutUSD: Number(creatorGross.toFixed(2)), // Pure 85% to Creator
    };
  }

  // Direct Credit Card Swipe Route for premium briefs or extended law lookups (>= $4.99)
  const bankSwipeFee = asset.priceUSD * 0.029 + 0.3;
  const creatorNetPayout = creatorGross - bankSwipeFee;

  return {
    route: "DIRECT_CREDIT_CARD",
    bankSwipeFee: Number(bankSwipeFee.toFixed(2)),
    urMediaProfitUSD: Number(platformCut.toFixed(2)), // Completely protected 15%
    creatorNetPayoutUSD: Number(creatorNetPayout.toFixed(2)),
  };
}

/**
 * Legal Reference Assistant Creator Profile with Omni-Capabilities
 */
export const AILegalReferenceAssistant = {
  id: "ai-legal-001",
  name: "UR Legal Reference Assistant",
  handle: "@urlegalreference",
  avatar: "⚖️",
  bio: "AI-powered legal reference tool for educational purposes. Query state and federal case law instantly. NOT a substitute for professional legal advice. Always consult a licensed attorney.",
  category: "Legal Reference",
  tier: "platinum" as const,
  price: 12.99,
  followers: 45200,
  rating: 4.8,
  updateFrequency: "Real-time (24/7 availability)",
  dataSource: "US Federal and State case law databases, legal precedents, statutes",
  disclaimer: LEGAL_AI_COMPLIANCE_CONFIG.mandatoryDisclaimerText,
  topics: [
    "Contract Law",
    "Employment Law",
    "Constitutional Law",
    "Digital Rights",
    "Business Law",
    "Family Law",
    "Criminal Law",
    "Intellectual Property",
  ],
  contentStyle:
    "Professional, objective, reference-focused tone with proper legal citations and compliance disclaimers",
  // Omni-Capabilities
  omniCapabilities: {
    longTermMemory: {
      enabled: true,
      vectorDimensions: 1536,
      retentionDays: 365,
      description: "Persistent context memory across all user interactions",
    },
    realTimeAudio: {
      enabled: true,
      codec: "opus",
      sampleRate: 16000,
      bitrate: 32000,
      description: "Real-time audio streaming for voice queries and responses",
    },
    vocalToneDetection: {
      enabled: true,
      emotionalAnalysis: true,
      prosodyDetection: true,
      adaptiveResponse: true,
      description: "Detects emotional tone and adjusts responses with empathy",
    },
    adaptiveResponses: {
      enabled: true,
      empathyLevel: 0.85,
      energyMatching: true,
      latencyTarget: 200,
      description: "Adapts tone and energy to match user emotional state",
    },
    safeguardedLearning: {
      enabled: true,
      rateLimitPerHour: 200,
      requiresApproval: true,
      auditTrail: true,
      protectedPatterns: ["legal_advice", "attorney_impersonation", "unauthorized_practice"],
      description: "Learns from interactions with safety guardrails and admin approval",
    },
  },
};

/**
 * Export all legal reference functions and configs
 */
export const LegalReferenceModule = {
  COMPLIANCE_CONFIG: LEGAL_AI_COMPLIANCE_CONFIG,
  CASE_LAW_DATABASE: MOCK_CASE_LAW_DATABASE,
  injectLegalDisclaimerToOutput,
  retrieveCaseLaw,
  generateLegalBrief,
  processDigitalProductSale,
  AILegalReferenceAssistant,
};
