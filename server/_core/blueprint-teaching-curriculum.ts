/**
 * Blueprint Reader Academy — full teaching curriculum (parity with TechBuilder / GameForge).
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";
import { BLUEPRINT_READER_AI_ID } from "./blueprint-reading-service";

const BLUEPRINT_MODULES: Omit<LearningModule, "id">[] = [
  {
    title: "How to read any drawing set",
    description: "Title blocks, scales, north arrows, revisions — universal blueprint literacy.",
  },
  {
    title: "Architectural floor plans",
    description: "Walls, doors, windows, dimensions, room tags, and reflected ceiling plans.",
  },
  {
    title: "Structural & framing plans",
    description: "Beams, columns, load paths, connection symbols, and detail callouts.",
  },
  {
    title: "Electrical one-lines & panels",
    description: "Single-line diagrams, panel schedules, circuit numbering, NEC awareness.",
  },
  {
    title: "Plumbing, P&ID & isometrics",
    description: "Pipe symbols, valves, equipment tags, flow direction, invert elevations.",
  },
  {
    title: "Mechanical & HVAC drawings",
    description: "Duct layouts, VAV boxes, equipment schedules, CFM and sizing notes.",
  },
  {
    title: "Site, civil & grading",
    description: "Contours, utilities, storm/sewer, easements, and stakeout basics.",
  },
  {
    title: "PCB & electronic schematics",
    description: "Component refs, nets, power rails, ground symbols, and sheet hierarchy.",
  },
  {
    title: "Automotive & robotics diagrams",
    description: "Wiring colors, connector pins, URDF links, assembly exploded views.",
  },
  {
    title: "Symbols, legends & line weights",
    description: "Decode any legend — ISA, IEEE, AIA, ISO — and line-type meaning.",
  },
  {
    title: "Trends: BIM, digital twins & AI takeoff",
    description: "Modern workflows — not just static PDFs. Industry direction every pro should know.",
  },
  {
    title: "Certification & field exam prep",
    description: "Plan reading for trade exams, inspector tests, and apprentice boards.",
    certificationPrep: true,
  },
];

export function isBlueprintTeachingCreator(creatorId: string): boolean {
  return creatorId === BLUEPRINT_READER_AI_ID;
}

export function getBlueprintTeachingModules(): LearningModule[] {
  return BLUEPRINT_MODULES.map((item, index) => ({
    id: `blueprint-mod-${index + 1}`,
    ...item,
  }));
}

export type BlueprintSelfPacedStep = {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleTitle: string;
};

export const BLUEPRINT_SELF_PACED_PATH: Record<LearningLevel, BlueprintSelfPacedStep[]> = {
  beginner: [
    {
      order: 1,
      title: "Find the title block",
      description: "Locate project name, scale, and sheet number.",
      estimatedMinutes: 15,
      moduleTitle: "How to read any drawing set",
    },
    {
      order: 2,
      title: "Read a simple floor plan",
      description: "Walls, doors, one dimension string.",
      estimatedMinutes: 25,
      moduleTitle: "Architectural floor plans",
    },
    {
      order: 3,
      title: "Legend scavenger hunt",
      description: "Match 10 symbols to meanings.",
      estimatedMinutes: 20,
      moduleTitle: "Symbols, legends & line weights",
    },
  ],
  intermediate: [
    {
      order: 1,
      title: "Cross-discipline sheet index",
      description: "Navigate A/E/P/M sets.",
      estimatedMinutes: 30,
      moduleTitle: "How to read any drawing set",
    },
    {
      order: 2,
      title: "Electrical one-line walkthrough",
      description: "From service to branch circuits.",
      estimatedMinutes: 40,
      moduleTitle: "Electrical one-lines & panels",
    },
    {
      order: 3,
      title: "P&ID symbol drill",
      description: "Valves, instruments, equipment tags.",
      estimatedMinutes: 35,
      moduleTitle: "Plumbing, P&ID & isometrics",
    },
  ],
  advanced: [
    {
      order: 1,
      title: "Coordination clash mindset",
      description: "Read across trades for conflicts.",
      estimatedMinutes: 45,
      moduleTitle: "Trends: BIM, digital twins & AI takeoff",
    },
    {
      order: 2,
      title: "Mock plan check",
      description: "Review a set like an inspector.",
      estimatedMinutes: 50,
      moduleTitle: "Certification & field exam prep",
    },
  ],
};

export function getBlueprintSelfPacedPath(level: LearningLevel): BlueprintSelfPacedStep[] {
  return BLUEPRINT_SELF_PACED_PATH[level];
}

export function buildBlueprintTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  return `
## Blueprint Reader Academy (active)
Teaching philosophy: **Read drawings like a detective** — title block first, legend second, never guess symbols.
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "schematic literacy"}.

For every lesson include:
- **Drawing type** (architectural, electrical, P&ID, etc.)
- **What to look at first** on the sheet
- **3–5 symbol examples** with plain-language meaning
- **Common mistakes** apprentices make
- **Trend tie-in** (BIM, digital twin, or AI takeoff when relevant)
- **Practice**: ask the learner to describe one area of a drawing they have

You read **any schematic type** — never refuse because the discipline is unfamiliar; apply general blueprint literacy and note when a hive peer (electrician, structural, plumber) should verify field work.
`.trim();
}
