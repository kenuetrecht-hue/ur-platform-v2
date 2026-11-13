/**
 * Three sandbox sizes for website, logo, game, and teaching-crypto builds.
 * Small is included. Medium and Large are a one-time unlock.
 * Prices stay low for the member. Storage and test room cost UR far less than the fee.
 */

export const SANDBOX_LAYER_PRICE_USD = {
  small: 0,
  medium: 9.99,
  large: 24.99,
} as const;

export const SANDBOX_LAYER_PRICE_LINE =
  "Small sandbox is free. Medium is $9.99 once. Large is $24.99 once. That fee is the room to store and test the project. It is separate from chat time.";

type LayerLimits = {
  storageBytes: number;
  maxProjects: number;
  maxFilesPerProject: number;
  maxFileBytes: number;
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const CODE_SANDBOX_LIMITS: Record<"small" | "medium" | "large", LayerLimits> = {
  small: { storageBytes: 64 * MB, maxProjects: 4, maxFilesPerProject: 40, maxFileBytes: 1 * MB },
  medium: { storageBytes: 512 * MB, maxProjects: 15, maxFilesPerProject: 500, maxFileBytes: 8 * MB },
  large: { storageBytes: 4 * GB, maxProjects: 40, maxFilesPerProject: 8000, maxFileBytes: 32 * MB },
};

export const GAME_SANDBOX_LIMITS: Record<"small" | "medium" | "large", LayerLimits> = {
  small: { storageBytes: 128 * MB, maxProjects: 4, maxFilesPerProject: 80, maxFileBytes: 5 * MB },
  medium: { storageBytes: 1 * GB, maxProjects: 15, maxFilesPerProject: 2000, maxFileBytes: 25 * MB },
  large: { storageBytes: 8 * GB, maxProjects: 40, maxFilesPerProject: 12000, maxFileBytes: 64 * MB },
};

export function sandboxLayerAdvice(kind: "website" | "logo" | "game" | "chain"): string {
  if (kind === "logo" || kind === "chain") {
    return `A logo or a teaching chain fits in the Small sandbox (${SANDBOX_LAYER_PRICE_LINE}) Website, logo, and crypto teaching builds share the code sandbox.`;
  }
  if (kind === "game") {
    return `A tiny game fits in Small. A full game needs Medium. A large world needs Large. GameForge has its own sandbox at the same prices. ${SANDBOX_LAYER_PRICE_LINE}`;
  }
  return `A one-page site fits in Small. A multi-page site fits in Medium. A large app, with room to build and test, needs Large. ${SANDBOX_LAYER_PRICE_LINE}`;
}
