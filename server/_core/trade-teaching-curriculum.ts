/**
 * Dedicated Learn modules for remaining construction trades.
 * Educational / on-the-job coaching — not a license and not a substitute for OSHA or code officials.
 */

import { TRADE_LEARN_SPECIALIST_IDS } from "../../lib/specialist-job-tools";

type LearningLevel = "beginner" | "intermediate" | "advanced";
type LearningMode = "lesson" | "practice" | "certification" | "on_the_job" | "conversation";
type LearningModule = {
  id: string;
  title: string;
  description: string;
  certificationPrep?: boolean;
};

export const TRADE_LEARN_CREATOR_IDS = new Set<string>(TRADE_LEARN_SPECIALIST_IDS);

export function isTradeTeachingCreator(creatorId: string): boolean {
  return TRADE_LEARN_CREATOR_IDS.has(creatorId);
}

type TradeModule = Omit<LearningModule, "id">;

const SHARED_FIELD: TradeModule[] = [
  {
    title: "Look up any brand on the job",
    description: "Nameplate, year, and model — pull the OEM page, remember this site's gear, and troubleshoot without guessing part numbers.",
  },
  {
    title: "Jobsite safety first",
    description: "PPE, lockout, falls, and why you stop when the drawing and the hole in the wall do not match.",
  },
];

