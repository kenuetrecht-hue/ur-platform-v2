import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Platform, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import type { UrWorldAvatarLook } from "@/lib/ur-world-avatar";
import type { EquippedLoadout } from "@/lib/ur-world-cosmetics";
import {
  UR_WORLD_HQ,
  UR_WORLD_SPAWN,
  UR_WORLD_TALK_DESKS,
  nearestTalkDesk,
  type UrWorldTalkDesk,
} from "@/lib/ur-world-plaza";
import { UR_WORLD_PLOT_SEEDS } from "@/lib/ur-world-economy";

type BabylonModule = typeof import("@babylonjs/core");

type Props = {
  avatar: UrWorldAvatarLook;
  equipped?: EquippedLoadout;
  height?: number;
  onNearbyDesk: (desk: UrWorldTalkDesk | null) => void;
};

function hexColor(BABYLON: BabylonModule, hex: string) {
  return BABYLON.Color3.FromHexString(hex.startsWith("#") ? hex : `#${hex}`);
}

function addBox(
  BABYLON: BabylonModule,
  scene: InstanceType<BabylonModule["Scene"]>,
  name: string,
  opts: { w: number; h: number; d: number; x: number; y: number; z: number; color: string },
) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: opts.w, height: opts.h, depth: opts.d }, scene);
  mesh.position = new BABYLON.Vector3(opts.x, opts.y, opts.z);
  mesh.checkCollisions = true;
  const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
  mat.diffuseColor = hexColor(BABYLON, opts.color);
  mat.specularColor = new BABYLON.Color3(0.12, 0.12, 0.12);
  mesh.material = mat;
  return mesh;
}

function buildPlaza(BABYLON: BabylonModule, scene: InstanceType<BabylonModule["Scene"]>) {
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.35, 0);
  scene.clearColor = new BABYLON.Color4(0.45, 0.62, 0.72, 1);

  new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.25, 1, 0.15), scene);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.45, -1.2, -0.35), scene);
  sun.intensity = 0.65;

  const ground = BABYLON.MeshBuilder.CreateGround("plaza-ground", { width: 90, height: 90, subdivisions: 4 }, scene);
  const gmat = new BABYLON.StandardMaterial("plaza-ground-mat", scene);
  gmat.diffuseColor = new BABYLON.Color3(0.42, 0.45, 0.4);
  gmat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  ground.material = gmat;
  ground.checkCollisions = true;

  addBox(BABYLON, scene, "civic-hall", {
    w: UR_WORLD_HQ.width,
    h: UR_WORLD_HQ.height,
    d: UR_WORLD_HQ.depth,
    x: UR_WORLD_HQ.x,
    y: UR_WORLD_HQ.height / 2,
    z: UR_WORLD_HQ.z,
    color: UR_WORLD_HQ.colorHex,
  });

  for (const desk of UR_WORLD_TALK_DESKS) {
    const mesh = addBox(BABYLON, scene, `desk-${desk.id}`, {
      w: desk.width,
      h: desk.height,
      d: desk.depth,
      x: desk.x,
      y: desk.height / 2,
      z: desk.z,
      color: desk.colorHex,
    });
    const glow = mesh.material as InstanceType<BabylonModule["StandardMaterial"]>;
    glow.emissiveColor = hexColor(BABYLON, desk.colorHex).scale(0.28);
  }

  for (const plot of UR_WORLD_PLOT_SEEDS) {
    addBox(BABYLON, scene, `plot-${plot.id}`, {
      w: 3.2,
      h: 0.18,
      d: 3.2,
      x: plot.x,
      y: 0.09,
      z: plot.z,
      color: "#8a7a5a",
    });
  }

  const rim = BABYLON.MeshBuilder.CreateBox("plaza-rim", { width: 88, height: 1.4, depth: 1.2 }, scene);
  rim.position = new BABYLON.Vector3(0, 0.7, -44);
  rim.checkCollisions = true;
  const rmat = new BABYLON.StandardMaterial("rim-mat", scene);
  rmat.diffuseColor = new BABYLON.Color3(0.35, 0.38, 0.42);
  rim.material = rmat;
}

