/**
 * UR 3D Workspace physics — Rapier and Cannon.js (cannon-es).
 * CAD units are feet. Gravity is 32.2 ft/s² so a drop test matches the drawing, not SI meters.
 */

import type { DesignLayer, Vec3 } from "./workspace-design-types";

export const WORKSPACE_PHYSICS_ENGINES = [
  {
    id: "rapier" as const,
    label: "Rapier",
    packageName: "@dimforge/rapier3d-compat",
    hint: "Modern rigid-body engine — robotics cells, collisions, drop tests",
  },
  {
    id: "cannon" as const,
    label: "Cannon.js",
    packageName: "cannon-es",
    hint: "Classic Cannon.js (cannon-es) — gravity, bounce, simple contacts",
  },
] as const;

export type WorkspacePhysicsEngineId = (typeof WORKSPACE_PHYSICS_ENGINES)[number]["id"];

/** Feet per second squared. 1 CAD unit = 1 foot. */
export const WORKSPACE_GRAVITY_FT_S2 = 32.2;

export type PhysicsBodyKind = "fixed" | "dynamic" | "skip";

export type PhysicsCollider = {
  layerId: string;
  shape: "box" | "sphere" | "cylinder";
  /** Box half-extents, or sphere radius in hx, or cylinder radius + half-height. */
  hx: number;
  hy: number;
  hz: number;
  position: Vec3;
  rotationDeg: Vec3;
  body: Exclude<PhysicsBodyKind, "skip">;
  mass: number;
};

export function physicsBodyKind(layer: DesignLayer): PhysicsBodyKind {
  if (!layer.visible || layer.kind !== "primitive" || !layer.primitive) return "skip";
  const type = layer.primitive.type;
  if (type === "plane" || type === "torus") return "skip";
  const role = layer.role;
  if (role === "wall" || role === "slab" || role === "hvac_duct" || role === "pipe" || role === "column") {
    return "fixed";
  }
  if (role === "robot_pad") {
    return layer.name.toLowerCase().includes("base") ? "dynamic" : "fixed";
  }
  return "dynamic";
}

export function colliderFromLayer(layer: DesignLayer): PhysicsCollider | null {
  const body = physicsBodyKind(layer);
  if (body === "skip" || !layer.primitive) return null;
  const p = layer.primitive;
  const s = layer.transform.scale;
  const position = { ...layer.transform.position };
  const rotationDeg = { ...layer.transform.rotation };
  const mass = body === "fixed" ? 0 : 1;

  if (p.type === "box") {
    return {
      layerId: layer.id,
      shape: "box",
      hx: Math.max(0.05, Math.abs((p.width ?? 1) * s.x) / 2),
      hy: Math.max(0.05, Math.abs((p.height ?? 1) * s.y) / 2),
      hz: Math.max(0.05, Math.abs((p.depth ?? 1) * s.z) / 2),
      position,
      rotationDeg,
      body,
      mass,
    };
  }
  if (p.type === "sphere") {
    const r = Math.max(0.05, Math.abs((p.diameter ?? 1) * Math.max(s.x, s.y, s.z)) / 2);
    return {
      layerId: layer.id,
      shape: "sphere",
      hx: r,
      hy: r,
      hz: r,
      position,
      rotationDeg,
      body,
      mass,
    };
  }
  if (p.type === "cylinder") {
    const r = Math.max(0.05, Math.abs((p.diameter ?? 1) * Math.max(s.x, s.z)) / 2);
    const halfH = Math.max(0.05, Math.abs((p.height ?? 1) * s.y) / 2);
    return {
      layerId: layer.id,
      shape: "cylinder",
      hx: r,
      hy: halfH,
      hz: r,
      position,
      rotationDeg,
      body,
      mass,
    };
  }
  return null;
}

export function collidersFromLayers(layers: DesignLayer[]): PhysicsCollider[] {
  return layers.map(colliderFromLayer).filter((c): c is PhysicsCollider => c != null);
}

export type PhysicsStepResult = {
  engine: WorkspacePhysicsEngineId;
  steps: number;
  dt: number;
  positions: Record<string, Vec3>;
};

function eulerDegToQuat(deg: Vec3): { x: number; y: number; z: number; w: number } {
  const x = (deg.x * Math.PI) / 180;
  const y = (deg.y * Math.PI) / 180;
  const z = (deg.z * Math.PI) / 180;
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);
  return {
    w: cx * cy * cz + sx * sy * sz,
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
  };
}

let rapierReady: Promise<typeof import("@dimforge/rapier3d-compat")> | null = null;

