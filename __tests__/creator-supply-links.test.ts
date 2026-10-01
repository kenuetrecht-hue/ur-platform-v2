import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapPrintifyBlueprints, mapPrintifyShopProducts, printifyUsShippingCents } from "../lib/printify-supply";
import { memberPrintifyRetailCents } from "../lib/member-printify-pricing";

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

  it("keeps at least $4 and half the cost for UR on a member order", () => {
    expect(memberPrintifyRetailCents(2000)).toBe(3000);
    expect(memberPrintifyRetailCents(800)).toBe(1200);
    expect(memberPrintifyRetailCents(100)).toBe(501);
    expect(memberPrintifyRetailCents(50)).toBeNull();
    const offers = mapPrintifyShopProducts({
      data: [
        {
          id: "prod-1",
          title: "Tee",
          blueprint_id: 3,
          print_provider_id: 29,
          variants: [
            { id: 2, title: "Large", cost: 900, is_enabled: true },
            { id: 1, title: "Small", cost: 700, is_enabled: true },
            { id: 3, title: "Off", cost: 100, is_enabled: false },
          ],
        },
      ],
    });
    expect(offers).toEqual([
      {
        productId: "prod-1",
        variantId: "1",
        title: "Tee · Small",
        costCents: 700,
        blueprintId: "3",
        printProviderId: "29",
      },
    ]);
    expect(
      printifyUsShippingCents({
        profiles: [{ countries: ["US"], first_item: { cost: 450, currency: "USD" } }],
      }),
    ).toBe(450);
    expect(memberPrintifyRetailCents(700 + 450)).toBe(1725);
  });
});
