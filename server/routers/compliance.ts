/**
 * Compliance Router
 * tRPC endpoints for accessing job-site specific codes, laws, and regulations
 * Allows AI agents to query compliance data based on location in real-time
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { LocationComplianceEngine } from "../location-compliance-engine";

// ============================================================================
// SCHEMAS
// ============================================================================

const LocationSchema = z.object({
  state: z.string(),
  county: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// ============================================================================
// ROUTER
// ============================================================================

const complianceEngine = new LocationComplianceEngine();

export const complianceRouter = router({
  /**
   * Get compliance documents for a specific location and field
   */
  getComplianceForLocation: publicProcedure
    .input(
      z.object({
        field: z.string().describe("AI field (attorney, electrician, contractor, etc.)"),
        location: LocationSchema.describe("Job site location"),
      })
    )
    .query(({ input }: any) => {
      const docs = complianceEngine.getComplianceForLocation(input.field, input.location);
      return {
        field: input.field,
        location: input.location,
        documentsCount: docs.length,
        documents: docs.map((doc) => ({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          jurisdiction: doc.jurisdiction,
          summary: doc.summary,
          keyRequirements: doc.keyRequirements,
          penalties: doc.penalties,
          lastUpdated: doc.lastUpdated,
        })),
      };
    }),

  /**
   * Register AI with compliance profile
   */
  registerAICompliance: publicProcedure
    .input(
      z.object({
        aiId: z.string().describe("Unique AI identifier"),
        aiName: z.string().describe("AI display name"),
        field: z.string().describe("AI field of expertise"),
        locations: z.array(LocationSchema).describe("Operating locations"),
      })
    )
    .mutation(({ input }: any) => {
      const profile = complianceEngine.registerAICompliance(
        input.aiId,
        input.aiName,
        input.field,
        input.locations
      );

      return {
        success: true,
        aiId: profile.aiId,
        aiName: profile.aiName,
        field: profile.field,
        locationsCount: profile.locations.length,
        certificationsRequired: profile.certifications,
        licensingRequirements: profile.licensingRequirements,
        complianceScore: profile.complianceScore,
      };
    }),

  /**
   * Perform compliance check for AI
   */
  performComplianceCheck: publicProcedure
    .input(
      z.object({
        aiId: z.string().describe("AI identifier"),
        location: LocationSchema.describe("Location to check compliance for"),
      })
    )
    .mutation(async ({ input }: any) => {
      const check = complianceEngine.performComplianceCheck(input.aiId, input.location);

      return {
        checkId: check.id,
        aiId: check.aiId,
        location: check.location,
        timestamp: check.timestamp,
        documentsReviewed: check.documentsReviewed,
        status: check.status,
        issuesFound: check.issuesFound,
        recommendations: check.recommendations,
      };
    }),

  /**
   * Get AI compliance profile
   */
  getAIProfile: publicProcedure
    .input(z.object({ aiId: z.string() }))
    .query(({ input }: any) => {
      const profile = complianceEngine.getAIProfile(input.aiId);

      if (!profile) {
        return {
          success: false,
          error: "AI profile not found",
        };
      }

      return {
        success: true,
        aiId: profile.aiId,
        aiName: profile.aiName,
        field: profile.field,
        locations: profile.locations,
        certificationsRequired: profile.certifications,
        licensingRequirements: profile.licensingRequirements,
        complianceScore: profile.complianceScore,
        lastComplianceCheck: profile.lastComplianceCheck,
      };
    }),

  /**
   * Get compliance summary for AI
   */
  getComplianceSummary: publicProcedure
    .input(z.object({ aiId: z.string() }))
    .query(({ input }: any) => {
      const summary = complianceEngine.getComplianceSummary(input.aiId);

      if (!summary) {
        return {
          success: false,
          error: "AI profile not found",
        };
      }

      return {
        success: true,
        aiName: summary.aiName,
        field: summary.field,
        locations: summary.locations,
        complianceScore: summary.complianceScore,
        documentsCount: summary.documentsCount,
        certificationsRequired: summary.certificationsRequired,
        lastCheck: summary.lastCheck,
      };
    }),

  /**
   * Get all compliance documents for AI
   */
  getComplianceDocuments: publicProcedure
    .input(z.object({ aiId: z.string() }))
    .query(({ input }: any) => {
      const docs = complianceEngine.getComplianceDocuments(input.aiId);

      return {
        success: true,
        documentsCount: docs.length,
        documents: docs.map((doc) => ({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          jurisdiction: doc.jurisdiction,
          summary: doc.summary,
          keyRequirements: doc.keyRequirements,
          penalties: doc.penalties,
          references: doc.references,
          updateFrequency: doc.updateFrequency,
          lastUpdated: doc.lastUpdated,
        })),
      };
    }),

  /**
   * Get specific compliance document
   */
  getComplianceDocument: publicProcedure
    .input(z.object({ documentId: z.string() }))
    .query(({ input }: any) => {
      // This would query from database in production
      return {
        success: true,
        message: "Compliance document retrieved",
        documentId: input.documentId,
      };
    }),

  /**
   * Update AI locations
   */
  updateAILocations: publicProcedure
    .input(
      z.object({
        aiId: z.string(),
        locations: z.array(LocationSchema),
      })
    )
    .mutation(({ input }: any) => {
      try {
        complianceEngine.updateAILocations(input.aiId, input.locations);

        return {
          success: true,
          aiId: input.aiId,
          locationsUpdated: input.locations.length,
          message: "AI locations updated successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update locations",
        };
      }
    }),

  /**
   * Search compliance documents by keyword
   */
  searchCompliance: publicProcedure
    .input(
      z.object({
        field: z.string(),
        location: LocationSchema,
        keyword: z.string(),
      })
    )
    .query(({ input }: any) => {
      const docs = complianceEngine.getComplianceForLocation(input.field, input.location);

      const filtered = docs.filter(
        (doc) =>
          doc.title.toLowerCase().includes(input.keyword.toLowerCase()) ||
          doc.summary.toLowerCase().includes(input.keyword.toLowerCase()) ||
          doc.keyRequirements.some((req) =>
            req.toLowerCase().includes(input.keyword.toLowerCase())
          )
      );

      return {
        success: true,
        keyword: input.keyword,
        resultsCount: filtered.length,
        results: filtered.map((doc) => ({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          jurisdiction: doc.jurisdiction,
          summary: doc.summary,
          keyRequirements: doc.keyRequirements,
        })),
      };
    }),

  /**
   * Get certifications required for field
   */
  getCertificationsForField: publicProcedure
    .input(z.object({ field: z.string() }))
    .query(({ input }: any) => {
      const certMap: Record<string, string[]> = {
        electrician: ["EPA Section 608", "OSHA 30-Hour", "State Electrical License"],
        hvac: ["EPA Section 608", "HVAC License", "Refrigerant Certification"],
        plumber: ["Plumbing License", "Backflow Certification", "Gas Fitting License"],
        attorney: ["Bar License", "Continuing Legal Education"],
        contractor: ["General Contractor License", "OSHA Certification"],
        realtor: ["Real Estate License", "Fair Housing Training"],
        landscaper: ["Pesticide Applicator License", "Landscape Contractor License"],
        coder: ["Security Certification", "Code Review Certification"],
        marketing: ["Digital Marketing Certification", "Analytics Certification"],
        finance: ["Financial Advisor License", "CPA Certification"],
        hr: ["HR Certification", "Employment Law Certification"],
        sales: ["Sales Certification", "Negotiation Training"],
        operations: ["Operations Management Certification"],
        customer_service: ["Customer Service Certification"],
        product: ["Product Management Certification"],
        content_creator: ["Content Creation Certification"],
      };

      const certs = certMap[input.field.toLowerCase()] || [];

      return {
        success: true,
        field: input.field,
        certificationsCount: certs.length,
        certifications: certs,
      };
    }),

  /**
   * Get licensing requirements for field
   */
  getLicensingRequirements: publicProcedure
    .input(z.object({ field: z.string() }))
    .query(({ input }: any) => {
      const licenseMap: Record<string, string[]> = {
        electrician: [
          "4-year apprenticeship",
          "2000 hours per year",
          "Pass state exam",
          "Maintain continuing education",
        ],
        attorney: [
          "Law degree (JD)",
          "Pass bar exam",
          "Character and fitness review",
          "Continuing legal education",
        ],
        contractor: [
          "Experience requirement",
          "Pass contractor exam",
          "Bonding and insurance",
          "License renewal",
        ],
        realtor: [
          "Pre-license course",
          "Pass state exam",
          "Broker sponsorship",
          "Continuing education",
        ],
        hvac: [
          "EPA Section 608 certification",
          "HVAC training",
          "State license",
          "Continuing education",
        ],
        plumber: [
          "Apprenticeship",
          "Journeyman exam",
          "Master exam",
          "License renewal",
        ],
      };

      const requirements = licenseMap[input.field.toLowerCase()] || [];

      return {
        success: true,
        field: input.field,
        requirementsCount: requirements.length,
        requirements,
      };
    }),

  /**
   * Get compliance check results
   */
  getComplianceCheckResults: publicProcedure
    .input(z.object({ checkId: z.string() }))
    .query(({ input }: any) => {
      const check = complianceEngine.getComplianceCheckResults(input.checkId);

      if (!check) {
        return {
          success: false,
          error: "Compliance check not found",
        };
      }

      return {
        success: true,
        checkId: check.id,
        aiId: check.aiId,
        location: check.location,
        timestamp: check.timestamp,
        documentsReviewed: check.documentsReviewed,
        status: check.status,
        issuesFound: check.issuesFound,
        recommendations: check.recommendations,
      };
    }),

  /**
   * Get compliance statistics
   */
  getComplianceStatistics: publicProcedure.query(() => {
    return {
      success: true,
      statistics: {
        totalAIAgents: 14,
        fieldsSupported: 14,
        statesSupported: 50,
        complianceDocuments: 100,
        certificationsAvailable: 45,
        lastUpdated: new Date(),
      },
    };
  }),
});

// ============================================================================
// EXPORTS
// ============================================================================

export type ComplianceRouter = typeof complianceRouter;
