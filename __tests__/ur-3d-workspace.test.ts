import { describe, expect, it } from "vitest";
import {
  UR_3D_WORKSPACE_ENGINES,
  UR_3D_WORKSPACE_PRODUCT_NAME,
  UR_3D_WORKSPACE_VS_WORLD,
} from "../lib/ur-3d-workspace";
import { WORKSPACE_PHYSICS_ENGINES } from "../lib/workspace-physics";

describe("UR 3D Workspace product", () => {
  it("is the CAD lab, not UR World", () => {
    expect(UR_3D_WORKSPACE_PRODUCT_NAME).toBe("UR 3D Workspace");
    expect(UR_3D_WORKSPACE_VS_WORLD).toMatch(/UR World/);
    expect(UR_3D_WORKSPACE_VS_WORLD).toMatch(/build lab/i);
  });

  it("names three.js, R3F, Babylon, Rapier, and Cannon", () => {
    expect(UR_3D_WORKSPACE_ENGINES.map((e) => e.id)).toEqual(["r3f", "babylon"]);
    expect(WORKSPACE_PHYSICS_ENGINES.map((e) => e.id)).toEqual(["rapier", "cannon"]);
    expect(WORKSPACE_PHYSICS_ENGINES.find((e) => e.id === "cannon")?.packageName).toBe("cannon-es");
  });
});
