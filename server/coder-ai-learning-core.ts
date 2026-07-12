/**
 * ============================================================================
 * 💻🧠 UR MEDIA LLC — CODER AI EVOLVING LEARNING CORE
 * ============================================================================
 * Target: AI Code Forge / Autonomous Learning Engine Architecture
 * Rules: Automatically analyzes code compilation success rates, tracks user 
 * styling overrides, and builds a long-term codebase intelligence matrix.
 * ============================================================================
 */

import { z } from "zod";

export interface ICoderAILearningMatrix {
  engineId: "UR_CODE_FORGE_V1";
  globalGenerationsCount: number;
  lastUpdated: Date;
  
  // Evolving library of validated fixes the AI teaches itself
  selfHealedBugsLibrary: Array<{
    language: "typescript" | "javascript" | "html" | "css" | "tsx" | "jsx";
    errorTokenIdentified: string;     // e.g., "Mismatched closing div tag"
    optimalFixPattern: string;        // The correct syntax pattern it learned
    confidenceRating: number;         // Scale 0.0 to 1.0 based on user approval
    occurrencesFixed: number;         // How many times this fix was applied
    lastApplied: Date;
  }>;

  // Evolving user preference storage (Tailoring to individual brands)
  userDesignProfiles: Record<string, {
    userId: string;
    preferredFramework: "TailwindCSS" | "NativeWind" | "Bootstrap" | "Custom";
    defaultThemeColors: string[];     // e.g., ["#000000", "#FFD700"]
    frequentlyGeneratedAssets: string[]; // Tracks what they build most
    designSignature: {
      spacing: "compact" | "comfortable" | "spacious";
      typography: "minimal" | "balanced" | "expressive";
      animations: "none" | "subtle" | "prominent";
    };
    totalProjectsGenerated: number;
    lastProfileUpdate: Date;
  }>;

  // Global code patterns that work well
  successfulCodePatterns: Array<{
    pattern: string;
    language: string;
    useCase: string;
    successRate: number;
    timesUsed: number;
  }>;

  // Compilation error tracking
  compilationMetrics: {
    totalCompilations: number;
    successfulCompilations: number;
    failedCompilations: number;
    averageFixTime: number; // milliseconds
    commonErrorPatterns: Record<string, number>; // Error type -> count
  };
}

/**
 * Initialize empty Coder AI Learning Matrix
 */
export function initializeCoderAIMatrix(): ICoderAILearningMatrix {
  return {
    engineId: "UR_CODE_FORGE_V1",
    globalGenerationsCount: 0,
    lastUpdated: new Date(),
    selfHealedBugsLibrary: [],
    userDesignProfiles: {},
    successfulCodePatterns: [],
    compilationMetrics: {
      totalCompilations: 0,
      successfulCompilations: 0,
      failedCompilations: 0,
      averageFixTime: 0,
      commonErrorPatterns: {},
    },
  };
}

/**
 * PHASE 1: Individual User Learning
 * Track user design preferences and tailor code generation
 */
export function updateUserDesignProfile(
  matrix: ICoderAILearningMatrix,
  userId: string,
  preferences: {
    framework?: "TailwindCSS" | "NativeWind" | "Bootstrap" | "Custom";
    colors?: string[];
    spacing?: "compact" | "comfortable" | "spacious";
    typography?: "minimal" | "balanced" | "expressive";
    animations?: "none" | "subtle" | "prominent";
  }
): ICoderAILearningMatrix {
  if (!matrix.userDesignProfiles[userId]) {
    matrix.userDesignProfiles[userId] = {
      userId,
      preferredFramework: preferences.framework || "TailwindCSS",
      defaultThemeColors: preferences.colors || ["#000000", "#FFFFFF"],
      frequentlyGeneratedAssets: [],
      designSignature: {
        spacing: preferences.spacing || "comfortable",
        typography: preferences.typography || "balanced",
        animations: preferences.animations || "subtle",
      },
      totalProjectsGenerated: 0,
      lastProfileUpdate: new Date(),
    };
  } else {
    const profile = matrix.userDesignProfiles[userId];
    if (preferences.framework) profile.preferredFramework = preferences.framework;
    if (preferences.colors) profile.defaultThemeColors = preferences.colors;
    if (preferences.spacing) profile.designSignature.spacing = preferences.spacing;
    if (preferences.typography) profile.designSignature.typography = preferences.typography;
    if (preferences.animations) profile.designSignature.animations = preferences.animations;
    profile.lastProfileUpdate = new Date();
  }

  matrix.lastUpdated = new Date();
  return matrix;
}

