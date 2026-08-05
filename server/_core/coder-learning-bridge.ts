/**
 * Bridges coder-ai-learning-core into live TechBuilder chat and sandbox flows.
 */

import {
  analyzeGeneratedCode,
  initializeCoderAIMatrix,
  optimizeGlobalCoderBrain,
  updateUserDesignProfile,
  type ICoderAILearningMatrix,
  type UserDesignPreferences,
} from "../coder-ai-learning-core";
import { loadLearningJson, saveLearningJson } from "../db-coder-sandbox";

const matrixStore = new Map<string, ICoderAILearningMatrix>();
const matrixHydrated = new Set<string>();

async function getMatrix(userId: string): Promise<ICoderAILearningMatrix> {
  let matrix = matrixStore.get(userId);
  if (!matrix) {
    matrix = initializeCoderAIMatrix();
    matrixStore.set(userId, matrix);
  }

  if (!matrixHydrated.has(userId)) {
    const json = await loadLearningJson(userId);
    if (json) {
      try {
        const parsed = JSON.parse(json) as ICoderAILearningMatrix;
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        matrixStore.set(userId, parsed);
        matrix = parsed;
      } catch {
        // keep fresh matrix
      }
    }
    matrixHydrated.add(userId);
  }

  return matrix!;
}

async function persistMatrix(userId: string, matrix: ICoderAILearningMatrix): Promise<void> {
  matrixStore.set(userId, matrix);
  await saveLearningJson(userId, JSON.stringify(matrix));
}

export function buildCoderLearningContext(userId: string): string {
  const matrix = matrixStore.get(userId) ?? initializeCoderAIMatrix();
  const profile = matrix.userDesignProfiles[userId];
  const topFixes = matrix.selfHealedBugsLibrary
    .sort((a, b) => b.confidenceRating - a.confidenceRating)
    .slice(0, 5);

  const lines: string[] = [
    "You are TechBuilder — full parity: chat, learn, hive, web search, voice, 3D workspace, sandbox build/test.",
    "Build tab: autonomous agent, templates, GitHub sync, preview, CI, ephemeral cloud execution (wiped on end/TTL).",
    "When users build apps, suggest file paths and structure suitable for their sandbox project.",
  ];

  if (profile) {
    lines.push(
      `User prefers ${profile.preferredFramework}, spacing ${profile.designSignature.spacing}, typography ${profile.designSignature.typography}.`,
      `Theme colors: ${profile.defaultThemeColors.join(", ")}.`,
    );
  }

  if (topFixes.length > 0) {
    lines.push(
      "Known fix patterns from past projects:",
      ...topFixes.map((f) => `- [${f.language}] ${f.errorTokenIdentified} → ${f.optimalFixPattern}`),
    );
  }

  return lines.join("\n");
}

/** Hydrate learning matrix from DB before chat (fire-and-forget safe). */
export async function hydrateCoderLearning(userId: string): Promise<void> {
  await getMatrix(userId);
}

export async function recordCoderPreferences(userId: string, prefs: UserDesignPreferences) {
  const matrix = updateUserDesignProfile(await getMatrix(userId), userId, prefs);
  await persistMatrix(userId, matrix);
  return profileSummary(matrix, userId);
}

export async function recordCoderBugFix(
  userId: string,
  fix: {
    language: "typescript" | "javascript" | "html" | "css" | "tsx" | "jsx";
    bugFound: string;
    fixApplied: string;
    userApproved: boolean;
    compilationSuccessful: boolean;
  },
) {
  const matrix = optimizeGlobalCoderBrain(await getMatrix(userId), fix);
  await persistMatrix(userId, matrix);
  return profileSummary(matrix, userId);
}

export async function analyzeCoderFileContent(
  userId: string,
  code: string,
  language: "typescript" | "javascript" | "html" | "css" | "tsx" | "jsx",
) {
  return analyzeGeneratedCode(await getMatrix(userId), code, language);
}

function profileSummary(matrix: ICoderAILearningMatrix, userId: string) {
  const profile = matrix.userDesignProfiles[userId];
  return {
    projectsGenerated: profile?.totalProjectsGenerated ?? 0,
    bugsLearned: matrix.selfHealedBugsLibrary.length,
    framework: profile?.preferredFramework ?? "TailwindCSS",
  };
}

export async function getCoderLearningStats(userId: string) {
  const matrix = await getMatrix(userId);
  const profile = matrix.userDesignProfiles[userId];
  return {
    framework: profile?.preferredFramework ?? "TailwindCSS",
    projectsGenerated: profile?.totalProjectsGenerated ?? 0,
    bugsLearned: matrix.selfHealedBugsLibrary.length,
    successRate:
      matrix.compilationMetrics.totalCompilations > 0
        ? matrix.compilationMetrics.successfulCompilations / matrix.compilationMetrics.totalCompilations
        : null,
  };
}
