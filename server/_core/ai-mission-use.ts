/**
 * Mission-use protocol — UR AIs exist for learning and legitimate on-the-job help.
 * They must not be used for crime, harm, sabotage, or defeating safety systems.
 * Owner (administrator) may bypass via the same path as other AI control checks.
 */

import { TRPCError } from "@trpc/server";

export const MISSION_USE_REFUSAL =
  "This assistant is for learning and legitimate on-the-job troubleshooting only. I can't help with harm, crime, sabotage, or defeating safety devices. If you have a real shop or kitchen problem, describe the equipment, the symptom, and what you already checked.";

/** Injected into every specialist system prompt. */
export const AI_MISSION_USE_PROMPT = `
## Mission-use protocol (learning and jobsite help only)
This platform is for **good**: education, skill-building, and hands-on troubleshooting on a job the user legitimately owns or is hired to work.

**Allowed**
- Teach a trade, technique, or cert-orientation lesson.
- Diagnose a real fault: symptoms → safe tests → repair path → when to call a licensed pro.
- Look up OEM manuals, alarms, and parts for equipment the user is maintaining.
- Kitchen craft, food safety, and allergen *prevention* — never concealment.

**Forbidden — refuse and redirect to a safe, legitimate task**
- Crime: theft, fraud, scams, trafficking, or "how to get away with it."
- Harm: weapons, explosives, poisoning people, hiding allergens to make someone sick.
- Sabotage: causing a crash, collapse, fire, or equipment failure on purpose.
- Defeating safety: E-stop, interlocks, guards, fire-suppression, airbags, lockout/tagout bypass.
- Unauthorized access: hacking controllers, stealing vehicles, picking locks for crime.
- Dual-use that is clearly for harm (e.g. "so I can hurt someone") even if the same skill is fine on a real job.

If intent is ambiguous, ask whether this is **their** equipment / **their** kitchen / a hired job — then help only with the safe, legal path. Never invent a bypass. Never give a recipe for harm.

**Who is responsible**
- You (the AI) do not perform the work. You teach and troubleshoot. You are not the actor on the job.
- The **human user** is responsible for how they use what they learn — including mistakes, unsafe shortcuts, and any illegal act they choose to do.
- Misuse is a **human Terms violation**, not something the AI "did" and not something the platform owner authorized or performed.
- Never say the owner, UR Platform LLC, or you (the AI) approved, committed, or is liable for a user's crime or jobsite error.
`.trim();

/**
 * Precise malicious-intent patterns. Do not use broad words like "cut" or "kill the circuit"
 * — those are normal on a mill, in a kitchen, and on an electrical job.
 */
const FORBIDDEN_MISSION_USE_PATTERNS: RegExp[] = [
  /\bbypass (the )?(e-?stop|emergency stop|interlock|safety (circuit|guard|switch|relay))\b/i,
  /\bdisable (the )?(guard|interlock|e-?stop|ansul|fire[- ]suppression|airbag)\b/i,
  /\bdefeat (the )?(safety|interlock|guard|e-?stop)\b/i,
  /\b(make|build|assemble|wire) (a |an )?(bomb|explosive|ied)\b/i,
  /\b(poison|lace|spike) (the |this )?(food|drink|guest|customer|someone)\b/i,
  /\bhide (the )?(allergen|peanut|nut allergy) (from|so)\b/i,
  /\b(hotwire|steal) (this |a |the )?(car|truck|vehicle)\b/i,
  /\bhow to (hack|exploit) (the |this )?(controller|ecu|plc|cnc)\b/i,
  /\bsabotage (the |this )?(machine|brake|crane|beam|structural|kitchen)\b/i,
  /\b(undercook|serve raw) .{0,60}(to (harm|hurt|make .{0,20} sick)|on purpose)\b/i,
  /\bhow to (get away with|cover up) (a )?(crime|theft|fraud|assault)\b/i,
  /\b(cook|synthesize|manufacture) (meth|fentanyl|illegal drugs?)\b/i,
];

export function matchesForbiddenMissionUse(text: string): boolean {
  return FORBIDDEN_MISSION_USE_PATTERNS.some((pattern) => pattern.test(text));
}

export function assertMissionUseAllowed(content: string, isAdministrator: boolean): void {
  if (isAdministrator) return;
  if (matchesForbiddenMissionUse(content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: MISSION_USE_REFUSAL,
    });
  }
}

/** Extra out-of-scope lines appended to every specialist mission prompt. */
export const MISSION_USE_OUT_OF_SCOPE = [
  "Crime, fraud, theft, or harming people",
  "Defeating safety devices (E-stop, interlocks, fire suppression, airbags)",
  "Weapons, explosives, or sabotage",
  "Poisoning food, hiding allergens, or making someone sick on purpose",
  "Hacking controllers, stealing vehicles, or unauthorized access",
  "Accepting blame for a user's crime or jobsite error — that is the human user's conduct, not the AI's and not the platform owner's",
] as const;
