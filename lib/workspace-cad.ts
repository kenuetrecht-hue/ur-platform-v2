/**
 * CAD-style geometry for UR 3D Workspace.
 * Centerline walls, ortho lock, 1 ft snap, feet-inches. Educational, not AutoCAD/Revit.
 */

import type {
  CadPlanPoint,
  CadSegment,
  DesignLayer,
  DesignLayerRole,
} from "./workspace-design-types";
import { createCustomLayer, snapValue } from "./workspace-design-utils";

export type CadDrawTool = "select" | "wall" | "slab" | "hvac_duct" | "pipe";

export type CadCameraView = "iso" | "plan" | "front" | "right";

export const CAD_GRID_FT = 1;

export const CAD_DEFAULTS = {
  wall: { height: 8, thickness: 0.5, baseElevation: 0, color: "#c4a574", role: "wall" as const },
  slab: { height: 0.4, thickness: 0.4, baseElevation: 0, color: "#8a8f99", role: "slab" as const },
  hvac_duct: { height: 1, thickness: 1, baseElevation: 7.5, color: "#9aa4b2", role: "hvac_duct" as const },
  pipe: { height: 0.4, thickness: 0.4, baseElevation: 2, color: "#4a7c59", role: "pipe" as const },
} as const;

export const CAD_CAMERA_PRESETS: Record<
  CadCameraView,
  { alpha: number; beta: number; radius: number; ortho: boolean; label: string }
> = {
  iso: { alpha: -Math.PI / 3, beta: Math.PI / 2.8, radius: 50, ortho: false, label: "Iso" },
  plan: { alpha: -Math.PI / 2, beta: 0.04, radius: 70, ortho: true, label: "Plan" },
  front: { alpha: -Math.PI / 2, beta: Math.PI / 2 - 0.04, radius: 50, ortho: true, label: "Front" },
  right: { alpha: 0, beta: Math.PI / 2 - 0.04, radius: 50, ortho: true, label: "Right" },
};

export function cadCameraCartesian(
  view: CadCameraView,
  target: { x: number; y: number; z: number } = { x: 0, y: 4, z: 0 },
): { x: number; y: number; z: number } {
  const { alpha, beta, radius } = CAD_CAMERA_PRESETS[view];
  return {
    x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
    y: target.y + radius * Math.cos(beta),
    z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
  };
}

export const CAD_DRAW_TOOLS: { id: CadDrawTool; label: string; emoji: string; hint: string }[] = [
  { id: "select", label: "Select", emoji: "🖱️", hint: "Pick a piece" },
  { id: "wall", label: "Wall", emoji: "🧱", hint: "Click start, click end" },
  { id: "slab", label: "Slab", emoji: "⬜", hint: "Two opposite corners" },
  { id: "hvac_duct", label: "Duct", emoji: "❄️", hint: "HVAC centerline" },
  { id: "pipe", label: "Pipe", emoji: "🔧", hint: "Pipe centerline" },
];

export function snapPlanPoint(point: CadPlanPoint, grid = CAD_GRID_FT): CadPlanPoint {
  return { x: snapValue(point.x, grid), z: snapValue(point.z, grid) };
}

export function segmentLengthFt(start: CadPlanPoint, end: CadPlanPoint): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

/** Yaw so a box's local Z (depth) follows the centerline on the XZ plane. */
export function segmentYawDegrees(start: CadPlanPoint, end: CadPlanPoint): number {
  return (Math.atan2(end.x - start.x, end.z - start.z) * 180) / Math.PI;
}

