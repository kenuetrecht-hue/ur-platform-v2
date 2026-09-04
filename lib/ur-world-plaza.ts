/**
 * Civic Plaza layout — slice 1 of the talk city.
 * Look (stone walks, furniture) lives in components/ur-world-plaza-scene.ts — Plan A now.
 * Paid kits B/C and photoreal D: lib/ur-world-look-upgrade-plan.ts (Business Steward reads it).
 * Desks open the existing Talk product (same packs, same meter).
 * Stations are walk-up places (sit, garden, bar, fountain, well). Other people
 * in the same 3D space at the same time is later; sit/bar open Social Hub now.
 */

export type UrWorldTalkDesk = {
  id: string;
  name: string;
  hint: string;
  creatorId: string;
  hubGroup: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  colorHex: string;
};

export type UrWorldStationKind = "sit" | "garden" | "bar" | "fountain" | "well";

export type UrWorldPlazaStation = {
  id: string;
  name: string;
  hint: string;
  kind: UrWorldStationKind;
  x: number;
  z: number;
  radius: number;
};

export type UrWorldPlazaNearby =
  | { kind: "desk"; id: string; name: string; hint: string; desk: UrWorldTalkDesk }
  | { kind: "station"; id: string; name: string; hint: string; station: UrWorldPlazaStation };

export const UR_WORLD_PALETTE = {
  sky: "#120c24",
  ground: "#1a1830",
  path: "#2e2860",
  hall: "#2a1f58",
  grass: "#16382f",
  water: "#4f8cff",
  neonBlue: "#4F46E5",
  neonPurple: "#7C3AED",
  glowBlue: "#818CF8",
  glowPurple: "#A78BFA",
  glass: "#6366f1",
  lamp: "#c4b5fd",
  bark: "#3b2a22",
  canopy: "#4c1d95",
  canopyAlt: "#312e81",
  stone: "#2a2548",
  well: "#1e1b4b",
  concrete: "#6b675e",
  paver: "#8a8374",
  grout: "#3f3c36",
  wood: "#6b4a32",
  woodDark: "#3d291c",
  seat: "#4a3f55",
} as const;

export const UR_WORLD_TALK_DESKS: readonly UrWorldTalkDesk[] = [
  {
    id: "trade",
    name: "Trade Yard desk",
    hint: "Electrician Expert — talk through a panel in a bay, not a chat list.",
    creatorId: "ai-electrician-001",
    hubGroup: "construction",
    x: -16,
    z: 10,
    width: 6,
    depth: 5,
    height: 4.2,
    colorHex: "#c9a227",
  },
  {
    id: "line",
    name: "The Line",
    hint: "Culinary Arts — stand the line and talk with the kitchen specialist.",
    creatorId: "ai-culinary-001",
    hubGroup: "all",
    x: 16,
    z: 10,
    width: 6,
    depth: 5,
    height: 4.2,
    colorHex: "#c45c26",
  },
  {
    id: "walk",
    name: "Language Walk",
    hint: "LinguaMate — the street talks back in the language you are learning.",
    creatorId: "linguamate",
    hubGroup: "platform",
    x: 0,
    z: 18,
    width: 7,
    depth: 5,
    height: 4.2,
    colorHex: "#2a7f6f",
  },
] as const;

export const UR_WORLD_HQ = {
  name: "Civic Hall",
  x: 0,
  z: -22,
  width: 14,
  depth: 10,
  height: 9,
  colorHex: UR_WORLD_PALETTE.hall,
} as const;

export const UR_WORLD_SPAWN = { x: 0, z: 2 };

export const UR_WORLD_DESK_PROXIMITY = 5.5;

/** Fountain + benches in the middle. Closer = fountain, around the ring = sit. */
export const UR_WORLD_STATIONS: readonly UrWorldPlazaStation[] = [
  {
    id: "fountain",
    name: "Plaza fountain",
    hint: "Cool blue water under the purple lamps. Walk the rim and sit on a bench to talk.",
    kind: "fountain",
    x: 0,
    z: 8,
    radius: 2.6,
  },
  {
    id: "sit",
    name: "Conversation circle",
    hint: "Stone benches and café tables around the fountain. Sit, look around, and open Social Hub to talk with people.",
    kind: "sit",
    x: 0,
    z: 8,
    radius: 5.8,
  },
  {
    id: "garden",
    name: "Night garden",
    hint: "A quiet path under glowing trees. Walk through. Sit at the garden table if you want a slower talk.",
    kind: "garden",
    x: 8,
    z: 30,
    radius: 8,
  },
  {
    id: "bar",
    name: "Glow Bar",
    hint: "Sit/stand Glow Bar — wood counter, stools, glow drinks. 18+ city. Open Social Hub from here.",
    kind: "bar",
    x: 28,
    z: 14,
    radius: 5.2,
  },
  {
    id: "well",
    name: "Wishing well",
    hint: "A quiet well under a UR sign. Entertainment only — a wish, not luck, not money, not a prize.",
    kind: "well",
    x: -28,
    z: 14,
    radius: 4.4,
  },
] as const;

