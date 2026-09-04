/**
 * UR World avatar locker — 10 apparel packs.
 * Digital entertainment licenses. Cheap for members, ~100% gross to UR (code, not cotton).
 * Never priced at exactly $5.00 (that SKU is mobile in-app only).
 */

import { getRequiredPaymentChannel } from "./payment-channel-policy";

export const UR_WORLD_COSMETIC_LICENSE =
  "Each pack is a limited entertainment license to wear looks in UR World. Not resold, not an investment, not cash.";

export type CosmeticSlot = "hat" | "jacket" | "boots" | "accent" | "pants" | "hair";

export type EquippedPiece = {
  packId: string;
  colorHex: string;
  mesh: string;
  name: string;
};

export type EquippedLoadout = Partial<Record<CosmeticSlot, EquippedPiece>>;

export type CosmeticPiece = {
  slot: CosmeticSlot;
  name: string;
  colorHex: string;
  mesh:
    | "cap"
    | "hardhat"
    | "toque"
    | "jacket"
    | "apron"
    | "vest"
    | "boots"
    | "scarf"
    | "patch"
    | "shirt"
    | "jeans"
    | "sneakers"
    | "star"
    | "hair";
};

export type UrWorldCosmeticPack = {
  id: string;
  name: string;
  tagline: string;
  district: string;
  priceCents: number;
  pieces: CosmeticPiece[];
  /** Never listed or sold. Platform owner only. */
  ownerOnly?: boolean;
};

const PACKS: UrWorldCosmeticPack[] = [
  {
    id: "civic-dawn",
    name: "Civic Dawn",
    tagline: "Clean plaza wool — oatmeal coat, slate cap, cognac boots.",
    district: "Civic Plaza",
    priceCents: 199,
    pieces: [
      { slot: "hat", name: "Slate newsboy", colorHex: "#4a5563", mesh: "cap" },
      { slot: "jacket", name: "Oatmeal wool overcoat", colorHex: "#c4b39a", mesh: "jacket" },
      { slot: "boots", name: "Cognac oxfords", colorHex: "#8b5a2b", mesh: "boots" },
      { slot: "accent", name: "Civic crest pin", colorHex: "#c9a227", mesh: "patch" },
    ],
  },
  {
    id: "language-walk",
    name: "Language Walk",
    tagline: "Travel knit — teal wrap, sand trousers energy, brass pin.",
    district: "Language Walk",
    priceCents: 199,
    pieces: [
      { slot: "hat", name: "Teal beret", colorHex: "#2a7f6f", mesh: "cap" },
      { slot: "jacket", name: "Sand travel wrap", colorHex: "#d4c4a8", mesh: "jacket" },
      { slot: "boots", name: "Espresso loafers", colorHex: "#3f2a1a", mesh: "boots" },
      { slot: "accent", name: "Phrasebook scarf", colorHex: "#c45c26", mesh: "scarf" },
    ],
  },
  {
    id: "night-shift",
    name: "Night Shift",
    tagline: "Kitchen blacks — charcoal chef coat, ink trousers, copper pin.",
    district: "The Line",
    priceCents: 249,
    pieces: [
      { slot: "hat", name: "Ink toque", colorHex: "#1a1d23", mesh: "toque" },
      { slot: "jacket", name: "Charcoal chef coat", colorHex: "#2c3038", mesh: "jacket" },
      { slot: "boots", name: "Kitchen clogs (black)", colorHex: "#111318", mesh: "boots" },
      { slot: "accent", name: "Copper service pin", colorHex: "#b87333", mesh: "patch" },
    ],
  },
  {
    id: "quiet-garden",
    name: "Quiet Garden",
    tagline: "Wellness linen — sage wrap, stone, soft gold.",
    district: "Quiet Garden",
    priceCents: 249,
    pieces: [
      { slot: "hat", name: "Sage visor", colorHex: "#7d9a74", mesh: "cap" },
      { slot: "jacket", name: "Stone linen wrap", colorHex: "#d7d1c4", mesh: "jacket" },
      { slot: "boots", name: "Barefoot trainers", colorHex: "#9aa392", mesh: "boots" },
      { slot: "accent", name: "Garden cord", colorHex: "#c6a664", mesh: "scarf" },
    ],
  },
  {
    id: "trade-yard",
    name: "Trade Yard",
    tagline: "Honest hi-vis — hard hat, navy duck jacket, steel toe.",
    district: "Trade Yard",
    priceCents: 299,
    pieces: [
      { slot: "hat", name: "Safety hard hat", colorHex: "#e2b007", mesh: "hardhat" },
      { slot: "jacket", name: "Navy duck chore coat", colorHex: "#1e3a5f", mesh: "jacket" },
      { slot: "boots", name: "Steel-toe work boots", colorHex: "#3b2f2a", mesh: "boots" },
      { slot: "accent", name: "Hi-vis sash", colorHex: "#f59e0b", mesh: "vest" },
    ],
  },
  {
    id: "harbor-lights",
    name: "Harbor Lights",
    tagline: "Marina oilskin — sea green, brass, deck boots.",
    district: "Harbor",
    priceCents: 299,
    pieces: [
      { slot: "hat", name: "Sou'wester brim", colorHex: "#1f4e5f", mesh: "cap" },
      { slot: "jacket", name: "Sea-green oilskin", colorHex: "#2f6f6a", mesh: "jacket" },
      { slot: "boots", name: "Deck boots", colorHex: "#f4f1ea", mesh: "boots" },
      { slot: "accent", name: "Brass dock pin", colorHex: "#d4af37", mesh: "patch" },
    ],
  },
  {
    id: "maker-lab",
    name: "Maker Lab",
    tagline: "Shop apron — graphite denim, rust tools, gum boots.",
    district: "Maker Lab",
    priceCents: 299,
    pieces: [
      { slot: "hat", name: "Weld cap", colorHex: "#5c4033", mesh: "cap" },
      { slot: "jacket", name: "Graphite shop apron", colorHex: "#3a3f46", mesh: "apron" },
      { slot: "boots", name: "Gum-soled shop boots", colorHex: "#4a3728", mesh: "boots" },
      { slot: "accent", name: "Rust tool wrap", colorHex: "#b7410e", mesh: "scarf" },
    ],
  },
  {
    id: "stage-studio",
    name: "Stage & Studio",
    tagline: "Creator blacks — velvet jacket, oxblood, silver mic pin.",
    district: "Stage",
    priceCents: 349,
    pieces: [
      { slot: "hat", name: "Black fedora", colorHex: "#1c1c1c", mesh: "cap" },
      { slot: "jacket", name: "Velvet stage jacket", colorHex: "#2a1620", mesh: "jacket" },
      { slot: "boots", name: "Oxblood chelsea", colorHex: "#6b1d2a", mesh: "boots" },
      { slot: "accent", name: "Silver mic pin", colorHex: "#c0c0c0", mesh: "patch" },
    ],
  },
  {
    id: "indiana-honest",
    name: "Indiana Honest",
    tagline: "Owner signature — field tan, barn red, corn-gold crest.",
    district: "Civic Plaza",
    priceCents: 399,
    pieces: [
      { slot: "hat", name: "Field tan cap", colorHex: "#c4a35a", mesh: "cap" },
      { slot: "jacket", name: "Barn-red chore coat", colorHex: "#8c2f1b", mesh: "jacket" },
      { slot: "boots", name: "Worked leather", colorHex: "#5c3317", mesh: "boots" },
      { slot: "accent", name: "Corn-gold crest", colorHex: "#e8c547", mesh: "patch" },
    ],
  },
  {
    id: "crew-call",
    name: "Crew Call",
    tagline: "Team kit — deep indigo, white piping, shared patch.",
    district: "Plaza",
    priceCents: 499,
    pieces: [
      { slot: "hat", name: "Indigo crew cap", colorHex: "#1b365d", mesh: "cap" },
      { slot: "jacket", name: "Team jacket", colorHex: "#243447", mesh: "jacket" },
      { slot: "boots", name: "White-piped trainers", colorHex: "#ececec", mesh: "boots" },
      { slot: "accent", name: "Crew patch", colorHex: "#e8e0d0", mesh: "patch" },
    ],
  },
];

