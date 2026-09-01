import { describe, expect, it } from "vitest";
import {
  ADMIN_QUICK_HREFS,
  ADMIN_TAB_HREF,
  BUSINESS_STEWARD_ADMIN_HREF,
  adminTabHref,
} from "../lib/admin-dashboard-routes";
import { BUSINESS_STEWARD_AI_ID } from "../lib/owner-platform-ops-catalog";

describe("admin dashboard routes", () => {
  it("opens the Admin tab, not a duplicate stack screen", () => {
    expect(ADMIN_TAB_HREF).toBe("/(tabs)/admin");
    expect(adminTabHref()).toBe("/(tabs)/admin");
  });

  it("selects Business Steward on the Admin tab", () => {
    expect(BUSINESS_STEWARD_ADMIN_HREF).toEqual({
      pathname: "/(tabs)/admin",
      params: { ai: BUSINESS_STEWARD_AI_ID },
    });
  });

  it("keeps owner shortcuts on in-app routes", () => {
    expect(ADMIN_QUICK_HREFS.allAis).toBe("/(tabs)/ais");
    expect(ADMIN_QUICK_HREFS.lab3d).toBe("/3d-workspace");
    expect(ADMIN_QUICK_HREFS.create).toBe("/(tabs)/create");
    expect(ADMIN_QUICK_HREFS.discover).toBe("/(tabs)/discover");
  });
});
