/**
 * Landscaping Master AI Agent
 * Specialized AI for landscape design, planning, and visualization
 * Helps users design and plan landscaping projects before execution
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LandscapeStyle = 
  | "modern_minimalist"
  | "traditional_formal"
  | "cottage_garden"
  | "xeriscaping"
  | "native_plants"
  | "tropical"
  | "japanese_zen"
  | "mediterranean"
  | "cottage_rustic"
  | "contemporary";

export type PlantType = 
  | "trees"
  | "shrubs"
  | "perennials"
  | "annuals"
  | "groundcover"
  | "vines"
  | "ornamental_grasses"
  | "water_plants";

export type HardscapeElement = 
  | "patio"
  | "pathway"
  | "deck"
  | "fence"
  | "wall"
  | "water_feature"
  | "lighting"
  | "seating"
  | "edging"
  | "mulch_bed";

export interface PlantSpecification {
  id: string;
  commonName: string;
  scientificName: string;
  plantType: PlantType;
  matureHeight: { min: number; max: number }; // in feet
  matureWidth: { min: number; max: number };
  sunRequirement: "full_sun" | "partial_shade" | "full_shade";
  waterNeeds: "low" | "medium" | "high";
  zoneHardiness: number[]; // USDA zones
  maintenanceLevel: "low" | "medium" | "high";
  bloomSeason: string[];
  bloomColor: string[];
  nativeRegions: string[];
  cost: number; // estimated per plant
  description: string;
}

export interface HardscapeSpecification {
  id: string;
  name: string;
  type: HardscapeElement;
  material: string;
  dimensions: { length: number; width: number; height?: number };
  cost: number; // per unit or total
  maintenanceLevel: "low" | "medium" | "high";
  durability: number; // years
  description: string;
}

export interface LandscapeDesign {
  id: string;
  userId: string;
  projectName: string;
  style: LandscapeStyle;
  areaSize: number; // square feet
  budget: number;
  sunExposure: "full_sun" | "partial_shade" | "full_shade" | "mixed";
  soilType: "sandy" | "loamy" | "clay" | "rocky";
  zone: number; // USDA hardiness zone
  plants: Array<{
    specification: PlantSpecification;
    quantity: number;
    placement: { x: number; y: number; z: number };
    notes: string;
  }>;
  hardscapes: Array<{
    specification: HardscapeSpecification;
    placement: { x: number; y: number; z: number };
    rotation: number; // degrees
    notes: string;
  }>;
  waterFeatures: Array<{
    type: string;
    size: { length: number; width: number; depth: number };
    placement: { x: number; y: number };
    notes: string;
  }>;
  lighting: Array<{
    type: string;
    placement: { x: number; y: number; z: number };
    brightness: number; // 0-100
    notes: string;
  }>;
  estimatedCost: number;
  estimatedMaintenanceHours: number; // per month
  timeline: {
    prepTime: number; // days
    plantingTime: number; // days
    establishmentTime: number; // days
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LandscapeRecommendation {
  id: string;
  designId: string;
  category: "plant" | "hardscape" | "layout" | "maintenance" | "cost";
  title: string;
  description: string;
  rationale: string;
  alternatives: string[];
  estimatedImpact: {
    cost: number;
    maintenance: number;
    aesthetics: number; // 0-10
    sustainability: number; // 0-10
  };
}

export interface DesignPhase {
  id: string;
  designId: string;
  phaseNumber: number;
  name: string;
  description: string;
  tasks: Array<{
    id: string;
    description: string;
    estimatedHours: number;
    materials: string[];
    tools: string[];
    difficulty: "easy" | "moderate" | "difficult";
  }>;
  estimatedCost: number;
  estimatedDuration: number; // days
  dependencies: string[]; // phase IDs
  completionPercentage: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PlantSpecificationSchema = z.object({
  id: z.string(),
  commonName: z.string(),
  scientificName: z.string(),
  plantType: z.enum([
    "trees", "shrubs", "perennials", "annuals", "groundcover",
    "vines", "ornamental_grasses", "water_plants"
  ]),
  matureHeight: z.object({ min: z.number(), max: z.number() }),
  matureWidth: z.object({ min: z.number(), max: z.number() }),
  sunRequirement: z.enum(["full_sun", "partial_shade", "full_shade"]),
  waterNeeds: z.enum(["low", "medium", "high"]),
  zoneHardiness: z.array(z.number()),
  maintenanceLevel: z.enum(["low", "medium", "high"]),
  bloomSeason: z.array(z.string()),
  bloomColor: z.array(z.string()),
  nativeRegions: z.array(z.string()),
  cost: z.number(),
  description: z.string(),
});

const LandscapeDesignSchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectName: z.string(),
  style: z.enum([
    "modern_minimalist", "traditional_formal", "cottage_garden", "xeriscaping",
    "native_plants", "tropical", "japanese_zen", "mediterranean",
    "cottage_rustic", "contemporary"
  ]),
  areaSize: z.number(),
  budget: z.number(),
  sunExposure: z.enum(["full_sun", "partial_shade", "full_shade", "mixed"]),
  soilType: z.enum(["sandy", "loamy", "clay", "rocky"]),
  zone: z.number(),
  plants: z.array(z.object({
    specification: PlantSpecificationSchema,
    quantity: z.number(),
    placement: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    notes: z.string(),
  })),
  hardscapes: z.array(z.object({
    specification: z.any(),
    placement: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    rotation: z.number(),
    notes: z.string(),
  })),
  waterFeatures: z.array(z.any()),
  lighting: z.array(z.any()),
  estimatedCost: z.number(),
  estimatedMaintenanceHours: z.number(),
  timeline: z.object({
    prepTime: z.number(),
    plantingTime: z.number(),
    establishmentTime: z.number(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// LANDSCAPING MASTER AI
// ============================================================================

export class LandscapingMasterAI {
  private designs: Map<string, LandscapeDesign> = new Map();
  private plantDatabase: Map<string, PlantSpecification> = new Map();
  private hardscapeDatabase: Map<string, HardscapeSpecification> = new Map();
  private recommendations: LandscapeRecommendation[] = [];
  private designPhases: Map<string, DesignPhase[]> = new Map();

  constructor() {
    this.initializePlantDatabase();
    this.initializeHardscapeDatabase();
  }

  /**
   * Initialize plant database with common landscaping plants
   */
  private initializePlantDatabase(): void {
    const plants: PlantSpecification[] = [
      {
        id: "oak-red",
        commonName: "Red Oak",
        scientificName: "Quercus rubra",
        plantType: "trees",
        matureHeight: { min: 50, max: 80 },
        matureWidth: { min: 40, max: 60 },
        sunRequirement: "full_sun",
        waterNeeds: "medium",
        zoneHardiness: [3, 4, 5, 6, 7, 8, 9],
        maintenanceLevel: "low",
        bloomSeason: ["spring"],
        bloomColor: ["green"],
        nativeRegions: ["North America"],
        cost: 150,
        description: "Large deciduous tree with attractive red fall foliage",
      },
      {
        id: "maple-japanese",
        commonName: "Japanese Maple",
        scientificName: "Acer palmatum",
        plantType: "trees",
        matureHeight: { min: 15, max: 25 },
        matureWidth: { min: 15, max: 25 },
        sunRequirement: "partial_shade",
        waterNeeds: "medium",
        zoneHardiness: [5, 6, 7, 8, 9],
        maintenanceLevel: "medium",
        bloomSeason: ["spring"],
        bloomColor: ["red", "purple"],
        nativeRegions: ["Japan"],
        cost: 200,
        description: "Ornamental tree with delicate foliage and stunning fall colors",
      },
      {
        id: "hydrangea-blue",
        commonName: "Blue Hydrangea",
        scientificName: "Hydrangea macrophylla",
        plantType: "shrubs",
        matureHeight: { min: 4, max: 8 },
        matureWidth: { min: 4, max: 8 },
        sunRequirement: "partial_shade",
        waterNeeds: "high",
        zoneHardiness: [5, 6, 7, 8, 9, 10, 11],
        maintenanceLevel: "medium",
        bloomSeason: ["summer", "fall"],
        bloomColor: ["blue", "purple", "pink"],
        nativeRegions: ["Japan"],
        cost: 30,
        description: "Large flowering shrub with showy blue, purple, or pink blooms",
      },
      {
        id: "lavender-english",
        commonName: "English Lavender",
        scientificName: "Lavandula angustifolia",
        plantType: "perennials",
        matureHeight: { min: 1.5, max: 3 },
        matureWidth: { min: 2, max: 3 },
        sunRequirement: "full_sun",
        waterNeeds: "low",
        zoneHardiness: [5, 6, 7, 8, 9, 10],
        maintenanceLevel: "low",
        bloomSeason: ["summer"],
        bloomColor: ["purple", "blue", "pink", "white"],
        nativeRegions: ["Mediterranean"],
        cost: 15,
        description: "Fragrant perennial with purple flowers, attracts pollinators",
      },
      {
        id: "sedum-autumn",
        commonName: "Autumn Sedum",
        scientificName: "Sedum 'Autumn Joy'",
        plantType: "perennials",
        matureHeight: { min: 1.5, max: 2.5 },
        matureWidth: { min: 2, max: 3 },
        sunRequirement: "full_sun",
        waterNeeds: "low",
        zoneHardiness: [3, 4, 5, 6, 7, 8, 9, 10, 11],
        maintenanceLevel: "low",
        bloomSeason: ["summer", "fall"],
        bloomColor: ["pink", "red", "brown"],
        nativeRegions: ["North America"],
        cost: 12,
        description: "Hardy succulent with color-changing flowers and foliage",
      },
      {
        id: "creeping-thyme",
        commonName: "Creeping Thyme",
        scientificName: "Thymus serpyllum",
        plantType: "groundcover",
        matureHeight: { min: 0.25, max: 0.5 },
        matureWidth: { min: 1, max: 2 },
        sunRequirement: "full_sun",
        waterNeeds: "low",
        zoneHardiness: [4, 5, 6, 7, 8, 9, 10],
        maintenanceLevel: "low",
        bloomSeason: ["summer"],
        bloomColor: ["purple", "pink", "white"],
        nativeRegions: ["Mediterranean"],
        cost: 8,
        description: "Low-growing groundcover with fragrant foliage and flowers",
      },
    ];

    plants.forEach((plant) => {
      this.plantDatabase.set(plant.id, plant);
    });
  }

  /**
   * Initialize hardscape database
   */
  private initializeHardscapeDatabase(): void {
    const hardscapes: HardscapeSpecification[] = [
      {
        id: "patio-stone",
        name: "Natural Stone Patio",
        type: "patio",
        material: "Natural stone (flagstone, slate)",
        dimensions: { length: 12, width: 12 },
        cost: 1200,
        maintenanceLevel: "low",
        durability: 30,
        description: "Elegant natural stone patio with irregular pattern",
      },
      {
        id: "pathway-gravel",
        name: "Gravel Pathway",
        type: "pathway",
        material: "Decorative gravel",
        dimensions: { length: 20, width: 3 },
        cost: 150,
        maintenanceLevel: "medium",
        durability: 3,
        description: "Simple gravel pathway with edging",
      },
      {
        id: "fence-wood",
        name: "Wooden Privacy Fence",
        type: "fence",
        material: "Cedar wood",
        dimensions: { length: 100, width: 0.5, height: 6 },
        cost: 2000,
        maintenanceLevel: "medium",
        durability: 15,
        description: "Classic wooden privacy fence",
      },
      {
        id: "water-feature-fountain",
        name: "Garden Fountain",
        type: "water_feature",
        material: "Stone/ceramic",
        dimensions: { length: 3, width: 3, height: 4 },
        cost: 500,
        maintenanceLevel: "medium",
        durability: 20,
        description: "Decorative water fountain for focal point",
      },
    ];

    hardscapes.forEach((hardscape) => {
      this.hardscapeDatabase.set(hardscape.id, hardscape);
    });
  }

  /**
   * Create landscape design from photo analysis
   */
  createDesignFromPhoto(
    userId: string,
    projectName: string,
    photoAnalysis: {
      areaSize: number;
      sunExposure: string;
      soilType: string;
      zone: number;
      currentConditions: string;
    },
    designPreferences: {
      style: LandscapeStyle;
      budget: number;
      maintenanceLevel: "low" | "medium" | "high";
    }
  ): LandscapeDesign {
    const design: LandscapeDesign = {
      id: `ld-${Date.now()}-${Math.random()}`,
      userId,
      projectName,
      style: designPreferences.style,
      areaSize: photoAnalysis.areaSize,
      budget: designPreferences.budget,
      sunExposure: photoAnalysis.sunExposure as any,
      soilType: photoAnalysis.soilType as any,
      zone: photoAnalysis.zone,
      plants: [],
      hardscapes: [],
      waterFeatures: [],
      lighting: [],
      estimatedCost: 0,
      estimatedMaintenanceHours: 0,
      timeline: {
        prepTime: 3,
        plantingTime: 2,
        establishmentTime: 30,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate plant recommendations based on conditions
    const plantRecommendations = this.recommendPlants(
      photoAnalysis.sunExposure,
      photoAnalysis.zone,
      designPreferences.maintenanceLevel,
      designPreferences.style
    );

    // Add recommended plants to design
    plantRecommendations.forEach((plant, index) => {
      const quantity = Math.floor(Math.random() * 3) + 1;
      design.plants.push({
        specification: plant,
        quantity,
        placement: {
          x: Math.random() * photoAnalysis.areaSize,
          y: Math.random() * photoAnalysis.areaSize,
          z: 0,
        },
        notes: `Recommended for ${designPreferences.style} style`,
      });
    });

    // Calculate costs
    design.estimatedCost = this.calculateDesignCost(design);
    design.estimatedMaintenanceHours = this.calculateMaintenanceHours(design);

    this.designs.set(design.id, design);
    return design;
  }

  /**
   * Recommend plants based on conditions
   */
  private recommendPlants(
    sunExposure: string,
    zone: number,
    maintenanceLevel: string,
    style: LandscapeStyle
  ): PlantSpecification[] {
    const recommendations: PlantSpecification[] = [];

    this.plantDatabase.forEach((plant) => {
      // Check if plant matches conditions
      const sunMatch = plant.sunRequirement === sunExposure || sunExposure === "mixed";
      const zoneMatch = plant.zoneHardiness.includes(zone);
      const maintenanceMatch = plant.maintenanceLevel === maintenanceLevel;

      if (sunMatch && zoneMatch && maintenanceMatch) {
        recommendations.push(plant);
      }
    });

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Calculate design cost
   */
  private calculateDesignCost(design: LandscapeDesign): number {
    let cost = 0;

    // Plant costs
    design.plants.forEach((plant) => {
      cost += plant.specification.cost * plant.quantity;
    });

    // Hardscape costs
    design.hardscapes.forEach((hardscape) => {
      cost += hardscape.specification.cost;
    });

    // Water feature costs
    design.waterFeatures.forEach((feature) => {
      cost += 300; // Average cost
    });

    // Lighting costs
    design.lighting.forEach(() => {
      cost += 50; // Per light
    });

    return cost;
  }

  /**
   * Calculate maintenance hours
   */
  private calculateMaintenanceHours(design: LandscapeDesign): number {
    let hours = 0;

    design.plants.forEach((plant) => {
      const maintenanceMap = { low: 0.5, medium: 1, high: 2 };
      hours += maintenanceMap[plant.specification.maintenanceLevel] * plant.quantity;
    });

    return hours;
  }

  /**
   * Get design by ID
   */
  getDesign(designId: string): LandscapeDesign | undefined {
    return this.designs.get(designId);
  }

  /**
   * Get all designs for user
   */
  getUserDesigns(userId: string): LandscapeDesign[] {
    const userDesigns: LandscapeDesign[] = [];
    this.designs.forEach((design) => {
      if (design.userId === userId) {
        userDesigns.push(design);
      }
    });
    return userDesigns;
  }

  /**
   * Generate design phases for execution
   */
  generateDesignPhases(designId: string): DesignPhase[] {
    const design = this.designs.get(designId);
    if (!design) return [];

    const phases: DesignPhase[] = [
      {
        id: `phase-1-${designId}`,
        designId,
        phaseNumber: 1,
        name: "Site Preparation",
        description: "Clear, level, and prepare the landscape area",
        tasks: [
          {
            id: "task-1",
            description: "Clear existing vegetation and debris",
            estimatedHours: 8,
            materials: ["mulch", "compost"],
            tools: ["shovel", "rake", "wheelbarrow"],
            difficulty: "moderate",
          },
          {
            id: "task-2",
            description: "Level and grade the area",
            estimatedHours: 6,
            materials: ["topsoil"],
            tools: ["shovel", "level", "rake"],
            difficulty: "moderate",
          },
        ],
        estimatedCost: 500,
        estimatedDuration: 2,
        dependencies: [],
        completionPercentage: 0,
      },
      {
        id: `phase-2-${designId}`,
        designId,
        phaseNumber: 2,
        name: "Hardscape Installation",
        description: "Install patios, pathways, and other hardscape elements",
        tasks: [
          {
            id: "task-3",
            description: "Install patio or deck",
            estimatedHours: 16,
            materials: ["stone", "sand", "gravel"],
            tools: ["shovel", "level", "mallet"],
            difficulty: "difficult",
          },
        ],
        estimatedCost: 1500,
        estimatedDuration: 3,
        dependencies: ["phase-1"],
        completionPercentage: 0,
      },
      {
        id: `phase-3-${designId}`,
        designId,
        phaseNumber: 3,
        name: "Planting",
        description: "Plant trees, shrubs, and other plants",
        tasks: [
          {
            id: "task-4",
            description: "Plant trees and large shrubs",
            estimatedHours: 12,
            materials: ["plants", "mulch", "soil"],
            tools: ["shovel", "wheelbarrow"],
            difficulty: "moderate",
          },
          {
            id: "task-5",
            description: "Plant perennials and groundcover",
            estimatedHours: 8,
            materials: ["plants", "mulch"],
            tools: ["shovel", "hand tools"],
            difficulty: "easy",
          },
        ],
        estimatedCost: 800,
        estimatedDuration: 2,
        dependencies: ["phase-2"],
        completionPercentage: 0,
      },
      {
        id: `phase-4-${designId}`,
        designId,
        phaseNumber: 4,
        name: "Finishing Touches",
        description: "Add lighting, water features, and final details",
        tasks: [
          {
            id: "task-6",
            description: "Install landscape lighting",
            estimatedHours: 6,
            materials: ["lights", "wire", "transformer"],
            tools: ["shovel", "wire cutter"],
            difficulty: "moderate",
          },
        ],
        estimatedCost: 400,
        estimatedDuration: 1,
        dependencies: ["phase-3"],
        completionPercentage: 0,
      },
    ];

    this.designPhases.set(designId, phases);
    return phases;
  }

  /**
   * Get design statistics
   */
  getStatistics(): {
    totalDesigns: number;
    totalPlants: number;
    totalHardscapes: number;
    averageDesignCost: number;
  } {
    let totalDesigns = 0;
    let totalPlants = 0;
    let totalHardscapes = 0;
    let totalCost = 0;

    this.designs.forEach((design) => {
      totalDesigns++;
      totalPlants += design.plants.length;
      totalHardscapes += design.hardscapes.length;
      totalCost += design.estimatedCost;
    });

    return {
      totalDesigns,
      totalPlants,
      totalHardscapes,
      averageDesignCost: totalDesigns > 0 ? totalCost / totalDesigns : 0,
    };
  }
}

export default LandscapingMasterAI;