async function loadRapier() {
  if (!rapierReady) {
    rapierReady = import("@dimforge/rapier3d-compat").then(async (mod) => {
      const RAPIER = mod.default;
      await RAPIER.init();
      return RAPIER;
    });
  }
  return rapierReady;
}

async function stepRapier(colliders: PhysicsCollider[], steps: number, dt: number): Promise<Record<string, Vec3>> {
  const RAPIER = await loadRapier();
  const world = new RAPIER.World(new RAPIER.Vector3(0, -WORKSPACE_GRAVITY_FT_S2, 0));
  const bodies = new Map<string, InstanceType<typeof RAPIER.RigidBody>>();

  for (const col of colliders) {
    const desc = col.body === "fixed" ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
    desc.setTranslation(col.position.x, col.position.y, col.position.z);
    const q = eulerDegToQuat(col.rotationDeg);
    desc.setRotation(q);
    const body = world.createRigidBody(desc);
    let colliderDesc;
    if (col.shape === "sphere") {
      colliderDesc = RAPIER.ColliderDesc.ball(col.hx);
    } else if (col.shape === "cylinder") {
      colliderDesc = RAPIER.ColliderDesc.cylinder(col.hy, col.hx);
    } else {
      colliderDesc = RAPIER.ColliderDesc.cuboid(col.hx, col.hy, col.hz);
    }
    colliderDesc.setRestitution(0.05);
    colliderDesc.setFriction(0.8);
    world.createCollider(colliderDesc, body);
    bodies.set(col.layerId, body);
  }

  world.timestep = dt;
  for (let i = 0; i < steps; i++) world.step();

  const positions: Record<string, Vec3> = {};
  for (const [id, body] of bodies) {
    const t = body.translation();
    positions[id] = { x: t.x, y: t.y, z: t.z };
  }
  world.free();
  return positions;
}

async function stepCannon(colliders: PhysicsCollider[], steps: number, dt: number): Promise<Record<string, Vec3>> {
  const CANNON = await import("cannon-es");
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -WORKSPACE_GRAVITY_FT_S2, 0) });
  world.broadphase = new CANNON.NaiveBroadphase();
  const bodies = new Map<string, InstanceType<typeof CANNON.Body>>();

  for (const col of colliders) {
    let shape: InstanceType<typeof CANNON.Shape>;
    if (col.shape === "sphere") {
      shape = new CANNON.Sphere(col.hx);
    } else if (col.shape === "cylinder") {
      shape = new CANNON.Cylinder(col.hx, col.hx, col.hy * 2, 12);
    } else {
      shape = new CANNON.Box(new CANNON.Vec3(col.hx, col.hy, col.hz));
    }
    const body = new CANNON.Body({
      mass: col.body === "fixed" ? 0 : col.mass,
      shape,
      position: new CANNON.Vec3(col.position.x, col.position.y, col.position.z),
    });
    const q = eulerDegToQuat(col.rotationDeg);
    body.quaternion.set(q.x, q.y, q.z, q.w);
    body.material = new CANNON.Material({ friction: 0.8, restitution: 0.05 });
    world.addBody(body);
    bodies.set(col.layerId, body);
  }

  for (let i = 0; i < steps; i++) world.step(dt);

  const positions: Record<string, Vec3> = {};
  for (const [id, body] of bodies) {
    positions[id] = { x: body.position.x, y: body.position.y, z: body.position.z };
  }
  return positions;
}

/** Run gravity for a short clip. Dynamic pieces fall; walls and slabs stay put. */
export async function stepWorkspacePhysics(input: {
  engine: WorkspacePhysicsEngineId;
  layers: DesignLayer[];
  steps?: number;
  dt?: number;
}): Promise<PhysicsStepResult> {
  const steps = input.steps ?? 180;
  const dt = input.dt ?? 1 / 60;
  const colliders = collidersFromLayers(input.layers);
  const positions =
    input.engine === "rapier" ? await stepRapier(colliders, steps, dt) : await stepCannon(colliders, steps, dt);
  return { engine: input.engine, steps, dt, positions };
}

export function applyPhysicsPositions(
  layers: DesignLayer[],
  positions: Record<string, Vec3>,
): DesignLayer[] {
  return layers.map((layer) => {
    const pos = positions[layer.id];
    if (!pos || physicsBodyKind(layer) !== "dynamic") return layer;
    return {
      ...layer,
      transform: { ...layer.transform, position: pos },
      updatedAt: new Date().toISOString(),
    };
  });
}
