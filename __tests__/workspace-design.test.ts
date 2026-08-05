import { describe, it, expect } from "vitest";
import {
  addLayer,
  createEmptyDesignState,
  createPrimitiveLayer,
  createStlLayer,
  designLayerSummary,
  duplicateLayer,
  moveLayer,
  removeLayer,
  snapValue,
  updateLayer,
} from "../lib/workspace-design-utils";
import { countBinaryStlTriangles, parseStlBase64 } from "../lib/stl-utils";
import {
  getSessionDesign,
  saveSessionDesign,
  validateDesignState,
} from "../server/_core/workspace-design-service";

describe("workspace design utils", () => {
  it("creates default state with base platform layer", () => {
    const state = createEmptyDesignState();
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0]?.kind).toBe("primitive");
    expect(state.gridEnabled).toBe(true);
  });

  it("adds primitive and STL layers", () => {
    let state = createEmptyDesignState();
    state = addLayer(state, createPrimitiveLayer({ name: "Block", type: "box" }));
    state = addLayer(
      state,
      createStlLayer({
        name: "Imported",
        stl: {
          fileName: "part.stl",
          dataBase64: "abc",
          byteSize: 3,
          triangleCount: 12,
        },
      }),
    );
    expect(state.layers).toHaveLength(3);
    const summary = designLayerSummary(state);
    expect(summary.stlLayers).toBe(1);
    expect(summary.primitiveLayers).toBe(2);
  });

  it("updates, moves, duplicates, and removes layers", () => {
    let state = createEmptyDesignState();
    const box = createPrimitiveLayer({ name: "Box", type: "box" });
    state = addLayer(state, box);
    state = updateLayer(state, box.id, { visible: false });
    expect(state.layers.find((l) => l.id === box.id)?.visible).toBe(false);

    state = duplicateLayer(state, box.id);
    expect(state.layers.some((l) => l.name.includes("copy"))).toBe(true);

    const copyId = state.layers.find((l) => l.name.includes("copy"))!.id;
    state = moveLayer(state, copyId, "up");
    state = removeLayer(state, copyId);
    expect(state.layers.some((l) => l.id === copyId)).toBe(false);
  });

  it("snaps values to grid", () => {
    expect(snapValue(1.4)).toBe(1);
    expect(snapValue(1.6)).toBe(2);
    expect(snapValue(2.3, 0.5)).toBe(2.5);
  });
});

describe("STL utils", () => {
  it("counts binary STL triangles from header", () => {
    const buffer = new ArrayBuffer(84 + 50 * 2);
    const view = new DataView(buffer);
    view.setUint32(80, 2, true);
    expect(countBinaryStlTriangles(buffer)).toBe(2);
  });

  it("parses small STL payloads", () => {
    const buffer = new ArrayBuffer(84 + 50);
    const view = new DataView(buffer);
    view.setUint32(80, 1, true);
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const b64 = btoa(binary);
    const parsed = parseStlBase64("cube.stl", b64);
    expect(parsed.triangleCount).toBe(1);
  });
});

describe("workspace design service", () => {
  it("saves and loads design state per session", () => {
    const sessionId = "ws-test-123";
    const state = createEmptyDesignState();
    const saved = saveSessionDesign(sessionId, state);
    expect(saved.layers).toHaveLength(1);
    const loaded = getSessionDesign(sessionId);
    expect(loaded.version).toBe(state.version);

    const withBox = addLayer(state, createPrimitiveLayer({ name: "Gear", type: "cylinder" }));
    saveSessionDesign(sessionId, withBox);
    expect(getSessionDesign(sessionId).layers).toHaveLength(2);
  });

  it("validates layer schema", () => {
    expect(() =>
      validateDesignState({
        layers: [
          {
            id: "layer-x",
            name: "Bad",
            kind: "stl",
            visible: true,
            locked: false,
            opacity: 1,
            color: "#fff",
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            updatedAt: new Date().toISOString(),
          },
        ],
        selectedLayerId: null,
        gridEnabled: true,
        snapEnabled: true,
        wireframe: false,
        version: 1,
      }),
    ).toThrow();
  });
});
