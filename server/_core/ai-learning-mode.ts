/**
 * Tier 1 educational learning modes — aligned with TIER_1_AI_CAPABILITIES.md §2
 * (Self-Learning, Certification & Expertise, Adaptive Learning)
 */

import { TRPCError } from "@trpc/server";
import {
  buildCreatorSystemPrompt,
  getCreatorAi,
  isCreatorAiId,
  type CreatorAiDefinition,
} from "./ai-creator-registry";
import { assertUserCanUseAi, enforceAiGuardrails } from "./ai-guardrails";
import { assertNoAiTakeoverInMessage } from "./ai-control";
import {
  assertMessageWithinAiRole,
  sanitizeAiReplyForRole,
} from "./ai-roles";
import {
  generateGoogleChatReply,
  isGoogleCloudAiConfigured,
  type GoogleChatTurn,
} from "./google-ai";
import { sanitizeChatHistory, sanitizeUserText } from "./input-sanitize";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";
import { assertAiEntitled } from "./access-entitlements";
import { assertAndConsumeAiUsage } from "./ai-usage-meter";
import {
  buildCoderTeachingPromptAddition,
  getCoderTeachingModules,
  isCoderTeachingCreator,
} from "./coder-teaching-curriculum";
import {
  buildGameTeachingPromptAddition,
  getGameTeachingModules,
  isGameTeachingCreator,
} from "./game-dev-teaching-curriculum";
import {
  buildBlueprintTeachingPromptAddition,
  getBlueprintTeachingModules,
  isBlueprintTeachingCreator,
} from "./blueprint-teaching-curriculum";
import {
  buildCreativeTeachingPromptAddition,
  getCreativeTeachingModules,
  isCreativeTeachingCreator,
} from "./creative-arts-teaching-curriculum";
import {
  buildLegalMasterTeachingPromptAddition,
  getLegalMasterTeachingModules,
  isLegalMasterTeachingCreator,
} from "./legal-masters-teaching-curriculum";

export type LearningLevel = "beginner" | "intermediate" | "advanced";

export type LearningMode =
  | "lesson"
  | "practice"
  | "certification"
  | "on_the_job"
  | "conversation";

export type LearningModule = {
  id: string;
  title: string;
  description: string;
  certificationPrep?: boolean;
};