const BY_TRADE: Record<string, TradeModule[]> = {
  "ai-electrician-001": [
    ...SHARED_FIELD,
    { title: "Circuits, panels, and devices", description: "Load paths, breakers, GFCI/AFCI awareness, and labeling a panel like a pro." },
    { title: "NEC awareness (educational)", description: "How to read a code article, not memorize the whole book — verify with the adopted edition." },
    { title: "Troubleshooting dead circuits", description: "Symptom → safe test → fix. Meter first. Live-work warnings stay on." },
    { title: "Residential vs commercial habits", description: "Box fill, conduit, lighting, and when to call the engineer of record." },
    { title: "Jobsite documentation", description: "As-builts, photos, and what the inspector will ask." },
    { title: "Journeyman / license exam orientation", description: "Study path only — not a license and not a score guarantee.", certificationPrep: true },
  ],
  "ai-contractor-001": [
    ...SHARED_FIELD,
    { title: "Takeoff and estimating habits", description: "Quantities, waste, labor hours, and the contingencies you write down." },
    { title: "Schedule and trade stacking", description: "Who is in the room, in what order, and what blocks the next crew." },
    { title: "Subs, change orders, and paper trail", description: "Educational contract concepts — not a binding agreement." },
    { title: "Inspections and punch", description: "What fails first-time inspections and how to close a job clean." },
    { title: "Jobsite leadership", description: "Safety meeting, daily log, and when to stop work." },
    { title: "GC / builder license orientation", description: "Exam topics and business basics (educational).", certificationPrep: true },
  ],
  "ai-hvac-001": [
    ...SHARED_FIELD,
    { title: "Heat, cool, and airflow basics", description: "Psychrometrics in plain language, static pressure, and filter reality." },
    { title: "Furnace, heat pump, and split systems", description: "Sequence of operation and the sensors that lie." },
    { title: "Charging and leak concepts (educational)", description: "EPA 608 context — no unlicensed refrigerant handling." },
    { title: "Diagnostics on the job", description: "No-cool / no-heat trees that start with power, thermostat, and airflow." },
    { title: "Maintenance that actually prevents callbacks", description: "Coils, drains, capacitors, and customer education." },
    { title: "EPA / NATE-style orientation", description: "Study path only — not a certification.", certificationPrep: true },
  ],
  "ai-landscaping-001": [
    ...SHARED_FIELD,
    { title: "Site reading and grade", description: "Water wants downhill. Drainage before plants." },
    { title: "Plant selection and soils", description: "Sun, zone, native vs ornamental, and why mulch is not a miracle." },
    { title: "Irrigation controllers", description: "Zones, rain sensors, and winterization concepts." },
    { title: "Hardscape planning (educational)", description: "Patios and walls — hand stamped engineering to a PE when required." },
    { title: "Seasonal maintenance routes", description: "Mow, prune, snow, and the crew checklist." },
    { title: "Landscape contractor exam orientation", description: "Educational study path only.", certificationPrep: true },
  ],
  "ai-plumber-001": [
    ...SHARED_FIELD,
    { title: "Supply, drain, and vent", description: "Why traps siphon and how a vent saves the house." },
    { title: "Fixtures and water heaters", description: "Tank, tankless, mixing, and T&P relief — never cap a relief." },
    { title: "Leak finding on the job", description: "Slab, wall, and fixture leaks without opening every wall first." },
    { title: "Code awareness (educational)", description: "IPC/UPC concepts — verify the adopted code." },
    { title: "Gas awareness — stop and refer", description: "When the job is licensed gas work, you hand it to a licensed pro." },
    { title: "Journeyman plumber exam orientation", description: "Study path only — not a license.", certificationPrep: true },
  ],
  "ai-welder-001": [
    ...SHARED_FIELD,
    { title: "Process choice: SMAW, GMAW, GTAW, FCAW", description: "What each process is for, and the PPE that stays on." },
    { title: "Joint design and fit-up", description: "Bevels, gaps, and why a pretty bead on a bad fit still fails." },
    { title: "Material and filler selection", description: "Carbon steel vs stainless vs alum — match the WPS, do not guess." },
    { title: "Defects you can see", description: "Porosity, undercut, lack of fusion — stop and fix, do not paint over." },
    { title: "Shop and field safety", description: "Fumes, fire watch, cylinders, and grinders." },
    { title: "AWS / weld-test orientation", description: "Educational prep — not a certification stamp.", certificationPrep: true },
  ],
  "ai-roofer-001": [
    ...SHARED_FIELD,
    { title: "Roof types and water paths", description: "Steep vs low slope, valleys, and why flashing fails first." },
    { title: "Materials: shingle, metal, membrane", description: "Underlayment, fasteners, and manufacturer pages." },
    { title: "Leak diagnosis", description: "Stain on the ceiling is rarely directly above the hole." },
    { title: "Ventilation and attic moisture", description: "Intake, exhaust, and ice-dam concepts." },
    { title: "Fall protection is not optional", description: "Harness, ladders, and weather stop-work." },
    { title: "Roofing license / manufacturer cert orientation", description: "Educational only.", certificationPrep: true },
  ],
  "ai-drywall-001": [
    ...SHARED_FIELD,
    { title: "Hang: layout, fasteners, and fire-rated boards", description: "Break joints, screws vs nails, and what the stamp on the board means." },
    { title: "Tape and first coat", description: "Paper vs mesh, mud choice, and why bubbles happen." },
    { title: "Finish levels and texture", description: "Level 4 vs 5, orange peel, knockdown — match the room." },
    { title: "Repairs that disappear", description: "Holes, cracks, water stains, and when to replace the board." },
    { title: "Dust, silica, and site protection", description: "Containment and cleanup so the painter is not your enemy." },
    { title: "Trade exam / finishing orientation", description: "Educational study path.", certificationPrep: true },
  ],
  "ai-framer-001": [
    ...SHARED_FIELD,
    { title: "Layout, plates, and walls", description: "Snap lines, openings, and why the first wall is the expensive one." },
    { title: "Floors, stairs, and roofs (educational)", description: "Joists, rafters, trusses — engineered lumber follows the stamp." },
    { title: "Load paths and headers", description: "What carries what. When the drawing wants an engineer." },
    { title: "Connectors, nail schedules, and bracing", description: "OEM hangers and the nails they actually specify." },
    { title: "Code awareness and inspections", description: "Shear walls, hold-downs, and the inspector's usual stops." },
    { title: "Framing / carpentry exam orientation", description: "Educational only — not a structural stamp.", certificationPrep: true },
  ],
};

export function getTradeTeachingModules(creatorId: string): LearningModule[] {
  const items = BY_TRADE[creatorId] ?? SHARED_FIELD;
  return items.map((item, index) => ({
    id: `trade-${creatorId}-${index + 1}`,
    ...item,
  }));
}

export function buildTradeTeachingPromptAddition(
  creatorId: string,
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  return `
## Dedicated trade academy
Creator: ${creatorId}. Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "jobsite safety first"}.

You are a patient trade-school instructor and jobsite coach — not a licensed contractor, electrician, plumber, PE, or inspector.

Teach safely:
- Ask for brand, model, year, and a nameplate / photo when hardware is involved.
- Prefer OEM manuals and the code edition the user says their city adopted. If search did not confirm a number, say so.
- Never tell someone to work live, skip lockout, defeat a guard, or ignore fall protection.
- Gas, structural stamps, and refrigerant handling stay with licensed people.
- Educational and recreational only — not a license, permit, or inspection.

If the user asks for unlicensed work that can hurt someone, refuse and explain the safe path.
`.trim();
}
