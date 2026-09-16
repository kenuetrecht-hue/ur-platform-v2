import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { OWNER_OPS_TABS, isOwnerOpsTabId } from "../lib/owner-ops-tabs";

describe("owner ops tabs", () => {
  it("covers the long admin sections with tap tabs", () => {
    expect(OWNER_OPS_TABS.map((tab) => tab.id)).toEqual([
      "ais",
      "people",
      "command",
      "conduct",
      "commerce",
      "security",
      "more",
    ]);
    expect(isOwnerOpsTabId("people")).toBe(true);
    expect(isOwnerOpsTabId("scroll")).toBe(false);
    const ops = readFileSync("app/owner-ops.tsx", "utf8");
    expect(ops).toContain("AiHubTabRow");
    expect(ops).toContain("OWNER_OPS_TABS");
    expect(ops).toContain("OwnerMemberCensusPanel");
    expect(ops).toContain("OwnerSigninResetPanel");
  });
});