export function midpointPlan(start: CadPlanPoint, end: CadPlanPoint): CadPlanPoint {
  return { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
}

/** CAD F8-style ortho: lock the second point to X or Z. */
export function constrainOrtho(start: CadPlanPoint, end: CadPlanPoint): CadPlanPoint {
  const dx = Math.abs(end.x - start.x);
  const dz = Math.abs(end.z - start.z);
  if (dx >= dz) return { x: end.x, z: start.z };
  return { x: start.x, z: end.z };
}

export function formatFeetInches(ft: number): string {
  const sign = ft < 0 ? "-" : "";
  const abs = Math.abs(ft);
  let feet = Math.floor(abs + 1e-9);
  let inches = Math.round((abs - feet) * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return `${sign}${feet}'-${inches}"`;
}

export function parseLengthFt(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/feet|foot|ft/g, "'").replace(/inches|inch|in/g, '"');
  if (!t) return null;
  const compound = t.match(/^(-?\d+(?:\.\d+)?)\s*'\s*-?\s*(\d+(?:\.\d+)?)?\s*"?\s*$/);
  if (compound) {
    const feet = Number(compound[1]);
    const inches = compound[2] ? Number(compound[2]) : 0;
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
    return feet + inches / 12;
  }
  const inchesOnly = t.match(/^(-?\d+(?:\.\d+)?)\s*"\s*$/);
  if (inchesOnly) {
    const inches = Number(inchesOnly[1]);
    return Number.isFinite(inches) ? inches / 12 : null;
  }
  const n = Number(t.replace(/['"]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function cadLengthFt(layer: DesignLayer): number {
  if (layer.cad) return round1(segmentLengthFt(layer.cad.start, layer.cad.end));
  return 0;
}

export function describeCadLayer(layer: DesignLayer): string {
  if (!layer.cad) return layer.name;
  const len = formatFeetInches(segmentLengthFt(layer.cad.start, layer.cad.end));
  const h = formatFeetInches(layer.cad.height);
  const t = formatFeetInches(layer.cad.thickness);
  if (layer.role === "slab") {
    const w = formatFeetInches(Math.abs(layer.cad.end.x - layer.cad.start.x));
    const d = formatFeetInches(Math.abs(layer.cad.end.z - layer.cad.start.z));
    return `${w} × ${d} slab`;
  }
  return `${len} · ${h} high · ${t} thick`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function segmentOrNull(start: CadPlanPoint, end: CadPlanPoint, min = 0.5): { start: CadPlanPoint; end: CadPlanPoint } | null {
  if (segmentLengthFt(start, end) < min) return null;
  return { start, end };
}

export function createCadWallLayer(start: CadPlanPoint, end: CadPlanPoint, overrides?: Partial<CadSegment>): DesignLayer | null {
  const pts = segmentOrNull(start, end);
  if (!pts) return null;
  const d = { ...CAD_DEFAULTS.wall, ...overrides };
  const length = segmentLengthFt(pts.start, pts.end);
  const mid = midpointPlan(pts.start, pts.end);
  const cad: CadSegment = {
    start: pts.start,
    end: pts.end,
    height: d.height,
    thickness: d.thickness,
    baseElevation: d.baseElevation,
  };
  return createCustomLayer({
    name: `Wall ${formatFeetInches(length)}`,
    role: "wall",
    discipline: "architecture",
    color: CAD_DEFAULTS.wall.color,
    cad,
    primitive: { type: "box", width: cad.thickness, height: cad.height, depth: length },
    transform: {
      position: { x: mid.x, y: cad.baseElevation + cad.height / 2, z: mid.z },
      rotation: { x: 0, y: segmentYawDegrees(pts.start, pts.end), z: 0 },
    },
  });
}

export function createCadSlabLayer(a: CadPlanPoint, b: CadPlanPoint, overrides?: Partial<CadSegment>): DesignLayer | null {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minZ = Math.min(a.z, b.z);
  const maxZ = Math.max(a.z, b.z);
  const width = maxX - minX;
  const depth = maxZ - minZ;
  if (width < 0.5 || depth < 0.5) return null;
  const d = { ...CAD_DEFAULTS.slab, ...overrides };
  const cad: CadSegment = {
    start: { x: minX, z: minZ },
    end: { x: maxX, z: maxZ },
    height: d.height,
    thickness: d.thickness,
    baseElevation: d.baseElevation,
  };
  return createCustomLayer({
    name: `Slab ${formatFeetInches(width)} × ${formatFeetInches(depth)}`,
    role: "slab",
    discipline: "architecture",
    color: CAD_DEFAULTS.slab.color,
    cad,
    primitive: { type: "box", width, height: cad.height, depth },
    transform: {
      position: {
        x: (minX + maxX) / 2,
        y: cad.baseElevation + cad.height / 2,
        z: (minZ + maxZ) / 2,
      },
    },
  });
}

export function createCadDuctLayer(start: CadPlanPoint, end: CadPlanPoint, overrides?: Partial<CadSegment>): DesignLayer | null {
  const pts = segmentOrNull(start, end);
  if (!pts) return null;
  const d = { ...CAD_DEFAULTS.hvac_duct, ...overrides };
  const length = segmentLengthFt(pts.start, pts.end);
  const mid = midpointPlan(pts.start, pts.end);
  const cad: CadSegment = {
    start: pts.start,
    end: pts.end,
    height: d.height,
    thickness: d.thickness,
    baseElevation: d.baseElevation,
  };
  return createCustomLayer({
    name: `Duct ${formatFeetInches(length)}`,
    role: "hvac_duct",
    discipline: "mechanical",
    color: CAD_DEFAULTS.hvac_duct.color,
    cad,
    primitive: { type: "box", width: cad.thickness, height: cad.height, depth: length },
    transform: {
      position: { x: mid.x, y: cad.baseElevation + cad.height / 2, z: mid.z },
      rotation: { x: 0, y: segmentYawDegrees(pts.start, pts.end), z: 0 },
    },
  });
}

export function createCadPipeLayer(start: CadPlanPoint, end: CadPlanPoint, overrides?: Partial<CadSegment>): DesignLayer | null {
  const pts = segmentOrNull(start, end);
  if (!pts) return null;
  const d = { ...CAD_DEFAULTS.pipe, ...overrides };
  const length = segmentLengthFt(pts.start, pts.end);
  const mid = midpointPlan(pts.start, pts.end);
  const cad: CadSegment = {
    start: pts.start,
    end: pts.end,
    height: d.height,
    thickness: d.thickness,
    baseElevation: d.baseElevation,
  };
  return createCustomLayer({
    name: `Pipe ${formatFeetInches(length)}`,
    role: "pipe",
    discipline: "plumbing",
    color: CAD_DEFAULTS.pipe.color,
    cad,
    primitive: { type: "cylinder", diameter: cad.thickness, height: length, tessellation: 16 },
    transform: {
      position: { x: mid.x, y: cad.baseElevation, z: mid.z },
      rotation: { x: 90, y: segmentYawDegrees(pts.start, pts.end), z: 0 },
    },
  });
}

export function createLayerFromDrawTool(
  tool: CadDrawTool,
  start: CadPlanPoint,
  end: CadPlanPoint,
): DesignLayer | null {
  switch (tool) {
    case "wall":
      return createCadWallLayer(start, end);
    case "slab":
      return createCadSlabLayer(start, end);
    case "hvac_duct":
      return createCadDuctLayer(start, end);
    case "pipe":
      return createCadPipeLayer(start, end);
    case "select":
      return null;
    default: {
      const _never: never = tool;
      return _never;
    }
  }
}

export function resizeCadLayer(
  layer: DesignLayer,
  patch: { length?: number; height?: number; thickness?: number },
): Partial<Pick<DesignLayer, "cad" | "primitive" | "transform" | "name">> {
  if (!layer.cad || !layer.primitive) return {};
  const cad: CadSegment = { ...layer.cad };
  if (patch.height != null && Number.isFinite(patch.height) && patch.height > 0) cad.height = patch.height;
  if (patch.thickness != null && Number.isFinite(patch.thickness) && patch.thickness > 0) {
    cad.thickness = patch.thickness;
  }

  if (layer.role === "slab") {
    if (patch.length != null && Number.isFinite(patch.length) && patch.length > 0.5) {
      cad.end = { ...cad.end, x: cad.start.x + patch.length };
    }
    const width = Math.abs(cad.end.x - cad.start.x);
    const depth = Math.abs(cad.end.z - cad.start.z);
    return {
      cad,
      name: `Slab ${formatFeetInches(width)} × ${formatFeetInches(depth)}`,
      primitive: { ...layer.primitive, width, height: cad.height, depth },
      transform: {
        ...layer.transform,
        position: {
          x: (cad.start.x + cad.end.x) / 2,
          y: cad.baseElevation + cad.height / 2,
          z: (cad.start.z + cad.end.z) / 2,
        },
      },
    };
  }

  const dirLen = segmentLengthFt(cad.start, cad.end) || 1;
  const ux = (cad.end.x - cad.start.x) / dirLen;
  const uz = (cad.end.z - cad.start.z) / dirLen;
  const length =
    patch.length != null && Number.isFinite(patch.length) && patch.length >= 0.5 ? patch.length : dirLen;
  cad.end = { x: cad.start.x + ux * length, z: cad.start.z + uz * length };
  const mid = midpointPlan(cad.start, cad.end);
  const yaw = segmentYawDegrees(cad.start, cad.end);
  const isPipe = layer.role === "pipe" || layer.primitive.type === "cylinder";

  return {
    cad,
    name: `${layer.role === "hvac_duct" ? "Duct" : layer.role === "pipe" ? "Pipe" : "Wall"} ${formatFeetInches(length)}`,
    primitive: isPipe
      ? { ...layer.primitive, diameter: cad.thickness, height: length }
      : { ...layer.primitive, width: cad.thickness, height: cad.height, depth: length },
    transform: {
      ...layer.transform,
      position: isPipe
        ? { x: mid.x, y: cad.baseElevation, z: mid.z }
        : { x: mid.x, y: cad.baseElevation + cad.height / 2, z: mid.z },
      rotation: isPipe
        ? { x: 90, y: yaw, z: 0 }
        : { x: 0, y: yaw, z: 0 },
    },
  };
}

export function roleLabel(role: DesignLayerRole | undefined): string {
  switch (role) {
    case "wall":
      return "Wall";
    case "slab":
      return "Slab";
    case "hvac_duct":
      return "HVAC";
    case "pipe":
      return "Pipe";
    case "column":
      return "Column";
    case "robot_pad":
      return "Robot";
    default:
      return "Mesh";
  }
}
