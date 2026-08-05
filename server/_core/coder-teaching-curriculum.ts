/**
 * TechBuilder — self-paced coding curriculum so learners can code on their own.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export type CoderExercise = {
  id: string;
  title: string;
  level: LearningLevel;
  topic: string;
  prompt: string;
  starterFile?: { path: string; content: string };
};

export type SelfPacedStep = {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleTitle: string;
};

const CODER_MODULES: Omit<LearningModule, "id">[] = [
  {
    title: "How code works (zero experience)",
    description: "Variables, logic, and what a program actually does — no jargon overload.",
  },
  {
    title: "Your first program",
    description: "Write and run Hello World in JavaScript/TypeScript step by step.",
  },
  {
    title: "HTML & CSS basics",
    description: "Structure a page and style it — the foundation of every web app.",
  },
  {
    title: "JavaScript fundamentals",
    description: "Functions, loops, arrays, objects — the core toolkit.",
  },
  {
    title: "React & React Native intro",
    description: "Components, props, state — build UI like UR Platform does.",
  },
  {
    title: "Reading error messages",
    description: "Debug like a pro: stack traces, console.log, and fix strategies.",
  },
  {
    title: "Git & version control basics",
    description: "Commits, branches, and collaborating without fear.",
  },
  {
    title: "APIs & fetching data",
    description: "Connect your app to servers — async/await and JSON.",
  },
  {
    title: "Testing your code",
    description: "Write tests, run checks, ship with confidence.",
  },
  {
    title: "Architecture & clean code",
    description: "Folders, patterns, and maintainable project structure.",
  },
  {
    title: "Build a mini-app solo",
    description: "Capstone: plan, build, and test a small app entirely on your own.",
  },
  {
    title: "Interview & cert prep",
    description: "Coding interviews, portfolio projects, cert study paths.",
    certificationPrep: true,
  },
];

export function isCoderTeachingCreator(creatorId: string): boolean {
  return creatorId === "ai-coder-001";
}

export function getCoderTeachingModules(): LearningModule[] {
  return CODER_MODULES.map((item, index) => ({
    id: `coder-mod-${index + 1}`,
    ...item,
  }));
}

export const CODER_SELF_PACED_PATH: Record<LearningLevel, SelfPacedStep[]> = {
  beginner: [
    { order: 1, title: "Understand what code is", description: "15-min intro — no typing yet.", estimatedMinutes: 15, moduleTitle: "How code works (zero experience)" },
    { order: 2, title: "Type your first lines", description: "Hello World in the sandbox.", estimatedMinutes: 20, moduleTitle: "Your first program" },
    { order: 3, title: "Make something visible", description: "HTML/CSS mini page.", estimatedMinutes: 30, moduleTitle: "HTML & CSS basics" },
    { order: 4, title: "Add interactivity", description: "Variables and functions.", estimatedMinutes: 45, moduleTitle: "JavaScript fundamentals" },
    { order: 5, title: "Build a tiny app", description: "Combine everything in sandbox.", estimatedMinutes: 60, moduleTitle: "Build a mini-app solo" },
  ],
  intermediate: [
    { order: 1, title: "React components deep dive", description: "Props, state, effects.", estimatedMinutes: 45, moduleTitle: "React & React Native intro" },
    { order: 2, title: "Debug real bugs", description: "Practice reading errors.", estimatedMinutes: 30, moduleTitle: "Reading error messages" },
    { order: 3, title: "Fetch live data", description: "APIs and async patterns.", estimatedMinutes: 40, moduleTitle: "APIs & fetching data" },
    { order: 4, title: "Ship with tests", description: "Test-driven habits.", estimatedMinutes: 35, moduleTitle: "Testing your code" },
  ],
  advanced: [
    { order: 1, title: "System design basics", description: "Scale-minded architecture.", estimatedMinutes: 50, moduleTitle: "Architecture & clean code" },
    { order: 2, title: "Git workflow mastery", description: "Branches, PRs, collaboration.", estimatedMinutes: 40, moduleTitle: "Git & version control basics" },
    { order: 3, title: "Solo capstone project", description: "Full app from scratch.", estimatedMinutes: 120, moduleTitle: "Build a mini-app solo" },
    { order: 4, title: "Interview drill", description: "Mock technical questions.", estimatedMinutes: 45, moduleTitle: "Interview & cert prep" },
  ],
};

const CODER_EXERCISES: CoderExercise[] = [
  {
    id: "ex-hello",
    title: "Hello World",
    level: "beginner",
    topic: "Your first program",
    prompt: "Teach me to write my first program. Give me one small task I can type myself and explain every line.",
    starterFile: {
      path: "hello.js",
      content: "// Your first program — replace the message below\nconsole.log('Hello, world!');\n",
    },
  },
  {
    id: "ex-variables",
    title: "Variables quiz",
    level: "beginner",
    topic: "JavaScript fundamentals",
    prompt: "Give me a practice exercise on variables and types. I want to solve it myself — hints only until I ask for the answer.",
  },
  {
    id: "ex-component",
    title: "React component",
    level: "intermediate",
    topic: "React & React Native intro",
    prompt: "Walk me through building a simple React component with props. I'll code it in the sandbox — coach, don't write it all for me.",
    starterFile: {
      path: "MyComponent.tsx",
      content: "import { View, Text } from 'react-native';\n\n// TODO: Create a component that accepts a `name` prop\nexport function MyComponent() {\n  return (\n    <View>\n      <Text>Replace me</Text>\n    </View>\n  );\n}\n",
    },
  },
  {
    id: "ex-debug",
    title: "Fix the bug",
    level: "intermediate",
    topic: "Reading error messages",
    prompt: "Give me a broken code snippet and teach me how to find and fix the bug step by step.",
  },
  {
    id: "ex-fetch",
    title: "Fetch API data",
    level: "intermediate",
    topic: "APIs & fetching data",
    prompt: "Teach me async/await with fetch. Give me an exercise to load JSON and display it — I'll implement it solo.",
  },
  {
    id: "ex-capstone",
    title: "Solo mini-app",
    level: "advanced",
    topic: "Build a mini-app solo",
    prompt: "I want to build a small todo or notes app entirely on my own. Give me a requirements list and milestones — check my work at each step.",
    starterFile: {
      path: "App.tsx",
      content: "import { View, Text } from 'react-native';\n\n// Solo capstone — build your mini-app here\nexport default function App() {\n  return (\n    <View>\n      <Text>My solo project</Text>\n    </View>\n  );\n}\n",
    },
  },
];

export function getCoderSelfPacedPath(level: LearningLevel): SelfPacedStep[] {
  return CODER_SELF_PACED_PATH[level];
}

export function getCoderPracticeExercises(params: {
  level?: LearningLevel;
  count?: number;
}): CoderExercise[] {
  const count = params.count ?? 5;
  let list = CODER_EXERCISES;
  if (params.level) {
    list = list.filter((e) => e.level === params.level);
  }
  return list.slice(0, count);
}

export function buildCoderTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  const path = CODER_SELF_PACED_PATH[level];
  const nextStep = path[0];

  return `
---
TECHBUILDER CODING INSTRUCTOR MODE
You teach people to code so they can build software **on their own** — not depend on you forever.

Teaching philosophy:
- **Guide, don't gatekeep** — explain WHY, not just WHAT.
- **I do, we do, you do** — show one example, pair on one, then learner codes solo.
- **Always give a hands-on task** the learner can complete in the Build sandbox.
- **Celebrate self-sufficiency** — "You can do this without me" is the goal.

Level: ${level}
Mode: ${mode}
Topic: ${topic ?? nextStep?.moduleTitle ?? "Programming fundamentals"}

For **lessons**: Use sections — Goal · Concept · Walkthrough · Try it yourself (specific file + code starter) · Self-check questions · What to learn next on your own.
For **practice**: Give exercises with **Hints (level 1–3)** before revealing answers. Never dump full solutions unless the learner tried twice.
For **certification**: Interview questions, portfolio tips, study schedules — educational only.
For **on_the_job**: Real dev workflows — debugging production, code review, shipping features.
For **conversation**: Socratic coaching — ask what they tried, what error they saw, what they think is wrong.

Self-paced path for ${level} (suggest the next step when they finish a topic):
${path.map((s) => `${s.order}. ${s.title} (~${s.estimatedMinutes}m) — ${s.moduleTitle}`).join("\n")}

Remind learners: open the **Build** tab to save code, run tests, and grow their sandbox as projects get bigger.
`.trim();
}
