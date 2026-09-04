import { describe, expect, it } from "vitest";
import { createEmptyDesignState } from "../lib/workspace-design-utils";
import { createStarterRoomLayers } from "../lib/workspace-build-kits";
import {
  designHasTeachingRoom,
  nextWorkspaceCoachStep,
  workspaceBeginnerStatus,
  WORKSPACE_FIRST_SESSION_BLURB,
} from "../lib/workspace-first-steps";

describe("UR 3D Workspace first-session coach", () => {
  it("does not treat the empty base platform as a room", () => {
    expect(designHasTeachingRoom(createEmptyDesignState().layers)).toBe(false);
    expect(designHasTeachingRoom(createStarterRoomLayers())).toBe(true);
  });

  it("walks room → plan → wall → draw → done", () => {
    const empty = createEmptyDesignState().layers;
    const room = createStarterRoomLayers();

    expect(
      nextWorkspaceCoachStep({
        layers: empty,
        cameraView: "iso",
        drawTool: "select",
        drewSegment: false,
      }),
    ).toBe("room");

    expect(
      nextWorkspaceCoachStep({
        layers: room,
        cameraView: "iso",
        drawTool: "select",
        drewSegment: false,
      }),
    ).toBe("plan");

    expect(
      nextWorkspaceCoachStep({
        layers: room,
        cameraView: "plan",
        drawTool: "select",
        drewSegment: false,
      }),
    ).toBe("wall");

    expect(
      nextWorkspaceCoachStep({
        layers: room,
        cameraView: "plan",
        drawTool: "wall",
        drewSegment: false,
      }),
    ).toBe("draw");

    expect(
      nextWorkspaceCoachStep({
        layers: room,
        cameraView: "plan",
        drawTool: "wall",
        drewSegment: true,
      }),
    ).toBe("done");
  });

  it("tells a beginner to click the floor twice when Wall is on", () => {
    expect(WORKSPACE_FIRST_SESSION_BLURB).toMatch(/1 foot/i);
    expect(
      workspaceBeginnerStatus({
        drawTool: "wall",
        hasPendingStart: false,
        orthoLock: true,
      }),
    ).toMatch(/click once on the floor/i);
    expect(
      workspaceBeginnerStatus({
        drawTool: "wall",
        hasPendingStart: true,
        startLabel: "0'-0\", 0'-0\"",
        orthoLock: true,
      }),
    ).toMatch(/other end/i);
  });
});
