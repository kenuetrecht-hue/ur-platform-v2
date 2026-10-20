import { isWeeklyFilterShape, type WeeklyFilterShape } from "./face-filters";

const TZ = "America/Indiana/Indianapolis";

export type WeeklyFaceLook = {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  color: string;
  shape: WeeklyFilterShape;
};

type WeekSet = { name: string; looks: Omit<WeeklyFaceLook, "id">[] };

/** Eight Mondays of looks, then the list starts over. One shared set per week. */
const WEEK_SETS: readonly WeekSet[] = [
  {
    name: "Gold hour",
    looks: [
      { slug: "gold-glasses", label: "Gold rims", emoji: "🕶️", color: "#C9A227", shape: "glasses" },
      { slug: "peach", label: "Peach blush", emoji: "🍑", color: "#F4A4A4", shape: "blush" },
      { slug: "tiny-crown", label: "Tiny crown", emoji: "👑", color: "#F5C542", shape: "crown" },
      { slug: "soft-hearts", label: "Soft hearts", emoji: "💛", color: "#F472B6", shape: "hearts" },
    ],
  },
  {
    name: "Night neon",
    looks: [
      { slug: "neon-rims", label: "Neon rims", emoji: "💜", color: "#A78BFA", shape: "glasses" },
      { slug: "violet-bow", label: "Violet bow", emoji: "🎀", color: "#C4B5FD", shape: "bow" },
      { slug: "ink-freckles", label: "Ink freckles", emoji: "✨", color: "#312E81", shape: "freckles" },
      { slug: "night-crown", label: "Night crown", emoji: "🌙", color: "#818CF8", shape: "crown" },
    ],
  },
  {
    name: "Garden",
    looks: [
      { slug: "leaf-bow", label: "Leaf bow", emoji: "🌿", color: "#34D399", shape: "bow" },
      { slug: "rose", label: "Rose blush", emoji: "🌹", color: "#FB7185", shape: "blush" },
      { slug: "petal", label: "Petal hearts", emoji: "🌷", color: "#F9A8D4", shape: "hearts" },
      { slug: "moss", label: "Moss freckles", emoji: "🍀", color: "#166534", shape: "freckles" },
    ],
  },
  {
    name: "Game night",
    looks: [
      { slug: "pixel-rims", label: "Pixel rims", emoji: "🕹️", color: "#22D3EE", shape: "glasses" },
      { slug: "arcade", label: "Arcade crown", emoji: "👾", color: "#F97316", shape: "crown" },
      { slug: "token", label: "Token hearts", emoji: "🎮", color: "#FACC15", shape: "hearts" },
      { slug: "sprite", label: "Sprite bow", emoji: "🎯", color: "#FB7185", shape: "bow" },
    ],
  },
  {
    name: "Winter lamp",
    looks: [
      { slug: "frost", label: "Frost rims", emoji: "❄️", color: "#E0F2FE", shape: "glasses" },
      { slug: "ice-crown", label: "Ice crown", emoji: "💎", color: "#7DD3FC", shape: "crown" },
      { slug: "berry", label: "Berry blush", emoji: "🫐", color: "#BE123C", shape: "blush" },
      { slug: "snow", label: "Snow freckles", emoji: "⚪", color: "#CBD5E1", shape: "freckles" },
    ],
  },
  {
    name: "Market day",
    looks: [
      { slug: "copper", label: "Copper rims", emoji: "🔶", color: "#C45C26", shape: "glasses" },
      { slug: "market-bow", label: "Market bow", emoji: "🎀", color: "#B45309", shape: "bow" },
      { slug: "citrus", label: "Citrus blush", emoji: "🍊", color: "#FB923C", shape: "blush" },
      { slug: "plum", label: "Plum hearts", emoji: "💜", color: "#7C3AED", shape: "hearts" },
    ],
  },
  {
    name: "Studio red",
    looks: [
      { slug: "red-rims", label: "Red rims", emoji: "🎬", color: "#DC2626", shape: "glasses" },
      { slug: "curtain", label: "Curtain bow", emoji: "🎭", color: "#991B1B", shape: "bow" },
      { slug: "spotlight", label: "Spotlight crown", emoji: "💡", color: "#FBBF24", shape: "crown" },
      { slug: "marquee", label: "Marquee hearts", emoji: "❤️", color: "#F43F5E", shape: "hearts" },
    ],
  },
  {
    name: "River",
    looks: [
      { slug: "river-rims", label: "River rims", emoji: "🌊", color: "#0284C7", shape: "glasses" },
      { slug: "foam", label: "Foam freckles", emoji: "🫧", color: "#BAE6FD", shape: "freckles" },
      { slug: "reed", label: "Reed bow", emoji: "🌾", color: "#65A30D", shape: "bow" },
      { slug: "deep", label: "Deep blush", emoji: "💙", color: "#1D4ED8", shape: "blush" },
    ],
  },
];

function indianaParts(at: Date): { year: number; month: number; day: number; weekday: string } {
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(at)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    weekday: bag.weekday ?? "Mon",
  };
}

const WEEKDAY_FROM_MONDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Monday date in Indiana, YYYY-MM-DD. The set changes on that morning. */
export function faceFilterWeekId(at = new Date()): string {
  const parts = indianaParts(at);
  const offset = WEEKDAY_FROM_MONDAY[parts.weekday] ?? 0;
  const monday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  monday.setUTCDate(monday.getUTCDate() - offset);
  const month = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(monday.getUTCDate()).padStart(2, "0");
  return `${monday.getUTCFullYear()}-${month}-${day}`;
}

export function faceFilterWeekEndsAt(at = new Date()): string {
  const [year, month, day] = faceFilterWeekId(at).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 7, 4, 0, 0)).toISOString();
}

function setIndex(weekId: string): number {
  let total = 0;
  for (const char of weekId) total += char.charCodeAt(0);
  return total % WEEK_SETS.length;
}

export function weeklyFaceSet(at = new Date()): { weekId: string; name: string; looks: WeeklyFaceLook[] } {
  const weekId = faceFilterWeekId(at);
  const set = WEEK_SETS[setIndex(weekId)] ?? WEEK_SETS[0];
  return {
    weekId,
    name: set.name,
    looks: set.looks.map((look) => ({
      ...look,
      id: `${weekId}-${look.slug}`,
    })),
  };
}

export function isSafeWeeklyColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function parseWeeklyLook(value: {
  id: string;
  label: string;
  emoji: string;
  color: string;
  shape: string;
}): WeeklyFaceLook | null {
  if (!isWeeklyFilterShape(value.shape) || !isSafeWeeklyColor(value.color)) return null;
  if (value.id.length > 80 || value.label.length > 40) return null;
  return {
    id: value.id,
    slug: value.id,
    label: value.label,
    emoji: value.emoji.slice(0, 8),
    color: value.color,
    shape: value.shape,
  };
}