const CATEGORY_MODULES: Record<string, Omit<LearningModule, "id">[]> = {
  Construction: [
    { title: "Safety & PPE fundamentals", description: "Job-site safety, OSHA awareness, and tool safety." },
    { title: "Tools & materials", description: "Core tools, material selection, and best practices." },
    { title: "Code & standards awareness", description: "Reading codes, permits, and compliance basics." },
    { title: "Troubleshooting workflows", description: "Diagnose problems step-by-step like a pro." },
    { title: "Certification & licensing prep", description: "Study paths for trade exams and licenses.", certificationPrep: true },
  ],
  Engineering: [
    { title: "Engineering fundamentals", description: "Core concepts and terminology." },
    { title: "Calculations & analysis", description: "Problem-solving methods and checks." },
    { title: "Codes & standards", description: "Industry standards and compliance." },
    { title: "Certification prep", description: "PE-style study guidance (educational only).", certificationPrep: true },
  ],
  "Legal Reference": [
    { title: "Legal concepts explained", description: "Foundational ideas in plain language." },
    { title: "Research & citations", description: "How to research and organize sources." },
    { title: "Document structure", description: "Drafting outlines and common formats." },
    { title: "Bar / exam study orientation", description: "Educational prep — not legal advice.", certificationPrep: true },
  ],
  Finance: [
    { title: "Financial fundamentals", description: "Core terms, statements, and workflows." },
    { title: "Analysis & modeling basics", description: "Spreadsheets, ratios, and scenarios." },
    { title: "Compliance awareness", description: "Regulatory context (educational)." },
    { title: "Certification orientation", description: "CPA/CFP-style study paths (educational).", certificationPrep: true },
  ],
  Technology: [
    { title: "Programming foundations", description: "Syntax, patterns, and debugging." },
    { title: "Architecture & best practices", description: "Design, testing, and maintenance." },
    { title: "Certification prep", description: "Interview and cert study drills.", certificationPrep: true },
  ],
  Language: [
    { title: "Essential vocabulary", description: "High-frequency words and phrases." },
    { title: "Grammar & structure", description: "Rules explained clearly." },
    { title: "Conversation practice", description: "Dialogues and pronunciation tips." },
    { title: "Certification prep", description: "Test-style practice (TOEFL, DELE, etc.).", certificationPrep: true },
  ],
  "Health & Wellness": [
    { title: "Wellness fundamentals", description: "Stress, sleep, and balance basics." },
    { title: "Mindfulness practice", description: "Techniques and daily habits." },
    { title: "Healthy routines", description: "Building sustainable wellness plans." },
  ],
  "Health & Fitness": [
    { title: "Exercise fundamentals", description: "Form, programming, and safety." },
    { title: "Nutrition basics", description: "Fuel, recovery, and meal planning." },
    { title: "Certification orientation", description: "Trainer cert study paths (educational).", certificationPrep: true },
  ],
  Business: [
    { title: "Business fundamentals", description: "Strategy, KPIs, and operations." },
    { title: "Growth & planning", description: "Roadmaps, markets, and execution." },
    { title: "Certification orientation", description: "MBA-style study guidance (educational).", certificationPrep: true },
  ],
  Marketing: [
    { title: "Brand & audience", description: "Positioning and customer insight." },
    { title: "Campaign planning", description: "Channels, content, and measurement." },
    { title: "Cert prep", description: "Marketing cert study drills (educational).", certificationPrep: true },
  ],
  Sales: [
    { title: "Sales fundamentals", description: "Pipeline, discovery, and closing." },
    { title: "Objection handling", description: "Scripts and negotiation basics." },
    { title: "Cert prep", description: "Sales certification orientation.", certificationPrep: true },
  ],
  Automotive: [
    { title: "Vehicle systems", description: "Engine, brakes, electrical overview." },
    { title: "Diagnostics workflow", description: "OBD codes and systematic troubleshooting." },
    { title: "Cert prep", description: "ASE-style study orientation (educational).", certificationPrep: true },
  ],
  "Small Engines": [
    { title: "Engine types", description: "Two-stroke vs four-stroke basics." },
    { title: "Maintenance & repair", description: "Carburetor, spark, fuel systems." },
    { title: "Safety & tools", description: "PPE and shop best practices." },
  ],
  Marine: [
    { title: "Marine systems overview", description: "Engine, fuel, cooling, electrical, hull, and rigging fundamentals." },
    { title: "Diagnostics workflow", description: "Symptom → test → fix for outboard, inboard, and stern drive." },
    { title: "Seasonal maintenance", description: "Commissioning, winterization, storage, and corrosion prevention." },
    { title: "Running a marina", description: "Slips, fuel dock, haul-out, storage, safety, and customer operations." },
    { title: "Cert prep orientation", description: "Marine tech / ABYC-style study guidance (educational).", certificationPrep: true },
  ],
  Creative: [
    { title: "Creative process & habits", description: "Ideation, iteration, critique, and finishing work." },
    { title: "Medium-specific craft", description: "Apply concepts to your art, music, or design." },
    { title: "Portfolio & showcase prep", description: "Present creative work professionally (educational).", certificationPrep: true },
  ],
  Writing: [
    { title: "Story & structure", description: "Plot, character, pacing, and revision." },
    { title: "Voice & style", description: "Find your tone and polish drafts." },
    { title: "Publishing orientation", description: "Paths to share your work (educational).", certificationPrep: true },
  ],
  "3D & Design": [
    { title: "3D modeling basics", description: "Meshes, materials, and topology." },
    { title: "Pipeline & export", description: "Print-ready and game-ready workflows." },
  ],
  "Blueprint & Schematics": [
    { title: "Drawing set fundamentals", description: "Title blocks, scales, revisions, sheet indexes." },
    { title: "Symbol & legend literacy", description: "Decode any discipline's symbols and line weights." },
    { title: "Multi-discipline coordination", description: "Read A/E/P/M sets together — catch clashes early." },
    { title: "Modern trends (BIM & digital twins)", description: "Where blueprint reading is heading industry-wide." },
    { title: "Trade exam plan reading", description: "Apprentice and inspector-style drawing tests.", certificationPrep: true },
  ],
  Platform: [
    { title: "Platform workflows", description: "Core UR creator platform skills." },
    { title: "Best practices", description: "Tips for getting the most from the platform." },
  ],
  Career: [
    { title: "Career planning", description: "Goals, skills, and pivots." },
    { title: "Interview prep", description: "Practice questions and storytelling." },
  ],
  News: [
    { title: "News literacy", description: "Sources, bias, and verification." },
    { title: "Summarization skills", description: "Context and background research." },
  ],
  "Real Estate": [
    { title: "Market fundamentals", description: "Valuation concepts and trends." },
    { title: "Transaction process", description: "Buy, sell, and invest basics." },
    { title: "License prep orientation", description: "Exam study guidance (educational).", certificationPrep: true },
  ],
  Outdoor: [
    { title: "Outdoor trade basics", description: "Tree care and site safety." },
    { title: "Equipment & technique", description: "Tools and professional workflows." },
  ],
  "Human Resources": [
    { title: "HR fundamentals", description: "Policies, hiring, and compliance awareness." },
    { title: "People operations", description: "Reviews, culture, and retention." },
  ],
  Operations: [
    { title: "Process improvement", description: "Lean, KPIs, and workflow mapping." },
    { title: "Operations scenarios", description: "Real-world case studies." },
  ],
  Product: [
    { title: "Product discovery", description: "User research and problem framing." },
    { title: "Roadmap & delivery", description: "Prioritization and launch planning." },
  ],
  Support: [
    { title: "Support excellence", description: "Scripts, empathy, and resolution." },
    { title: "De-escalation", description: "Handle tough conversations professionally." },
  ],
};

