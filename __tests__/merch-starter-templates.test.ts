import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  MERCH_STARTER_TEMPLATES,
  createMerchStarterDesign,
  createMerchStarterLayers,
} from "../lib/merch-starter-templates";

describe("free merch starter templates", () => {
  it("offers a tumbler, cup, sweater, shirt, keychain, and business card", () => {
    expect(MERCH_STARTER_TEMPLATES.map((template) => template.id)).toEqual([
      "tumbler",
      "coffee-mug",
      "sweater",
      "t-shirt",
      "keychain",
      "business-card",
    ]);
  });

  it("gives every template a logo spot to start the design", () => {
    for (const template of MERCH_STARTER_TEMPLATES) {
      const layers = createMerchStarterLayers(template.id);
      expect(layers.length).toBeGreaterThan(1);
      expect(layers.some((layer) => layer.name === "Logo or phrase")).toBe(true);
      const design = createMerchStarterDesign(template.id);
      expect(design.selectedLayerId).toBeTruthy();
    }
  });

  it("puts merch starters on a tab at the top of the design lab", () => {
    const page = readFileSync("app/3d-workspace.tsx", "utf8");
    expect(page).toContain('{ id: "merch", label: "Merch"');
    expect(page).toContain("Free starters");
    expect(page).toContain("startMerchTemplate");
  });
});
