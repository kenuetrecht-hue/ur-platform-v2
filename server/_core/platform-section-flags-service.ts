/**
 * Server-side platform section kill switches — owner-approved maintenance isolation.
 */

import { TRPCError } from "@trpc/server";
import {
  DEFAULT_SECTION_MAINTENANCE_MESSAGE,
  PLATFORM_SECTION_CATALOG,
  PLATFORM_SECTION_IDS,
  type PlatformSectionId,
} from "../../lib/platform-section-flags";
import type { OwnerPlatformAiId } from "./platform-ops-ai";
import { persistSectionFlag, loadSectionFlagsFromDb } from "../db-platform-ops";

export type SectionDisabledBy = OwnerPlatformAiId | "owner" | "system";

export type PlatformSectionState = {
  id: PlatformSectionId;
  label: string;
  description: string;
  routes: string[];
  enabled: boolean;
  maintenanceMessage: string;
  disabledAt: string | null;
  disabledBy: SectionDisabledBy | null;
  incidentId: string | null;
  reason: string | null;
  updatedAt: string;
};

const sectionStore = new Map<PlatformSectionId, PlatformSectionState>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function rememberSection(state: PlatformSectionState): PlatformSectionState {
  sectionStore.set(state.id, state);
  void persistSectionFlag({
    id: state.id,
    enabled: state.enabled,
    maintenanceMessage: state.maintenanceMessage,
    disabledAt: state.disabledAt,
    disabledBy: state.disabledBy,
    incidentId: state.incidentId,
    reason: state.reason,
    updatedAt: state.updatedAt,
  });
  return state;
}

export async function hydratePlatformSectionFlags(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const rows = await loadSectionFlagsFromDb();
      for (const row of rows) {
        if (!(PLATFORM_SECTION_IDS as readonly string[]).includes(row.id)) continue;
        const id = row.id as PlatformSectionId;
        const base = defaultState(id);
        sectionStore.set(id, {
          ...base,
          enabled: row.enabled,
          maintenanceMessage: row.maintenanceMessage,
          disabledAt: row.disabledAt,
          disabledBy: row.disabledBy as SectionDisabledBy | null,
          incidentId: row.incidentId,
          reason: row.reason,
          updatedAt: row.updatedAt,
        });
      }
      hydrated = true;
    })();
  }
  await hydratePromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultState(id: PlatformSectionId): PlatformSectionState {
  const meta = PLATFORM_SECTION_CATALOG.find((s) => s.id === id)!;
  return {
    id,
    label: meta.label,
    description: meta.description,
    routes: meta.routes,
    enabled: true,
    maintenanceMessage: DEFAULT_SECTION_MAINTENANCE_MESSAGE,
    disabledAt: null,
    disabledBy: null,
    incidentId: null,
    reason: null,
    updatedAt: nowIso(),
  };
}

function getOrInit(id: PlatformSectionId): PlatformSectionState {
  let state = sectionStore.get(id);
  if (!state) {
    state = defaultState(id);
    sectionStore.set(id, state);
  }
  return state;
}

export function listPlatformSectionStates(): PlatformSectionState[] {
  return PLATFORM_SECTION_IDS.map((id) => getOrInit(id));
}

export function getPlatformSectionState(id: PlatformSectionId): PlatformSectionState {
  return getOrInit(id);
}

export function isPlatformSectionEnabled(
  id: PlatformSectionId,
  isPlatformOwner: boolean,
): boolean {
  if (isPlatformOwner) return true;
  return getOrInit(id).enabled;
}

export function assertPlatformSectionEnabled(
  id: PlatformSectionId,
  isPlatformOwner: boolean,
): void {
  if (isPlatformSectionEnabled(id, isPlatformOwner)) return;
  const state = getOrInit(id);
  throw new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: state.maintenanceMessage,
  });
}

export function disablePlatformSection(input: {
  sectionId: PlatformSectionId;
  reason: string;
  maintenanceMessage?: string;
  incidentId?: string;
  disabledBy: SectionDisabledBy;
}): PlatformSectionState {
  const state = getOrInit(input.sectionId);
  state.enabled = false;
  state.disabledAt = nowIso();
  state.disabledBy = input.disabledBy;
  state.incidentId = input.incidentId ?? null;
  state.reason = input.reason.slice(0, 2000);
  state.maintenanceMessage = (input.maintenanceMessage ?? DEFAULT_SECTION_MAINTENANCE_MESSAGE).slice(
    0,
    500,
  );
  state.updatedAt = nowIso();
  return rememberSection(state);
}

export function enablePlatformSection(input: {
  sectionId: PlatformSectionId;
  ownerNote?: string;
}): PlatformSectionState {
  const state = getOrInit(input.sectionId);
  state.enabled = true;
  state.disabledAt = null;
  state.disabledBy = null;
  state.incidentId = null;
  state.reason = input.ownerNote?.slice(0, 500) ?? null;
  state.maintenanceMessage = DEFAULT_SECTION_MAINTENANCE_MESSAGE;
  state.updatedAt = nowIso();
  return rememberSection(state);
}

export function getPublicSectionFlags(): Array<{
  id: PlatformSectionId;
  enabled: boolean;
  maintenanceMessage: string;
}> {
  return listPlatformSectionStates().map((s) => ({
    id: s.id,
    enabled: s.enabled,
    maintenanceMessage: s.maintenanceMessage,
  }));
}

export function countDisabledSections(): number {
  return listPlatformSectionStates().filter((s) => !s.enabled).length;
}

/** Test helper */
export function _resetPlatformSectionsForTests(): void {
  sectionStore.clear();
  hydrated = false;
  hydratePromise = null;
}