const DEFAULT_MODULES: Omit<LearningModule, "id">[] = [
  { title: "Domain fundamentals", description: "Core concepts in this field." },
  { title: "Hands-on practice", description: "Apply what you learn with exercises." },
  { title: "Real-world scenarios", description: "On-the-job style case studies." },
  { title: "Certification & career path", description: "Exam prep and professional growth.", certificationPrep: true },
];

export function getCurriculumForCreator(def: CreatorAiDefinition): LearningModule[] {
  if (isCoderTeachingCreator(def.id)) {
    return getCoderTeachingModules();
  }
  if (isGameTeachingCreator(def.id)) {
    return getGameTeachingModules();
  }
  if (isBlueprintTeachingCreator(def.id)) {
    return getBlueprintTeachingModules();
  }
  if (isCreativeTeachingCreator(def.id)) {
    return getCreativeTeachingModules(def.id);
  }
  if (isLegalMasterTeachingCreator(def.id)) {
    return getLegalMasterTeachingModules(def.id);
  }

  const fromCategory = CATEGORY_MODULES[def.category] ?? DEFAULT_MODULES;
  const fromScope = def.inScope.slice(0, 4).map((title) => ({
    title,
    description: `Specialist topic: ${title}`,
  }));

  const merged = [...fromScope, ...fromCategory];
  const seen = new Set<string>();
  const modules: LearningModule[] = [];

  for (const item of merged) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    modules.push({
      id: `mod-${modules.length + 1}`,
      ...item,
    });
    if (modules.length >= 8) break;
  }

  return modules;
}

