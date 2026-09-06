/**
 * UR Cartoon Studio — website/app cartoon video builder.
 * Prepaid ladder: Draft, Lite, Mid, Cinema, Premiere 4K.
 * Not a ToonBee clone and not a Hollywood movie.
 */

import type { CartoonStudioTierId } from "./cartoon-studio-pricing";

export const CARTOON_STUDIO_HREF = "/cartoon-studio" as const;

export const CARTOON_STUDIO_TITLE = "UR Cartoon Studio";

export const CARTOON_STUDIO_RULE =
  "This website is also the UR app. Pay first, then we build. Draft is cheapest (stills + editor). Lite and Mid are cheaper motion from a lower-cost engine API. Cinema is the expensive 1080p quality engine. Premiere 4K is the highest resolution we sell — not a Hollywood movie. No return policy. You must be happy with what you receive.";

export const CARTOON_STUDIO_RULE_SHORT =
  "Pay first. Draft, Lite, Mid, Cinema, or Premiere 4K. No refunds.";

export const CARTOON_MAX_SCENES = 8;
export const CARTOON_MIN_SCENES = 3;
export const CARTOON_MAX_SECONDS = 60;
export const CARTOON_IDEA_MAX = 2000;

export const CARTOON_STYLES = [
  {
    id: "classic",
    label: "Classic cartoon",
    hint: "Bright shapes, simple faces, kids-show look",
  },
  {
    id: "comic",
    label: "Comic book",
    hint: "Bold outlines, panels, punchy captions",
  },
  {
    id: "modern",
    label: "Modern flat",
    hint: "Clean colors, simple characters, explainer feel",
  },
  {
    id: "educational",
    label: "Teaching cartoon",
    hint: "Clear steps for a lesson or how-to",
  },
] as const;

export type CartoonStyleId = (typeof CARTOON_STYLES)[number]["id"];

export const CARTOON_MUSIC_MOODS = [
  { id: "none", label: "No music" },
  { id: "upbeat", label: "Upbeat" },
  { id: "calm", label: "Calm" },
  { id: "lesson", label: "Lesson / teaching" },
] as const;

export type CartoonMusicMood = (typeof CARTOON_MUSIC_MOODS)[number]["id"];

export type CartoonScene = {
  id: string;
  order: number;
  title: string;
  narration: string;
  caption: string;
  durationSeconds: number;
  visualPrompt: string;
  frameSvg: string;
  voiceEnabled: boolean;
  musicMood: CartoonMusicMood;
  musicVolume: number;
};

export type CartoonProject = {
  id: string;
  userId: string;
  title: string;
  idea: string;
  style: CartoonStyleId;
  script: string;
  scenes: CartoonScene[];
  totalSeconds: number;
  tier: CartoonStudioTierId;
  billedSeconds: number;
  paid: boolean;
  complimentary: boolean;
  renderStatus: "ready" | "complete";
  engineNote: string;
  createdAt: string;
  updatedAt: string;
};

export function isCartoonStyleId(value: string): value is CartoonStyleId {
  return CARTOON_STYLES.some((style) => style.id === value);
}

export type PublicCartoonProject = ReturnType<typeof publicCartoonProject>;

