import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_CALENDAR_DISCLAIMER,
  formatComplianceCalendarForPrompt,
  INDIANA_LLC_COMPLIANCE_ITEMS,
} from "../lib/indiana-llc-compliance-calendar";
import { isOwnerOnlyPlatformAi } from "../server/_core/platform-ops-ai";
import { listCreatorsForClient } from "../server/_core/ai-creator-registry";

describe("Indiana LLC compliance calendar", () => {
  it("lists quarterly estimated tax dates", () => {
    const titles = INDIANA_LLC_COMPLIANCE_ITEMS.map((i) => i.title).join(" ");
    expect(titles).toContain("1040-ES");
    expect(titles).toContain("ES-40");
    expect(INDIANA_LLC_COMPLIANCE_ITEMS.some((i) => i.when === "September 15")).toBe(true);
    expect(INDIANA_LLC_COMPLIANCE_ITEMS.some((i) => i.when.includes("January 15"))).toBe(true);
  });

  it("prompt text is educational not a filing", () => {
    const prompt = formatComplianceCalendarForPrompt();
    expect(prompt).toContain(COMPLIANCE_CALENDAR_DISCLAIMER.slice(0, 40));
    expect(prompt.toLowerCase()).toContain("not tax");
  });
});

describe("Business Steward AI isolation", () => {
  it("is owner-only and hidden from the public catalog", () => {
    expect(isOwnerOnlyPlatformAi("platform-business-steward-ai")).toBe(true);
    const publicList = listCreatorsForClient({ includeOwnerOps: false });
    expect(publicList.some((c) => c.id === "platform-business-steward-ai")).toBe(false);
    const ownerList = listCreatorsForClient({ includeOwnerOps: true });
    expect(ownerList.some((c) => c.id === "platform-business-steward-ai")).toBe(true);
  });
});
