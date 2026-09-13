import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { AFTER_ID_PASS_HREF, AFTER_JOIN_WELCOME_HREF } from "../lib/after-sign-in";
import { JOIN_EMANUAL_STEPS, JOIN_EMANUAL_TITLE } from "../lib/join-emanual";
import { markGiveJoinEmanual, shouldGiveJoinEmanual, clearGiveJoinEmanual } from "../lib/join-emanual-handoff";

describe("join e-manual", () => {
  it("has eight click-by-click steps from website to payout", () => {
    expect(JOIN_EMANUAL_TITLE).toMatch(/e-manual/i);
    expect(JOIN_EMANUAL_STEPS).toHaveLength(8);
    expect(JOIN_EMANUAL_STEPS[0]?.clicks[0]).toMatch(/urplatform\.llc/i);
    expect(JOIN_EMANUAL_STEPS[1]?.clicks.some((c) => /already joined/i.test(c))).toBe(true);
    expect(JOIN_EMANUAL_STEPS[6]?.clicks.some((c) => /List for sale/i.test(c))).toBe(true);
    expect(JOIN_EMANUAL_STEPS[7]?.clicks.some((c) => /85%/i.test(c))).toBe(true);
    expect(JOIN_EMANUAL_STEPS[7]?.clicks.some((c) => /100%/i.test(c))).toBe(true);
    expect(JOIN_EMANUAL_STEPS[7]?.clicks.some((c) => /Stripe/i.test(c))).toBe(true);
  });

  it("flags a new member to receive the e-manual after they join", () => {
    clearGiveJoinEmanual();
    expect(shouldGiveJoinEmanual()).toBe(false);
    markGiveJoinEmanual();
    expect(shouldGiveJoinEmanual()).toBe(true);
    clearGiveJoinEmanual();
    expect(shouldGiveJoinEmanual()).toBe(false);
  });

  it("opens a real page after pictures, not a blank tab layout", () => {
    expect(AFTER_JOIN_WELCOME_HREF).toBe("/e-manual?joined=1");
    expect(AFTER_ID_PASS_HREF).toBe("/(tabs)/index");
    const hook = readFileSync("hooks/use-enter-app-after-pictures.ts", "utf8");
    const manual = readFileSync("app/e-manual.tsx", "utf8");
    expect(hook).toContain("AFTER_JOIN_WELCOME_HREF");
    expect(hook).toContain("markGiveJoinEmanual");
    expect(manual).toContain("AFTER_ID_PASS_HREF");
    expect(manual).not.toContain('replace("/(tabs)")');
  });
});
