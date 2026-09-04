/**
 * Civic Plaza Babylon scene — Plan A look (see lib/ur-world-look-upgrade-plan.ts).
 * Stone/concrete walks, tables with legs, chairs with backs, sit/stand bar, fountain.
 * Still primitives + DynamicTexture — not purchased .glb. B/C load glTF into the same stations.
 * Stylized (not photoreal crowds). Animals and birds are local atmosphere.
 */
import {
  UR_WORLD_HQ,
  UR_WORLD_LAMP_SPOTS,
  UR_WORLD_PALETTE as P,
  UR_WORLD_SIGN_LINES,
  UR_WORLD_TALK_DESKS,
  UR_WORLD_TREE_SPOTS,
} from "@/lib/ur-world-plaza";
import { UR_WORLD_PLOT_SEEDS } from "@/lib/ur-world-economy";

type BabylonModule = typeof import("@babylonjs/core");
type Scene = InstanceType<BabylonModule["Scene"]>;
type Mesh = InstanceType<BabylonModule["Mesh"]>;

export type PlazaAtmosphere = {
  tick: (dt: number, time: number) => void;
};

function hexColor(BABYLON: BabylonModule, hex: string) {
  return BABYLON.Color3.FromHexString(hex.startsWith("#") ? hex : `#${hex}`);
}

function mat(
  BABYLON: BabylonModule,
  scene: Scene,
  name: string,
  color: string,
  extra?: { emissive?: number; specular?: number; alpha?: number },
) {
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor = hexColor(BABYLON, color);
  m.specularColor = new BABYLON.Color3(extra?.specular ?? 0.12, extra?.specular ?? 0.12, extra?.specular ?? 0.12);
  if (extra?.emissive) {
    m.emissiveColor = hexColor(BABYLON, color).scale(extra.emissive);
  }
  if (extra?.alpha != null) {
    m.alpha = extra.alpha;
    m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return m;
}

function addBox(
  BABYLON: BabylonModule,
  scene: Scene,
  name: string,
  opts: { w: number; h: number; d: number; x: number; y: number; z: number; color: string; collide?: boolean; emissive?: number },
) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: opts.w, height: opts.h, depth: opts.d }, scene);
  mesh.position = new BABYLON.Vector3(opts.x, opts.y, opts.z);
  mesh.checkCollisions = opts.collide !== false;
  mesh.material = mat(BABYLON, scene, `${name}-mat`, opts.color, { emissive: opts.emissive });
  return mesh;
}

function addCylinder(
  BABYLON: BabylonModule,
  scene: Scene,
  name: string,
  opts: { h: number; d: number; x: number; y: number; z: number; color: string; tess?: number; collide?: boolean; emissive?: number },
) {
  const mesh = BABYLON.MeshBuilder.CreateCylinder(
    name,
    { height: opts.h, diameter: opts.d, tessellation: opts.tess ?? 12 },
    scene,
  );
  mesh.position = new BABYLON.Vector3(opts.x, opts.y, opts.z);
  mesh.checkCollisions = opts.collide !== false;
  mesh.material = mat(BABYLON, scene, `${name}-mat`, opts.color, { emissive: opts.emissive });
  return mesh;
}

function addSign(
  BABYLON: BabylonModule,
  scene: Scene,
  id: string,
  line: { text: string; sub: string },
  opts: { x: number; y: number; z: number; rotY: number; w?: number; h?: number },
) {
  const w = opts.w ?? 3.4;
  const h = opts.h ?? 1.35;
  const plane = BABYLON.MeshBuilder.CreatePlane(`sign-${id}`, { width: w, height: h }, scene);
  plane.position = new BABYLON.Vector3(opts.x, opts.y, opts.z);
  plane.rotation.y = opts.rotY;
  plane.checkCollisions = false;

  const texture = new BABYLON.DynamicTexture(`sign-tex-${id}`, { width: 512, height: 256 }, scene, false);
  const ctx = texture.getContext();
  ctx.fillStyle = "#1e1b4b";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#4F46E5";
  ctx.fillRect(0, 0, 18, 256);
  ctx.fillStyle = "#7C3AED";
  ctx.fillRect(494, 0, 18, 256);
  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 92px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(line.text, 256, 110);
  ctx.fillStyle = "#c7d2fe";
  ctx.font = "28px sans-serif";
  ctx.fillText(line.sub, 256, 175);
  texture.update();

  const m = new BABYLON.StandardMaterial(`sign-mat-${id}`, scene);
  m.diffuseTexture = texture;
  m.emissiveTexture = texture;
  m.emissiveColor = new BABYLON.Color3(0.45, 0.4, 0.7);
  m.specularColor = new BABYLON.Color3(0.08, 0.08, 0.12);
  m.backFaceCulling = false;
  plane.material = m;
  return plane;
}

