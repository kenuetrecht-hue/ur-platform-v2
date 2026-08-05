/**
 * Hive asset pipeline — import 3D/design assets into GameForge or TechBuilder sandboxes.
 */

import type { SandboxFile } from "./coder-sandbox-service";

export type HiveAssetPack = {
  id: string;
  label: string;
  sourceAi: string;
  description: string;
  files: Array<{ path: string; content: string }>;
};

const ASSET_PACKS: HiveAssetPack[] = [
  {
    id: "3d-placeholder-glb",
    label: "3D placeholder mesh notes",
    sourceAi: "ai-3d-specialist",
    description: "Import checklist + GLB path conventions from AI 3D Designer.",
    files: [
      {
        path: "assets/models/README.md",
        content: `# 3D Assets (from AI 3D Designer Hive)\n\n- Export GLB from 3D Lab\n- Place in assets/models/\n- Reference in Godot: res://assets/models/player.glb\n- Unity: drag into Assets/Models/\n`,
      },
      {
        path: "assets/models/.gitkeep",
        content: "",
      },
    ],
  },
  {
    id: "game-ui-sprites",
    label: "2D UI sprite sheet scaffold",
    sourceAi: "ai-3d-specialist",
    description: "Sprite atlas layout for HUD and collectibles.",
    files: [
      {
        path: "assets/sprites/atlas.json",
        content: JSON.stringify(
          {
            frames: {
              player: { x: 0, y: 0, w: 32, h: 32 },
              coin: { x: 32, y: 0, w: 16, h: 16 },
            },
            meta: { source: "Hive — AI 3D Designer", image: "atlas.png" },
          },
          null,
          2,
        ),
      },
      {
        path: "assets/sprites/README.md",
        content: "Replace atlas.png with art from 3D Lab or your pipeline.",
      },
    ],
  },
  {
    id: "story-lore",
    label: "Story & lore from Author Muse",
    sourceAi: "ai-author-001",
    description: "Narrative scaffold for game world building.",
    files: [
      {
        path: "docs/LORE.md",
        content: `# World Lore\n\n## Factions\n\n## Main quest arc\n\n## Key NPCs\n\n(Collaborate with Author Muse in Hive mode.)\n`,
      },
    ],
  },
  {
    id: "secure-multiplayer",
    label: "Security checklist (multiplayer)",
    sourceAi: "platform-security-ai",
    description: "Server-authoritative patterns from Security AI.",
    files: [
      {
        path: "docs/SECURITY_MULTIPLAYER.md",
        content: `# Secure Multiplayer\n\n- Server validates all actions\n- Rate-limit inputs\n- No client-trusted scores\n- Encrypt sensitive tokens via env vars\n`,
      },
    ],
  },
];

export function listHiveAssetPacks(specialist: "coder" | "game") {
  if (specialist === "game") return ASSET_PACKS;
  return ASSET_PACKS.filter((p) => p.id === "secure-multiplayer");
}

export function getHiveAssetPack(id: string): HiveAssetPack | null {
  return ASSET_PACKS.find((p) => p.id === id) ?? null;
}

export function hiveAssetsToSandboxFiles(pack: HiveAssetPack): SandboxFile[] {
  const now = new Date().toISOString();
  return pack.files.map((f, i) => ({
    id: `hive_${pack.id}_${i}`,
    path: f.path,
    content: f.content,
    language: f.path.endsWith(".json") ? "json" : f.path.endsWith(".md") ? "markdown" : "text",
    sizeBytes: Buffer.byteLength(f.content, "utf8"),
    updatedAt: now,
  }));
}
