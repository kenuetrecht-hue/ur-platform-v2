/**
 * Beginner coach for UR 3D Workspace — what to click when you are not a CAD user.
 */

import type { CadCameraView, CadDrawTool } from "./workspace-cad";
import type { DesignLayer } from "./workspace-design-types";

export const WORKSPACE_COACH_STORAGE_KEY = "ur.3dWorkspace.coachHidden";

export const WORKSPACE_FIRST_SESSION_BLURB =
  "You do not need CAD experience. The grid is the floor. Each square is 1 foot. " +
  "Start with a room, look down on it, then draw one wall with two clicks.";

export type WorkspaceCoachStepId = "room" | "plan" | "wall" | "draw" | "done";

export type WorkspaceCoachStep = {
  id: Exclude<WorkspaceCoachStepId, "done">;
  n: number;
  title: string;
  detail: string;
  actionLabel: string;
};

export const WORKSPACE_COACH_STEPS: readonly WorkspaceCoachStep[] = [
  {
    id: "room",
    n: 1,
    title: "Put a room on the floor",
    detail: "Loads a 12×12×8 ft teaching room so you are not staring at an empty grid.",
    actionLabel: "Show me a room",
  },
  {
    id: "plan",
    n: 2,
    title: "Look from above",
    detail: "Plan view is a floor drawing. Walls are easier to place from the top.",
    actionLabel: "Look from above",
  },
  {
    id: "wall",
    n: 3,
    title: "Pick the Wall tool",
    detail: "Wall stays on until you switch back to Select. Then click the floor twice.",
    actionLabel: "Start a wall",
  },
  {
    id: "draw",
    n: 4,
    title: "Click two spots on the grid",
    detail: "First click is one end of the wall. Second click is the other end. Keep Ortho on so walls stay straight.",
    actionLabel: "I’m clicking the grid",
  },
];

export function designHasTeachingRoom(layers: readonly Pick<DesignLayer, "role" | "cad">[]): boolean {
  return layers.some((layer) => layer.cad != null || layer.role === "wall" || layer.role === "slab");
}

export function nextWorkspaceCoachStep(input: {
  layers: readonly Pick<DesignLayer, "role" | "cad">[];
  cameraView: CadCameraView;
  drawTool: CadDrawTool;
  drewSegment: boolean;
}): WorkspaceCoachStepId {
  if (!designHasTeachingRoom(input.layers)) return "room";
  if (input.cameraView !== "plan") return "plan";
  if (input.drewSegment) return "done";
  if (input.drawTool !== "wall") return "wall";
  return "draw";
}

export function workspaceBeginnerStatus(input: {
  drawTool: CadDrawTool;
  hasPendingStart: boolean;
  startLabel?: string;
  orthoLock: boolean;
}): string {
  if (input.drawTool === "select") {
    return "Click a piece to pick it. Drag to look around. Use Plan, then Wall, to draw.";
  }
  if (input.hasPendingStart) {
    const from = input.startLabel ? ` from ${input.startLabel}` : "";
    return `Now click the other end${from}.`;
  }
  if (input.drawTool === "wall") {
    return "Wall is on. Click once on the floor for the start, then click again for the end.";
  }
  if (input.drawTool === "slab") {
    return "Slab is on. Click two opposite corners of the floor.";
  }
  if (input.drawTool === "hvac_duct") {
    return "Duct is on. Click start, then end, along the ceiling run.";
  }
  if (input.drawTool === "pipe") {
    return "Pipe is on. Click start, then end.";
  }
  return input.orthoLock ? "Click start, then end · straight lines on" : "Click start, then end";
}