function addTree(BABYLON: BabylonModule, scene: Scene, i: number, x: number, z: number, scale: number) {
  const trunkH = 2.4 * scale;
  addCylinder(BABYLON, scene, `tree-trunk-${i}`, {
    h: trunkH,
    d: 0.38 * scale,
    x,
    y: trunkH / 2,
    z,
    color: P.bark,
    tess: 8,
  });
  const canopy = BABYLON.MeshBuilder.CreateSphere(
    `tree-canopy-${i}`,
    { diameter: 2.4 * scale, segments: 8 },
    scene,
  );
  canopy.position = new BABYLON.Vector3(x, trunkH + 0.55 * scale, z);
  canopy.scaling.y = 0.75;
  canopy.checkCollisions = true;
  canopy.material = mat(BABYLON, scene, `tree-canopy-mat-${i}`, i % 2 === 0 ? P.canopy : P.canopyAlt, {
    emissive: 0.22,
  });
  const halo = BABYLON.MeshBuilder.CreateSphere(
    `tree-halo-${i}`,
    { diameter: 1.1 * scale, segments: 6 },
    scene,
  );
  halo.position = new BABYLON.Vector3(x + 0.45 * scale, trunkH + 0.2 * scale, z);
  halo.checkCollisions = false;
  halo.material = mat(BABYLON, scene, `tree-halo-mat-${i}`, P.glowBlue, { emissive: 0.4, alpha: 0.55 });
}

function addLamp(BABYLON: BabylonModule, scene: Scene, i: number, x: number, z: number) {
  addCylinder(BABYLON, scene, `lamp-pole-${i}`, {
    h: 3.1,
    d: 0.12,
    x,
    y: 1.55,
    z,
    color: P.stone,
    tess: 6,
  });
  const bulb = BABYLON.MeshBuilder.CreateSphere(`lamp-bulb-${i}`, { diameter: 0.42, segments: 8 }, scene);
  bulb.position = new BABYLON.Vector3(x, 3.25, z);
  bulb.checkCollisions = false;
  bulb.material = mat(BABYLON, scene, `lamp-bulb-mat-${i}`, i % 2 === 0 ? P.glowBlue : P.glowPurple, {
    emissive: 0.7,
  });
}

function makeDog(BABYLON: BabylonModule, scene: Scene, name: string, color: string) {
  const root = new BABYLON.TransformNode(name, scene);
  const body = BABYLON.MeshBuilder.CreateCapsule(`${name}-body`, { height: 0.7, radius: 0.16, tessellation: 6 }, scene);
  body.parent = root;
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.28;
  body.checkCollisions = false;
  body.material = mat(BABYLON, scene, `${name}-body-mat`, color);

  const head = BABYLON.MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.28, segments: 8 }, scene);
  head.parent = root;
  head.position = new BABYLON.Vector3(0.38, 0.36, 0);
  head.checkCollisions = false;
  head.material = mat(BABYLON, scene, `${name}-head-mat`, color);

  for (const side of [-1, 1]) {
    const ear = BABYLON.MeshBuilder.CreateBox(`${name}-ear-${side}`, { width: 0.06, height: 0.14, depth: 0.08 }, scene);
    ear.parent = head;
    ear.position = new BABYLON.Vector3(-0.02, 0.14, side * 0.08);
    ear.material = mat(BABYLON, scene, `${name}-ear-mat-${side}`, P.neonPurple);
  }
  const tail = BABYLON.MeshBuilder.CreateBox(`${name}-tail`, { width: 0.06, height: 0.06, depth: 0.28 }, scene);
  tail.parent = root;
  tail.position = new BABYLON.Vector3(-0.4, 0.34, 0);
  tail.material = mat(BABYLON, scene, `${name}-tail-mat`, color);
  return root;
}

function makeBird(BABYLON: BabylonModule, scene: Scene, name: string) {
  const bird = BABYLON.MeshBuilder.CreateBox(name, { width: 0.28, height: 0.08, depth: 0.16 }, scene);
  bird.checkCollisions = false;
  bird.material = mat(BABYLON, scene, `${name}-mat`, P.glowBlue, { emissive: 0.35 });
  return bird;
}

function addCloud(BABYLON: BabylonModule, scene: Scene, name: string, x: number, y: number, z: number, s: number) {
  const cloud = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 6 * s, segments: 6 }, scene);
  cloud.position = new BABYLON.Vector3(x, y, z);
  cloud.scaling.y = 0.28;
  cloud.scaling.x = 1.6;
  cloud.checkCollisions = false;
  cloud.material = mat(BABYLON, scene, `${name}-mat`, "#c4b5fd", { emissive: 0.12, alpha: 0.38 });
  return cloud;
}

type PlazaMats = {
  paver: InstanceType<BabylonModule["StandardMaterial"]>;
  wood: InstanceType<BabylonModule["StandardMaterial"]>;
  woodDark: InstanceType<BabylonModule["StandardMaterial"]>;
  stone: InstanceType<BabylonModule["StandardMaterial"]>;
  shadow: InstanceType<BabylonModule["StandardMaterial"]>;
};

