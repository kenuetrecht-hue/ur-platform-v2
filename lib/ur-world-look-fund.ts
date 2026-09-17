/**
 * Optional coffee tips for the developer. Not a charity, not tax-deductible,
 * not an investment, not a plot, not a vote, not a website-upgrade fund.
 */

export const UR_WORLD_APPAREL_LOOK_FUND_BPS = 2_000; // 20% of clothing pack list price

export const UR_WORLD_LOOK_FUND_CHIP_PACKS = [
  { id: "look_2", label: "$2", priceCents: 200 },
  { id: "look_10", label: "$10", priceCents: 1000 },
  { id: "look_25", label: "$25", priceCents: 2500 },
  { id: "look_50", label: "$50", priceCents: 5000 },
  { id: "look_100", label: "$100", priceCents: 10000 },
] as const;

export type UrWorldLookFundChipId = (typeof UR_WORLD_LOOK_FUND_CHIP_PACKS)[number]["id"];
export type UrWorldLookFundStageId = "B" | "C" | "D";

/** Single-number targets so the board can fill. Ranges stay in copy. */
export const UR_WORLD_LOOK_FUND_STAGES = [
  {
    id: "B" as const,
    name: "Plan B — Glow Bar kit",
    targetCents: 40_000,
    rangeLabel: "$40–$400 for a licensed café/bar model. We fill to $400 so we can actually buy a commercial kit.",
    unlocks: "A store-bought Glow Bar interior (.glb): real tables, chairs, bar, stone floor. Outdoor plaza stays Plan A.",
  },
  {
    id: "C" as const,
    name: "Plan C — custom Glow Bar",
    targetCents: 1_200_000,
    rangeLabel: "$3,000–$12,000 for one commissioned web-ready room. We fill to $12,000.",
    unlocks: "A custom UR-branded Glow Bar: stone walks, furniture, fountain, UR signs. Replaces the B kit.",
  },
  {
    id: "D" as const,
    name: "Plan D — photoreal start (parked)",
    targetCents: 5_000_000,
    rangeLabel: "$50,000–$250,000+ for a photoreal city / engine jump. We fill to $50,000 before the owner even talks D.",
    unlocks: "Permission to discuss a photoreal jump. Not Unreal-on-phone. Photoreal crowds stay Never. Do not skip B and C.",
  },
] as const;

export function getLookFundChipPack(id: string): (typeof UR_WORLD_LOOK_FUND_CHIP_PACKS)[number] | undefined {
  return UR_WORLD_LOOK_FUND_CHIP_PACKS.find((p) => p.id === id);
}

export function apparelLookFundCutCents(priceCents: number): number {
  return Math.max(0, Math.round((priceCents * UR_WORLD_APPAREL_LOOK_FUND_BPS) / 10_000));
}

export const UR_WORLD_LOOK_FUND_PURPOSE = "UR does not ask members for tips.";

export const UR_WORLD_LOOK_FUND_APPAREL_LINE = "";

export const UR_WORLD_LOOK_FUND_SHORT = "UR does not ask members for tips.";

export const UR_WORLD_LOOK_FUND_RECEIPT_LINE = "";

export const UR_WORLD_LOOK_FUND_NEXT_SCENE_LINE = "";
