/**
 * Platform section registry — isolated kill switches per app area.
 * Disabling a section keeps the rest of UR online.
 */

export const PLATFORM_SECTION_IDS = [
  "3d_workspace",
  "playroom",
  "blueprint_reader",
  "hive_town_hall",
  "forge_sandbox",
  "ai_chat",
  "commerce",
  "loyalty",
  "landing_demo",
  "voice_talk",
  "jobsite",
] as const;

export type PlatformSectionId = (typeof PLATFORM_SECTION_IDS)[number];

export type PlatformSectionMeta = {
  id: PlatformSectionId;
  label: string;
  description: string;
  routes: string[];
};

export const PLATFORM_SECTION_CATALOG: PlatformSectionMeta[] = [
  {
    id: "3d_workspace",
    label: "3D Workspace",
    description: "Babylon builder, design layers, STL upload, print export",
    routes: ["/3d-workspace"],
  },
  {
    id: "playroom",
    label: "AI Playroom",
    description: "Playroom builder and sandbox previews",
    routes: ["/playroom"],
  },
  {
    id: "blueprint_reader",
    label: "Blueprint Reader",
    description: "Drawing and PDF blueprint analysis",
    routes: [],
  },
  {
    id: "hive_town_hall",
    label: "AI Hive / Town Hall",
    description: "Multi-AI hive consultations",
    routes: [],
  },
  {
    id: "forge_sandbox",
    label: "Forge & Code Sandbox",
    description: "TechBuilder, GameForge, and Forge agent pipelines",
    routes: ["/tech-builder"],
  },
  {
    id: "ai_chat",
    label: "AI Specialist Chat",
    description: "Public specialist text chat (not Owner Ops AIs)",
    routes: ["/ais"],
  },
  {
    id: "commerce",
    label: "Shop & Commerce",
    description: "Store, merch, and checkout flows",
    routes: [],
  },
  {
    id: "loyalty",
    label: "Loyalty & Stamps",
    description: "Stamps, loyalty points, and rewards",
    routes: [],
  },
  {
    id: "landing_demo",
    label: "Landing Demo",
    description: "Public landing page AI and voice demos",
    routes: ["/"],
  },
  {
    id: "voice_talk",
    label: "AI Voice Talk",
    description: "Voice synthesis and talk-time playback",
    routes: [],
  },
  {
    id: "jobsite",
    label: "Jobsite & Office",
    description: "Clock, inventory, equipment map, daily logs",
    routes: ["/jobsite"],
  },
];

export function isPlatformSectionId(value: string): value is PlatformSectionId {
  return (PLATFORM_SECTION_IDS as readonly string[]).includes(value);
}

export function getPlatformSectionMeta(id: PlatformSectionId): PlatformSectionMeta {
  return PLATFORM_SECTION_CATALOG.find((s) => s.id === id)!;
}

/** Match ops-AI chat text to a section id for maintenance proposals. */
export function inferSectionFromOpsText(text: string): PlatformSectionId | null {
  const lower = text.toLowerCase();
  if (/3d workspace|3d-workspace|babylon|component builder/.test(lower)) return "3d_workspace";
  if (/playroom/.test(lower)) return "playroom";
  if (/blueprint/.test(lower)) return "blueprint_reader";
  if (/hive|town hall/.test(lower)) return "hive_town_hall";
  if (/forge|sandbox|techbuilder|gameforge|coder/.test(lower)) return "forge_sandbox";
  if (/specialist chat|ai chat|\bais\b/.test(lower)) return "ai_chat";
  if (/shop|commerce|store|merch/.test(lower)) return "commerce";
  if (/loyalty|stamps/.test(lower)) return "loyalty";
  if (/landing|homepage demo/.test(lower)) return "landing_demo";
  if (/voice talk|talk time|elevenlabs/.test(lower)) return "voice_talk";
  if (/jobsite|job site|clock in|geofence|heavy equipment|yard inventory/.test(lower)) {
    return "jobsite";
  }
  return null;
}

export const DEFAULT_SECTION_MAINTENANCE_MESSAGE =
  "This area is temporarily offline for maintenance. The rest of UR is still available.";
