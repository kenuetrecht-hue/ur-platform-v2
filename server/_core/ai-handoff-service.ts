/**
 * Cross-specialist handoff — competitive with multi-tool workflows (Cursor → deploy, Game → 3D).
 */

import { getCreatorAi } from "./ai-creator-registry";

export type HandoffSuggestion = {
  targetCreatorId: string;
  targetName: string;
  reason: string;
  prefillPrompt: string;
  route: string;
};

const HANDOFF_GRAPH: Record<string, HandoffSuggestion[]> = {
  "ai-coder-001": [
    {
      targetCreatorId: "ai-game-dev-001",
      targetName: "GameForge",
      reason: "Turn your app logic into a playable game.",
      prefillPrompt: "Help me gamify my project — core loop, mechanics, and first playable slice.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Add 3D assets and visual design.",
      prefillPrompt: "I need 3D assets and visual direction for my app/game.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-product-001",
      targetName: "Product Manager AI",
      reason: "Ship roadmap and user stories.",
      prefillPrompt: "Review my build and suggest a launch roadmap.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-game-dev-001": [
    {
      targetCreatorId: "ai-coder-001",
      targetName: "TechBuilder",
      reason: "Backend, APIs, and platform code.",
      prefillPrompt: "Help me build the server/backend for my game (auth, APIs, database).",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Meshes, textures, and 3D pipeline.",
      prefillPrompt: "Import 3D assets into my game project — GLB pipeline and optimization.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-author-001",
      targetName: "AI Author Muse",
      reason: "Story, lore, and quest design.",
      prefillPrompt: "Help me write the story and quest lines for my game world.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-3d-specialist": [
    {
      targetCreatorId: "ai-blueprint-reader-001",
      targetName: "Blueprint Reader AI",
      reason: "Read plans and schematics for your 3D build.",
      prefillPrompt: "I have a drawing — help me interpret dimensions and symbols before I model it in 3D.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-game-dev-001",
      targetName: "GameForge",
      reason: "Use your 3D assets in a playable game.",
      prefillPrompt: "Help me import my 3D assets into a Godot/Unity game project.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-coder-001",
      targetName: "TechBuilder",
      reason: "Integrate 3D viewer into your app.",
      prefillPrompt: "Help me embed a 3D model viewer in my React Native app.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-blueprint-reader-001": [
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Turn this drawing into a 3D model.",
      prefillPrompt: "Based on the blueprint we read, help me build it in the 3D workspace.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-structural-001",
      targetName: "AI Structural Engineer",
      reason: "Structural load and framing review.",
      prefillPrompt: "Review this structural sheet — loads, connections, and red flags.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-electrician-001",
      targetName: "Electrician Expert AI",
      reason: "Electrical one-line and panel interpretation.",
      prefillPrompt: "Walk me through this electrical drawing — panels, circuits, and NEC notes.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-contractor-001",
      targetName: "Contractor Pro AI",
      reason: "Build from these plans on site.",
      prefillPrompt: "I'm taking this plan set to the job site — walk me through execution order.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-framer-001": [
    {
      targetCreatorId: "ai-blueprint-reader-001",
      targetName: "Blueprint Reader AI",
      reason: "Learn to read framing plans faster.",
      prefillPrompt: "Teach me to read this framing plan — studs, headers, and load paths.",
      route: "/(tabs)/ais",
    },
  ],
  contentmate: [
    {
      targetCreatorId: "ai-marketing-001",
      targetName: "Marketing Expert AI",
      reason: "Turn content into a campaign.",
      prefillPrompt: "Turn my latest content ideas into a marketing campaign plan.",
      route: "/(tabs)/ais",
    },
  ],
};

export function getHandoffSuggestions(creatorId: string): HandoffSuggestion[] {
  return HANDOFF_GRAPH[creatorId] ?? [];
}

export function buildHandoffMessage(fromCreatorId: string, toCreatorId: string, context: string): string {
  const from = getCreatorAi(fromCreatorId);
  const to = getCreatorAi(toCreatorId);
  return [
    `Handoff from ${from?.name ?? "specialist"} to ${to?.name ?? "specialist"}:`,
    context.slice(0, 1500),
    "",
    "Continue this work in your domain. Reference prior context above.",
  ].join("\n");
}