export function publicCartoonProject(project: CartoonProject) {
  return {
    id: project.id,
    title: project.title,
    idea: project.idea,
    style: project.style,
    script: project.script,
    scenes: project.scenes,
    totalSeconds: project.totalSeconds,
    tier: project.tier,
    billedSeconds: project.billedSeconds,
    paid: project.paid,
    complimentary: project.complimentary,
    renderStatus: project.renderStatus,
    engineNote: project.engineNote,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashHue(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }
  return hash;
}

const STYLE_SKIES: Record<CartoonStyleId, [string, string]> = {
  classic: ["#7ec8ff", "#fff4a3"],
  comic: ["#1b1b2f", "#ff6b6b"],
  modern: ["#dbeafe", "#f8fafc"],
  educational: ["#bbf7d0", "#fef9c3"],
};

const TIER_MARK: Record<CartoonStudioTierId, string> = {
  draft: "Draft Studio",
  lite: "Lite Motion",
  mid: "Mid Motion",
  cinema: "Cinema Engine",
  premiere: "Premiere 4K",
};

export function buildCartoonFrameSvg(params: {
  title: string;
  narration: string;
  style: CartoonStyleId;
  order: number;
  cinematic?: boolean;
  tier?: CartoonStudioTierId;
}): string {
  const tier = params.tier ?? (params.cinematic ? "cinema" : "draft");
  const hue = hashHue(`${params.style}:${params.title}:${params.order}`);
  const [sky, ground] = STYLE_SKIES[params.style];
  const body = `hsl(${hue} 70% 48%)`;
  const accent = `hsl(${(hue + 40) % 360} 80% 56%)`;
  const title = escapeXml(params.title.slice(0, 48));
  const line = escapeXml(params.narration.slice(0, 90));
  const film = tier !== "draft";
  const drift = film ? 20 + (params.order % 4) * (tier === "premiere" ? 22 : 14) : 0;
  const x = 180 + (params.order % 3) * 40 + drift;
  const bar = tier === "premiere" ? 70 : tier === "cinema" ? 54 : tier === "mid" ? 36 : 0;
  const letterbox =
    bar > 0
      ? `<rect width="1280" height="${bar}" fill="#000"/><rect y="${720 - bar}" width="1280" height="${bar}" fill="#000"/>`
      : "";
  const mark = TIER_MARK[tier];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="sky${params.order}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/>
      <stop offset="1" stop-color="${ground}"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky${params.order})"/>
  <ellipse cx="980" cy="140" rx="90" ry="54" fill="#fff8" />
  <ellipse cx="1040" cy="140" rx="70" ry="44" fill="#fff6" />
  <path d="M0 520 C 220 460, 420 580, 640 520 C 860 460, 1060 580, 1280 500 L 1280 720 L 0 720 Z" fill="${accent}"/>
  <circle cx="${x + 80}" cy="330" r="62" fill="#ffe0bd"/>
  <circle cx="${x + 58}" cy="318" r="7" fill="#222"/>
  <circle cx="${x + 102}" cy="318" r="7" fill="#222"/>
  <path d="M${x + 58} 350 Q ${x + 80} 368 ${x + 102} 350" fill="none" stroke="#222" stroke-width="5" stroke-linecap="round"/>
  <rect x="${x + 38}" y="392" width="84" height="110" rx="28" fill="${body}"/>
  <rect x="${x + 18}" y="410" width="28" height="78" rx="14" fill="${body}"/>
  <rect x="${x + 114}" y="410" width="28" height="78" rx="14" fill="${body}"/>
  <rect x="${x + 48}" y="492" width="26" height="70" rx="12" fill="#2b2d42"/>
  <rect x="${x + 86}" y="492" width="26" height="70" rx="12" fill="#2b2d42"/>
  <rect x="70" y="40" width="1140" height="86" rx="18" fill="#111827cc"/>
  <text x="640" y="78" text-anchor="middle" fill="#fff" font-size="32" font-family="Verdana, sans-serif" font-weight="700">${title}</text>
  <text x="640" y="112" text-anchor="middle" fill="#fde68a" font-size="20" font-family="Verdana, sans-serif">${line}</text>
  <text x="80" y="680" fill="#111827" font-size="22" font-family="Verdana, sans-serif" font-weight="700">UR Cartoon Studio · ${mark} · ${params.style}</text>
  ${letterbox}
</svg>`;
}

export function fallbackCartoonStoryboard(params: {
  idea: string;
  style: CartoonStyleId;
}): { title: string; script: string; scenes: Omit<CartoonScene, "id" | "frameSvg">[] } {
  const idea = params.idea.trim();
  const chunks = idea
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8)
    .slice(0, CARTOON_MAX_SCENES);
  const parts =
    chunks.length >= CARTOON_MIN_SCENES
      ? chunks
      : [
          `Meet the characters and the idea: ${idea.slice(0, 120)}`,
          "Show the problem or the first step in a simple cartoon beat.",
          "The characters try, miss, then try again.",
          "They learn the lesson and close the story.",
        ];
  const title = idea.length <= 60 ? idea : `${idea.slice(0, 56).trim()}…`;
  const scenes = parts.slice(0, CARTOON_MAX_SCENES).map((text, index) => ({
    order: index + 1,
    title: `Scene ${index + 1}`,
    narration: text.slice(0, 220),
    caption: text.slice(0, 120),
    durationSeconds: 5,
    visualPrompt: `${params.style} cartoon of: ${text.slice(0, 160)}`,
    voiceEnabled: true,
    musicMood: (params.style === "educational" ? "lesson" : "upbeat") as CartoonMusicMood,
    musicVolume: 40,
  }));
  return {
    title,
    script: scenes.map((scene) => scene.narration).join(" "),
    scenes,
  };
}

export function cartoonFrameDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
