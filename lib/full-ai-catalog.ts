import type { AiCreatorCatalogEntry } from "@/lib/ai-creator-catalog";
import { getFullCatalogEntries } from "@/lib/ai-creator-catalog-sync";

/** Every public specialist plus owner-only ops AIs (44+ total). */
export function getFullAiCatalog(): AiCreatorCatalogEntry[] {
  return getFullCatalogEntries();
}

export const FULL_AI_CATALOG = getFullAiCatalog();

export const FULL_AI_COUNT = FULL_AI_CATALOG.length;