export const UR_WORLD_COSMETIC_PACKS: readonly UrWorldCosmeticPack[] = PACKS;

/** Owner-only casual look — jeans, shirt, sneakers, civic star. Not sold. Not a cop uniform. */
export const UR_OWNER_SHERIFF_PACK: UrWorldCosmeticPack = {
  id: "ur-sheriff",
  name: "UR Sheriff",
  tagline: "Laid-back civic host — oatmeal shirt, indigo jeans, clean sneakers, UR star. Only the platform owner.",
  district: "Civic Plaza",
  priceCents: 199,
  ownerOnly: true,
  pieces: [
    { slot: "hair", name: "Casual crop", colorHex: "#3b2f2a", mesh: "hair" },
    { slot: "jacket", name: "Oatmeal casual shirt", colorHex: "#e7e0d4", mesh: "shirt" },
    { slot: "pants", name: "Indigo jeans", colorHex: "#3a4f73", mesh: "jeans" },
    { slot: "boots", name: "Clean white sneakers", colorHex: "#f4f1ea", mesh: "sneakers" },
    { slot: "accent", name: "UR Sheriff star", colorHex: "#e8c547", mesh: "star" },
  ],
};

export type UrWorldCosmeticPackId = (typeof PACKS)[number]["id"] | typeof UR_OWNER_SHERIFF_PACK.id;

export function listCosmeticPacks(): UrWorldCosmeticPack[] {
  return PACKS.map((p) => ({ ...p, pieces: p.pieces.map((x) => ({ ...x })) }));
}

export function getCosmeticPack(id: string): UrWorldCosmeticPack | undefined {
  if (id === UR_OWNER_SHERIFF_PACK.id) {
    return {
      ...UR_OWNER_SHERIFF_PACK,
      pieces: UR_OWNER_SHERIFF_PACK.pieces.map((x) => ({ ...x })),
    };
  }
  return PACKS.find((p) => p.id === id);
}

export function loadoutFromPack(pack: UrWorldCosmeticPack): EquippedLoadout {
  const equipped: EquippedLoadout = {};
  for (const piece of pack.pieces) {
    equipped[piece.slot] = {
      packId: pack.id,
      colorHex: piece.colorHex,
      mesh: piece.mesh,
      name: piece.name,
    };
  }
  return equipped;
}

export function cosmeticPackChannel(priceCents: number) {
  return getRequiredPaymentChannel(priceCents);
}

export const UR_WORLD_COSMETIC_PRICING_NOTE =
  "Ten digital looks, $1.99–$4.99, web checkout only. Never exactly $5.00. UR keeps the list price (code, not cotton). When Stripe is live the customer pays 2.9% + $0.30 on top, same as other UR SKUs.";

/** Stripe 2.9% + $0.30 if UR absorbed the fee (we pass it through to the customer when live). */
export function stripeAbsorbedCents(priceCents: number): number {
  return Math.round(priceCents * 0.029) + 30;
}

export function urKeepIfAbsorbingStripe(priceCents: number): number {
  return Math.max(0, priceCents - stripeAbsorbedCents(priceCents));
}
