import {
  DEFAULT_TRANSFORM,
  MAX_DESIGN_LAYERS,
  type DesignLayer,
  type DesignLayerPrimitive,
  type DesignLayerStl,
  type DesignLayerTransform,
  type PrimitiveType,
  type WorkspaceDesignState,
} from "./workspace-design-types";

function newLayerId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `layer-${globalThis.crypto.randomUUID()}`;
  }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const LAYER_COLORS = [
  "#4a90e2",
  "#50c878",
  "#f5a623",
  "#e94b8b",
  "#9b59b6",
  "#1abc9c",
  "#e74c3c",
  "#3498db",
];

export function createEmptyDesignState(): WorkspaceDesignState {
  return {
    layers: [createDefaultBaseLayer()],
    selectedLayerId: null,
    gridEnabled: true,
    snapEnabled: true,
    wireframe: false,
    version: 1,
  };
}

export function createDefaultBaseLayer(): DesignLayer {
  const now = new Date().toISOString();
  return {
    id: newLayerId(),
    name: "Base platform",
    kind: "primitive",
    visible: true,
    locked: false,
    opacity: 1,
    color: "#3d5a80",
    transform: { ...DEFAULT_TRANSFORM, position: { x: 0, y: 0, z: 0 } },
    primitive: { type: "cylinder", diameter: 14, height: 1, tessellation: 32 },
    updatedAt: now,
  };
}

export function nextLayerColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length]!;
}

export function createPrimitiveLayer(input: {
  name: string;
  type: PrimitiveType;
  color?: string;
  transform?: Partial<DesignLayerTransform>;
  createdBy?: string;
  primitive?: Partial<DesignLayerPrimitive>;
}): DesignLayer {
  const defaults: Record<PrimitiveType, DesignLayerPrimitive> = {
    box: { type: "box", width: 8, height: 8, depth: 8 },
    sphere: { type: "sphere", diameter: 8, tessellation: 24 },
    cylinder: { type: "cylinder", diameter: 8, height: 10, tessellation: 24 },
    torus: { type: "torus", diameter: 8, tessellation: 24 },
    plane: { type: "plane", width: 20, height: 20 },
  };

  const base = defaults[input.type];

  return {
    id: newLayerId(),
    name: input.name,
    kind: "primitive",
    visible: true,
    locked: false,
    opacity: 1,
    color: input.color ?? "#4a90e2",
    transform: {
      ...DEFAULT_TRANSFORM,
      ...input.transform,
      position: { ...DEFAULT_TRANSFORM.position, ...input.transform?.position },
      rotation: { ...DEFAULT_TRANSFORM.rotation, ...input.transform?.rotation },
      scale: { ...DEFAULT_TRANSFORM.scale, ...input.transform?.scale },
    },
    primitive: { ...base, ...input.primitive, type: input.type },
    createdBy: input.createdBy,
    updatedAt: new Date().toISOString(),
  };
}

/** Full control over shape dimensions — used by AI playroom build plans and CAD walls. */
export function createCustomLayer(input: {
  name: string;
  primitive: DesignLayerPrimitive;
  color: string;
  transform?: Partial<DesignLayerTransform>;
  createdBy?: string;
  role?: DesignLayer["role"];
  discipline?: DesignLayer["discipline"];
  cad?: DesignLayer["cad"];
}): DesignLayer {
  return {
    id: newLayerId(),
    name: input.name,
    kind: "primitive",
    visible: true,
    locked: false,
    opacity: 1,
    color: input.color,
    transform: {
      ...DEFAULT_TRANSFORM,
      ...input.transform,
      position: { ...DEFAULT_TRANSFORM.position, ...input.transform?.position },
      rotation: { ...DEFAULT_TRANSFORM.rotation, ...input.transform?.rotation },
      scale: { ...DEFAULT_TRANSFORM.scale, ...input.transform?.scale },
    },
    primitive: input.primitive,
    role: input.role,
    discipline: input.discipline,
    cad: input.cad,
    createdBy: input.createdBy,
    updatedAt: new Date().toISOString(),
  };
}

