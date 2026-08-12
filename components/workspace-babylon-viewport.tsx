import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Platform, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import { build3dWorkspaceWebPath } from "@/lib/forge-platform-handoff";
import type { DesignLayer, WorkspaceDesignState } from "@/lib/workspace-design-types";
import { base64ToArrayBuffer } from "@/lib/stl-utils";

type Specialist = { id: string; name: string; avatar: string };

export type WorkspaceBabylonViewportProps = {
  design: WorkspaceDesignState;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  specialists?: Specialist[];
  selectedAiId?: string;
  onSelectAi?: (id: string) => void;
  projectName?: string;
  height?: number;
};

type BabylonModule = typeof import("@babylonjs/core");

async function syncLayerMeshes(
  BABYLON: BabylonModule,
  scene: InstanceType<BabylonModule["Scene"]>,
  design: WorkspaceDesignState,
  selectedLayerId: string | null,
  nodeMap: Map<string, InstanceType<BabylonModule["TransformNode"]>>,
  fingerprintMap: Map<string, string>,
) {
  const activeIds = new Set(design.layers.map((l) => l.id));

  for (const [id, node] of nodeMap) {
    if (!activeIds.has(id)) {
      node.getChildMeshes().forEach((m) => m.dispose());
      node.dispose();
      nodeMap.delete(id);
      fingerprintMap.delete(id);
    }
  }

  for (const layer of design.layers) {
    const fingerprint = layerFingerprint(layer);
    let root = nodeMap.get(layer.id);
    const needsRebuild = !root || fingerprintMap.get(layer.id) !== fingerprint;

    if (needsRebuild) {
      if (root) {
        root.getChildMeshes().forEach((m) => m.dispose());
        root.dispose();
      }
      root = new BABYLON.TransformNode(`layer-root-${layer.id}`, scene);
      nodeMap.set(layer.id, root);
      fingerprintMap.set(layer.id, fingerprint);
      await buildLayerMesh(BABYLON, scene, layer, root);
    }

    if (!root) continue;
    applyTransform(BABYLON, root, layer);
    root.setEnabled(layer.visible);

    root.getChildMeshes().forEach((mesh) => {
      mesh.isPickable = !layer.locked;
      mesh.metadata = { layerId: layer.id };
      if (mesh.material && "alpha" in mesh.material) {
        const mat = mesh.material as InstanceType<BabylonModule["StandardMaterial"]>;
        mat.alpha = layer.opacity;
        mat.diffuseColor = BABYLON.Color3.FromHexString(layer.color);
        mat.wireframe = design.wireframe;
        mat.emissiveColor =
          layer.id === selectedLayerId
            ? BABYLON.Color3.FromHexString(layer.color).scale(0.35)
            : BABYLON.Color3.Black();
      }
    });
  }

  const grid = scene.getMeshByName("workspace-grid");
  if (grid) grid.setEnabled(design.gridEnabled);
}

function layerFingerprint(layer: DesignLayer): string {
  return JSON.stringify({
    kind: layer.kind,
    primitive: layer.primitive,
    stlKey: layer.stl ? `${layer.stl.byteSize}:${layer.stl.fileName}` : null,
  });
}

function applyTransform(
  BABYLON: BabylonModule,
  node: InstanceType<BabylonModule["TransformNode"]>,
  layer: DesignLayer,
) {
  const { position, rotation, scale } = layer.transform;
  node.position = new BABYLON.Vector3(position.x, position.y, position.z);
  node.rotation = new BABYLON.Vector3(
    (rotation.x * Math.PI) / 180,
    (rotation.y * Math.PI) / 180,
    (rotation.z * Math.PI) / 180,
  );
  node.scaling = new BABYLON.Vector3(scale.x, scale.y, scale.z);
}

