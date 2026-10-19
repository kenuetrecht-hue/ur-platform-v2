/**
 * Free starter shapes for the merch lab. Teaching models, not brand products.
 * Sizes are in feet so they sit on the workspace table.
 */

import type { DesignLayer, WorkspaceDesignState } from "./workspace-design-types";
import { createCustomLayer, createEmptyDesignState } from "./workspace-design-utils";

export type MerchStarterId =
  | "tumbler"
  | "coffee-mug"
  | "sweater"
  | "t-shirt"
  | "keychain"
  | "business-card";

export type MerchStarterTemplate = {
  id: MerchStarterId;
  label: string;
  emoji: string;
  hint: string;
};

export const MERCH_STARTER_TEMPLATES: readonly MerchStarterTemplate[] = [
  { id: "tumbler", label: "Travel tumbler", emoji: "🥤", hint: "Tall cup, Stanley-style" },
  { id: "coffee-mug", label: "Coffee cup", emoji: "☕", hint: "Mug with a handle" },
  { id: "sweater", label: "Sweater", emoji: "🧥", hint: "Body and sleeves" },
  { id: "t-shirt", label: "T-shirt", emoji: "👕", hint: "Short sleeves" },
  { id: "keychain", label: "Keychain", emoji: "🔑", hint: "Ring and tag" },
  { id: "business-card", label: "Business card", emoji: "💳", hint: "3.5 by 2 inches" },
];

function piece(
  name: string,
  color: string,
  primitive: DesignLayer["primitive"],
  position: { x: number; y: number; z: number },
): DesignLayer {
  return createCustomLayer({
    name,
    color,
    primitive: primitive!,
    transform: { position },
    role: "generic",
  });
}

function logoSpot(y: number, z: number, width: number, height: number): DesignLayer {
  return piece(
    "Logo or phrase",
    "#f5c542",
    { type: "box", width, height, depth: 0.02 },
    { x: 0, y, z },
  );
}

export function createMerchStarterLayers(id: MerchStarterId): DesignLayer[] {
  switch (id) {
    case "tumbler":
      return [
        piece("Cup body", "#1f4b99", { type: "cylinder", diameter: 0.36, height: 0.95, tessellation: 24 }, { x: 0, y: 0.5, z: 0 }),
        piece("Lid", "#d9dde6", { type: "cylinder", diameter: 0.4, height: 0.12, tessellation: 24 }, { x: 0, y: 1.04, z: 0 }),
        logoSpot(0.55, 0.2, 0.22, 0.28),
      ];
    case "coffee-mug":
      return [
        piece("Cup", "#f4f1ea", { type: "cylinder", diameter: 0.42, height: 0.42, tessellation: 24 }, { x: 0, y: 0.24, z: 0 }),
        piece("Handle", "#f4f1ea", { type: "box", width: 0.08, height: 0.22, depth: 0.16 }, { x: 0.26, y: 0.24, z: 0 }),
        logoSpot(0.24, 0.22, 0.16, 0.16),
      ];
    case "sweater":
      return [
        piece("Body", "#2f6f4e", { type: "box", width: 1.5, height: 1.8, depth: 0.28 }, { x: 0, y: 1, z: 0 }),
        piece("Left sleeve", "#2f6f4e", { type: "box", width: 0.7, height: 0.28, depth: 0.28 }, { x: -1.05, y: 1.55, z: 0 }),
        piece("Right sleeve", "#2f6f4e", { type: "box", width: 0.7, height: 0.28, depth: 0.28 }, { x: 1.05, y: 1.55, z: 0 }),
        logoSpot(1.15, 0.16, 0.4, 0.4),
      ];
    case "t-shirt":
      return [
        piece("Body", "#f7f7f7", { type: "box", width: 1.4, height: 1.5, depth: 0.16 }, { x: 0, y: 0.85, z: 0 }),
        piece("Left sleeve", "#f7f7f7", { type: "box", width: 0.4, height: 0.22, depth: 0.16 }, { x: -0.85, y: 1.4, z: 0 }),
        piece("Right sleeve", "#f7f7f7", { type: "box", width: 0.4, height: 0.22, depth: 0.16 }, { x: 0.85, y: 1.4, z: 0 }),
        logoSpot(1.05, 0.1, 0.36, 0.36),
      ];
    case "keychain":
      return [
        piece("Ring", "#c0c6d0", { type: "torus", diameter: 0.22, tessellation: 20 }, { x: -0.12, y: 0.16, z: 0 }),
        piece("Tag", "#1f4b99", { type: "box", width: 0.28, height: 0.16, depth: 0.03 }, { x: 0.12, y: 0.1, z: 0 }),
        logoSpot(0.1, 0.04, 0.16, 0.08),
      ];
    case "business-card":
      return [
        piece("Card", "#f7f4ee", { type: "box", width: 0.29, height: 0.02, depth: 0.17 }, { x: 0, y: 0.02, z: 0 }),
        logoSpot(0.04, 0, 0.12, 0.02),
      ];
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function createMerchStarterDesign(id: MerchStarterId): WorkspaceDesignState {
  const layers = createMerchStarterLayers(id);
  return {
    ...createEmptyDesignState(),
    layers,
    selectedLayerId: layers.find((layer) => layer.name === "Logo or phrase")?.id ?? layers[0]?.id ?? null,
    version: 1,
  };
}

export function isMerchStarterId(value: string): value is MerchStarterId {
  return MERCH_STARTER_TEMPLATES.some((template) => template.id === value);
}
