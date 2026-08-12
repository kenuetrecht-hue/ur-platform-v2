import { describe, it, expect } from "vitest";
import {
  assessForgeProjectScale,
  buildForgeAisWebPath,
  build3dWorkspaceWebPath,
  FORGE_NATIVE_LIMITS,
} from "../lib/forge-platform-handoff";
import { GAME_FORGE_ID, TECH_BUILDER_ID } from "../lib/forge-specialists";

describe("forge platform handoff", () => {
  it("builds web paths for coders and 3D merch lab", () => {
    expect(buildForgeAisWebPath(TECH_BUILDER_ID, "build")).toContain("ai-coder-001");
    expect(buildForgeAisWebPath(TECH_BUILDER_ID, "build")).toContain("surface=build");
    expect(buildForgeAisWebPath(GAME_FORGE_ID, "build")).toContain("ai-game-dev-001");
    expect(build3dWorkspaceWebPath({ project: "merchandise" })).toBe(
      "/3d-workspace?project=merchandise",
    );
  });

  it("does not hand off on web client", () => {
    const result = assessForgeProjectScale({
      isNativeApp: true,
      creatorId: TECH_BUILDER_ID,
      usagePercent: 99,
      projectFileCount: 100,
    });
    expect(result.shouldHandoffToWeb).toBe(true);
  });

  it("does not hand off when not native app", () => {
    const result = assessForgeProjectScale({
      isNativeApp: false,
      usagePercent: 99,
      projectFileCount: 100,
    });
    expect(result.shouldHandoffToWeb).toBe(false);
  });

  it("documents native limits for large projects", () => {
    expect(FORGE_NATIVE_LIMITS.usagePercent).toBeGreaterThan(0);
    expect(FORGE_NATIVE_LIMITS.projectFileCount).toBeGreaterThan(0);
  });
});