export const UR_WORLD_SIGN_LINES = [
  { id: "hall", text: "UR", sub: "Civic Plaza" },
  { id: "walk-talk", text: "UR", sub: "Walk. Talk. Be here." },
  { id: "time", text: "UR", sub: "Time in the city" },
  { id: "garden", text: "UR", sub: "Night garden" },
  { id: "bar", text: "UR", sub: "Glow Bar" },
  { id: "well", text: "UR", sub: "Make a quiet wish" },
  { id: "you", text: "UR", sub: "You are UR" },
] as const;

export const UR_WORLD_TREE_SPOTS: readonly { x: number; z: number; scale: number }[] = [
  { x: 6, z: 26, scale: 1 },
  { x: 12, z: 32, scale: 1.15 },
  { x: 2, z: 34, scale: 0.9 },
  { x: 14, z: 26, scale: 1.05 },
  { x: -6, z: 28, scale: 1 },
  { x: -12, z: 32, scale: 1.2 },
  { x: -22, z: -6, scale: 1.1 },
  { x: -30, z: -14, scale: 0.95 },
  { x: 22, z: -8, scale: 1 },
  { x: 30, z: -16, scale: 1.15 },
  { x: -32, z: 24, scale: 1 },
  { x: 32, z: 24, scale: 1 },
  { x: -36, z: 4, scale: 0.85 },
  { x: 36, z: 4, scale: 0.85 },
  { x: -10, z: -32, scale: 1.1 },
  { x: 10, z: -32, scale: 1.1 },
  { x: 0, z: -34, scale: 1.25 },
  { x: -24, z: 32, scale: 0.9 },
  { x: 24, z: 32, scale: 0.9 },
];

export const UR_WORLD_LAMP_SPOTS: readonly { x: number; z: number }[] = [
  { x: -8, z: 2 },
  { x: 8, z: 2 },
  { x: -10, z: 8 },
  { x: 10, z: 8 },
  { x: -22, z: 14 },
  { x: 22, z: 14 },
  { x: 0, z: -12 },
  { x: 8, z: 24 },
  { x: -8, z: 24 },
];

export function nearestTalkDesk(x: number, z: number): UrWorldTalkDesk | null {
  let best: UrWorldTalkDesk | null = null;
  let bestDist = UR_WORLD_DESK_PROXIMITY;
  for (const desk of UR_WORLD_TALK_DESKS) {
    const dx = x - desk.x;
    const dz = z - desk.z;
    const dist = Math.hypot(dx, dz);
    if (dist < bestDist) {
      best = desk;
      bestDist = dist;
    }
  }
  return best;
}

export function nearestPlazaNearby(x: number, z: number): UrWorldPlazaNearby | null {
  const desk = nearestTalkDesk(x, z);
  if (desk) {
    return { kind: "desk", id: desk.id, name: desk.name, hint: desk.hint, desk };
  }

  let best: UrWorldPlazaStation | null = null;
  let bestRadius = Infinity;
  let bestDist = Infinity;
  for (const station of UR_WORLD_STATIONS) {
    const dist = Math.hypot(x - station.x, z - station.z);
    if (dist >= station.radius) continue;
    if (station.radius < bestRadius || (station.radius === bestRadius && dist < bestDist)) {
      best = station;
      bestRadius = station.radius;
      bestDist = dist;
    }
  }
  if (!best) return null;
  return { kind: "station", id: best.id, name: best.name, hint: best.hint, station: best };
}

export function buildWorldTalkHref(desk: UrWorldTalkDesk) {
  return {
    pathname: "/(tabs)/ais" as const,
    params: {
      ai: desk.creatorId,
      group: desk.hubGroup,
      surface: "chat",
      from: "world",
    },
  };
}

export function buildWorldSitHref() {
  return "/(tabs)/messages" as const;
}
