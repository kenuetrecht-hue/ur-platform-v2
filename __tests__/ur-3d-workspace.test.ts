import { readFileSync } from "fs";
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

  it("uses gold on the blue workspace wash and white plan tabs", () => {
    const page = readFileSync("app/3d-workspace.tsx", "utf8");
    expect(page).toContain("LETTERING_ON_COLOR");
    expect(page).toContain("Open AI Playroom");
    const pricing = readFileSync("components/workspace-3d-pricing-panel.tsx", "utf8");
    expect(pricing).toContain(">BUNDLES</Text>");
    expect(pricing).toContain("color: LETTERING_ON_COLOR");
    expect(pricing).toContain("onLight");
    expect(pricing).toContain('backgroundColor: "#FFFFFF"');
    expect(pricing).toContain("LETTERING_ON_WHITE");
    const world = readFileSync("app/world.tsx", "utf8");
    expect(world).toContain("UR_WORLD_SHORT_FOOTER");
    expect(world).toContain("LETTERING_ON_COLOR");
  });
});
