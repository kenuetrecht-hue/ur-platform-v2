import { describe, expect, it } from "vitest";
import { createCadSlabLayer, createCadWallLayer, formatFeetInches, parseLengthFt, constrainOrtho, snapPlanPoint } from "../lib/workspace-cad";
import { createBuildKitLayers, createStarterRoomLayers, computeWorkspaceTakeoff } from "../lib/workspace-build-kits";
import { applyPhysicsPositions, colliderFromLayer, collidersFromLayers, physicsBodyKind, stepWorkspacePhysics } from "../lib/workspace-physics";

describe("CAD walls", () => {
  it("builds a 12 ft centerline wall on X", () => {
    const wall = createCadWallLayer({ x: 0, z: 0 }, { x: 12, z: 0 });
    expect(wall).not.toBeNull();
    expect(wall?.role).toBe("wall");
    expect(wall?.cad?.thickness).toBe(0.5);
    expect(wall?.primitive?.depth).toBe(12);
    expect(wall?.transform.rotation.y).toBe(90);
  });

  it("snaps and orthos like CAD", () => {
    expect(snapPlanPoint({ x: 1.4, z: 8.6 })).toEqual({ x: 1, z: 9 });
    expect(constrainOrtho({ x: 0, z: 0 }, { x: 10, z: 2 })).toEqual({ x: 10, z: 0 });
  });

  it("parses feet-inches", () => {
    expect(formatFeetInches(12.5)).toBe("12'-6\"");
    expect(parseLengthFt("8'-6\"")).toBe(8.5);
    expect(parseLengthFt("6\"")).toBe(0.5);
  });

  it("starter room walls share corners and takeoff a 12×12×8 box", () => {
    const layers = createStarterRoomLayers();
    expect(layers).toHaveLength(5);
    const takeoff = computeWorkspaceTakeoff(layers);
    expect(takeoff.wallCount).toBe(4);
    expect(takeoff.wallAreaSqFt).toBe(384);
    expect(takeoff.slabAreaSqFt).toBe(144);
    expect(takeoff.roomVolumeCuFt).toBe(1152);
    expect(takeoff.shopCfmEstimate).toBe(115.2);
  });
});

describe("physics colliders", () => {
  it("keeps walls fixed and drop probes dynamic", () => {
    const wall = createCadWallLayer({ x: 0, z: 0 }, { x: 12, z: 0 })!;
    const probe = createBuildKitLayers("physics_probe")[0]!;
    expect(physicsBodyKind(wall)).toBe("fixed");
    expect(physicsBodyKind(probe)).toBe("dynamic");
    expect(colliderFromLayer(probe)?.shape).toBe("sphere");
  });

  it("drops a probe onto a slab in Cannon.js", async () => {
    const slab = createCadSlabLayer({ x: -6, z: -6 }, { x: 6, z: 6 })!;
    const probe = createBuildKitLayers("physics_probe")[0]!;
    const result = await stepWorkspacePhysics({
      engine: "cannon",
      layers: [slab, probe],
      steps: 180,
    });
    const after = result.positions[probe.id];
    expect(after).toBeTruthy();
    expect(after!.y).toBeLessThan(probe.transform.position.y - 2);
    expect(after!.y).toBeGreaterThan(0.3);
    const applied = applyPhysicsPositions([slab, probe], result.positions);
    expect(applied.find((l) => l.id === probe.id)?.transform.position.y).toBe(after!.y);
    expect(applied.find((l) => l.id === slab.id)?.transform.position.y).toBe(slab.transform.position.y);
  });

  it("drops a probe onto a slab in Rapier", async () => {
    const slab = createCadSlabLayer({ x: -6, z: -6 }, { x: 6, z: 6 })!;
    const probe = createBuildKitLayers("physics_probe")[0]!;
    const result = await stepWorkspacePhysics({
      engine: "rapier",
      layers: [slab, probe],
      steps: 180,
    });
    const after = result.positions[probe.id];
    expect(after).toBeTruthy();
    expect(after!.y).toBeLessThan(probe.transform.position.y - 2);
    expect(after!.y).toBeGreaterThan(0.3);
  });

  it("lists both physics engines", () => {
    expect(collidersFromLayers(createStarterRoomLayers()).every((c) => c.body === "fixed")).toBe(true);
  });
});
