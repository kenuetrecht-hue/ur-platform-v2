/**
 * Math Mentor — teaching mathematics (not bookkeeping).
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export const MATH_MENTOR_ID = "ai-math-001";

const MATH_MODULES: Omit<LearningModule, "id">[] = [
  { title: "Number sense", description: "Place value, fractions, and why numbers behave." },
  { title: "Arithmetic fluency", description: "Add, subtract, multiply, divide — with why, not just drills." },
  { title: "Pre-algebra", description: "Variables, equations, and order of operations." },
  { title: "Algebra", description: "Linear, quadratic, systems, and graphing." },
  { title: "Geometry", description: "Shapes, proofs, area, and 3D workspace measurements." },
  { title: "Trigonometry", description: "Triangles, unit circle, and shop-floor angles." },
  { title: "Statistics & probability", description: "Data, chance, and honest uncertainty." },
  { title: "Calculus intro", description: "Rates, area under a curve, and when to use it." },
  { title: "Proofs & reasoning", description: "If-then thinking without intimidation." },
  { title: "Applied math for trades", description: "HVAC loads, takeoffs, and robot kinematics — teaching only." },
  { title: "Competition & exam prep", description: "SAT/ACT/GED-style math practice — not a score guarantee.", certificationPrep: true },
];

export function isMathTeachingCreator(creatorId: string): boolean {
  return creatorId === MATH_MENTOR_ID;
}

export function getMathTeachingModules(): LearningModule[] {
  return MATH_MODULES.map((item, index) => ({ id: `math-mod-${index + 1}`, ...item }));
}

export function getMathSelfPacedPath(level: LearningLevel) {
  const paths = {
    beginner: [
      { order: 1, title: "Count and place", description: "Number sense first.", estimatedMinutes: 20, moduleTitle: "Number sense" },
      { order: 2, title: "Four operations", description: "Slow, correct, then faster.", estimatedMinutes: 30, moduleTitle: "Arithmetic fluency" },
      { order: 3, title: "Letters for numbers", description: "First equations.", estimatedMinutes: 35, moduleTitle: "Pre-algebra" },
    ],
    intermediate: [
      { order: 1, title: "Solve for x", description: "Linear equations.", estimatedMinutes: 40, moduleTitle: "Algebra" },
      { order: 2, title: "Shapes that hold", description: "Area and angles.", estimatedMinutes: 40, moduleTitle: "Geometry" },
      { order: 3, title: "Data, not vibes", description: "Mean, median, chance.", estimatedMinutes: 35, moduleTitle: "Statistics & probability" },
    ],
    advanced: [
      { order: 1, title: "Rates of change", description: "Calculus idea, not a PE stamp.", estimatedMinutes: 45, moduleTitle: "Calculus intro" },
      { order: 2, title: "Prove it", description: "Short proofs.", estimatedMinutes: 40, moduleTitle: "Proofs & reasoning" },
      { order: 3, title: "Shop math", description: "Apply to a trade problem.", estimatedMinutes: 50, moduleTitle: "Applied math for trades" },
    ],
  } as const;
  return [...paths[level]];
}

export function buildMathTeachingPromptAddition(level: LearningLevel, mode: LearningMode, topic?: string): string {
  return `
MATH MENTOR — MATHEMATICS TEACHER
Teach math, not bookkeeping (Accountant Pro AI) and not sealed engineering (Structural / HVAC specialists).
Show steps. Check the learner's work. Use 3D Workspace feet-inches when they are measuring a room.
Never claim a standardized-test score or a PE stamp.
Level: ${level} | Mode: ${mode} | Topic: ${topic ?? "Number sense"}`.trim();
}
