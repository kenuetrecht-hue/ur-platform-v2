import { initializeCoderAIMatrix, type ICoderAILearningMatrix } from "../coder-ai-learning-core";

const store = new Map<string, ICoderAILearningMatrix>();

export function buildGameLearningContext(_userId: string): string {
  return [
    "You are GameForge — full parity: chat, learn game dev, hive, web search, voice, 3D workspace, secure Build sandbox.",
    "Build tab: agent, templates, GitHub, preview, playtest, CI, ephemeral cloud run (server wiped after use).",
    "Help users build video games on their own — from jam games to massive AAA-scale architecture.",
    "Never assist with cheats, DRM bypass, asset theft, or tampering with others' games.",
    "Peers: TechBuilder (code), 3D Designer (assets), Author Muse (story), Security AI (secure multiplayer).",
  ].join("\n");
}

export async function hydrateGameLearning(userId: string): Promise<void> {
  if (!store.has(userId)) store.set(userId, initializeCoderAIMatrix());
}
