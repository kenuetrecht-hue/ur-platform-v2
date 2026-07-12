/**
 * Location-Aware Compliance Engine
 * Provides job-site specific codes, laws, and regulations based on location
 * Ensures each AI has access to relevant compliance information
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const ComplianceDocumentSchema = z.object({
  id: z.string(),
  type: z.enum([
    "building_code",
    "electrical_code",
    "plumbing_code",
    "safety_standard",
    "labor_law",
    "environmental_regulation",
    "licensing_requirement",
    "permit_requirement",
    "inspection_standard",
    "zoning_law",
    "fair_housing_law",
    "disclosure_requirement",
    "contract_law",
    "tax_regulation",
    "insurance_requirement",
  ] as const),
  title: z.string(),
  jurisdiction: z.string(), // State, county, city
  effectiveDate: z.date(),
  expirationDate: z.date().optional(),
  summary: z.string(),
  fullText: z.string(),
  keyRequirements: z.array(z.string()),
  penalties: z.array(z.string()),
  references: z.array(z.string()),
  updateFrequency: z.enum(["annual", "quarterly", "monthly", "as_needed"] as const),
  lastUpdated: z.date(),
});

const LocationSchema = z.object({
  state: z.string(),
  county: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const AIComplianceProfileSchema = z.object({
  aiId: z.string(),
  aiName: z.string(),
  field: z.string(),
  locations: z.array(LocationSchema),
  relevantCompliances: z.array(z.string()), // IDs of compliance documents
  certifications: z.array(z.string()),
  licensingRequirements: z.array(z.string()),
  lastComplianceCheck: z.date(),
  complianceScore: z.number().min(0).max(100),
});

const ComplianceCheckSchema = z.object({
  id: z.string(),
  aiId: z.string(),
  location: LocationSchema,
  timestamp: z.date(),
  documentsReviewed: z.number(),
  issuesFound: z.array(z.string()),
  recommendations: z.array(z.string()),
  status: z.enum(["compliant", "warning", "non_compliant"] as const),
});

// ============================================================================
// TYPES
// ============================================================================

type ComplianceDocument = z.infer<typeof ComplianceDocumentSchema>;
type Location = z.infer<typeof LocationSchema>;
type AIComplianceProfile = z.infer<typeof AIComplianceProfileSchema>;
type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

// ============================================================================
// COMPLIANCE DATABASE
// ============================================================================

const COMPLIANCE_DATABASE: Record<string, ComplianceDocument[]> = {
  attorney: [
    {
      id: "atty-ny-001",
      type: "contract_law",
      title: "New York Contract Law",
      jurisdiction: "New York",
      effectiveDate: new Date("2024-01-01"),
      summary: "Governs formation, interpretation, and enforcement of contracts",
      fullText: "New York contract law follows common law principles...",
      keyRequirements: [
        "Offer and acceptance",
        "Consideration",
        "Mutual intent",
        "Legal purpose",
      ],
      penalties: ["Breach damages", "Specific performance", "Injunctive relief"],
      references: ["NY UCC Article 2", "NY General Obligations Law"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
    {
      id: "atty-ny-002",
      type: "fair_housing_law",
      title: "New York Fair Housing Law",
      jurisdiction: "New York",
      effectiveDate: new Date("2024-01-01"),
      summary: "Prohibits discrimination in housing based on protected classes",
      fullText: "Protected classes include race, color, religion, sex...",
      keyRequirements: [
        "No discrimination in sales",
        "No discrimination in rentals",
        "Reasonable accommodations",
        "Service animal provisions",
      ],
      penalties: ["Civil penalties up to $10,000", "Damages", "Injunctive relief"],
      references: ["NY Executive Law Article 15", "Fair Housing Act"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
  ],
  electrician: [
    {
      id: "elec-ca-001",
      type: "electrical_code",
      title: "California Electrical Code (NEC 2023)",
      jurisdiction: "California",
      effectiveDate: new Date("2024-01-01"),
      summary: "National Electrical Code adopted by California",
      fullText: "The NEC establishes standards for safe electrical installation...",
      keyRequirements: [
        "Proper wire gauging",
        "Circuit protection",
        "Grounding requirements",
        "Arc fault protection",
      ],
      penalties: ["Code violations", "Failed inspections", "License suspension"],
      references: ["NFPA 70", "California Title 24"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
    {
      id: "elec-ca-002",
      type: "licensing_requirement",
      title: "California Electrician Licensing",
      jurisdiction: "California",
      effectiveDate: new Date("2024-01-01"),
      summary: "Requirements for becoming a licensed electrician in California",
      fullText: "California requires apprenticeship, exams, and experience...",
      keyRequirements: [
        "4-year apprenticeship",
        "2000 hours per year",
        "Pass state exam",
        "Maintain continuing education",
      ],
      penalties: ["Unlicensed practice fines", "Criminal charges", "Work stoppage"],
      references: ["California Code of Regulations Title 16"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
  ],
  contractor: [
    {
      id: "cont-tx-001",
      type: "building_code",
      title: "Texas Building Code (IBC 2021)",
      jurisdiction: "Texas",
      effectiveDate: new Date("2024-01-01"),
      summary: "International Building Code adopted by Texas",
      fullText: "Establishes minimum standards for building construction...",
      keyRequirements: [
        "Structural integrity",
        "Fire safety",
        "Accessibility compliance",
        "Energy efficiency",
      ],
      penalties: ["Code violations", "Failed inspections", "Demolition orders"],
      references: ["International Building Code", "Texas Property Code"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
    {
      id: "cont-tx-002",
      type: "permit_requirement",
      title: "Texas Construction Permits",
      jurisdiction: "Texas",
      effectiveDate: new Date("2024-01-01"),
      summary: "Permit requirements for construction projects",
      fullText: "Most construction projects require permits before work begins...",
      keyRequirements: [
        "Permit application",
        "Plan review",
        "Inspections",
        "Final approval",
      ],
      penalties: ["Unpermitted work fines", "Stop work orders", "Liens"],
      references: ["Texas Local Government Code"],
      updateFrequency: "quarterly",
      lastUpdated: new Date(),
    },
  ],
  realtor: [
    {
      id: "re-fl-001",
      type: "disclosure_requirement",
      title: "Florida Real Estate Disclosure Requirements",
      jurisdiction: "Florida",
      effectiveDate: new Date("2024-01-01"),
      summary: "Required disclosures in real estate transactions",
      fullText: "Sellers and agents must disclose known defects...",
      keyRequirements: [
        "Property condition disclosure",
        "Lead-based paint disclosure",
        "HOA disclosures",
        "Flood zone disclosure",
      ],
      penalties: ["Civil liability", "License suspension", "Damages"],
      references: ["Florida Statute 507.136", "Florida Statute 553.721"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
    {
      id: "re-fl-002",
      type: "licensing_requirement",
      title: "Florida Real Estate License Requirements",
      jurisdiction: "Florida",
      effectiveDate: new Date("2024-01-01"),
      summary: "Requirements for Florida real estate licensure",
      fullText: "Must complete education, pass exam, and maintain license...",
      keyRequirements: [
        "63-hour pre-license course",
        "Pass state exam",
        "Sponsorship by broker",
        "Continuing education",
      ],
      penalties: ["Unlicensed practice fines", "Criminal charges"],
      references: ["Florida Statute Chapter 475"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
  ],
  hvac: [
    {
      id: "hvac-epa-001",
      type: "environmental_regulation",
      title: "EPA Refrigerant Regulations",
      jurisdiction: "Federal",
      effectiveDate: new Date("2024-01-01"),
      summary: "EPA regulations for refrigerant handling and certification",
      fullText: "Technicians must be certified to handle refrigerants...",
      keyRequirements: [
        "EPA Section 608 certification",
        "Proper recovery procedures",
        "Leak repair requirements",
        "Record keeping",
      ],
      penalties: ["Fines up to $37,500 per violation", "License suspension"],
      references: ["Clean Air Act", "40 CFR Part 82"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
  ],
  landscaper: [
    {
      id: "land-ca-001",
      type: "environmental_regulation",
      title: "California Pesticide Regulations",
      jurisdiction: "California",
      effectiveDate: new Date("2024-01-01"),
      summary: "Regulations for pesticide application and licensing",
      fullText: "Pesticide applicators must be licensed and follow regulations...",
      keyRequirements: [
        "Applicator license",
        "Proper labeling",
        "Safety equipment",
        "Record keeping",
      ],
      penalties: ["Fines up to $5,000", "License revocation", "Criminal charges"],
      references: ["California Food & Agricultural Code", "EPA regulations"],
      updateFrequency: "annual",
      lastUpdated: new Date(),
    },
  ],
};

// ============================================================================
// LOCATION COMPLIANCE ENGINE
// ============================================================================

export class LocationComplianceEngine {
  private complianceDatabase: Record<string, ComplianceDocument[]> = COMPLIANCE_DATABASE;
  private aiProfiles: Map<string, AIComplianceProfile> = new Map();
  private complianceChecks: Map<string, ComplianceCheck> = new Map();

  /**
   * Get compliance documents for a specific location and field
   */
  getComplianceForLocation(
    field: string,
    location: Location
  ): ComplianceDocument[] {
    const fieldCompliances = this.complianceDatabase[field.toLowerCase()] || [];
    
    return fieldCompliances.filter((doc) => {
      const jurisdictionMatch =
        doc.jurisdiction === location.state ||
        doc.jurisdiction === location.county ||
        doc.jurisdiction === location.city ||
        doc.jurisdiction === "Federal";
      return jurisdictionMatch;
    });
  }

  /**
   * Register AI with compliance profile
   */
  registerAICompliance(
    aiId: string,
    aiName: string,
    field: string,
    locations: Location[]
  ): AIComplianceProfile {
    const relevantCompliances = this.getRelevantCompliances(field, locations);

    const profile: AIComplianceProfile = {
      aiId,
      aiName,
      field,
      locations,
      relevantCompliances: relevantCompliances.map((c) => c.id),
      certifications: this.getCertificationsForField(field),
      licensingRequirements: this.getLicensingRequirements(field),
      lastComplianceCheck: new Date(),
      complianceScore: 100,
    };

    this.aiProfiles.set(aiId, profile);
    return profile;
  }

  /**
   * Get all relevant compliance documents for AI
   */
  private getRelevantCompliances(
    field: string,
    locations: Location[]
  ): ComplianceDocument[] {
    const allCompliances: ComplianceDocument[] = [];

    for (const location of locations) {
      const docs = this.getComplianceForLocation(field, location);
      allCompliances.push(...docs);
    }

    // Remove duplicates
    return Array.from(
      new Map(allCompliances.map((item) => [item.id, item])).values()
    );
  }

  /**
   * Get certifications required for field
   */
  private getCertificationsForField(field: string): string[] {
    const certMap: Record<string, string[]> = {
      electrician: ["EPA Section 608", "OSHA 30-Hour", "State Electrical License"],
      hvac: ["EPA Section 608", "HVAC License", "Refrigerant Certification"],
      plumber: ["Plumbing License", "Backflow Certification", "Gas Fitting License"],
      attorney: ["Bar License", "Continuing Legal Education"],
      contractor: ["General Contractor License", "OSHA Certification"],
      realtor: ["Real Estate License", "Fair Housing Training"],
      landscaper: ["Pesticide Applicator License", "Landscape Contractor License"],
    };

    return certMap[field.toLowerCase()] || [];
  }

  /**
   * Get licensing requirements for field
   */
  private getLicensingRequirements(field: string): string[] {
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
    };

    return licenseMap[field.toLowerCase()] || [];
  }

  /**
   * Perform compliance check for AI
   */
  performComplianceCheck(aiId: string, location: Location): ComplianceCheck {
    const profile = this.aiProfiles.get(aiId);
    if (!profile) throw new Error(`AI profile ${aiId} not found`);

    const relevantDocs = this.getComplianceForLocation(profile.field, location);
    const issuesFound: string[] = [];
    const recommendations: string[] = [];

    // Check for expired documents
    for (const doc of relevantDocs) {
      if (doc.expirationDate && new Date() > doc.expirationDate) {
        issuesFound.push(`Expired compliance document: ${doc.title}`);
        recommendations.push(`Update to latest version of ${doc.title}`);
      }

      // Check if AI has required certifications
      if (doc.type === "licensing_requirement") {
        const hasCert = profile.certifications.some((cert) =>
          doc.title.includes(cert)
        );
        if (!hasCert) {
          issuesFound.push(`Missing certification for: ${doc.title}`);
          recommendations.push(`Obtain certification: ${doc.keyRequirements.join(", ")}`);
        }
      }
    }

    const complianceCheck: ComplianceCheck = {
      id: `check-${Date.now()}`,
      aiId,
      location,
      timestamp: new Date(),
      documentsReviewed: relevantDocs.length,
      issuesFound,
      recommendations,
      status: issuesFound.length === 0 ? "compliant" : issuesFound.length > 2 ? "non_compliant" : "warning",
    };

    this.complianceChecks.set(complianceCheck.id, complianceCheck);

    // Update compliance score
    if (profile) {
      profile.complianceScore = Math.max(0, 100 - issuesFound.length * 10);
      profile.lastComplianceCheck = new Date();
    }

    return complianceCheck;
  }

  /**
   * Get AI compliance profile
   */
  getAIProfile(aiId: string): AIComplianceProfile | null {
    return this.aiProfiles.get(aiId) || null;
  }

  /**
   * Get compliance check results
   */
  getComplianceCheckResults(checkId: string): ComplianceCheck | null {
    return this.complianceChecks.get(checkId) || null;
  }

  /**
   * Update AI locations
   */
  updateAILocations(aiId: string, locations: Location[]): void {
    const profile = this.aiProfiles.get(aiId);
    if (!profile) throw new Error(`AI profile ${aiId} not found`);

    profile.locations = locations;
    profile.relevantCompliances = this.getRelevantCompliances(
      profile.field,
      locations
    ).map((c) => c.id);
  }

  /**
   * Get compliance summary for AI
   */
  getComplianceSummary(aiId: string): {
    aiName: string;
    field: string;
    locations: Location[];
    complianceScore: number;
    documentsCount: number;
    certificationsRequired: string[];
    lastCheck: Date;
  } | null {
    const profile = this.aiProfiles.get(aiId);
    if (!profile) return null;

    const docs = this.getRelevantCompliances(profile.field, profile.locations);

    return {
      aiName: profile.aiName,
      field: profile.field,
      locations: profile.locations,
      complianceScore: profile.complianceScore,
      documentsCount: docs.length,
      certificationsRequired: profile.certifications,
      lastCheck: profile.lastComplianceCheck,
    };
  }

  /**
   * Get all compliance documents for export
   */
  getComplianceDocuments(aiId: string): ComplianceDocument[] {
    const profile = this.aiProfiles.get(aiId);
    if (!profile) return [];

    return this.getRelevantCompliances(profile.field, profile.locations);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ComplianceDocumentSchema,
  LocationSchema,
  AIComplianceProfileSchema,
  ComplianceCheckSchema,
};

export type {
  ComplianceDocument,
  Location,
  AIComplianceProfile,
  ComplianceCheck,
};