/** Tiled stone/wood from canvas — no downloaded textures, no Plan B kit yet. */
function makeTiledMaterial(
  BABYLON: BabylonModule,
  scene: Scene,
  name: string,
  kind: "paver" | "wood",
  uScale: number,
  vScale: number,
) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture(`${name}-tex`, { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  if (kind === "paver") {
    ctx.fillStyle = P.grout;
    ctx.fillRect(0, 0, size, size);
    const tile = 32;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const n = ((x * 7 + y * 13) % 17) / 17;
        ctx.fillStyle = n > 0.55 ? P.paver : P.concrete;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
  } else {
    ctx.fillStyle = P.woodDark;
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 10) {
      ctx.fillStyle = x % 20 === 0 ? P.wood : "#7a5638";
      ctx.fillRect(x, 0, 8, size);
    }
  }
  texture.update();
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = uScale;
  texture.vScale = vScale;
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseTexture = texture;
  m.specularColor = new BABYLON.Color3(0.07, 0.07, 0.06);
  return m;
}

function createPlazaMaterials(BABYLON: BabylonModule, scene: Scene): PlazaMats {
  return {
    paver: makeTiledMaterial(BABYLON, scene, "plaza-paver", "paver", 10, 10),
    wood: makeTiledMaterial(BABYLON, scene, "plaza-wood", "wood", 2, 2),
    woodDark: mat(BABYLON, scene, "plaza-wood-dark", P.woodDark, { specular: 0.08 }),
    stone: mat(BABYLON, scene, "plaza-cut-stone", P.stone, { specular: 0.1, emissive: 0.04 }),
    shadow: mat(BABYLON, scene, "plaza-contact-shadow", "#0a0814", { alpha: 0.38, specular: 0 }),
  };
}

