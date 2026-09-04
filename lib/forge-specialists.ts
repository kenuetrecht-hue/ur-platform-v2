/** Forge specialists with Chat + Learn + Build sandbox surfaces */
export const TECH_BUILDER_ID = "ai-coder-001";
export const GAME_FORGE_ID = "ai-game-dev-001";
export const CHAIN_SMITH_ID = "ai-blockchain-001";

export function isTechBuilder(creatorId: string): boolean {
  return creatorId === TECH_BUILDER_ID;
}

export function isGameForge(creatorId: string): boolean {
  return creatorId === GAME_FORGE_ID;
}

export function isChainSmith(creatorId: string): boolean {
  return creatorId === CHAIN_SMITH_ID;
}

export function isForgeSpecialist(creatorId: string): boolean {
  return isTechBuilder(creatorId) || isGameForge(creatorId) || isChainSmith(creatorId);
}

export function forgeLearnLabel(creatorId: string): string {
  if (isGameForge(creatorId)) return "Learn game dev";
  if (isChainSmith(creatorId)) return "Learn blockchain";
  if (isTechBuilder(creatorId)) return "Learn to code";
  return "Learn the trade";
}
