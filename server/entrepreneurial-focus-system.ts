/**
 * Entrepreneurial Focus Validation System
 * Ensures the app is used for legitimate educational and entrepreneurial purposes
 * Validates user goals and activities align with business/learning objectives
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EntrepreneurialCategory = 
  | "business_creation"
  | "skill_development"
  | "market_research"
  | "product_development"
  | "marketing_strategy"
  | "financial_planning"
  | "legal_compliance"
  | "team_building"
  | "sales_strategy"
  | "customer_service"
  | "scaling"
  | "innovation";

export type LegitimacyScore = "high" | "medium" | "low" | "blocked";

export interface UserGoal {
  id: string;
  userId: string;
  category: EntrepreneurialCategory;
  description: string;
  targetOutcome: string;
  timeline: string;
  legitimacyScore: LegitimacyScore;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntrepreneurialActivity {
  id: string;
  userId: string;
  goalId: string;
  activityType: string;
  description: string;
  timestamp: Date;
  relevanceScore: number; // 0-1
  contributesToGoal: boolean;
}

export interface LegitimacyAssessment {
  id: string;
  userId: string;
  assessmentType: "goal" | "activity" | "request";
  targetId: string;
  score: LegitimacyScore;
  reasoning: string[];
  redFlags: string[];
  timestamp: Date;
}

export interface EntrepreneurialResource {
  id: string;
  category: EntrepreneurialCategory;
  title: string;
  description: string;
  content: string;
  type: "guide" | "template" | "checklist" | "tool" | "course";
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface BusinessMetrics {
  userId: string;
  goalsCreated: number;
  activitiesLogged: number;
  averageLegitimacyScore: number;
  skillsImproved: string[];
  businessesLaunched: number;
  lastActivityDate: Date;
}

export interface LegitimacyViolation {
  id: string;
  userId: string;
  violationType: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UserGoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.enum([
    "business_creation", "skill_development", "market_research", "product_development",
    "marketing_strategy", "financial_planning", "legal_compliance", "team_building",
    "sales_strategy", "customer_service", "scaling", "innovation"
  ]),
  description: z.string().min(10),
  targetOutcome: z.string().min(10),
  timeline: z.string(),
  legitimacyScore: z.enum(["high", "medium", "low", "blocked"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const EntrepreneurialActivitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  goalId: z.string(),
  activityType: z.string().min(1),
  description: z.string().min(1),
  timestamp: z.date(),
  relevanceScore: z.number().min(0).max(1),
  contributesToGoal: z.boolean(),
});

const LegitimacyAssessmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  assessmentType: z.enum(["goal", "activity", "request"]),
  targetId: z.string(),
  score: z.enum(["high", "medium", "low", "blocked"]),
  reasoning: z.array(z.string()),
  redFlags: z.array(z.string()),
  timestamp: z.date(),
});

// ============================================================================
// ENTREPRENEURIAL FOCUS VALIDATION SYSTEM
// ============================================================================

export class EntrepreneurialFocusSystem {
  private userGoals: Map<string, UserGoal[]> = new Map();
  private activities: Map<string, EntrepreneurialActivity[]> = new Map();
  private assessments: LegitimacyAssessment[] = [];
  private resources: Map<string, EntrepreneurialResource> = new Map();
  private businessMetrics: Map<string, BusinessMetrics> = new Map();
  private violations: LegitimacyViolation[] = [];

  // Keywords that indicate legitimate entrepreneurial focus
  private readonly LEGITIMATE_KEYWORDS = {
    business_creation: [
      "startup", "business plan", "LLC", "incorporation", "business model",
      "revenue stream", "customer acquisition", "market entry", "launch",
    ],
    skill_development: [
      "learn", "certification", "training", "course", "skill", "expertise",
      "mastery", "competency", "development", "improvement",
    ],
    market_research: [
      "market analysis", "competitor research", "customer research", "survey",
      "focus group", "trend analysis", "industry research", "SWOT",
    ],
    product_development: [
      "prototype", "MVP", "product design", "feature", "roadmap", "iteration",
      "testing", "user feedback", "beta",
    ],
    marketing_strategy: [
      "marketing plan", "brand", "social media", "content marketing", "SEO",
      "advertising", "campaign", "audience", "engagement",
    ],
    financial_planning: [
      "budget", "cash flow", "financial forecast", "pricing", "profitability",
      "funding", "investment", "revenue", "expense",
    ],
    legal_compliance: [
      "terms of service", "privacy policy", "contract", "compliance", "regulation",
      "license", "permit", "tax", "legal",
    ],
    team_building: [
      "hiring", "recruitment", "team", "culture", "leadership", "delegation",
      "management", "collaboration", "roles",
    ],
    sales_strategy: [
      "sales funnel", "sales process", "closing", "negotiation", "proposal",
      "pitch", "deal", "conversion", "retention",
    ],
    customer_service: [
      "customer support", "feedback", "satisfaction", "retention", "loyalty",
      "service quality", "complaint resolution", "CRM",
    ],
    scaling: [
      "growth", "expansion", "scaling", "automation", "systems", "processes",
      "efficiency", "capacity", "infrastructure",
    ],
    innovation: [
      "innovation", "disruption", "new idea", "improvement", "optimization",
      "problem solving", "creative", "unique value",
    ],
  };

  // Keywords that indicate non-entrepreneurial/harmful use
  private readonly BLOCKED_KEYWORDS = [
    "illegal", "fraud", "scam", "hack", "exploit", "abuse", "harm",
    "violence", "harassment", "discrimination", "exploitation",
  ];

  constructor() {
    this.initializeResources();
  }

  /**
   * Initialize entrepreneurial resources
   */
  private initializeResources(): void {
    const resources: EntrepreneurialResource[] = [
      {
        id: "res-1",
        category: "business_creation",
        title: "Business Plan Template",
        description: "Complete template for creating a professional business plan",
        content: "Business Plan Guide...",
        type: "template",
        difficulty: "beginner",
      },
      {
        id: "res-2",
        category: "skill_development",
        title: "Entrepreneurship Fundamentals",
        description: "Core skills every entrepreneur needs",
        content: "Entrepreneurship Guide...",
        type: "guide",
        difficulty: "beginner",
      },
      {
        id: "res-3",
        category: "market_research",
        title: "Market Analysis Checklist",
        description: "Step-by-step checklist for conducting market research",
        content: "Market Research Checklist...",
        type: "checklist",
        difficulty: "intermediate",
      },
      {
        id: "res-4",
        category: "financial_planning",
        title: "Financial Forecasting Tool",
        description: "Tool for creating financial projections",
        content: "Financial Tool...",
        type: "tool",
        difficulty: "intermediate",
      },
      {
        id: "res-5",
        category: "scaling",
        title: "Growth Strategy Course",
        description: "Learn strategies for scaling your business",
        content: "Growth Course...",
        type: "course",
        difficulty: "advanced",
      },
    ];

    resources.forEach((resource) => {
      this.resources.set(resource.id, resource);
    });
  }

  /**
   * Create user goal
   */
  createUserGoal(
    userId: string,
    category: EntrepreneurialCategory,
    description: string,
    targetOutcome: string,
    timeline: string
  ): UserGoal {
    // Assess legitimacy
    const legitimacyScore = this.assessGoalLegitimacy(description, targetOutcome);

    const goal: UserGoal = {
      id: `ug-${Date.now()}-${Math.random()}`,
      userId,
      category,
      description,
      targetOutcome,
      timeline,
      legitimacyScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    UserGoalSchema.parse(goal);

    const goals = this.userGoals.get(userId) || [];
    goals.push(goal);
    this.userGoals.set(userId, goals);

    // Record assessment
    this.recordAssessment(userId, "goal", goal.id, legitimacyScore, description, targetOutcome);

    return goal;
  }

  /**
   * Assess goal legitimacy
   */
  private assessGoalLegitimacy(description: string, targetOutcome: string): LegitimacyScore {
    const text = `${description} ${targetOutcome}`.toLowerCase();

    // Check for blocked keywords
    for (const keyword of this.BLOCKED_KEYWORDS) {
      if (text.includes(keyword)) {
        return "blocked";
      }
    }

    // Check for legitimate keywords
    let legitimateCount = 0;
    for (const keywords of Object.values(this.LEGITIMATE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          legitimateCount++;
        }
      }
    }

    if (legitimateCount >= 3) {
      return "high";
    } else if (legitimateCount >= 1) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * Log activity
   */
  logActivity(
    userId: string,
    goalId: string,
    activityType: string,
    description: string
  ): EntrepreneurialActivity {
    // Assess relevance to goal
    const goal = this.findUserGoal(userId, goalId);
    const relevanceScore = goal ? this.assessActivityRelevance(description, goal) : 0;
    const contributesToGoal = relevanceScore > 0.5;

    const activity: EntrepreneurialActivity = {
      id: `ea-${Date.now()}-${Math.random()}`,
      userId,
      goalId,
      activityType,
      description,
      timestamp: new Date(),
      relevanceScore,
      contributesToGoal,
    };

    EntrepreneurialActivitySchema.parse(activity);

    const activities = this.activities.get(userId) || [];
    activities.push(activity);
    this.activities.set(userId, activities);

    return activity;
  }

  /**
   * Assess activity relevance to goal
   */
  private assessActivityRelevance(description: string, goal: UserGoal): number {
    const text = description.toLowerCase();
    const categoryKeywords = this.LEGITIMATE_KEYWORDS[goal.category] || [];

    let matchCount = 0;
    for (const keyword of categoryKeywords) {
      if (text.includes(keyword)) {
        matchCount++;
      }
    }

    return Math.min(1, matchCount / 3);
  }

  /**
   * Find user goal
   */
  private findUserGoal(userId: string, goalId: string): UserGoal | undefined {
    const goals = this.userGoals.get(userId) || [];
    return goals.find((g) => g.id === goalId);
  }

  /**
   * Record assessment
   */
  private recordAssessment(
    userId: string,
    assessmentType: "goal" | "activity" | "request",
    targetId: string,
    score: LegitimacyScore,
    ...details: string[]
  ): void {
    const reasoning: string[] = [];
    const redFlags: string[] = [];

    const text = details.join(" ").toLowerCase();

    // Analyze for red flags
    for (const keyword of this.BLOCKED_KEYWORDS) {
      if (text.includes(keyword)) {
        redFlags.push(`Contains blocked keyword: ${keyword}`);
      }
    }

    // Generate reasoning
    if (score === "high") {
      reasoning.push("Multiple legitimate entrepreneurial keywords detected");
      reasoning.push("Clear business/learning focus");
    } else if (score === "medium") {
      reasoning.push("Some entrepreneurial indicators present");
      reasoning.push("May need clarification");
    } else if (score === "low") {
      reasoning.push("Limited entrepreneurial focus indicators");
      reasoning.push("Recommend clarifying business goals");
    } else {
      reasoning.push("Contains blocked content");
      redFlags.push("Assessment blocked due to policy violation");
    }

    const assessment: LegitimacyAssessment = {
      id: `la-${Date.now()}-${Math.random()}`,
      userId,
      assessmentType,
      targetId,
      score,
      reasoning,
      redFlags,
      timestamp: new Date(),
    };

    LegitimacyAssessmentSchema.parse(assessment);
    this.assessments.push(assessment);
  }

  /**
   * Get user goals
   */
  getUserGoals(userId: string): UserGoal[] {
    return this.userGoals.get(userId) || [];
  }

  /**
   * Get user activities
   */
  getUserActivities(userId: string): EntrepreneurialActivity[] {
    return this.activities.get(userId) || [];
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(userId: string): BusinessMetrics {
    if (!this.businessMetrics.has(userId)) {
      const goals = this.userGoals.get(userId) || [];
      const activities = this.activities.get(userId) || [];

      const metrics: BusinessMetrics = {
        userId,
        goalsCreated: goals.length,
        activitiesLogged: activities.length,
        averageLegitimacyScore: this.calculateAverageLegitimacy(goals),
        skillsImproved: this.extractSkillsImproved(activities),
        businessesLaunched: goals.filter((g) => g.category === "business_creation").length,
        lastActivityDate: activities.length > 0 ? activities[activities.length - 1].timestamp : new Date(),
      };

      this.businessMetrics.set(userId, metrics);
    }

    return this.businessMetrics.get(userId)!;
  }

  /**
   * Calculate average legitimacy score
   */
  private calculateAverageLegitimacy(goals: UserGoal[]): number {
    const scoreMap = { high: 1, medium: 0.66, low: 0.33, blocked: 0 };
    if (goals.length === 0) return 0;

    const sum = goals.reduce((acc, goal) => acc + scoreMap[goal.legitimacyScore], 0);
    return sum / goals.length;
  }

  /**
   * Extract skills improved
   */
  private extractSkillsImproved(activities: EntrepreneurialActivity[]): string[] {
    const skills = new Set<string>();
    activities.forEach((activity) => {
      if (activity.activityType.includes("learn")) {
        skills.add(activity.description.substring(0, 50));
      }
    });
    return Array.from(skills);
  }

  /**
   * Get entrepreneurial resources
   */
  getResourcesByCategory(category: EntrepreneurialCategory): EntrepreneurialResource[] {
    return Array.from(this.resources.values()).filter((r) => r.category === category);
  }

  /**
   * Record violation
   */
  recordViolation(
    userId: string,
    violationType: string,
    description: string,
    severity: "low" | "medium" | "high" | "critical"
  ): LegitimacyViolation {
    const violation: LegitimacyViolation = {
      id: `lv-${Date.now()}-${Math.random()}`,
      userId,
      violationType,
      description,
      severity,
      timestamp: new Date(),
      resolved: false,
    };

    this.violations.push(violation);
    return violation;
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalGoals: number;
    totalActivities: number;
    averageLegitimacy: number;
    highLegitimacyGoals: number;
    blockedGoals: number;
    totalViolations: number;
  } {
    const allGoals = Array.from(this.userGoals.values()).flat();
    const allActivities = Array.from(this.activities.values()).flat();

    const highLegitimacyGoals = allGoals.filter((g) => g.legitimacyScore === "high").length;
    const blockedGoals = allGoals.filter((g) => g.legitimacyScore === "blocked").length;
    const averageLegitimacy = this.calculateAverageLegitimacy(allGoals);

    return {
      totalGoals: allGoals.length,
      totalActivities: allActivities.length,
      averageLegitimacy,
      highLegitimacyGoals,
      blockedGoals,
      totalViolations: this.violations.length,
    };
  }
}

export default EntrepreneurialFocusSystem;
