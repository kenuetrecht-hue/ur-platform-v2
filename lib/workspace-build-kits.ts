/**
 * Construction / HVAC / robotics kits for UR 3D Workspace.
 * Kits insert CAD centerline pieces (1 unit = 1 foot). Educational, not code-grade BIM.
 */

import { UR_3D_WORKSPACE_SHOP_ACH } from "./ur-3d-workspace";
import {
  createCadDuctLayer,
  createCadPipeLayer,
  createCadSlabLayer,
  createCadWallLayer,
  segmentLengthFt,
} from "./workspace-cad";
import type { DesignLayer, DesignLayerRole, WorkspaceDesignState } from "./workspace-design-types";
import { createCustomLayer, createEmptyDesignState } from "./workspace-design-utils";

export type BuildKitId = "wall" | "slab" | "hvac_duct" | "pipe" | "column" | "robot_pad" | "physics_probe";

export type BuildKitMeta = {
  id: BuildKitId;
  label: string;
  emoji: string;
  hint: string;
};

export const BUILD_KITS: readonly BuildKitMeta[] = [
  { id: "wall", label: "Wall 12'", emoji: "🧱", hint: "Along X" },
  { id: "slab", label: "Slab 12'", emoji: "⬜", hint: "Floor" },
  { id: "hvac_duct", label: "Duct 12'", emoji: "❄️", hint: "Ceiling run" },
  { id: "pipe", label: "Pipe 10'", emoji: "🔧", hint: "Along X" },
  { id: "column", label: "Column", emoji: "🪵", hint: "8 ft post" },
  { id: "robot_pad", label: "Robot pad", emoji: "🤖", hint: "Cell + base" },
  { id: "physics_probe", label: "Drop ball", emoji: "⚪", hint: "Rapier / Cannon" },
];

export type WorkspaceTakeoff = {
  wallCount: number;
  wallAreaSqFt: number;
  slabAreaSqFt: number;
  ductLinearFt: number;
  pipeLinearFt: number;
  columnCount: number;
  robotPadCount: number;
  roomVolumeCuFt: number;
  shopCfmEstimate: number | null;
};