/**
 * PHASE 2: Global Code Database Evolution
 * Commits a successfully compiled and published piece of software 
 * to the global Coder AI intelligence pool so it never makes the same mistake twice.
 */
export function optimizeGlobalCoderBrain(
  matrix: ICoderAILearningMatrix,
  optimization: {
    language: "typescript" | "javascript" | "html" | "css" | "tsx" | "jsx";
    bugFound: string;
    fixApplied: string;
    userApproved: boolean;
    compilationSuccessful: boolean;
  }
): ICoderAILearningMatrix {
  matrix.globalGenerationsCount += 1;

  // Find existing bug pattern or create new one
  const existingBug = matrix.selfHealedBugsLibrary.find(
    (bug) => bug.errorTokenIdentified === optimization.bugFound && bug.language === optimization.language
  );

  if (existingBug) {
    // Increase confidence if user approved
    if (optimization.userApproved) {
      existingBug.confidenceRating = Math.min(1.0, existingBug.confidenceRating + 0.05);
    }
    existingBug.occurrencesFixed += 1;
    existingBug.lastApplied = new Date();
  } else {
    // Add new bug fix to library
    matrix.selfHealedBugsLibrary.push({
      language: optimization.language,
      errorTokenIdentified: optimization.bugFound,
      optimalFixPattern: optimization.fixApplied,
      confidenceRating: optimization.userApproved ? 0.95 : 0.60,
      occurrencesFixed: 1,
      lastApplied: new Date(),
    });
  }

  // Track compilation metrics
  matrix.compilationMetrics.totalCompilations += 1;
  if (optimization.compilationSuccessful) {
    matrix.compilationMetrics.successfulCompilations += 1;
  } else {
    matrix.compilationMetrics.failedCompilations += 1;
    matrix.compilationMetrics.commonErrorPatterns[optimization.bugFound] =
      (matrix.compilationMetrics.commonErrorPatterns[optimization.bugFound] || 0) + 1;
  }

  matrix.lastUpdated = new Date();
  return matrix;
}

/**
 * PHASE 3: Critic Script Loop
 * Analyzes generated code and suggests improvements based on learned patterns
 */
export function analyzeGeneratedCode(
  matrix: ICoderAILearningMatrix,
  code: string,
  language: "typescript" | "javascript" | "html" | "css" | "tsx" | "jsx"
): {
  suggestedFixes: Array<{
    issue: string;
    fix: string;
    confidence: number;
  }>;
  successProbability: number;
} {
  const suggestedFixes: Array<{
    issue: string;
    fix: string;
    confidence: number;
  }> = [];

  // Check against known bug patterns
  for (const bug of matrix.selfHealedBugsLibrary) {
    if (bug.language === language && code.includes(bug.errorTokenIdentified)) {
      suggestedFixes.push({
        issue: bug.errorTokenIdentified,
        fix: bug.optimalFixPattern,
        confidence: bug.confidenceRating,
      });
    }
  }

  // Calculate success probability based on compilation metrics
  const successRate =
    matrix.compilationMetrics.totalCompilations > 0
      ? matrix.compilationMetrics.successfulCompilations / matrix.compilationMetrics.totalCompilations
      : 0.5;

  return {
    suggestedFixes: suggestedFixes.sort((a, b) => b.confidence - a.confidence),
    successProbability: Math.min(1.0, successRate + (suggestedFixes.length > 0 ? 0.1 : 0)),
  };
}