function buildAvatar(
  BABYLON: BabylonModule,
  scene: InstanceType<BabylonModule["Scene"]>,
  look: UrWorldAvatarLook,
) {
  const body = BABYLON.MeshBuilder.CreateCapsule(
    "avatar-body",
    { height: 1.7, radius: 0.32, tessellation: 10 },
    scene,
  );
  body.position = new BABYLON.Vector3(UR_WORLD_SPAWN.x, 0.85, UR_WORLD_SPAWN.z);
  body.checkCollisions = true;
  body.ellipsoid = new BABYLON.Vector3(0.38, 0.85, 0.38);
  body.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);
  const bodyMat = new BABYLON.StandardMaterial("avatar-body-mat", scene);
  bodyMat.diffuseColor = hexColor(BABYLON, look.bodyHex);
  body.material = bodyMat;

  const head = BABYLON.MeshBuilder.CreateSphere("avatar-head", { diameter: 0.52, segments: 12 }, scene);
  head.parent = body;
  head.position = new BABYLON.Vector3(0, 0.97, 0);
  const headMat = new BABYLON.StandardMaterial("avatar-head-mat", scene);
  headMat.diffuseColor = hexColor(BABYLON, look.accentHex);
  head.material = headMat;

  const badge = BABYLON.MeshBuilder.CreatePlane("avatar-badge", { width: 0.28, height: 0.28 }, scene);
  badge.parent = body;
  badge.position = new BABYLON.Vector3(0, 0.38, 0.34);
  const badgeMat = new BABYLON.StandardMaterial("avatar-badge-mat", scene);
  badgeMat.diffuseColor = hexColor(BABYLON, look.accentHex);
  badgeMat.emissiveColor = hexColor(BABYLON, look.accentHex).scale(0.4);
  badge.material = badgeMat;

  return body;
}

function dressAvatar(
  BABYLON: BabylonModule,
  scene: InstanceType<BabylonModule["Scene"]>,
  body: InstanceType<BabylonModule["Mesh"]>,
  look: UrWorldAvatarLook,
  equipped?: EquippedLoadout,
) {
  const jacket = equipped?.jacket;
  if (jacket) {
    const mesh = BABYLON.MeshBuilder.CreateBox(
      "avatar-jacket",
      { width: 0.72, height: 0.7, depth: 0.48 },
      scene,
    );
    mesh.parent = body;
    mesh.position = new BABYLON.Vector3(0, 0.12, 0);
    const mat = new BABYLON.StandardMaterial("avatar-jacket-mat", scene);
    mat.diffuseColor = hexColor(BABYLON, jacket.colorHex);
    mesh.material = mat;
  } else {
    const bodyMat = body.material as InstanceType<BabylonModule["StandardMaterial"]>;
    if (bodyMat) bodyMat.diffuseColor = hexColor(BABYLON, look.bodyHex);
  }

  const hat = equipped?.hat;
  if (hat) {
    const isHard = hat.mesh === "hardhat";
    const mesh = isHard
      ? BABYLON.MeshBuilder.CreateCylinder("avatar-hat", { height: 0.22, diameter: 0.58 }, scene)
      : BABYLON.MeshBuilder.CreateSphere("avatar-hat", { diameter: 0.42, segments: 10 }, scene);
    mesh.parent = body;
    mesh.position = new BABYLON.Vector3(0, isHard ? 1.28 : 1.22, 0);
    const mat = new BABYLON.StandardMaterial("avatar-hat-mat", scene);
    mat.diffuseColor = hexColor(BABYLON, hat.colorHex);
    mesh.material = mat;
  }

  const boots = equipped?.boots;
  if (boots) {
    for (const side of [-1, 1]) {
      const mesh = BABYLON.MeshBuilder.CreateBox(
        `avatar-boot-${side}`,
        { width: 0.18, height: 0.16, depth: 0.28 },
        scene,
      );
      mesh.parent = body;
      mesh.position = new BABYLON.Vector3(side * 0.14, -0.78, 0.04);
      const mat = new BABYLON.StandardMaterial(`avatar-boot-mat-${side}`, scene);
      mat.diffuseColor = hexColor(BABYLON, boots.colorHex);
      mesh.material = mat;
    }
  }

  const accent = equipped?.accent;
  if (accent) {
    const mesh = BABYLON.MeshBuilder.CreateBox(
      "avatar-accent",
      { width: accent.mesh === "scarf" ? 0.55 : 0.22, height: 0.12, depth: 0.12 },
      scene,
    );
    mesh.parent = body;
    mesh.position = new BABYLON.Vector3(0, 0.42, 0.32);
    const mat = new BABYLON.StandardMaterial("avatar-accent-mat", scene);
    mat.diffuseColor = hexColor(BABYLON, accent.colorHex);
    mat.emissiveColor = hexColor(BABYLON, accent.colorHex).scale(0.25);
    mesh.material = mat;
  }
}