function scaledBox(layer: DesignLayer): { width: number; height: number; depth: number } {
  const p = layer.primitive;
  const s = layer.transform.scale;
  return {
    width: Math.abs((p?.width ?? 1) * s.x),
    height: Math.abs((p?.height ?? 1) * s.y),
    depth: Math.abs((p?.depth ?? 1) * s.z),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function wallLengthFt(layer: DesignLayer): number {
  if (layer.cad) return segmentLengthFt(layer.cad.start, layer.cad.end);
  const { width, depth } = scaledBox(layer);
  return Math.max(width, depth);
}

function wallHeightFt(layer: DesignLayer): number {
  if (layer.cad) return layer.cad.height;
  return scaledBox(layer).height;
}

/** Face area of a wall: length × height. */
export function wallFaceAreaSqFt(layer: DesignLayer): number {
  if (layer.kind !== "primitive") return 0;
  return round1(wallLengthFt(layer) * wallHeightFt(layer));
}

export function slabAreaSqFt(layer: DesignLayer): number {
  if (layer.cad && layer.role === "slab") {
    return round1(Math.abs(layer.cad.end.x - layer.cad.start.x) * Math.abs(layer.cad.end.z - layer.cad.start.z));
  }
  if (layer.kind !== "primitive" || layer.primitive?.type !== "box") return 0;
  const { width, depth } = scaledBox(layer);
  return round1(width * depth);
}

export function linearRunFt(layer: DesignLayer): number {
  if (layer.cad) return round1(segmentLengthFt(layer.cad.start, layer.cad.end));
  if (layer.kind !== "primitive") return 0;
  if (layer.primitive?.type === "cylinder") {
    const s = layer.transform.scale;
    return round1(Math.abs((layer.primitive.height ?? 1) * s.y));
  }
  if (layer.primitive?.type === "box") {
    const b = scaledBox(layer);
    return round1(Math.max(b.width, b.height, b.depth));
  }
  return 0;
}

export function computeWorkspaceTakeoff(layers: DesignLayer[]): WorkspaceTakeoff {
  const visible = layers.filter((l) => l.visible);
  const walls = visible.filter((l) => l.role === "wall");
  const slabs = visible.filter((l) => l.role === "slab");
  const ducts = visible.filter((l) => l.role === "hvac_duct");
  const pipes = visible.filter((l) => l.role === "pipe");
  const columns = visible.filter((l) => l.role === "column");
  const pads = visible.filter((l) => l.role === "robot_pad");

  const wallAreaSqFt = round1(walls.reduce((n, l) => n + wallFaceAreaSqFt(l), 0));
  const slabAreaSqFtTotal = round1(slabs.reduce((n, l) => n + slabAreaSqFt(l), 0));
  const maxWallHeight = walls.reduce((h, l) => Math.max(h, wallHeightFt(l)), 0);
  const roomVolumeCuFt =
    slabAreaSqFtTotal > 0 && maxWallHeight > 0 ? round1(slabAreaSqFtTotal * maxWallHeight) : 0;
  const shopCfmEstimate =
    roomVolumeCuFt > 0 ? round1((roomVolumeCuFt * UR_3D_WORKSPACE_SHOP_ACH) / 60) : null;

  return {
    wallCount: walls.length,
    wallAreaSqFt,
    slabAreaSqFt: slabAreaSqFtTotal,
    ductLinearFt: round1(ducts.reduce((n, l) => n + linearRunFt(l), 0)),
    pipeLinearFt: round1(pipes.reduce((n, l) => n + linearRunFt(l), 0)),
    columnCount: columns.length,
    robotPadCount: pads.length,
    roomVolumeCuFt,
    shopCfmEstimate,
  };
}

export function formatWorkspaceTakeoff(takeoff: WorkspaceTakeoff): string {
  const bits = [
    `${takeoff.wallCount} walls · ${takeoff.wallAreaSqFt} sq ft face`,
    `${takeoff.slabAreaSqFt} sq ft slab`,
  ];
  if (takeoff.ductLinearFt > 0) bits.push(`${takeoff.ductLinearFt} ft duct`);
  if (takeoff.pipeLinearFt > 0) bits.push(`${takeoff.pipeLinearFt} ft pipe`);
  if (takeoff.roomVolumeCuFt > 0) bits.push(`${takeoff.roomVolumeCuFt} cu ft`);
  if (takeoff.shopCfmEstimate != null) bits.push(`~${takeoff.shopCfmEstimate} CFM @ ${UR_3D_WORKSPACE_SHOP_ACH} ACH`);
  return bits.join(" · ");
}

function must<T>(layer: T | null): T {
  if (!layer) throw new Error("CAD kit produced an empty piece.");
  return layer;
}

export function createBuildKitLayers(kit: BuildKitId): DesignLayer[] {
  switch (kit) {
    case "wall":
      return [must(createCadWallLayer({ x: -6, z: 0 }, { x: 6, z: 0 }))];
    case "slab":
      return [must(createCadSlabLayer({ x: -6, z: -6 }, { x: 6, z: 6 }))];
    case "hvac_duct":
      return [must(createCadDuctLayer({ x: -6, z: 0 }, { x: 6, z: 0 }))];
    case "pipe":
      return [must(createCadPipeLayer({ x: -5, z: 2 }, { x: 5, z: 2 }))];
    case "column":
      return [
        createCustomLayer({
          name: "Column 8 ft",
          role: "column",
          discipline: "architecture",
          color: "#6b4f3a",
          primitive: { type: "cylinder", diameter: 1.2, height: 8, tessellation: 16 },
          transform: { position: { x: 0, y: 4, z: 0 } },
        }),
      ];
    case "robot_pad":
      return [
        createCustomLayer({
          name: "Robot cell pad 8×8 ft",
          role: "robot_pad",
          discipline: "robotics",
          color: "#3d4a5c",
          primitive: { type: "box", width: 8, height: 0.35, depth: 8 },
          transform: { position: { x: 0, y: 0.18, z: 0 } },
        }),
        createCustomLayer({
          name: "Robot base",
          role: "robot_pad",
          discipline: "robotics",
          color: "#e94b8b",
          primitive: { type: "cylinder", diameter: 1.6, height: 2.2, tessellation: 20 },
          transform: { position: { x: 0, y: 1.3, z: 0 } },
        }),
      ];
    case "physics_probe":
      return [
        createCustomLayer({
          name: "Drop probe 1 ft",
          color: "#f5a623",
          primitive: { type: "sphere", diameter: 1, tessellation: 16 },
          transform: { position: { x: 0, y: 10, z: 0 } },
        }),
      ];
    default: {
      const _never: never = kit;
      return _never;
    }
  }
}

/** 12×12×8 ft teaching room — four centerline walls that share corners + slab. */
export function createStarterRoomLayers(): DesignLayer[] {
  const sw = { x: -6, z: -6 };
  const se = { x: 6, z: -6 };
  const ne = { x: 6, z: 6 };
  const nw = { x: -6, z: 6 };
  return [
    must(createCadSlabLayer(sw, ne)),
    must(createCadWallLayer(sw, se)),
    must(createCadWallLayer(se, ne)),
    must(createCadWallLayer(ne, nw)),
    must(createCadWallLayer(nw, sw)),
  ];
}

export function createStarterRoomDesignState(): WorkspaceDesignState {
  const layers = createStarterRoomLayers();
  return {
    ...createEmptyDesignState(),
    layers,
    selectedLayerId: layers[0]?.id ?? null,
    version: 1,
  };
}

export function kitLayerCount(kit: BuildKitId): number {
  return createBuildKitLayers(kit).length;
}

export function isBuildRole(role: DesignLayerRole | undefined): boolean {
  return role != null && role !== "generic";
}
