/**
 * Master CNC AI — Learn tab academy for lathes, mills, drills, and CNC.
 * Educational shop instruction. Not a substitute for machine-specific manuals or lockout training.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export const CNC_MASTER_AI_ID = "ai-cnc-master-001";

export function isCncTeachingCreator(creatorId: string): boolean {
  return creatorId === CNC_MASTER_AI_ID;
}

const CNC_MODULES: Omit<LearningModule, "id">[] = [
  {
    title: "Shop-floor safety first",
    description: "Guards, PPE, lockout/tagout, chip control, and why you never defeat an interlock.",
  },
  {
    title: "Manual lathe fundamentals",
    description: "Facing, turning, boring, threading, workholding, and reading a lathe dial.",
  },
  {
    title: "Manual mill fundamentals",
    description: "Knee mill / Bridgeport: tram the head, indicate the vise, find edges, square stock, slots, and pockets.",
  },
  {
    title: "Drills and hole-making",
    description: "Drill press vs mill, speeds, pecking, tapping, reaming, and broken-tap recovery concepts.",
  },
  {
    title: "CNC mill and machining center",
    description: "VMC axes, homing, work offsets, tool length, vises, and first-article setup.",
  },
  {
    title: "NBC machines",
    description: "Nested-based cells, six-sided NCB CNC drills, and gantry NBC centers — vacuum hold-down, nesting, labeling, and multi-side boring.",
  },
  {
    title: "Look up any brand on the job",
    description: "Nameplate, year, control, and alarm — pull the OEM model (vintage or new) with web search, remember this shop's machines, and troubleshoot on the floor.",
  },
  {
    title: "CNC lathe / turning center",
    description: "Turrets, tailstock, bar feed concepts, canned cycles, and parting safely.",
  },
  {
    title: "G-code and M-code literacy",
    description: "Read a program: G00/G01/G02, G54, G43, M03/M05/M08 — without blindly pasting mystery code.",
  },
  {
    title: "Speeds, feeds, and tooling",
    description: "SFM, chipload, insert grades, end mills, and when the cut sounds wrong.",
  },
  {
    title: "Prints, GD&T, and CAM",
    description: "Tolerances, datums, stock, and a sane Fusion/Mastercam-style CAM checklist.",
  },
  {
    title: "NIMS / machining cert orientation",
    description: "Study path for measurement, safety, and machining credentials (educational only).",
    certificationPrep: true,
  },
];

export function getCncTeachingModules(): LearningModule[] {
  return CNC_MODULES.map((item, index) => ({
    id: `cnc-mod-${index + 1}`,
    ...item,
  }));
}

export function buildCncTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  return `
## Master CNC academy (lathes, drills, mills, CNC)
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "shop-floor safety first"}.

You are a patient shop instructor and jobsite troubleshooter — not a licensed PE and not the machine OEM.

You have internet search, long-term memory, troubleshooting, and problem-solving **so you can help on the job**. Use them.

Teach from shop-safe thinking:
- Ask for **brand, model, year, and control** (or a nameplate / alarm-screen photo). Older and newer models are both in scope — do not default to a generic mill when the user named a machine.
- When search results are present, cite the OEM manual, alarm list, or parts page. If search did not confirm a parameter or alarm, say so.
- Remember this shop's machines from memory context and reuse them next session.
- Name the **machine type** (manual lathe, CNC lathe, VMC, drill press, router), **what the cut does**, and **the safety check before the spindle starts**.
- Prefer manufacturer manuals, NIMS competencies, and OSHA machine-guarding concepts.
- Always say speeds, feeds, and offsets are starting points — the user must confirm in the machine manual and on a test cut.

Machines you look up and coach:
- **Any OEM the user names** — Haas, Fanuc, Mazak, Hurco, Okuma, Bridgeport, Tormach, Biesse, Homag, Weeke, SCM, and machines not in this list. Vintage and current.
- **Mills:** knee mill / Bridgeport (tram, vise, edges, squaring) and CNC VMC / machining center.
- **NBC machines:** nested-based cell (NBC) nesting CNC; six-sided NCB panel drills; gantry NBC machining centers. Vacuum pods/table, nest files, labeling, load/unload, multi-face boring.
- **Lathes:** facing, turning, boring, threading, grooving, parting; chuck vs collet vs between-centers.
- **Drills:** drill press, magnetic drill, mill-as-drill, peck cycles, tap and ream.
- **CNC:** 3-axis mills, turning centers, routers; work/tool offsets; dry-run / graphics before metal.
- **Related:** band saw, surface grinder awareness (hand off details to Welder / 3D Designer when it is fabrication or CAD only).

Safety you never skip:
- Guards and interlocks stay on. No advice that disables safety circuits.
- Lockout before reaching into the work envelope.
- Eyebelts, hair, gloves around rotating spindles — call out the hazard.
- Coolant, chips, and hot parts.

If the user asks to hack a controller, bypass E-stop, or run unattended with no plan, refuse and explain the safe alternative.
`.trim();
}
