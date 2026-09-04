import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Platform, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { WorkspaceTapButton } from "@/components/workspace-tap-button";
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import { build3dWorkspaceWebPath } from "@/lib/forge-platform-handoff";
import type { DesignLayer, WorkspaceDesignState } from "@/lib/workspace-design-types";
import { base64ToArrayBuffer } from "@/lib/stl-utils";
import {
  CAD_CAMERA_PRESETS,
  CAD_DRAW_TOOLS,
  constrainOrtho,
  formatFeetInches,
  snapPlanPoint,
  type CadCameraView,
  type CadDrawTool,
  type CadPlanPoint,
} from "@/lib/workspace-cad";
import { workspaceBeginnerStatus } from "@/lib/workspace-first-steps";

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
  drawTool?: CadDrawTool;
  onDrawToolChange?: (tool: CadDrawTool) => void;
  orthoLock?: boolean;
  chainFrom?: CadPlanPoint | null;
  onDrawSegment?: (start: CadPlanPoint, end: CadPlanPoint) => void;
  cameraView?: CadCameraView;
  onCameraViewChange?: (view: CadCameraView) => void;
  onDrawPendingChange?: (point: CadPlanPoint | null) => void;
};

function applyCadCamera(
  BABYLON: BabylonModule,
  camera: InstanceType<BabylonModule["ArcRotateCamera"]>,
  view: CadCameraView,
  canvas: HTMLCanvasElement,
) {
  const preset = CAD_CAMERA_PRESETS[view];
  camera.alpha = preset.alpha;
  camera.beta = preset.beta;
  camera.radius = preset.radius;
  camera.target = new BABYLON.Vector3(0, 4, 0);
  if (preset.ortho) {
    camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    const aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
    const half = 22;
    camera.orthoLeft = -half * aspect;
    camera.orthoRight = half * aspect;
    camera.orthoBottom = -half;
    camera.orthoTop = half;
  } else {
    camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
  }
}

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
  height = 480,
  drawTool = "select",
  onDrawToolChange,
  orthoLock = true,
  chainFrom = null,
  onDrawSegment,
  cameraView: cameraViewProp,
  onCameraViewChange,
  onDrawPendingChange,
}: WorkspaceBabylonViewportProps) {
  const colors = useColors();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<{ dispose: () => void; resize: () => void } | null>(null);
  const sceneRef = useRef<InstanceType<BabylonModule["Scene"]> | null>(null);
  const cameraRef = useRef<InstanceType<BabylonModule["ArcRotateCamera"]> | null>(null);
  const nodeMapRef = useRef(new Map<string, InstanceType<BabylonModule["TransformNode"]>>());
  const fingerprintRef = useRef(new Map<string, string>());
  const babylonRef = useRef<BabylonModule | null>(null);
  const onSelectLayerRef = useRef(onSelectLayer);
  const onDrawSegmentRef = useRef(onDrawSegment);
  const drawToolRef = useRef(drawTool);
  const orthoLockRef = useRef(orthoLock);
  const chainFromRef = useRef(chainFrom);
  const pendingStartRef = useRef<CadPlanPoint | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(Platform.OS === "web");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<"solid" | "wireframe">("solid");
  const [cameraViewInternal, setCameraViewInternal] = useState<CadCameraView>("iso");
  const cameraView = cameraViewProp ?? cameraViewInternal;
  const cameraViewRef = useRef<CadCameraView>(cameraView);
  const [pendingStart, setPendingStart] = useState<CadPlanPoint | null>(null);
  const [hoverPoint, setHoverPoint] = useState<CadPlanPoint | null>(null);
  const onDrawPendingChangeRef = useRef(onDrawPendingChange);
  const onCameraViewChangeRef = useRef(onCameraViewChange);

  onSelectLayerRef.current = onSelectLayer;
  onDrawSegmentRef.current = onDrawSegment;
  drawToolRef.current = drawTool;
  orthoLockRef.current = orthoLock;
  chainFromRef.current = chainFrom;
  pendingStartRef.current = pendingStart;
  cameraViewRef.current = cameraView;
  onDrawPendingChangeRef.current = onDrawPendingChange;
  onCameraViewChangeRef.current = onCameraViewChange;

  const applyView = (view: CadCameraView) => {
    if (cameraViewProp == null) setCameraViewInternal(view);
    onCameraViewChangeRef.current?.(view);
    if (babylonRef.current && cameraRef.current && canvasRef.current) {
      applyCadCamera(babylonRef.current, cameraRef.current, view, canvasRef.current);
    }
  };

  const setPending = (point: CadPlanPoint | null) => {
    pendingStartRef.current = point;
    setPendingStart(point);
    onDrawPendingChangeRef.current?.(point);
  };

  useEffect(() => {
    if (!ready || !babylonRef.current || !cameraRef.current || !canvasRef.current) return;
    applyCadCamera(babylonRef.current, cameraRef.current, cameraView, canvasRef.current);
  }, [cameraView, ready]);

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
          CAD_CAMERA_PRESETS.iso.alpha,
          CAD_CAMERA_PRESETS.iso.beta,
          CAD_CAMERA_PRESETS.iso.radius,
          new BABYLON.Vector3(0, 4, 0),
          scene,
        );
        camera.attachControl(canvasRef.current, true);
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 180;
        camera.wheelPrecision = 25;
        camera.panningSensibility = 80;
        cameraRef.current = camera;

        new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.4, 1, 0.2), scene);
        const key = new BABYLON.DirectionalLight(
          "key",
          new BABYLON.Vector3(-0.8, -1.5, -0.5),
          scene,
        );
        key.intensity = 0.55;

        const ground = BABYLON.MeshBuilder.CreateGround(
          "workspace-grid",
          { width: 120, height: 120, subdivisions: 24 },
          scene,
        );
        const gmat = new BABYLON.StandardMaterial("grid-mat", scene);
        gmat.diffuseColor = new BABYLON.Color3(0.18, 0.2, 0.28);
        gmat.wireframe = true;
        gmat.alpha = 0.55;
        ground.material = gmat;
        ground.isPickable = false;
        ground.position.y = -0.01;

        const pickPlane = BABYLON.MeshBuilder.CreateGround(
          "cad-pick",
          { width: 200, height: 200 },
          scene,
        );
        pickPlane.visibility = 0;
        pickPlane.isPickable = true;
        pickPlane.position.y = 0;

        const planPointFromPick = (): CadPlanPoint | null => {
          const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => m.name === "cad-pick");
          if (!pick?.hit || !pick.pickedPoint) return null;
          return snapPlanPoint({ x: pick.pickedPoint.x, z: pick.pickedPoint.z });
        };

        scene.onPointerObservable.add((info) => {
          const { PointerEventTypes } = BABYLON;
          if (info.type === PointerEventTypes.POINTERMOVE && drawToolRef.current !== "select") {
            setHoverPoint(planPointFromPick());
          }
          if (info.type === PointerEventTypes.POINTERDOWN) {
            pointerDownRef.current = { x: scene.pointerX, y: scene.pointerY };
          }
          if (info.type !== PointerEventTypes.POINTERUP) return;
          const down = pointerDownRef.current;
          pointerDownRef.current = null;
          if (!down) return;
          const dragged = Math.hypot(scene.pointerX - down.x, scene.pointerY - down.y) > 6;
          if (dragged) return;

          if (drawToolRef.current !== "select") {
            let point = planPointFromPick();
            if (!point) return;
            const start = pendingStartRef.current ?? chainFromRef.current;
            if (start && orthoLockRef.current && drawToolRef.current !== "slab") {
              point = constrainOrtho(start, point);
              point = snapPlanPoint(point);
            }
            if (start) {
              onDrawSegmentRef.current?.(start, point);
              setPending(null);
            } else {
              setPending(point);
            }
            return;
          }

          const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => Boolean(m.metadata?.layerId));
          const layerId = pick?.pickedMesh?.metadata?.layerId as string | undefined;
          if (layerId) onSelectLayerRef.current(layerId);
        });

        engine.runRenderLoop(() => scene.render());
        const onResize = () => {
          engine.resize();
          if (cameraRef.current && canvasRef.current) {
            applyCadCamera(BABYLON, cameraRef.current, cameraViewRef.current, canvasRef.current);
          }
        };
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
      cameraRef.current = null;
      nodeMapRef.current.clear();
      fingerprintRef.current.clear();
      babylonRef.current = null;
      setReady(false);
    };
    // Engine mounts once; draw/select callbacks use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (drawTool === "select") {
      setPending(null);
    }
  }, [drawTool]);

  useEffect(() => {
    if (!ready) return;
    engineRef.current?.resize();
  }, [ready, height]);

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

  const statusStart = pendingStart ?? chainFrom;
  const status = workspaceBeginnerStatus({
    drawTool,
    hasPendingStart: Boolean(statusStart),
    startLabel: statusStart
      ? `${formatFeetInches(statusStart.x)}, ${formatFeetInches(statusStart.z)}`
      : undefined,
    orthoLock,
  });

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.fallback, { height, borderColor: colors.border }]}>
        <Text style={{ fontSize: 36 }}>📐</Text>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>{projectName ?? "UR 3D Workspace"}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 16 }}>
          CAD-style drawing (plan view, snap walls, HVAC runs) runs in the browser. Layers sync to this account.
        </Text>
        <Pressable
          onPress={() => void openWebBrowserCheckout(build3dWorkspaceWebPath({ project: "architecture" }))}
          style={[styles.nativeWebBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Open CAD lab in browser</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <View style={styles.chromeRow}>
        <Text style={styles.toolbarTitle} numberOfLines={1}>
          {projectName ?? "UR 3D Workspace"} · {design.layers.length} pcs
        </Text>
        {(Object.keys(CAD_CAMERA_PRESETS) as CadCameraView[]).map((view) => (
          <WorkspaceTapButton
            key={view}
            onPress={() => applyView(view)}
            style={[styles.toolBtn, cameraView === view && { backgroundColor: colors.primary }]}
          >
            <Text style={styles.toolBtnText}>{CAD_CAMERA_PRESETS[view].label}</Text>
          </WorkspaceTapButton>
        ))}
        <WorkspaceTapButton
          onPress={() => setViewMode((m) => (m === "solid" ? "wireframe" : "solid"))}
          style={[styles.toolBtn, viewMode === "wireframe" && { backgroundColor: colors.primary }]}
        >
          <Text style={styles.toolBtnText}>{viewMode === "wireframe" ? "Solid" : "Wire"}</Text>
        </WorkspaceTapButton>
      </View>

      <View style={styles.chromeRow}>
        {CAD_DRAW_TOOLS.map((t) => (
          <WorkspaceTapButton
            key={t.id}
            onPress={() => onDrawToolChange?.(t.id)}
            style={[styles.toolBtn, drawTool === t.id && { backgroundColor: colors.primary }]}
          >
            <Text style={styles.toolBtnText}>
              {t.emoji} {t.label}
            </Text>
          </WorkspaceTapButton>
        ))}
      </View>

      <View style={[styles.canvasHost, { height }]}>
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.overlayText}>Loading CAD viewport…</Text>
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
          style={{
            width: "100%",
            height: "100%",
            display: loading || error ? "none" : "block",
            cursor: drawTool === "select" ? "default" : "crosshair",
          }}
        />
        <View style={styles.statusBar} pointerEvents="none">
          <Text style={styles.statusText}>{status}</Text>
          {hoverPoint && drawTool !== "select" ? (
            <Text style={styles.statusText}>
              X {formatFeetInches(hoverPoint.x)} · Z {formatFeetInches(hoverPoint.z)}
            </Text>
          ) : null}
        </View>
      </View>

      {specialists.length > 0 ? (
        <View style={styles.chromeRow}>
          {specialists.slice(0, 8).map((s) => (
            <WorkspaceTapButton
              key={s.id}
              onPress={() => onSelectAi?.(s.id)}
              style={[
                styles.aiChip,
                selectedAiId === s.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}44` },
              ]}
            >
              <Text>{s.avatar}</Text>
            </WorkspaceTapButton>
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
  },
  chromeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 20,
  },
  canvasHost: {
    position: "relative",
    width: "100%",
    backgroundColor: "#0a0b10",
    zIndex: 0,
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
  toolbarTitle: { color: "#e2e8f0", fontSize: 11, fontWeight: "700", flexGrow: 1, minWidth: 80 },
  toolBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  toolBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  statusBar: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 2,
  },
  statusText: { color: "#cbd5e1", fontSize: 10, fontWeight: "600" },
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
