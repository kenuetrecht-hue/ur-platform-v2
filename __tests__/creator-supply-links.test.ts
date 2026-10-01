import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapPrintifyBlueprints } from "../lib/printify-supply";

describe("creator supply links", () => {
  it("keeps cartoon and Printify links on the creator dashboard", () => {
    const links = readFileSync("components/creator-supply-links.tsx", "utf8");
    const dashboard = readFileSync("components/content-creator-dashboard-panel.tsx", "utf8");
    expect(links).toContain('testID="creator-open-cartoon"');
    expect(links).toContain('router.push("/cartoon-studio")');
    expect(links).toContain('testID="creator-open-printify"');
    expect(links).toContain('router.push("/creator-merch")');
    expect(dashboard).toContain("CreatorSupplyLinks");
  });

  it("maps Printify catalog titles and drops the token", () => {
    const items = mapPrintifyBlueprints([
      { id: 3, title: "  Kids Tee  " },
      { id: "9", title: "Mug" },
      { title: "No id" },
      { id: 1, title: "" },
    ]);
    expect(items).toEqual([
      { id: "3", title: "Kids Tee" },
      { id: "9", title: "Mug" },
    ]);
    const route = readFileSync("server/_core/commerce-fulfillment-adapters.ts", "utf8");
    expect(route).toContain("listCreatorPrintifySupply");
    expect(route).not.toContain("return { ready: true, token");
  });
});