async function buildLayerMesh(
  BABYLON: BabylonModule,
  scene: InstanceType<BabylonModule["Scene"]>,
  layer: DesignLayer,
  parent: InstanceType<BabylonModule["TransformNode"]>,
) {
  const mat = new BABYLON.StandardMaterial(`mat-${layer.id}`, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(layer.color);
  mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  mat.alpha = layer.opacity;
  if (layer.kind === "primitive" && layer.primitive) {
    const p = layer.primitive;
    let mesh: InstanceType<BabylonModule["Mesh"]> | null = null;
    switch (p.type) {
      case "box":
        mesh = BABYLON.MeshBuilder.CreateBox(
          `mesh-${layer.id}`,
          { width: p.width ?? 8, height: p.height ?? 8, depth: p.depth ?? 8 },
          scene,
        );
        break;
      case "sphere":
        mesh = BABYLON.MeshBuilder.CreateSphere(
          `mesh-${layer.id}`,
          { diameter: p.diameter ?? 8, segments: p.tessellation ?? 24 },
          scene,
        );
        break;
      case "cylinder":
        mesh = BABYLON.MeshBuilder.CreateCylinder(
          `mesh-${layer.id}`,
          {
            height: p.height ?? 10,
            diameter: p.diameter ?? 8,
            tessellation: p.tessellation ?? 24,
          },
          scene,
        );
        break;
      case "torus":
        mesh = BABYLON.MeshBuilder.CreateTorus(
          `mesh-${layer.id}`,
          { diameter: p.diameter ?? 8, thickness: 2, tessellation: p.tessellation ?? 24 },
          scene,
        );
        break;
      case "plane":
        mesh = BABYLON.MeshBuilder.CreatePlane(
          `mesh-${layer.id}`,
          { width: p.width ?? 20, height: p.height ?? 20 },
          scene,
        );
        mesh.rotation.x = Math.PI / 2;
        break;
    }
    if (mesh) {
      mesh.parent = parent;
      mesh.material = mat;
    }
    return;
  }

  if (layer.kind === "stl" && layer.stl) {
    await import("@babylonjs/loaders/STL");
    const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader");
    const buffer = base64ToArrayBuffer(layer.stl.dataBase64);
    const blob = new Blob([buffer], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    try {
      const result = await SceneLoader.ImportMeshAsync("", url, "", scene);
      const rootMesh = result.meshes[0];
      if (rootMesh) {
        rootMesh.parent = parent;
        result.meshes.forEach((m) => {
          if (m.material) m.material.dispose();
          m.material = mat.clone(`stl-mat-${layer.id}-${m.name}`);
        });
        centerAndFitMesh(BABYLON, rootMesh);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function centerAndFitMesh(
  BABYLON: BabylonModule,
  mesh: InstanceType<BabylonModule["AbstractMesh"]>,
) {
  mesh.computeWorldMatrix(true);
  const { min, max } = mesh.getHierarchyBoundingVectors(true);
  const size = max.subtract(min);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0 && maxDim > 20) {
    const s = 20 / maxDim;
    mesh.scaling.scaleInPlace(s);
  }
  const center = min.add(max).scale(0.5);
  mesh.position.subtractInPlace(center);
  mesh.position.y += size.y * 0.5 * mesh.scaling.y;
}

/** Babylon.js viewport — web only; native shows guidance. */
export function WorkspaceBabylonViewport({
  design,
  selectedLayerId,
  onSelectLayer,
  specialists = [],
  selectedAiId,
  onSelectAi,
  projectName,
  height = 420,
}: WorkspaceBabylonViewportProps) {
  const colors = useColors();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<{ dispose: () => void; resize: () => void } | null>(null);
  const sceneRef = useRef<InstanceType<BabylonModule["Scene"]> | null>(null);
  const nodeMapRef = useRef(new Map<string, InstanceType<BabylonModule["TransformNode"]>>());
  const fingerprintRef = useRef(new Map<string, string>());
  const babylonRef = useRef<BabylonModule | null>(null);
  const [loading, setLoading] = useState(Platform.OS === "web");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<"solid" | "wireframe">("solid");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let disposed = false;
    let removeResize: (() => void) | null = null;

    (async () => {
      try {
        const BABYLON = await import("@babylonjs/core");
        if (disposed || !canvasRef.current) return;

        babylonRef.current = BABYLON;
        const engine = new BABYLON.Engine(canvasRef.current, true, {
          preserveDrawingBuffer: true,
          stencil: true,
        });
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.06, 0.07, 0.11, 1);

        const camera = new BABYLON.ArcRotateCamera(
          "cam",
          -Math.PI / 3,
          Math.PI / 2.8,
          50,
          new BABYLON.Vector3(0, 5, 0),
          scene,
        );
        camera.attachControl(canvasRef.current, true);
        camera.lowerRadiusLimit = 12;
        camera.upperRadiusLimit = 150;
        camera.wheelPrecision = 25;
        camera.panningSensibility = 80;

        new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.4, 1, 0.2), scene);
        const key = new BABYLON.DirectionalLight(
          "key",
          new BABYLON.Vector3(-0.8, -1.5, -0.5),
          scene,
        );
        key.intensity = 0.55;

        const ground = BABYLON.MeshBuilder.CreateGround(
          "workspace-grid",
          { width: 80, height: 80, subdivisions: 16 },
          scene,
        );
        const gmat = new BABYLON.StandardMaterial("grid-mat", scene);
        gmat.diffuseColor = new BABYLON.Color3(0.18, 0.2, 0.28);
        gmat.wireframe = true;
        gmat.alpha = 0.6;
        ground.material = gmat;
        ground.isPickable = false;
        ground.position.y = -0.01;

        scene.onPointerObservable.add((info) => {
          const { PointerEventTypes } = BABYLON;
          if (info.type === PointerEventTypes.POINTERDOWN && info.pickInfo?.hit) {
            const layerId = info.pickInfo.pickedMesh?.metadata?.layerId as string | undefined;
            if (layerId) onSelectLayer(layerId);
          }
        });

        engine.runRenderLoop(() => scene.render());
        const onResize = () => engine.resize();
        window.addEventListener("resize", onResize);
        removeResize = () => window.removeEventListener("resize", onResize);

        engineRef.current = engine;
        sceneRef.current = scene;
        setReady(true);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load 3D engine");
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      removeResize?.();
      engineRef.current?.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      nodeMapRef.current.clear();
      fingerprintRef.current.clear();
      babylonRef.current = null;
      setReady(false);
    };
  }, [onSelectLayer]);

  useEffect(() => {
    if (!ready || !sceneRef.current || !babylonRef.current) return;
    const effectiveDesign =
      viewMode === "wireframe" ? { ...design, wireframe: true } : { ...design, wireframe: false };
    void syncLayerMeshes(
      babylonRef.current,
      sceneRef.current,
      effectiveDesign,
      selectedLayerId,
      nodeMapRef.current,
      fingerprintRef.current,
    );
  }, [design, selectedLayerId, ready, viewMode]);

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.fallback, { height, borderColor: colors.border }]}>
        <Text style={{ fontSize: 36 }}>🎮</Text>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>{projectName ?? "3D Builder"}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 16 }}>
          Full Babylon.js builder with STL upload runs on web. Layers sync when you open the workspace in a browser.
        </Text>
        <Pressable
          onPress={() => void openWebBrowserCheckout(build3dWorkspaceWebPath({ project: "merchandise" }))}
          style={[styles.nativeWebBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Open in browser</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height, borderColor: colors.border }]}>
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.overlayText}>Loading Babylon.js engine…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.overlay}>
          <Text style={[styles.overlayText, { color: "#fbbf24" }]}>{error}</Text>
          <Text style={styles.overlayHint}>Run: pnpm add @babylonjs/core @babylonjs/loaders</Text>
        </View>
      ) : null}
      {/* @ts-expect-error web canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: loading || error ? "none" : "block" }}
      />

      <View style={styles.toolbar} pointerEvents="box-none">
        <Text style={styles.toolbarTitle} numberOfLines={1}>
          {projectName ?? "3D Builder"} · {design.layers.length} layers
        </Text>
        <View style={styles.toolbarBtns}>
          <Pressable
            onPress={() => setViewMode((m) => (m === "solid" ? "wireframe" : "solid"))}
            style={[styles.toolBtn, viewMode === "wireframe" && { backgroundColor: colors.primary }]}
          >
            <Text style={styles.toolBtnText}>{viewMode === "wireframe" ? "◻ Solid" : "◇ Wire"}</Text>
          </Pressable>
        </View>
      </View>

      {specialists.length > 0 ? (
        <View style={styles.aiBar}>
          {specialists.slice(0, 6).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onSelectAi?.(s.id)}
              style={[
                styles.aiChip,
                selectedAiId === s.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}44` },
              ]}
            >
              <Text>{s.avatar}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#0a0b10",
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
  nativeWebBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0b10ee",
    zIndex: 3,
    padding: 16,
  },
  overlayText: { color: "#cbd5e1", fontSize: 13, textAlign: "center" },
  overlayHint: { color: "#64748b", fontSize: 11, marginTop: 8 },
  toolbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  toolbarTitle: { color: "#e2e8f0", fontSize: 11, fontWeight: "700", flex: 1 },
  toolbarBtns: { flexDirection: "row", gap: 6 },
  toolBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  toolBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  aiBar: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    gap: 6,
  },
  aiChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff30",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
