import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  MAX_DESIGN_LAYERS,
  MAX_STL_BYTES,
  type WorkspaceDesignState,
} from "../../lib/workspace-design-types";
import { createEmptyDesignState } from "../../lib/workspace-design-utils";

const Vec3Schema = z.object({ x: z.number(), y: z.number(), z: z.number() });

const DesignLayerSchema = z.object({
  id: z.string().min(4).max(80),
  name: z.string().min(1).max(120),
  kind: z.enum(["primitive", "stl"]),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1),
  color: z.string().max(32),
  transform: z.object({
    position: Vec3Schema,
    rotation: Vec3Schema,
    scale: Vec3Schema,
  }),
  primitive: z
    .object({
      type: z.enum(["box", "sphere", "cylinder", "torus", "plane"]),
      width: z.number().optional(),
      height: z.number().optional(),
      depth: z.number().optional(),
      diameter: z.number().optional(),
      tessellation: z.number().optional(),
    })
    .optional(),
  stl: z
    .object({
      fileName: z.string().max(200),
      dataBase64: z.string().max(MAX_STL_BYTES * 2),
      byteSize: z.number().int().max(MAX_STL_BYTES),
      triangleCount: z.number().int().optional(),
      isAscii: z.boolean().optional(),
    })
    .optional(),
  createdBy: z.string().max(64).optional(),
  role: z.enum(["wall", "slab", "hvac_duct", "pipe", "column", "robot_pad", "generic"]).optional(),
  discipline: z
    .enum(["architecture", "mechanical", "plumbing", "electrical", "robotics", "general"])
    .optional(),
  cad: z
    .object({
      start: z.object({ x: z.number(), z: z.number() }),
      end: z.object({ x: z.number(), z: z.number() }),
      height: z.number(),
      thickness: z.number(),
      baseElevation: z.number(),
    })
    .optional(),
  updatedAt: z.string(),
});

export const WorkspaceDesignStateSchema = z.object({
  layers: z.array(DesignLayerSchema).max(MAX_DESIGN_LAYERS),
  selectedLayerId: z.string().max(80).nullable(),
  gridEnabled: z.boolean(),
  snapEnabled: z.boolean(),
  wireframe: z.boolean(),
  version: z.number().int().min(0),
});

const designBySessionId = new Map<string, WorkspaceDesignState>();

export function validateDesignState(raw: unknown): WorkspaceDesignState {
  const parsed = WorkspaceDesignStateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: parsed.error.issues[0]?.message ?? "Invalid design state.",
    });
  }
  for (const layer of parsed.data.layers) {
    if (layer.kind === "stl") {
      if (!layer.stl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "STL layer missing mesh data." });
      }
      if (layer.stl.byteSize > MAX_STL_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "STL file exceeds size limit." });
      }
    }
    if (layer.kind === "primitive" && !layer.primitive) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Primitive layer missing shape." });
    }
  }
  return {
    ...parsed.data,
    selectedLayerId: parsed.data.selectedLayerId ?? null,
  };
}

export function getSessionDesign(sessionId: string): WorkspaceDesignState {
  return designBySessionId.get(sessionId) ?? createEmptyDesignState();
}

export function saveSessionDesign(sessionId: string, state: unknown): WorkspaceDesignState {
  const validated = validateDesignState(state);
  designBySessionId.set(sessionId, validated);
  return validated;
}

export function clearSessionDesign(sessionId: string): void {
  designBySessionId.delete(sessionId);
}
