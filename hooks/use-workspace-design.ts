import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { WorkspaceDesignState } from "@/lib/workspace-design-types";
import {
  addLayer,
  createEmptyDesignState,
  createPrimitiveLayer,
  createStlLayer,
  designStorageKey,
  duplicateLayer,
  moveLayer,
  nextLayerColor,
  removeLayer,
  updateLayer,
} from "@/lib/workspace-design-utils";
import type { PrimitiveType } from "@/lib/workspace-design-types";
import type { StlParseResult } from "@/lib/stl-utils";
import type { CadDrawTool, CadPlanPoint } from "@/lib/workspace-cad";
import { createLayerFromDrawTool, resizeCadLayer } from "@/lib/workspace-cad";
import type { BuildKitId } from "@/lib/workspace-build-kits";
import { createBuildKitLayers, createStarterRoomDesignState } from "@/lib/workspace-build-kits";
import { applyPhysicsPositions } from "@/lib/workspace-physics";

function loadLocalDesign(sessionId: string): WorkspaceDesignState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(designStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceDesignState;
  } catch {
    return null;
  }
}

function saveLocalDesign(sessionId: string, state: WorkspaceDesignState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(designStorageKey(sessionId), JSON.stringify(state));
  } catch {
    /* quota exceeded — server copy still saved */
  }
}

/** Design layer state with server + localStorage persistence. */
export function useWorkspaceDesign(sessionId: string | null) {
  const [design, setDesign] = useState<WorkspaceDesignState>(() => createEmptyDesignState());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  const serverDesign = trpc.equipment.getDesignState.useQuery(
    { sessionId: sessionId! },
    { enabled: Boolean(sessionId) },
  );
  const saveMutation = trpc.equipment.saveDesignState.useMutation({
    onSuccess: () => {
      if (sessionId) void utils.equipment.getDesignState.invalidate({ sessionId });
    },
  });

  useEffect(() => {
    if (!sessionId) {
      setDesign(createEmptyDesignState());
      return;
    }
    const local = loadLocalDesign(sessionId);
    if (local && local.layers.length > 0) {
      setDesign(local);
    } else if (serverDesign.data) {
      setDesign(serverDesign.data);
    }
  }, [sessionId, serverDesign.data]);

  const persist = useCallback(
    (next: WorkspaceDesignState) => {
      setDesign(next);
      if (!sessionId) return;
      saveLocalDesign(sessionId, next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate({ sessionId, design: next });
      }, 800);
    },
    [sessionId, saveMutation],
  );

  const setSelectedLayerId = useCallback(
    (id: string | null) => {
      persist({ ...design, selectedLayerId: id });
    },
    [design, persist],
  );

  const patchDesign = useCallback(
    (patch: Partial<WorkspaceDesignState>) => {
      persist({ ...design, ...patch, version: design.version + 1 });
    },
    [design, persist],
  );

  const addPrimitive = useCallback(
    (type: PrimitiveType, name?: string) => {
      const layer = createPrimitiveLayer({
        name: name ?? `New ${type}`,
        type,
        color: nextLayerColor(design.layers.length),
      });
      persist(addLayer(design, layer));
    },
    [design, persist],
  );

  const addStl = useCallback(
    (parsed: StlParseResult) => {
      const layer = createStlLayer({
        name: parsed.fileName.replace(/\.stl$/i, ""),
        stl: {
          fileName: parsed.fileName,
          dataBase64: parsed.dataBase64,
          byteSize: parsed.byteSize,
          triangleCount: parsed.triangleCount,
          isAscii: parsed.isAscii,
        },
      });
      persist(addLayer(design, layer));
    },
    [design, persist],
  );

  const updateLayerById = useCallback(
    (layerId: string, patch: Parameters<typeof updateLayer>[2]) => {
      persist(updateLayer(design, layerId, patch));
    },
    [design, persist],
  );

  const removeLayerById = useCallback(
    (layerId: string) => {
      persist(removeLayer(design, layerId));
    },
    [design, persist],
  );

  const moveLayerById = useCallback(
    (layerId: string, direction: "up" | "down") => {
      persist(moveLayer(design, layerId, direction));
    },
    [design, persist],
  );

  const duplicateLayerById = useCallback(
    (layerId: string) => {
      persist(duplicateLayer(design, layerId));
    },
    [design, persist],
  );

  const flushSave = useCallback(async () => {
    if (!sessionId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveMutation.mutateAsync({ sessionId, design });
  }, [sessionId, design, saveMutation]);

  const loadDesign = useCallback(
    (next: WorkspaceDesignState) => {
      persist(next);
    },
    [persist],
  );

  const addBuildKit = useCallback(
    (kit: BuildKitId) => {
      let next = design;
      for (const layer of createBuildKitLayers(kit)) {
        next = addLayer(next, layer);
      }
      persist(next);
    },
    [design, persist],
  );

  const loadStarterRoom = useCallback(() => {
    persist(createStarterRoomDesignState());
  }, [persist]);

  const addCadDraw = useCallback(
    (tool: CadDrawTool, start: CadPlanPoint, end: CadPlanPoint) => {
      const layer = createLayerFromDrawTool(tool, start, end);
      if (!layer) return false;
      persist(addLayer(design, layer));
      return true;
    },
    [design, persist],
  );

  const updateCadDimensions = useCallback(
    (layerId: string, patch: { length?: number; height?: number; thickness?: number }) => {
      const layer = design.layers.find((l) => l.id === layerId);
      if (!layer) return;
      persist(updateLayer(design, layerId, resizeCadLayer(layer, patch)));
    },
    [design, persist],
  );

  const applyPhysicsPositionsToDesign = useCallback(
    (positions: Record<string, { x: number; y: number; z: number }>) => {
      persist({
        ...design,
        layers: applyPhysicsPositions(design.layers, positions),
        version: design.version + 1,
      });
    },
    [design, persist],
  );

  return {
    design,
    isLoading: serverDesign.isLoading,
    isSaving: saveMutation.isPending,
    selectedLayerId: design.selectedLayerId,
    setSelectedLayerId,
    patchDesign,
    addPrimitive,
    addStl,
    addBuildKit,
    addCadDraw,
    loadStarterRoom,
    updateCadDimensions,
    applyPhysicsPositionsToDesign,
    updateLayerById,
    removeLayerById,
    moveLayerById,
    duplicateLayerById,
    flushSave,
    loadDesign,
  };
}
