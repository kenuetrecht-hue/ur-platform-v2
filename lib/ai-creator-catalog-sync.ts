import { AI_CREATOR_CATALOG } from "./ai-creator-catalog";
import { OWNER_OPS_AI_IDS, OWNER_PLATFORM_OPS_CATALOG } from "./owner-platform-ops-catalog";

/** Public specialist IDs (excludes owner-only ops AIs). */
export const PUBLIC_CATALOG_IDS = AI_CREATOR_CATALOG.map((c) => c.id);

/** All catalog IDs: public specialists + owner-only ops AIs. */
export const FULL_CATALOG_IDS = [
  ...OWNER_OPS_AI_IDS,
  ...PUBLIC_CATALOG_IDS.filter((id) => !OWNER_OPS_AI_IDS.includes(id)),
];

/**
 * Validates client catalog stays in sync with server registry exports.
 * Used in tests — server registry is source of truth at runtime via aiCreators.list.
 */
export function validateCatalogSync(serverRegistryIds: string[]): {
  ok: boolean;
  missingFromServer: string[];
  missingFromCatalog: string[];
} {
  const serverSet = new Set(serverRegistryIds);
  const publicSet = new Set(PUBLIC_CATALOG_IDS);

  const missingFromServer = PUBLIC_CATALOG_IDS.filter((id) => !serverSet.has(id));
  const missingFromCatalog = serverRegistryIds.filter(
    (id) => !publicSet.has(id) && !OWNER_OPS_AI_IDS.includes(id),
  );

  return {
    ok: missingFromServer.length === 0 && missingFromCatalog.length === 0,
    missingFromServer,
    missingFromCatalog,
  };
}

export function getFullCatalogEntries() {
  const merged = [...AI_CREATOR_CATALOG];
  for (const ops of OWNER_PLATFORM_OPS_CATALOG) {
    if (!merged.some((c) => c.id === ops.id)) merged.unshift(ops);
  }
  return merged;
}

export const EXPECTED_PUBLIC_COUNT = PUBLIC_CATALOG_IDS.length;
export const EXPECTED_FULL_COUNT = getFullCatalogEntries().length;
