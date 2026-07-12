/**
 * Landscaping Execution Pipeline
 * Converts 3D landscape designs into actionable execution plans
 * Generates materials lists, timelines, and step-by-step instructions
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExecutionPhase {
  id: string;
  phaseNumber: number;
  name: string;
  description: string;
  estimatedDuration: number; // days
  estimatedCost: number;
  tasks: ExecutionTask[];
  dependencies: string[]; // phase IDs
  status: "pending" | "in_progress" | "completed" | "on_hold";
  startDate?: Date;
  endDate?: Date;
  completionPercentage: number;
}

export interface ExecutionTask {
  id: string;
  description: string;
  stepNumber: number;
  estimatedHours: number;
  difficulty: "easy" | "moderate" | "difficult";
  materials: MaterialRequirement[];
  tools: ToolRequirement[];
  instructions: string[];
  safetyNotes: string[];
  videoUrl?: string;
  status: "pending" | "in_progress" | "completed";
  assignedTo?: string;
  completedAt?: Date;
}

export interface MaterialRequirement {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  supplier?: string;
  notes: string;
  status: "not_ordered" | "ordered" | "received" | "used";
}

export interface ToolRequirement {
  id: string;
  name: string;
  quantity: number;
  rentalCost?: number;
  purchaseCost?: number;
  availability: "own" | "borrow" | "rent" | "purchase";
  notes: string;
}

export interface ExecutionPlan {
  id: string;
  designId: string;
  userId: string;
  projectName: string;
  createdAt: Date;
  updatedAt: Date;
  phases: ExecutionPhase[];
  totalCost: number;
  totalDuration: number; // days
  totalHours: number;
  materialsNeeded: MaterialRequirement[];
  toolsNeeded: ToolRequirement[];
  timeline: {
    startDate: Date;
    estimatedEndDate: Date;
    actualEndDate?: Date;
  };
  status: "draft" | "approved" | "in_progress" | "completed" | "paused";
  notes: string;
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  description: string;
  category: "preparation" | "safety" | "materials" | "tools" | "execution" | "cleanup";
  completed: boolean;
  completedAt?: Date;
}

export interface ProgressReport {
  planId: string;
  generatedAt: Date;
  overallProgress: number; // 0-100
  phaseProgress: Array<{
    phaseId: string;
    phaseName: string;
    progress: number;
  }>;
  completedTasks: number;
  totalTasks: number;
  spentCost: number;
  remainingCost: number;
  daysElapsed: number;
  daysRemaining: number;
  issues: string[];
  recommendations: string[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ExecutionTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  stepNumber: z.number(),
  estimatedHours: z.number(),
  difficulty: z.enum(["easy", "moderate", "difficult"]),
  materials: z.array(z.any()),
  tools: z.array(z.any()),
  instructions: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  videoUrl: z.string().url().optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
  assignedTo: z.string().optional(),
  completedAt: z.date().optional(),
});

// ============================================================================
// LANDSCAPING EXECUTION PIPELINE
// ============================================================================

export class LandscapingExecutionPipeline {
  private plans: Map<string, ExecutionPlan> = new Map();
  private progressReports: Map<string, ProgressReport> = new Map();

  /**
   * Generate execution plan from design
   */
  generateExecutionPlan(
    designId: string,
    userId: string,
    projectName: string,
    designDetails: {
      plants: Array<{ name: string; quantity: number; cost: number }>;
      hardscapes: Array<{ name: string; cost: number }>;
      waterFeatures: Array<{ name: string; cost: number }>;
      lighting: Array<{ name: string; cost: number }>;
      totalBudget: number;
    }
  ): ExecutionPlan {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const phases = this.generatePhases(designDetails);
    const materialsNeeded = this.generateMaterialsList(designDetails);
    const toolsNeeded = this.generateToolsList(designDetails);

    const totalCost = this.calculateTotalCost(materialsNeeded, toolsNeeded);
    const totalDuration = phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);
    const totalHours = phases.reduce((sum, phase) => {
      return sum + phase.tasks.reduce((taskSum, task) => taskSum + task.estimatedHours, 0);
    }, 0);

    const startDate = new Date();
    const estimatedEndDate = new Date(startDate);
    estimatedEndDate.setDate(estimatedEndDate.getDate() + totalDuration);

    const plan: ExecutionPlan = {
      id: planId,
      designId,
      userId,
      projectName,
      createdAt: new Date(),
      updatedAt: new Date(),
      phases,
      totalCost,
      totalDuration,
      totalHours,
      materialsNeeded,
      toolsNeeded,
      timeline: {
        startDate,
        estimatedEndDate,
      },
      status: "draft",
      notes: `Execution plan for ${projectName}`,
      checklist: this.generateChecklist(),
    };

    this.plans.set(planId, plan);
    return plan;
  }

  /**
   * Generate execution phases
   */
  private generatePhases(designDetails: any): ExecutionPhase[] {
    const phases: ExecutionPhase[] = [
      {
        id: `phase-1-${Date.now()}`,
        phaseNumber: 1,
        name: "Site Preparation",
        description: "Clear, level, and prepare the landscape area for work",
        estimatedDuration: 2,
        estimatedCost: 500,
        tasks: [
          {
            id: "task-1",
            description: "Clear existing vegetation and debris",
            stepNumber: 1,
            estimatedHours: 8,
            difficulty: "moderate",
            materials: [
              {
                id: "mat-1",
                name: "Mulch",
                quantity: 10,
                unit: "cubic yards",
                cost: 300,
                notes: "For debris disposal",
                status: "not_ordered",
              },
            ],
            tools: [
              {
                id: "tool-1",
                name: "Shovel",
                quantity: 2,
                availability: "own",
                notes: "Standard garden shovel",
              },
              {
                id: "tool-2",
                name: "Wheelbarrow",
                quantity: 1,
                rentalCost: 25,
                availability: "rent",
                notes: "For debris transport",
              },
            ],
            instructions: [
              "Remove all dead plants and weeds",
              "Clear rocks and debris",
              "Dispose of waste properly",
            ],
            safetyNotes: ["Wear gloves and safety glasses", "Watch for hidden obstacles"],
            status: "pending",
          },
          {
            id: "task-2",
            description: "Level and grade the area",
            stepNumber: 2,
            estimatedHours: 6,
            difficulty: "moderate",
            materials: [
              {
                id: "mat-2",
                name: "Topsoil",
                quantity: 5,
                unit: "cubic yards",
                cost: 150,
                notes: "For leveling",
                status: "not_ordered",
              },
            ],
            tools: [
              {
                id: "tool-3",
                name: "Rake",
                quantity: 1,
                availability: "own",
                notes: "Standard garden rake",
              },
              {
                id: "tool-4",
                name: "Level",
                quantity: 1,
                availability: "own",
                notes: "4-foot level",
              },
            ],
            instructions: ["Grade the slope", "Compact soil", "Check level in multiple spots"],
            safetyNotes: ["Ensure proper drainage", "Avoid over-compaction"],
            status: "pending",
          },
        ],
        dependencies: [],
        status: "pending",
        completionPercentage: 0,
      },
      {
        id: `phase-2-${Date.now()}`,
        phaseNumber: 2,
        name: "Hardscape Installation",
        description: "Install patios, pathways, and other hardscape elements",
        estimatedDuration: 3,
        estimatedCost: 1500,
        tasks: [
          {
            id: "task-3",
            description: "Install patio or deck",
            stepNumber: 1,
            estimatedHours: 16,
            difficulty: "difficult",
            materials: designDetails.hardscapes.map((h: any, i: number) => ({
              id: `mat-hardscape-${i}`,
              name: h.name,
              quantity: 1,
              unit: "unit",
              cost: h.cost,
              notes: "Professional installation recommended",
              status: "not_ordered",
            })),
            tools: [
              {
                id: "tool-5",
                name: "Power drill",
                quantity: 1,
                rentalCost: 40,
                availability: "rent",
                notes: "For fastening",
              },
            ],
            instructions: [
              "Prepare foundation",
              "Install base materials",
              "Place hardscape elements",
              "Secure and level",
            ],
            safetyNotes: ["Use proper safety equipment", "Follow manufacturer instructions"],
            status: "pending",
          },
        ],
        dependencies: ["phase-1"],
        status: "pending",
        completionPercentage: 0,
      },
      {
        id: `phase-3-${Date.now()}`,
        phaseNumber: 3,
        name: "Planting",
        description: "Plant trees, shrubs, and other vegetation",
        estimatedDuration: 2,
        estimatedCost: 800,
        tasks: [
          {
            id: "task-4",
            description: "Plant trees and large shrubs",
            stepNumber: 1,
            estimatedHours: 12,
            difficulty: "moderate",
            materials: designDetails.plants.map((p: any, i: number) => ({
              id: `mat-plant-${i}`,
              name: p.name,
              quantity: p.quantity,
              unit: "plants",
              cost: p.cost,
              notes: "From local nursery",
              status: "not_ordered",
            })),
            tools: [
              {
                id: "tool-6",
                name: "Shovel",
                quantity: 1,
                availability: "own",
                notes: "Spading shovel",
              },
            ],
            instructions: [
              "Dig appropriate holes",
              "Amend soil with compost",
              "Plant at correct depth",
              "Water thoroughly",
            ],
            safetyNotes: ["Wear gloves", "Lift properly to avoid injury"],
            status: "pending",
          },
        ],
        dependencies: ["phase-2"],
        status: "pending",
        completionPercentage: 0,
      },
      {
        id: `phase-4-${Date.now()}`,
        phaseNumber: 4,
        name: "Finishing Touches",
        description: "Add lighting, water features, and final details",
        estimatedDuration: 1,
        estimatedCost: 400,
        tasks: [
          {
            id: "task-5",
            description: "Install landscape lighting",
            stepNumber: 1,
            estimatedHours: 6,
            difficulty: "moderate",
            materials: designDetails.lighting.map((l: any, i: number) => ({
              id: `mat-light-${i}`,
              name: l.name,
              quantity: 1,
              unit: "unit",
              cost: l.cost,
              notes: "LED recommended for efficiency",
              status: "not_ordered",
            })),
            tools: [
              {
                id: "tool-7",
                name: "Wire cutter",
                quantity: 1,
                availability: "own",
                notes: "For electrical work",
              },
            ],
            instructions: [
              "Plan lighting layout",
              "Install fixtures",
              "Run electrical wire",
              "Test all lights",
            ],
            safetyNotes: ["Turn off power when working", "Follow electrical codes"],
            status: "pending",
          },
        ],
        dependencies: ["phase-3"],
        status: "pending",
        completionPercentage: 0,
      },
    ];

    return phases;
  }

  /**
   * Generate materials list
   */
  private generateMaterialsList(designDetails: any): MaterialRequirement[] {
    const materials: MaterialRequirement[] = [];

    // Plants
    designDetails.plants.forEach((plant: any, i: number) => {
      materials.push({
        id: `mat-plant-${i}`,
        name: plant.name,
        quantity: plant.quantity,
        unit: "plants",
        cost: plant.cost,
        notes: "From local nursery",
        status: "not_ordered",
      });
    });

    // Hardscapes
    designDetails.hardscapes.forEach((hardscape: any, i: number) => {
      materials.push({
        id: `mat-hardscape-${i}`,
        name: hardscape.name,
        quantity: 1,
        unit: "unit",
        cost: hardscape.cost,
        notes: "Professional grade",
        status: "not_ordered",
      });
    });

    // Soil and amendments
    materials.push({
      id: "mat-soil",
      name: "Topsoil",
      quantity: 10,
      unit: "cubic yards",
      cost: 300,
      notes: "For soil amendment",
      status: "not_ordered",
    });

    materials.push({
      id: "mat-compost",
      name: "Compost",
      quantity: 5,
      unit: "cubic yards",
      cost: 150,
      notes: "For planting beds",
      status: "not_ordered",
    });

    materials.push({
      id: "mat-mulch",
      name: "Mulch",
      quantity: 8,
      unit: "cubic yards",
      cost: 200,
      notes: "For ground cover",
      status: "not_ordered",
    });

    return materials;
  }

  /**
   * Generate tools list
   */
  private generateToolsList(designDetails: any): ToolRequirement[] {
    return [
      {
        id: "tool-shovel",
        name: "Shovel",
        quantity: 2,
        availability: "own",
        notes: "Standard and spading shovels",
      },
      {
        id: "tool-rake",
        name: "Rake",
        quantity: 2,
        availability: "own",
        notes: "Garden and landscape rakes",
      },
      {
        id: "tool-wheelbarrow",
        name: "Wheelbarrow",
        quantity: 1,
        rentalCost: 25,
        availability: "rent",
        notes: "For material transport",
      },
      {
        id: "tool-level",
        name: "Level",
        quantity: 1,
        availability: "own",
        notes: "4-foot level",
      },
      {
        id: "tool-hose",
        name: "Garden Hose",
        quantity: 1,
        availability: "own",
        notes: "50-foot hose with spray nozzle",
      },
      {
        id: "tool-gloves",
        name: "Work Gloves",
        quantity: 3,
        purchaseCost: 30,
        availability: "purchase",
        notes: "Heavy-duty leather gloves",
      },
    ];
  }

  /**
   * Calculate total cost
   */
  private calculateTotalCost(materials: MaterialRequirement[], tools: ToolRequirement[]): number {
    let cost = 0;

    materials.forEach((mat) => {
      cost += mat.cost * mat.quantity;
    });

    tools.forEach((tool) => {
      if (tool.rentalCost) {
        cost += tool.rentalCost * tool.quantity;
      } else if (tool.purchaseCost) {
        cost += tool.purchaseCost * tool.quantity;
      }
    });

    return cost;
  }

  /**
   * Generate checklist
   */
  private generateChecklist(): ChecklistItem[] {
    return [
      {
        id: "check-1",
        description: "Review design and get approval",
        category: "preparation",
        completed: false,
      },
      {
        id: "check-2",
        description: "Order all materials",
        category: "materials",
        completed: false,
      },
      {
        id: "check-3",
        description: "Gather and prepare tools",
        category: "tools",
        completed: false,
      },
      {
        id: "check-4",
        description: "Review safety procedures",
        category: "safety",
        completed: false,
      },
      {
        id: "check-5",
        description: "Clear work area",
        category: "preparation",
        completed: false,
      },
      {
        id: "check-6",
        description: "Complete all phases",
        category: "execution",
        completed: false,
      },
      {
        id: "check-7",
        description: "Final cleanup and inspection",
        category: "cleanup",
        completed: false,
      },
    ];
  }

  /**
   * Get execution plan
   */
  getPlan(planId: string): ExecutionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    planId: string,
    phaseId: string,
    taskId: string,
    status: "pending" | "in_progress" | "completed"
  ): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return false;

    const task = phase.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    task.status = status;
    if (status === "completed") {
      task.completedAt = new Date();
    }

    plan.updatedAt = new Date();

    return true;
  }

  /**
   * Generate progress report
   */
  generateProgressReport(planId: string): ProgressReport | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    let completedTasks = 0;
    let totalTasks = 0;

    const phaseProgress = plan.phases.map((phase) => {
      const phaseTasks = phase.tasks;
      const completedPhase = phaseTasks.filter((t) => t.status === "completed").length;
      totalTasks += phaseTasks.length;
      completedTasks += completedPhase;

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        progress: phaseTasks.length > 0 ? (completedPhase / phaseTasks.length) * 100 : 0,
      };
    });

    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const report: ProgressReport = {
      planId,
      generatedAt: new Date(),
      overallProgress,
      phaseProgress,
      completedTasks,
      totalTasks,
      spentCost: 0, // Would be calculated from actual expenses
      remainingCost: plan.totalCost,
      daysElapsed: Math.floor(
        (Date.now() - plan.timeline.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      daysRemaining: plan.totalDuration,
      issues: [],
      recommendations: [],
    };

    this.progressReports.set(planId, report);

    return report;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalPlans: number;
    averageCost: number;
    averageDuration: number;
  } {
    let totalCost = 0;
    let totalDuration = 0;

    this.plans.forEach((plan) => {
      totalCost += plan.totalCost;
      totalDuration += plan.totalDuration;
    });

    return {
      totalPlans: this.plans.size,
      averageCost: this.plans.size > 0 ? totalCost / this.plans.size : 0,
      averageDuration: this.plans.size > 0 ? totalDuration / this.plans.size : 0,
    };
  }
}

export default LandscapingExecutionPipeline;