/** Web Babylon plaza — third-person walk. Native callers should not mount this. */
export function UrWorldPlazaViewport({ avatar, equipped, height = 520, onNearbyDesk }: Props) {
  const colors = useColors();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onNearbyRef = useRef(onNearbyDesk);
  onNearbyRef.current = onNearbyDesk;
  const avatarRef = useRef(avatar);
  avatarRef.current = avatar;
  const loadoutKey = JSON.stringify(equipped ?? {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let disposed = false;
    let removeResize: (() => void) | null = null;
    let removeKeys: (() => void) | null = null;
    let engine: { dispose: () => void; resize: () => void } | null = null;

    (async () => {
      try {
        const BABYLON = await import("@babylonjs/core");
        if (disposed || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.tabIndex = 0;
        const babylonEngine = new BABYLON.Engine(canvas, true, {
          preserveDrawingBuffer: true,
          stencil: true,
        });
        engine = babylonEngine;
        const scene = new BABYLON.Scene(babylonEngine);
        buildPlaza(BABYLON, scene);
        const body = buildAvatar(BABYLON, scene, avatarRef.current);
        dressAvatar(BABYLON, scene, body, avatarRef.current, equipped);

        const camera = new BABYLON.UniversalCamera(
          "follow",
          new BABYLON.Vector3(0, 4.2, -8),
          scene,
        );
        camera.minZ = 0.2;
        camera.inertia = 0;
        camera.inputs.clear();

        const keys = new Set<string>();
        const onKeyDown = (e: KeyboardEvent) => {
          const k = e.key.toLowerCase();
          if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
            e.preventDefault();
            keys.add(k);
          }
        };
        const onKeyUp = (e: KeyboardEvent) => {
          keys.delete(e.key.toLowerCase());
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        removeKeys = () => {
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("keyup", onKeyUp);
        };

        let yaw = 0;
        const onMouse = (e: MouseEvent) => {
          if (document.pointerLockElement !== canvas) return;
          yaw -= e.movementX * 0.0022;
        };
        canvas.addEventListener("click", () => {
          canvas.focus();
          void canvas.requestPointerLock?.();
        });
        document.addEventListener("mousemove", onMouse);

        let lastDeskId: string | null = null;
        scene.onBeforeRenderObservable.add(() => {
          const dt = Math.min(babylonEngine.getDeltaTime() / 1000, 0.05);
          const speed = 8;
          let fwd = 0;
          let strafe = 0;
          if (keys.has("w") || keys.has("arrowup")) fwd += 1;
          if (keys.has("s") || keys.has("arrowdown")) fwd -= 1;
          if (keys.has("a") || keys.has("arrowleft")) strafe -= 1;
          if (keys.has("d") || keys.has("arrowright")) strafe += 1;
          const sin = Math.sin(yaw);
          const cos = Math.cos(yaw);
          const dx = (sin * fwd + cos * strafe) * speed * dt;
          const dz = (cos * fwd - sin * strafe) * speed * dt;
          body.moveWithCollisions(new BABYLON.Vector3(dx, 0, dz));
          body.position.y = 0.85;
          body.rotation.y = yaw;

          const camDist = 7.2;
          camera.position.x = body.position.x - sin * camDist;
          camera.position.z = body.position.z - cos * camDist;
          camera.position.y = 3.4;
          camera.setTarget(body.position.add(new BABYLON.Vector3(0, 0.7, 0)));

          const desk = nearestTalkDesk(body.position.x, body.position.z);
          const id = desk?.id ?? null;
          if (id !== lastDeskId) {
            lastDeskId = id;
            onNearbyRef.current(desk);
          }
        });

        babylonEngine.runRenderLoop(() => scene.render());
        const onResize = () => babylonEngine.resize();
        window.addEventListener("resize", onResize);
        removeResize = () => {
          window.removeEventListener("resize", onResize);
          document.removeEventListener("mousemove", onMouse);
        };

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load UR World");
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      removeResize?.();
      removeKeys?.();
      engine?.dispose();
    };
  }, [loadoutKey]);

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.fallback, { height, borderColor: colors.border }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>UR World is a web city</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 16 }}>
          Walk your avatar and talk at desks in the browser — same account.
        </Text>
        <Pressable
          onPress={() => void openWebBrowserCheckout("/world")}
          style={[styles.nativeBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Open UR World in browser</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height, borderColor: colors.border }]}>
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.overlayText}>Loading Civic Plaza…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.overlay}>
          <Text style={[styles.overlayText, { color: "#fbbf24" }]}>{error}</Text>
        </View>
      ) : null}
      {/* @ts-expect-error web canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: loading || error ? "none" : "block", outline: "none" }}
      />
      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>Click the city · WASD walk · mouse look</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#1c2428",
    position: "relative",
  },
  fallback: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  nativeBtn: { marginTop: 8, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c2428ee",
    zIndex: 3,
    padding: 16,
  },
  overlayText: { color: "#cbd5e1", fontSize: 13, textAlign: "center", marginTop: 8 },
  hint: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    alignItems: "center",
  },
  hintText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
});