/**
 * PHASE 4: Generate Code with User Preferences
 * Uses learned user design profiles to generate tailored code
 */
export function generateCodeWithUserPreferences(
  matrix: ICoderAILearningMatrix,
  userId: string,
  codeType: string,
  requirements: string
): {
  generatedCode: string;
  framework: string;
  colors: string[];
  estimatedSuccessRate: number;
} {
  const userProfile = matrix.userDesignProfiles[userId];

  if (!userProfile) {
    // Default code generation
    return {
      generatedCode: `// Generated code for: ${codeType}\n// Requirements: ${requirements}`,
      framework: "TailwindCSS",
      colors: ["#000000", "#FFFFFF"],
      estimatedSuccessRate: 0.7,
    };
  }

  // Tailor code to user preferences
  const framework = userProfile.preferredFramework;
  const colors = userProfile.defaultThemeColors;
  const spacing = userProfile.designSignature.spacing;
  const typography = userProfile.designSignature.typography;
  const animations = userProfile.designSignature.animations;

  // Simulate code generation with preferences
  let generatedCode = `// Generated with ${framework}\n`;
  generatedCode += `// Theme: ${colors.join(", ")}\n`;
  generatedCode += `// Spacing: ${spacing}, Typography: ${typography}, Animations: ${animations}\n`;
  generatedCode += `// Type: ${codeType}\n`;
  generatedCode += `// Requirements: ${requirements}\n`;

  // Get success probability based on similar past projects
  const similarProjects = matrix.selfHealedBugsLibrary.length;
  const successRate = Math.min(0.95, 0.7 + similarProjects * 0.01);

  userProfile.totalProjectsGenerated += 1;

  return {
    generatedCode,
    framework,
    colors,
    estimatedSuccessRate: successRate,
  };
}

/**
 * Get learning statistics
 */
export function getCoderAIStatistics(matrix: ICoderAILearningMatrix) {
  const successRate =
    matrix.compilationMetrics.totalCompilations > 0
      ? (matrix.compilationMetrics.successfulCompilations / matrix.compilationMetrics.totalCompilations) * 100
      : 0;

  const topBugsFixed = matrix.selfHealedBugsLibrary
    .sort((a, b) => b.occurrencesFixed - a.occurrencesFixed)
    .slice(0, 5);

  const topUsers = Object.values(matrix.userDesignProfiles)
    .sort((a, b) => b.totalProjectsGenerated - a.totalProjectsGenerated)
    .slice(0, 5);

  return {
    totalGenerations: matrix.globalGenerationsCount,
    successRate: successRate.toFixed(2) + "%",
    totalBugsPatternsLearned: matrix.selfHealedBugsLibrary.length,
    totalUsersProfiled: Object.keys(matrix.userDesignProfiles).length,
    topBugsFixed,
    topUsers,
    compilationMetrics: matrix.compilationMetrics,
  };
}

// Zod validation schemas
export const CoderAIBugFixSchema = z.object({
  language: z.enum(["typescript", "javascript", "html", "css", "tsx", "jsx"]),
  bugFound: z.string(),
  fixApplied: z.string(),
  userApproved: z.boolean(),
  compilationSuccessful: z.boolean(),
});

export const UserDesignPreferencesSchema = z.object({
  framework: z.enum(["TailwindCSS", "NativeWind", "Bootstrap", "Custom"]).optional(),
  colors: z.array(z.string()).optional(),
  spacing: z.enum(["compact", "comfortable", "spacious"]).optional(),
  typography: z.enum(["minimal", "balanced", "expressive"]).optional(),
  animations: z.enum(["none", "subtle", "prominent"]).optional(),
});

export type CoderAIBugFix = z.infer<typeof CoderAIBugFixSchema>;
export type UserDesignPreferences = z.infer<typeof UserDesignPreferencesSchema>;
