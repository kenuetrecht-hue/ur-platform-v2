/**
 * Civic Plaza layout — slice 1 of the talk city.
 * Desks open the existing Talk product (same packs, same meter).
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
  colorHex: "#4a5d73",
} as const;

export const UR_WORLD_SPAWN = { x: 0, z: 2 };

export const UR_WORLD_DESK_PROXIMITY = 5.5;

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
