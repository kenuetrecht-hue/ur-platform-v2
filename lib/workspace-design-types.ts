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
export const MAX_DESIGN_LAYERS = 32;
