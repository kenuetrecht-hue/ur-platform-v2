/**
 * ============================================================================
 * ⚖️ UR MEDIA LLC — AI FORGE CORE ENGINE (PRODUCTION FINAL WITH LEGAL & DISCOUNTS)
 * ============================================================================
 * Services: Document Forge, US State/Federal Legal Reference, Content Marketplace
 * Rules:
 * - Strict 15/85 Gross Revenue Split (UR Media cut is 100% insulated).
 * - Purchases < $4.99 forced into internal Loyalty Points.
 * - Verified Content Creators get a 50% DISCOUNT on all AI premium service fees.
 * - Non-Attorney compliance disclaimer strictly hardcoded into legal lookups.
 * ============================================================================
 */

import { z } from "zod";

export const UR_FORGE_GLOBAL_CONFIG = {
  urPlatformCutPercentage: 0.15,
  creatorGrossSharePercentage: 0.85,
  pointWallCutoffUSD: 4.99,
  pointsPerDollar: 100,
  creatorAIFeeDiscountMultiplier: 0.50, // 50% Off for verified talent
};

// 1. Legal Compliance Content
export const LEGAL_AI_COMPLIANCE = {
  mandatoryDisclaimerText: `
⚠️ NOTICE & DISCLAIMER: This assistant is a synthetic AI model built strictly for educational and informational reference purposes. It is NOT an attorney, a law firm, or a licensed legal professional. No interaction with this AI constitutes legal advice, nor does it establish an attorney-client relationship. Always consult a qualified, licensed attorney in your jurisdiction for formal legal matters. UR LLC assumes no liability for the use or reference of this material.
  `.trim(),
};

export interface IPlatformUser {
  userId: string;
  isVerifiedCreator: boolean; // Flag to determine 50% off eligibility
  userPointWalletBalance: number;
}

export interface IAIForgeService {
  serviceId: string;
  serviceName: string; // e.g., "Legal Case Reference Lookup", "eBook Chapter Draft"
  standardPriceInPoints: number; // Standard price for a standard surfer
}

/**
 * PHASE 1: Calculating the Cost for a User or Creator to USE the AI Tools
 */
export function calculateAIServiceCost(
  user: IPlatformUser,
  service: IAIForgeService
): { finalCostInPoints: number; isDiscountApplied: boolean } {
  if (user.isVerifiedCreator) {
    const discountedCost =
      service.standardPriceInPoints *
      UR_FORGE_GLOBAL_CONFIG.creatorAIFeeDiscountMultiplier;
    return {
      finalCostInPoints: Math.ceil(discountedCost),
      isDiscountApplied: true,
    };
  }

  return {
    finalCostInPoints: service.standardPriceInPoints,
    isDiscountApplied: false,
  };
}

/**
 * PHASE 2: Injecting Legal Safeguards into Output
 */
export function injectLegalDisclaimerToOutput(aiGeneratedBriefText: string): string {
  return `${aiGeneratedBriefText}\n\n========================================\n${LEGAL_AI_COMPLIANCE.mandatoryDisclaimerText}`;
}

/**
 * PHASE 3: Processing Marketplace Sales Splits When Products are Sold to the Public
 */
export function processMarketplaceProductSale(assetPriceUSD: number) {
  const corporateTake =
    assetPriceUSD * UR_FORGE_GLOBAL_CONFIG.urPlatformCutPercentage;
  const creatorGross =
    assetPriceUSD * UR_FORGE_GLOBAL_CONFIG.creatorGrossSharePercentage;

  // Gate A: Points Wallet Route (Purchases < $4.99)
  if (assetPriceUSD < UR_FORGE_GLOBAL_CONFIG.pointWallCutoffUSD) {
    return {
      success: true,
      paymentMethod: "INTERNAL_LOYALTY_POINTS",
      pointsCost: assetPriceUSD * UR_FORGE_GLOBAL_CONFIG.pointsPerDollar,
      urMediaNetProfitUSD: Number(corporateTake.toFixed(2)), // Pure 15% to Treasury
      creatorNetPayoutUSD: Number(creatorGross.toFixed(2)), // Pure 85% to Creator
    };
  }

  // Gate B: Direct Credit Card Route (Purchases >= $4.99 - Fees from Creator Share)
  const bankSwipeFee = assetPriceUSD * 0.029 + 0.3;
  const creatorNetTakeHome = creatorGross - bankSwipeFee;

  return {
    success: true,
    paymentMethod: "DIRECT_CREDIT_CARD",
    urMediaNetProfitUSD: Number(corporateTake.toFixed(2)), // 100% Protected 15%
    creatorNetPayoutUSD: Number(creatorNetTakeHome.toFixed(2)),
  };
}

/**
 * Zod Schemas for Validation
 */
export const PlatformUserSchema = z.object({
  userId: z.string(),
  isVerifiedCreator: z.boolean(),
  userPointWalletBalance: z.number().min(0),
});

export const AIForgeServiceSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  standardPriceInPoints: z.number().min(0),
});

export const AIServiceCostSchema = z.object({
  finalCostInPoints: z.number(),
  isDiscountApplied: z.boolean(),
});

export const MarketplaceSaleSchema = z.object({
  success: z.boolean(),
  paymentMethod: z.enum(["INTERNAL_LOYALTY_POINTS", "DIRECT_CREDIT_CARD"]),
  pointsCost: z.number().optional(),
  urMediaNetProfitUSD: z.number(),
  creatorNetPayoutUSD: z.number(),
  bankSwipeFee: z.number().optional(),
});

/**
 * Pre-defined AI Forge Services
 */
export const AI_FORGE_SERVICES: Record<string, IAIForgeService> = {
  LEGAL_CASE_LOOKUP: {
    serviceId: "legal-case-001",
    serviceName: "Legal Case Reference Lookup",
    standardPriceInPoints: 500, // 5 dollars worth
  },
  EBOOK_CHAPTER_DRAFT: {
    serviceId: "ebook-draft-001",
    serviceName: "eBook Chapter Draft Generation",
    standardPriceInPoints: 1000, // 10 dollars worth
  },
  POETRY_COMPOSITION: {
    serviceId: "poetry-001",
    serviceName: "Poetry Composition Assistance",
    standardPriceInPoints: 300, // 3 dollars worth
  },
  MUSIC_COMPOSITION: {
    serviceId: "music-001",
    serviceName: "Music Composition with AI Creative Muse",
    standardPriceInPoints: 800, // 8 dollars worth
  },
  DOCUMENT_GENERATION: {
    serviceId: "document-001",
    serviceName: "Professional Document Generation",
    standardPriceInPoints: 600, // 6 dollars worth
  },
};

/**
 * Export all AI Forge functions and configs
 */
export const AIForgeEngine = {
  config: UR_FORGE_GLOBAL_CONFIG,
  compliance: LEGAL_AI_COMPLIANCE,
  calculateAIServiceCost,
  injectLegalDisclaimerToOutput,
  processMarketplaceProductSale,
  services: AI_FORGE_SERVICES,
};
