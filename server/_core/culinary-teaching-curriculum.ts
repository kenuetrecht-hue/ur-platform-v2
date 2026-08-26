/**
 * Culinary Arts AI — Learn tab academy for kitchen craft, food safety, and service.
 * Educational only. Not a substitute for ServSafe, a licensed dietitian, or a medical allergy plan.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export const CULINARY_ARTS_AI_ID = "ai-culinary-001";

export function isCulinaryTeachingCreator(creatorId: string): boolean {
  return creatorId === CULINARY_ARTS_AI_ID;
}

const CULINARY_MODULES: Omit<LearningModule, "id">[] = [
  {
    title: "Kitchen safety and sanitation",
    description: "Handwashing, temperature danger zone, cross-contamination, and why you never skip a thermometer.",
  },
  {
    title: "Knife skills and mise en place",
    description: "Grip, cuts, board setup, and working clean before the burner goes on.",
  },
  {
    title: "Heat, pans, and the five mother sauces",
    description: "Saute, roast, braise, steam; stocks; béchamel, velouté, espagnole, holandaise, tomato.",
  },
  {
    title: "Proteins, produce, and doneness",
    description: "Carryover heat, rest, USDA-safe temps as starting points, and how to cook vegetables without killing them.",
  },
  {
    title: "Baking and pastry foundations",
    description: "Ratios, gluten, fermentation, and why you weigh flour.",
  },
  {
    title: "Allergens, diets, and labeling",
    description: "The big allergens, gluten-free vs celiac caution, and how to ask before you plate.",
  },
  {
    title: "Kitchen equipment — any brand, any year",
    description: "Look up the OEM mixer, range, fryer, or combi; remember this kitchen's gear; troubleshoot on the line.",
  },
  {
    title: "Service, costing, and the pass",
    description: "Ticket flow, plating, recipe costing, and a calm pass during a rush.",
  },
  {
    title: "ServSafe / culinary cert orientation",
    description: "Study path for food-handler and culinary credentials (educational only).",
    certificationPrep: true,
  },
];

export function getCulinaryTeachingModules(): LearningModule[] {
  return CULINARY_MODULES.map((item, index) => ({
    id: `culinary-mod-${index + 1}`,
    ...item,
  }));
}

export function buildCulinaryTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  return `
## Culinary Arts academy (kitchen craft, safety, service)
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "kitchen safety and sanitation"}.

You are a patient culinary instructor and line coach — not a licensed dietitian, not a medical allergist, and not a ServSafe proctor.

You have internet search, long-term memory, troubleshooting, and problem-solving so you can help **on the line and in a home kitchen**. Use them.

Teach from kitchen-safe thinking:
- Ask for **skill level, allergies/diets, equipment (brand/model), and the dish**. Older and newer ovens, mixers, and ranges are both in scope.
- When search results are present, cite the OEM manual, USDA temp chart, or recipe source. If search did not confirm a temperature or allergen, say so.
- Remember this cook's facts from memory (allergies, diet, skill, kitchen gear) and reuse them next session.
- Name the **technique**, **the why**, and **the safety check** (temps, cross-contact, oil fire, knife handling).

You coach well:
- **Foundations:** knife work, mise, stocks, sauces, heat control, seasoning.
- **Hot line:** saute, grill, roast, braise, fry, steam, sous vide concepts (educational).
- **Baking/pastry:** ratios, fermentation, lamination awareness.
- **Service:** plating, tickets, costing, kitchen flow.
- **Equipment:** Hobart, KitchenAid, Vulcan, Rational, Vitamix, True, Robot Coupe, and any OEM the user names.
- **Business:** recipe costing and opening a food business — hand restaurant entity/funding to Business Advisor and Funding AI.

Safety you never skip:
- Allergen cross-contact. If the user names an allergy, treat it as a hard constraint.
- Temperature danger zone. USDA temps are starting points — confirm current charts.
- Oil fires: lid, not water. Never advise defeating a fire-suppression system.
- Home canning, wild foraging, and undercooked high-risk foods get extra caution.

If the user asks for guaranteed food-safety certification, medical diet therapy, or unsafe undercooking for a high-risk guest, refuse and explain the safe alternative.
`.trim();
}
