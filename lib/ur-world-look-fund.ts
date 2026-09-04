/**
 * Plaza look tips — voluntary extra payments toward UR World art (Plans B, C, D).
 * A tip helps grow UR Platform’s look. Not a charity donation, not tax-deductible,
 * not an investment, not a plot, not a vote. Hitting a bar does not auto-buy art.
 */

export const UR_WORLD_APPAREL_LOOK_FUND_BPS = 2_000; // 20% of clothing pack list price

export const UR_WORLD_LOOK_FUND_CHIP_PACKS = [
  { id: "look_2", label: "$2 tip", priceCents: 200 },
  { id: "look_10", label: "$10 tip", priceCents: 1000 },
  { id: "look_25", label: "$25 tip", priceCents: 2500 },
  { id: "look_50", label: "$50 tip", priceCents: 5000 },
  { id: "look_100", label: "$100 tip", priceCents: 10000 },
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

export const UR_WORLD_LOOK_FUND_PURPOSE =
  "UR Platform LLC does not have the cash on hand for the next plaza art kits. " +
  "Leave a tip if you want the city to look more professional — tips help grow UR Platform by paying for better rooms people will actually stay in. " +
  "A tip is a thank-you to UR, not a charity donation, not tax-deductible, not a 501(c)(3) gift, not an investment, " +
  "and it does not buy a plot, a vote, or ownership of the company. Hitting a bar does not auto-spend — " +
  "the owner still has to buy the licensed art when Stripe money is real. " +
  "When this plaza look (B, C, D) is done, we keep accepting tips for the next scene — a new place to walk. " +
  "Every goal and every spend stays public so you can see where your tips went.";

export const UR_WORLD_LOOK_FUND_APPAREL_LINE =
  "Twenty percent of every avatar clothing pack (list price) is earmarked as a tip toward this look board. " +
  "You still get the look. UR still owns the money. It is a bookkeeping set-aside for plaza art, not a separate account you control.";

export const UR_WORLD_LOOK_FUND_SHORT =
  "Plaza look tips: extra tips and 20% of clothing packs toward B → C → D, then the next scene. All spends public. Helps grow UR Platform. Not a charity. Not tax-deductible. Not an investment.";

export const UR_WORLD_LOOK_FUND_RECEIPT_LINE =
  "When a goal is hit and UR buys the art, we post what the money was spent on and what upgrade went live. That is a public receipt, not a charity report and not an investment update. We never hide where tips went.";

export const UR_WORLD_LOOK_FUND_NEXT_SCENE_LINE =
  "This level is the Civic Plaza look (B, then C, then D). When it is done, we keep the tip jar open for the next scene — a new place to go. We will name that place on this board before we fill it. All updates stay public.";