function addContactShadow(
  BABYLON: BabylonModule,
  scene: Scene,
  mats: PlazaMats,
  name: string,
  x: number,
  z: number,
  radius: number,
) {
  const disc = BABYLON.MeshBuilder.CreateDisc(name, { radius, tessellation: 16 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.position = new BABYLON.Vector3(x, 0.025, z);
  disc.checkCollisions = false;
  disc.material = mats.shadow;
}

function applyMat(mesh: Mesh, material: InstanceType<BabylonModule["StandardMaterial"]>) {
  mesh.material = material;
}

function addCafeTable(
  BABYLON: BabylonModule,
  scene: Scene,
  mats: PlazaMats,
  id: string,
  x: number,
  z: number,
) {
  addContactShadow(BABYLON, scene, mats, `${id}-shadow`, x, z, 0.85);
  const top = addBox(BABYLON, scene, `${id}-top`, {
    w: 1.15,
    h: 0.07,
    d: 1.15,
    x,
    y: 0.78,
    z,
    color: P.wood,
    collide: false,
  });
  applyMat(top, mats.wood);
  const inset = 0.42;
  for (const [lx, lz] of [
    [-inset, -inset],
    [inset, -inset],
    [-inset, inset],
    [inset, inset],
  ] as const) {
    const leg = addBox(BABYLON, scene, `${id}-leg-${lx}-${lz}`, {
      w: 0.08,
      h: 0.74,
      d: 0.08,
      x: x + lx,
      y: 0.37,
      z: z + lz,
      color: P.woodDark,
    });
    applyMat(leg, mats.woodDark);
  }
}

function addChair(
  BABYLON: BabylonModule,
  scene: Scene,
  mats: PlazaMats,
  id: string,
  x: number,
  z: number,
  rotY: number,
) {
  addContactShadow(BABYLON, scene, mats, `${id}-shadow`, x, z, 0.38);
  const root = new BABYLON.TransformNode(id, scene);
  root.position = new BABYLON.Vector3(x, 0, z);
  root.rotation.y = rotY;

  const seat = BABYLON.MeshBuilder.CreateBox(`${id}-seat`, { width: 0.44, height: 0.07, depth: 0.44 }, scene);
  seat.parent = root;
  seat.position.y = 0.46;
  seat.checkCollisions = false;
  seat.material = mat(BABYLON, scene, `${id}-seat-mat`, P.seat, { specular: 0.06 });

  const back = BABYLON.MeshBuilder.CreateBox(`${id}-back`, { width: 0.44, height: 0.5, depth: 0.07 }, scene);
  back.parent = root;
  back.position = new BABYLON.Vector3(0, 0.74, -0.2);
  back.checkCollisions = false;
  back.material = mats.woodDark;

  for (const [lx, lz] of [
    [-0.16, -0.16],
    [0.16, -0.16],
    [-0.16, 0.16],
    [0.16, 0.16],
  ] as const) {
    const leg = BABYLON.MeshBuilder.CreateBox(`${id}-leg-${lx}`, { width: 0.06, height: 0.42, depth: 0.06 }, scene);
    leg.parent = root;
    leg.position = new BABYLON.Vector3(lx, 0.21, lz);
    leg.checkCollisions = false;
    leg.material = mats.woodDark;
  }
}

function addStoneBench(
  BABYLON: BabylonModule,
  scene: Scene,
  mats: PlazaMats,
  id: string,
  x: number,
  z: number,
  rotY: number,
) {
  addContactShadow(BABYLON, scene, mats, `${id}-shadow`, x, z, 1.05);
  const root = new BABYLON.TransformNode(id, scene);
  root.position = new BABYLON.Vector3(x, 0, z);
  root.rotation.y = rotY;
  const slab = BABYLON.MeshBuilder.CreateBox(`${id}-slab`, { width: 1.7, height: 0.12, depth: 0.5 }, scene);
  slab.parent = root;
  slab.position.y = 0.42;
  slab.checkCollisions = true;
  slab.material = mats.stone;
  const backrest = BABYLON.MeshBuilder.CreateBox(`${id}-back`, { width: 1.7, height: 0.55, depth: 0.1 }, scene);
  backrest.parent = root;
  backrest.position = new BABYLON.Vector3(0, 0.72, -0.22);
  backrest.checkCollisions = false;
  backrest.material = mats.stone;
  for (const side of [-0.62, 0.62]) {
    const support = BABYLON.MeshBuilder.CreateBox(`${id}-s-${side}`, { width: 0.14, height: 0.36, depth: 0.42 }, scene);
    support.parent = root;
    support.position = new BABYLON.Vector3(side, 0.18, 0);
    support.material = mats.stone;
  }
}

function addBarStool(
  BABYLON: BabylonModule,
  scene: Scene,
  mats: PlazaMats,
  id: string,
  x: number,
  z: number,
) {
  addContactShadow(BABYLON, scene, mats, `${id}-shadow`, x, z, 0.32);
  const base = addCylinder(BABYLON, scene, `${id}-base`, {
    h: 0.06,
    d: 0.38,
    x,
    y: 0.04,
    z,
    color: P.stone,
    tess: 10,
    collide: false,
  });
  applyMat(base, mats.stone);
  addCylinder(BABYLON, scene, `${id}-stem`, {
    h: 0.72,
    d: 0.08,
    x,
    y: 0.4,
    z,
    color: P.woodDark,
    tess: 8,
  });
  const seat = addCylinder(BABYLON, scene, `${id}-seat`, {
    h: 0.08,
    d: 0.4,
    x,
    y: 0.8,
    z,
    color: P.seat,
    tess: 12,
    collide: false,
  });
  seat.material = mat(BABYLON, scene, `${id}-seat-mat`, P.seat, { specular: 0.1 });
}

function buildHall(BABYLON: BabylonModule, scene: Scene) {
  addBox(BABYLON, scene, "civic-hall", {
    w: UR_WORLD_HQ.width,
    h: UR_WORLD_HQ.height,
    d: UR_WORLD_HQ.depth,
    x: UR_WORLD_HQ.x,
    y: UR_WORLD_HQ.height / 2,
    z: UR_WORLD_HQ.z,
    color: UR_WORLD_HQ.colorHex,
    emissive: 0.08,
  });
  addBox(BABYLON, scene, "civic-glass", {
    w: 8,
    h: 5.2,
    d: 0.35,
    x: 0,
    y: 3.4,
    z: UR_WORLD_HQ.z + UR_WORLD_HQ.depth / 2 + 0.1,
    color: P.glass,
    collide: false,
    emissive: 0.35,
  });
  addCylinder(BABYLON, scene, "civic-spire", {
    h: 5.5,
    d: 0.45,
    x: 0,
    y: UR_WORLD_HQ.height + 2.6,
    z: UR_WORLD_HQ.z,
    color: P.neonPurple,
    tess: 8,
    collide: false,
    emissive: 0.45,
  });
  const cap = BABYLON.MeshBuilder.CreateSphere("civic-spire-cap", { diameter: 0.9, segments: 8 }, scene);
  cap.position = new BABYLON.Vector3(0, UR_WORLD_HQ.height + 5.4, UR_WORLD_HQ.z);
  cap.checkCollisions = false;
  cap.material = mat(BABYLON, scene, "civic-spire-cap-mat", P.glowBlue, { emissive: 0.7 });
}

function buildFountain(BABYLON: BabylonModule, scene: Scene, mats: PlazaMats) {
  const fx = 0;
  const fz = 8;
  const plaza = BABYLON.MeshBuilder.CreateCylinder(
    "fountain-plaza",
    { height: 0.06, diameter: 13.5, tessellation: 28 },
    scene,
  );
  plaza.position = new BABYLON.Vector3(fx, 0.03, fz);
  plaza.checkCollisions = false;
  plaza.material = mats.paver;

  const plinth = addCylinder(BABYLON, scene, "fountain-plinth", {
    h: 0.38,
    d: 5.2,
    x: fx,
    y: 0.2,
    z: fz,
    color: P.stone,
    tess: 20,
  });
  applyMat(plinth, mats.stone);

  const basin = addCylinder(BABYLON, scene, "fountain-basin", {
    h: 0.72,
    d: 4.4,
    x: fx,
    y: 0.68,
    z: fz,
    color: P.stone,
    tess: 20,
  });
  applyMat(basin, mats.stone);

  const inner = addCylinder(BABYLON, scene, "fountain-inner", {
    h: 0.5,
    d: 3.55,
    x: fx,
    y: 0.78,
    z: fz,
    color: "#152238",
    tess: 18,
    collide: false,
  });
  inner.material = mat(BABYLON, scene, "fountain-inner-mat", "#152238", { emissive: 0.08 });

  const water = BABYLON.MeshBuilder.CreateCylinder("fountain-water", { height: 0.16, diameter: 3.35, tessellation: 18 }, scene);
  water.position = new BABYLON.Vector3(fx, 1.12, fz);
  water.checkCollisions = false;
  water.material = mat(BABYLON, scene, "fountain-water-mat", P.water, { emissive: 0.38, alpha: 0.58 });

  const column = addCylinder(BABYLON, scene, "fountain-column", {
    h: 0.85,
    d: 0.72,
    x: fx,
    y: 1.42,
    z: fz,
    color: P.stone,
    tess: 12,
  });
  applyMat(column, mats.stone);

  const bowl = addCylinder(BABYLON, scene, "fountain-bowl", {
    h: 0.28,
    d: 1.85,
    x: fx,
    y: 1.9,
    z: fz,
    color: P.stone,
    tess: 14,
  });
  applyMat(bowl, mats.stone);

  addCylinder(BABYLON, scene, "fountain-jet", {
    h: 1.25,
    d: 0.14,
    x: fx,
    y: 2.6,
    z: fz,
    color: P.glowBlue,
    tess: 8,
    collide: false,
    emissive: 0.6,
  });

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addStoneBench(BABYLON, scene, mats, `bench-${i}`, fx + Math.cos(a) * 5.05, fz + Math.sin(a) * 5.05, a + Math.PI);
  }

  addCafeTable(BABYLON, scene, mats, "cafe-e", 5.4, 12.1);
  addChair(BABYLON, scene, mats, "cafe-e-c1", 5.4, 13.05, Math.PI);
  addChair(BABYLON, scene, mats, "cafe-e-c2", 5.4, 11.15, 0);

  addCafeTable(BABYLON, scene, mats, "cafe-w", -5.4, 12.1);
  addChair(BABYLON, scene, mats, "cafe-w-c1", -5.4, 13.05, Math.PI);
  addChair(BABYLON, scene, mats, "cafe-w-c2", -5.4, 11.15, 0);

  return water;
}

function buildBar(BABYLON: BabylonModule, scene: Scene, mats: PlazaMats) {
  const x = 28;
  const z = 14;
  const floor = BABYLON.MeshBuilder.CreateBox("bar-floor", { width: 8.2, height: 0.07, depth: 5.2 }, scene);
  floor.position = new BABYLON.Vector3(x, 0.04, z);
  floor.checkCollisions = false;
  floor.material = mats.paver;

  const front = addBox(BABYLON, scene, "bar-front", {
    w: 6.5,
    h: 1.02,
    d: 0.22,
    x,
    y: 0.52,
    z: z - 0.55,
    color: P.woodDark,
  });
  applyMat(front, mats.woodDark);

  const body = addBox(BABYLON, scene, "bar-body", {
    w: 6.4,
    h: 0.92,
    d: 1.15,
    x,
    y: 0.47,
    z: z + 0.12,
    color: P.wood,
  });
  applyMat(body, mats.wood);

  const top = addBox(BABYLON, scene, "bar-top", {
    w: 6.7,
    h: 0.08,
    d: 1.55,
    x,
    y: 1.06,
    z: z + 0.05,
    color: P.wood,
    collide: false,
  });
  applyMat(top, mats.wood);

  const rail = addCylinder(BABYLON, scene, "bar-footrail", {
    h: 6.2,
    d: 0.07,
    x,
    y: 0.16,
    z: z - 0.72,
    color: P.stone,
    tess: 8,
    collide: false,
  });
  rail.rotation.z = Math.PI / 2;
  applyMat(rail, mats.stone);

  addBox(BABYLON, scene, "bar-back", {
    w: 6.6,
    h: 3.15,
    d: 0.32,
    x,
    y: 1.62,
    z: z + 1.42,
    color: P.hall,
    emissive: 0.12,
  });
  const shelf = addBox(BABYLON, scene, "bar-shelf", {
    w: 6.2,
    h: 0.08,
    d: 0.42,
    x,
    y: 2.15,
    z: z + 1.18,
    color: P.wood,
    collide: false,
  });
  applyMat(shelf, mats.wood);

  for (let i = 0; i < 4; i++) {
    addBarStool(BABYLON, scene, mats, `bar-stool-${i}`, x - 2.1 + i * 1.4, z - 1.28);
  }
  for (let i = 0; i < 5; i++) {
    addCylinder(BABYLON, scene, `bar-bottle-${i}`, {
      h: 0.55,
      d: 0.16,
      x: x - 1.6 + i * 0.8,
      y: 2.5,
      z: z + 1.15,
      color: i % 2 === 0 ? P.glowBlue : P.glowPurple,
      tess: 6,
      collide: false,
      emissive: 0.5,
    });
  }
}

function buildWell(BABYLON: BabylonModule, scene: Scene) {
  const x = -28;
  const z = 14;
  addCylinder(BABYLON, scene, "well-outer", {
    h: 1.15,
    d: 2.4,
    x,
    y: 0.57,
    z,
    color: P.well,
    tess: 14,
    emissive: 0.12,
  });
  const inner = addCylinder(BABYLON, scene, "well-inner", {
    h: 1.05,
    d: 1.55,
    x,
    y: 0.62,
    z,
    color: "#0b1020",
    tess: 12,
    collide: false,
  });
  inner.material = mat(BABYLON, scene, "well-inner-mat", "#0b1020", { emissive: 0.05 });
  const coin = BABYLON.MeshBuilder.CreateCylinder("well-coin", { height: 0.06, diameter: 0.42, tessellation: 12 }, scene);
  coin.position = new BABYLON.Vector3(x, 0.85, z);
  coin.checkCollisions = false;
  coin.material = mat(BABYLON, scene, "well-coin-mat", P.lamp, { emissive: 0.65 });
  addBox(BABYLON, scene, "well-arch", {
    w: 0.18,
    h: 1.6,
    d: 0.18,
    x: x - 0.9,
    y: 1.7,
    z,
    color: P.neonPurple,
    collide: false,
    emissive: 0.3,
  });
  addBox(BABYLON, scene, "well-arch-2", {
    w: 0.18,
    h: 1.6,
    d: 0.18,
    x: x + 0.9,
    y: 1.7,
    z,
    color: P.neonPurple,
    collide: false,
    emissive: 0.3,
  });
  addBox(BABYLON, scene, "well-beam", {
    w: 2.1,
    h: 0.16,
    d: 0.16,
    x,
    y: 2.5,
    z,
    color: P.glowBlue,
    collide: false,
    emissive: 0.4,
  });
  return coin;
}

function buildGarden(BABYLON: BabylonModule, scene: Scene, mats: PlazaMats) {
  const gx = 8;
  const gz = 30;
  addBox(BABYLON, scene, "garden-lawn", {
    w: 16,
    h: 0.12,
    d: 14,
    x: gx,
    y: 0.06,
    z: gz,
    color: P.grass,
    collide: false,
    emissive: 0.08,
  });
  const path = addBox(BABYLON, scene, "garden-path", {
    w: 2.2,
    h: 0.14,
    d: 12,
    x: gx,
    y: 0.08,
    z: gz,
    color: P.path,
    collide: false,
  });
  applyMat(path, mats.paver);
  addCafeTable(BABYLON, scene, mats, "garden-table", gx + 3.2, gz);
  addChair(BABYLON, scene, mats, "garden-c1", gx + 3.2, gz + 0.95, Math.PI);
  addChair(BABYLON, scene, mats, "garden-c2", gx + 3.2, gz - 0.95, 0);
  addStoneBench(BABYLON, scene, mats, "garden-bench", gx - 3.2, gz, Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addCylinder(BABYLON, scene, `garden-bloom-${i}`, {
      h: 0.35,
      d: 0.45,
      x: gx + Math.cos(a) * 5.2,
      y: 0.22,
      z: gz + Math.sin(a) * 4.4,
      color: i % 2 === 0 ? P.neonPurple : P.glowBlue,
      tess: 8,
      collide: false,
      emissive: 0.4,
    });
  }
}

function buildWalkways(BABYLON: BabylonModule, scene: Scene, mats: PlazaMats) {
  const north = addBox(BABYLON, scene, "path-north", {
    w: 4.4,
    h: 0.1,
    d: 36,
    x: 0,
    y: 0.05,
    z: 6,
    color: P.path,
    collide: false,
  });
  applyMat(north, mats.paver);
  const eastwest = addBox(BABYLON, scene, "path-eastwest", {
    w: 56,
    h: 0.1,
    d: 3.6,
    x: 0,
    y: 0.05,
    z: 8,
    color: P.path,
    collide: false,
  });
  applyMat(eastwest, mats.paver);
  const ring = BABYLON.MeshBuilder.CreateTorus("plaza-ring", { diameter: 12.5, thickness: 0.4, tessellation: 32 }, scene);
  ring.position = new BABYLON.Vector3(0, 0.1, 8);
  ring.rotation.x = Math.PI / 2;
  ring.checkCollisions = false;
  ring.material = mat(BABYLON, scene, "plaza-ring-mat", P.neonPurple, { emissive: 0.35 });
}

function buildPerimeter(BABYLON: BabylonModule, scene: Scene) {
  const wallMat = mat(BABYLON, scene, "rim-mat", P.stone, { emissive: 0.08 });
  const walls: Array<{ name: string; w: number; d: number; x: number; z: number }> = [
    { name: "rim-s", w: 88, d: 1.1, x: 0, z: -44 },
    { name: "rim-n", w: 88, d: 1.1, x: 0, z: 44 },
    { name: "rim-w", w: 1.1, d: 88, x: -44, z: 0 },
    { name: "rim-e", w: 1.1, d: 88, x: 44, z: 0 },
  ];
  for (const w of walls) {
    const mesh = BABYLON.MeshBuilder.CreateBox(w.name, { width: w.w, height: 2.2, depth: w.d }, scene);
    mesh.position = new BABYLON.Vector3(w.x, 1.1, w.z);
    mesh.checkCollisions = true;
    mesh.material = wallMat;
  }
}

export function buildCivicPlaza(BABYLON: BabylonModule, scene: Scene): PlazaAtmosphere {
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.35, 0);
  const sky = hexColor(BABYLON, P.sky);
  scene.clearColor = new BABYLON.Color4(sky.r, sky.g, sky.b, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.007;
  scene.fogColor = hexColor(BABYLON, P.sky);

  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.15, 1, 0.25), scene);
  hemi.intensity = 0.68;
  hemi.diffuse = hexColor(BABYLON, P.glowPurple);
  hemi.groundColor = hexColor(BABYLON, P.hall);

  const moon = new BABYLON.DirectionalLight("moon", new BABYLON.Vector3(-0.35, -1.1, 0.2), scene);
  moon.intensity = 0.58;
  moon.diffuse = hexColor(BABYLON, P.glowBlue);

  const fountainLight = new BABYLON.PointLight("fountain-light", new BABYLON.Vector3(0, 3.6, 8), scene);
  fountainLight.intensity = 0.85;
  fountainLight.diffuse = hexColor(BABYLON, P.glowBlue);
  fountainLight.range = 20;

  const hallLight = new BABYLON.PointLight("hall-light", new BABYLON.Vector3(0, 6, -16), scene);
  hallLight.intensity = 0.62;
  hallLight.diffuse = hexColor(BABYLON, P.glowPurple);
  hallLight.range = 22;

  const barLight = new BABYLON.PointLight("bar-light", new BABYLON.Vector3(28, 3.4, 14), scene);
  barLight.intensity = 0.7;
  barLight.diffuse = hexColor(BABYLON, P.glowPurple);
  barLight.range = 12;

  const mats = createPlazaMaterials(BABYLON, scene);

  const ground = BABYLON.MeshBuilder.CreateGround("plaza-ground", { width: 90, height: 90, subdivisions: 2 }, scene);
  ground.material = mat(BABYLON, scene, "plaza-ground-mat", P.ground, { specular: 0.04, emissive: 0.04 });
  ground.checkCollisions = true;

  buildWalkways(BABYLON, scene, mats);
  buildPerimeter(BABYLON, scene);
  buildHall(BABYLON, scene);
  const water = buildFountain(BABYLON, scene, mats);
  buildBar(BABYLON, scene, mats);
  const wellCoin = buildWell(BABYLON, scene);
  buildGarden(BABYLON, scene, mats);

  for (const desk of UR_WORLD_TALK_DESKS) {
    const mesh = addBox(BABYLON, scene, `desk-${desk.id}`, {
      w: desk.width,
      h: desk.height,
      d: desk.depth,
      x: desk.x,
      y: desk.height / 2,
      z: desk.z,
      color: desk.colorHex,
      emissive: 0.22,
    });
    const glow = mesh.material as InstanceType<BabylonModule["StandardMaterial"]>;
    glow.emissiveColor = hexColor(BABYLON, desk.colorHex).scale(0.32);
    const counter = addBox(BABYLON, scene, `desk-${desk.id}-counter`, {
      w: Math.min(desk.width * 0.72, 4.2),
      h: 0.08,
      d: 1.15,
      x: desk.x,
      y: 1.04,
      z: desk.z - desk.depth / 2 - 0.35,
      color: P.wood,
    });
    applyMat(counter, mats.wood);
    addContactShadow(BABYLON, scene, mats, `desk-${desk.id}-shadow`, desk.x, desk.z - desk.depth / 2 - 0.35, 1.4);
  }

  for (const plot of UR_WORLD_PLOT_SEEDS) {
    addBox(BABYLON, scene, `plot-${plot.id}`, {
      w: 3.2,
      h: 0.16,
      d: 3.2,
      x: plot.x,
      y: 0.09,
      z: plot.z,
      color: P.neonBlue,
      collide: false,
      emissive: 0.12,
    });
  }

  UR_WORLD_TREE_SPOTS.forEach((t, i) => addTree(BABYLON, scene, i, t.x, t.z, t.scale));
  UR_WORLD_LAMP_SPOTS.forEach((l, i) => addLamp(BABYLON, scene, i, l.x, l.z));

  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[0].id, UR_WORLD_SIGN_LINES[0], {
    x: 0,
    y: 6.4,
    z: UR_WORLD_HQ.z + UR_WORLD_HQ.depth / 2 + 0.4,
    rotY: 0,
    w: 6.2,
    h: 1.8,
  });
  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[1].id, UR_WORLD_SIGN_LINES[1], {
    x: -8,
    y: 3.1,
    z: -11,
    rotY: Math.PI / 8,
  });
  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[2].id, UR_WORLD_SIGN_LINES[2], {
    x: 8,
    y: 3.1,
    z: -11,
    rotY: -Math.PI / 8,
  });
  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[3].id, UR_WORLD_SIGN_LINES[3], {
    x: 8,
    y: 2.6,
    z: 23.2,
    rotY: Math.PI,
  });
  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[4].id, UR_WORLD_SIGN_LINES[4], {
    x: 28,
    y: 3.4,
    z: 15.7,
    rotY: Math.PI,
    w: 3.8,
  });
  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[5].id, UR_WORLD_SIGN_LINES[5], {
    x: -28,
    y: 3.2,
    z: 15.4,
    rotY: Math.PI,
  });
  addSign(BABYLON, scene, UR_WORLD_SIGN_LINES[6].id, UR_WORLD_SIGN_LINES[6], {
    x: 0,
    y: 3.4,
    z: 43.2,
    rotY: Math.PI,
    w: 5.2,
  });

  const dogs = [
    makeDog(BABYLON, scene, "dog-plaza", "#d6d3f0"),
    makeDog(BABYLON, scene, "dog-garden", "#a78bfa"),
    makeDog(BABYLON, scene, "dog-west", "#818cf8"),
  ];
  const birds = Array.from({ length: 10 }, (_, i) => makeBird(BABYLON, scene, `bird-${i}`));
  const clouds = [
    addCloud(BABYLON, scene, "cloud-a", -20, 22, -10, 1.2),
    addCloud(BABYLON, scene, "cloud-b", 8, 24, 6, 1.5),
    addCloud(BABYLON, scene, "cloud-c", 26, 21, 18, 1.1),
    addCloud(BABYLON, scene, "cloud-d", -12, 26, 22, 1.35),
    addCloud(BABYLON, scene, "cloud-e", 0, 23, -28, 1.6),
    addCloud(BABYLON, scene, "cloud-f", 32, 25, -8, 1),
  ];

  return {
    tick: (dt, time) => {
      water.position.y = 1.12 + Math.sin(time * 2.2) * 0.05;
      wellCoin.rotation.y += dt * 1.4;
      const coinMat = wellCoin.material as InstanceType<BabylonModule["StandardMaterial"]>;
      if (coinMat) coinMat.emissiveColor = hexColor(BABYLON, P.lamp).scale(0.5 + 0.35 * Math.sin(time * 3));

      dogs[0]!.position.x = Math.cos(time * 0.35) * 7.2;
      dogs[0]!.position.z = 8 + Math.sin(time * 0.35) * 7.2;
      dogs[0]!.position.y = 0;
      dogs[0]!.rotation.y = time * 0.35 + Math.PI / 2;

      dogs[1]!.position.x = 8 + Math.cos(time * 0.28 + 1.2) * 5.5;
      dogs[1]!.position.z = 30 + Math.sin(time * 0.28 + 1.2) * 4.5;
      dogs[1]!.rotation.y = time * 0.28 + 1.2 + Math.PI / 2;

      dogs[2]!.position.x = -22 + Math.cos(time * 0.22) * 8;
      dogs[2]!.position.z = 4 + Math.sin(time * 0.22) * 3.5;
      dogs[2]!.rotation.y = time * 0.22 + Math.PI / 2;

      for (let i = 0; i < birds.length; i++) {
        const t = time * 0.42 + i * 0.62;
        const flock = i < 5 ? 1 : -1;
        birds[i]!.position.x = flock * 6 + Math.cos(t) * (16 + (i % 3) * 2);
        birds[i]!.position.z = 4 + Math.sin(t) * (12 + (i % 4));
        birds[i]!.position.y = 9.5 + Math.sin(t * 2.1 + i) * 1.1;
        birds[i]!.rotation.y = t + Math.PI / 2;
      }

      for (const cloud of clouds) {
        cloud.position.x += dt * 0.55;
        if (cloud.position.x > 48) cloud.position.x = -48;
      }
    },
  };
}
