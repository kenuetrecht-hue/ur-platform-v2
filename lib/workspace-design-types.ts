/** Shared design-layer model for the 3D workspace builder. */

export type PrimitiveType = "box" | "sphere" | "cylinder" | "torus" | "plane";

export type DesignLayerKind = "primitive" | "stl";

export type Vec3 = { x: number; y: number; z: number };

export type DesignLayerTransform = {
  position: Vec3;
  /** Euler angles in degrees */
  rotation: Vec3;
  scale: Vec3;
};

export type DesignLayerPrimitive = {
  type: PrimitiveType;
  width?: number;
  height?: number;
  depth?: number;
  diameter?: number;
  tessellation?: number;
};

export type DesignLayerStl = {
  fileName: string;
  /** Base64-encoded STL (binary or ASCII) */
  dataBase64: string;
  byteSize: number;
  triangleCount?: number;
  isAscii?: boolean;
};

export const DESIGN_LAYER_ROLES = [
  "wall",
  "slab",
  "hvac_duct",
  "pipe",
  "column",
  "robot_pad",
  "generic",
] as const;

export type DesignLayerRole = (typeof DESIGN_LAYER_ROLES)[number];

export const CAD_DISCIPLINES = [
  "architecture",
  "mechanical",
  "plumbing",
  "electrical",
  "robotics",
  "general",
] as const;

export type CadDiscipline = (typeof CAD_DISCIPLINES)[number];

/** Plan-view point. Y is elevation on CadSegment. Units: feet. */
export type CadPlanPoint = { x: number; z: number };

/** Centerline segment — CAD walls, ducts, and pipes. */
export type CadSegment = {
  start: CadPlanPoint;
  end: CadPlanPoint;
  /** Wall/duct height, or slab thickness. Feet. */
  height: number;
  /** Wall/duct/pipe thickness (plan width). Feet. */
  thickness: number;
  /** Bottom elevation. Feet. */
  baseElevation: number;
};

export type DesignLayer = {
  id: string;
  name: string;
  kind: DesignLayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
  color: string;
  transform: DesignLayerTransform;
  primitive?: DesignLayerPrimitive;
  stl?: DesignLayerStl;
  role?: DesignLayerRole;
  discipline?: CadDiscipline;
  cad?: CadSegment;
  createdBy?: string;
  updatedAt: string;
};

export type WorkspaceDesignState = {
  layers: DesignLayer[];
  selectedLayerId: string | null;
  gridEnabled: boolean;
  snapEnabled: boolean;
  wireframe: boolean;
  version: number;
};

export const DEFAULT_TRANSFORM: DesignLayerTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

export const MAX_STL_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_DESIGN_LAYERS = 64;