function buildLearningPrompt(
  def: CreatorAiDefinition,
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  const base = buildCreatorSystemPrompt(def.id);
  const modeInstructions: Record<LearningMode, string> = {
    lesson: `You are now in **Learn — Lesson** mode. Teach like a patient trade school instructor.
Structure every lesson with: **Learning goal**, **Key concepts**, **Step-by-step explanation**, **Example**, **Check your understanding** (2–3 questions), **Next step**.
Level: ${level}. Topic: ${topic ?? def.category + " fundamentals"}.`,
    practice: `You are in **Learn — Practice** mode. Give hands-on exercises, scenarios, and quizzes with answers explained.
Include: **Scenario**, **Your task**, **Hints**, **Model answer**, **Why it matters**. Level: ${level}.`,
    certification: `You are in **Certification prep** mode (educational only — not a guarantee of passing any exam).
Provide: **Exam topics overview**, **Study plan**, **Sample questions** (5), **Answer key with explanations**, **Common mistakes**.
Remind the user to verify requirements with official licensing bodies. Level: ${level}.`,
    on_the_job: `You are in **On-the-job training** mode. Walk through realistic field scenarios.
Use: **Situation**, **What a pro checks first**, **Procedure**, **Safety warnings**, **Pro tips**. Level: ${level}.`,
    conversation: `You are in **Learn — Conversation** mode. Coach through dialogue — ask questions, correct gently, build confidence.
Level: ${level}. Topic: ${topic ?? "general skills"}.`,
  };

  return `${base}

---
EDUCATIONAL LEARNING MODE (Tier 1 Educational AI)
${modeInstructions[mode]}
${isCoderTeachingCreator(def.id) ? `\n\n${buildCoderTeachingPromptAddition(level, mode, topic)}` : ""}
${isGameTeachingCreator(def.id) ? `\n\n${buildGameTeachingPromptAddition(level, mode, topic)}` : ""}
${isBlueprintTeachingCreator(def.id) ? `\n\n${buildBlueprintTeachingPromptAddition(level, mode, topic)}` : ""}
${isCreativeTeachingCreator(def.id) ? `\n\n${buildCreativeTeachingPromptAddition(def.id, level, mode, topic)}` : ""}
${isLegalMasterTeachingCreator(def.id) ? `\n\n${buildLegalMasterTeachingPromptAddition(def.id, level, mode, topic)}` : ""}

Rules:
- Educational and recreational purposes only — not licensed professional advice.
- Adapt vocabulary to ${level} level.
- Encourage questions; celebrate progress.
- Suggest the next module when the learner completes a topic.`;
}

export async function handleCreatorLearningSession(params: {
  creatorId: string;
  message: string;
  history?: GoogleChatTurn[];
  level: LearningLevel;
  mode: LearningMode;
  topic?: string;
  userId: string;
  userEmail?: string | null;
  isPlatformOwner: boolean;
}): Promise<{ lesson: string; model: string; creatorName: string }> {
  if (!isGoogleCloudAiConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This feature is not available right now.",
    });
  }

  if (!isCreatorAiId(params.creatorId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That AI assistant is not available." });
  }

  if (isOwnerOnlyPlatformAi(params.creatorId) && !params.isPlatformOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner operations AIs do not offer public learning mode.",
    });
  }

  assertAiEntitled({
    userId: params.userId,
    email: params.userEmail,
    isPlatformOwner: params.isPlatformOwner,
    feature: "ai_learn",
    creatorId: params.creatorId,
  });

  if (!params.isPlatformOwner) {
    assertAndConsumeAiUsage({
      userId: params.userId,
      email: params.userEmail,
      creatorId: params.creatorId,
      isPlatformOwner: false,
      isLearnMode: true,
    });
  }

  const def = getCreatorAi(params.creatorId)!;

  assertUserCanUseAi(params.userId, params.isPlatformOwner);
  const message = sanitizeUserText(params.message, 4000);
  assertNoAiTakeoverInMessage(message, params.isPlatformOwner);
  assertMessageWithinAiRole(message, params.creatorId, params.isPlatformOwner);

  const history = sanitizeChatHistory(params.history ?? [], 20, 4000);
  const systemPrompt = buildLearningPrompt(
    def,
    params.level,
    params.mode,
    params.topic?.slice(0, 200),
  );

  const { reply: rawReply, model } = await generateGoogleChatReply({
    systemPrompt,
    history,
    message,
  });

  const reply = sanitizeAiReplyForRole(rawReply, params.creatorId);
  const lesson = enforceAiGuardrails({
    reply,
    userId: params.userId,
    isPlatformOwner: params.isPlatformOwner,
    role: isOwnerOnlyPlatformAi(params.creatorId) ? "admin" : undefined,
  });

  return { lesson, model, creatorName: def.name };
}

export function getCertificationOverview(def: CreatorAiDefinition): {
  title: string;
  topics: string[];
  estimatedStudyHours: number;
  disclaimer: string;
} {
  const certModules = getCurriculumForCreator(def).filter((m) => m.certificationPrep);
  return {
    title: `${def.name} — Certification & licensing orientation`,
    topics: certModules.length > 0 ? certModules.map((m) => m.title) : def.inScope,
    estimatedStudyHours: def.category === "Construction" ? 40 : 24,
    disclaimer:
      "Educational study guidance only — you are learning from an AI, not a licensed professional. If you want professional advice, consult official boards and qualified experts in your jurisdiction.",
  };
}