export function createStlLayer(input: {
  name: string;
  stl: DesignLayerStl;
  color?: string;
  createdBy?: string;
}): DesignLayer {
  return {
    id: newLayerId(),
    name: input.name,
    kind: "stl",
    visible: true,
    locked: false,
    opacity: 1,
    color: input.color ?? "#7ec8e3",
    transform: { ...DEFAULT_TRANSFORM },
    stl: input.stl,
    createdBy: input.createdBy,
    updatedAt: new Date().toISOString(),
  };
}

export function addLayer(state: WorkspaceDesignState, layer: DesignLayer): WorkspaceDesignState {
  if (state.layers.length >= MAX_DESIGN_LAYERS) {
    throw new Error(`Maximum ${MAX_DESIGN_LAYERS} layers reached.`);
  }
  return {
    ...state,
    layers: [...state.layers, layer],
    selectedLayerId: layer.id,
    version: state.version + 1,
  };
}

export function updateLayer(
  state: WorkspaceDesignState,
  layerId: string,
  patch: Partial<Omit<DesignLayer, "id">>,
): WorkspaceDesignState {
  return {
    ...state,
    layers: state.layers.map((l) =>
      l.id === layerId ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
    ),
    version: state.version + 1,
  };
}

export function removeLayer(state: WorkspaceDesignState, layerId: string): WorkspaceDesignState {
  const next = state.layers.filter((l) => l.id !== layerId);
  if (next.length === 0) {
    return { ...state, layers: [createDefaultBaseLayer()], selectedLayerId: null, version: state.version + 1 };
  }
  return {
    ...state,
    layers: next,
    selectedLayerId: state.selectedLayerId === layerId ? next[0]!.id : state.selectedLayerId,
    version: state.version + 1,
  };
}

export function moveLayer(state: WorkspaceDesignState, layerId: string, direction: "up" | "down"): WorkspaceDesignState {
  const idx = state.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return state;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= state.layers.length) return state;
  const layers = [...state.layers];
  [layers[idx], layers[target]] = [layers[target]!, layers[idx]!];
  return { ...state, layers, version: state.version + 1 };
}

export function duplicateLayer(state: WorkspaceDesignState, layerId: string): WorkspaceDesignState {
  const source = state.layers.find((l) => l.id === layerId);
  if (!source) return state;
  const copy: DesignLayer = {
    ...(JSON.parse(JSON.stringify(source)) as DesignLayer),
    id: newLayerId(),
    name: `${source.name} copy`,
    transform: {
      ...source.transform,
      position: {
        x: source.transform.position.x + 2,
        y: source.transform.position.y,
        z: source.transform.position.z + 2,
      },
    },
    updatedAt: new Date().toISOString(),
  };
  return addLayer(state, copy);
}

export function snapValue(value: number, grid = 1): number {
  return Math.round(value / grid) * grid;
}

export function designLayerSummary(state: WorkspaceDesignState): {
  totalLayers: number;
  stlLayers: number;
  primitiveLayers: number;
  totalStlBytes: number;
  totalTriangles: number;
} {
  const stlLayers = state.layers.filter((l) => l.kind === "stl");
  return {
    totalLayers: state.layers.length,
    stlLayers: stlLayers.length,
    primitiveLayers: state.layers.length - stlLayers.length,
    totalStlBytes: stlLayers.reduce((n, l) => n + (l.stl?.byteSize ?? 0), 0),
    totalTriangles: stlLayers.reduce((n, l) => n + (l.stl?.triangleCount ?? 0), 0),
  };
}

/** Browser localStorage key for offline layer cache. */
export function designStorageKey(sessionId: string): string {
  return `ur-ws-design-v1-${sessionId}`;
}
