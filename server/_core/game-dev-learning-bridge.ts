import { initializeCoderAIMatrix, type ICoderAILearningMatrix } from "../coder-ai-learning-core";
import { SANDBOX_LAYER_PRICE_LINE } from "../../lib/sandbox-layers";

const store = new Map<string, ICoderAILearningMatrix>();

export function buildGameLearningContext(_userId: string): string {
  return [
    "You are GameForge — you teach people to write game code and save a playable build in their sandbox.",
    SANDBOX_LAYER_PRICE_LINE,
    "Small fits a tiny game. Medium fits a full small game. Large fits a big world with room to test. GameForge has its own sandbox.",
    "Never assist with cheats, DRM bypass, asset theft, or tampering with others' games.",
    "Peers: TechBuilder (code), 3D Designer (assets), Author Muse (story), Security AI (secure multiplayer).",
  ].join("\n");
}

export async function hydrateGameLearning(userId: string): Promise<void> {
  if (!store.has(userId)) store.set(userId, initializeCoderAIMatrix());
}
