import { describe, expect, it } from "vitest";
import { FACE_FILTER_MONTH_CENTS, FACE_FILTER_WEEK_CENTS } from "../lib/face-filter-pricing";
import { faceFilterWeekId, weeklyFaceSet } from "../lib/face-filter-week";
import {
  _resetFaceFilterPassesForTests,
  faceFiltersUnlocked,
  grantFaceFilterPass,
} from "../server/_core/face-filter-pass-service";

describe("face filter price", () => {
  it("keeps everyday use free and prices the Monday set under a $3.99 monthly add-on", () => {
    expect(FACE_FILTER_WEEK_CENTS).toBe(199);
    expect(FACE_FILTER_MONTH_CENTS).toBe(299);
    expect(FACE_FILTER_WEEK_CENTS).not.toBe(500);
    expect(FACE_FILTER_MONTH_CENTS).toBeLessThan(399);
  });

  it("changes the four looks on Monday morning in Indiana", () => {
    const sunday = faceFilterWeekId(new Date("2026-10-18T18:00:00Z"));
    const monday = faceFilterWeekId(new Date("2026-10-19T16:00:00Z"));
    expect(sunday).toBe("2026-10-12");
    expect(monday).toBe("2026-10-19");
    expect(weeklyFaceSet(new Date("2026-10-19T16:00:00Z")).looks).toHaveLength(4);
  });

  it("opens this week after a week pass and keeps a 30-day pass open next week", () => {
    _resetFaceFilterPassesForTests();
    const at = new Date("2026-10-19T16:00:00Z");
    expect(faceFiltersUnlocked("member-1", false, at)).toBe(false);
    grantFaceFilterPass({ userId: "member-1", planId: "week", at });
    expect(faceFiltersUnlocked("member-1", false, at)).toBe(true);
    expect(faceFiltersUnlocked("member-1", false, new Date("2026-10-26T16:00:00Z"))).toBe(false);

    grantFaceFilterPass({ userId: "member-2", planId: "month", at });
    expect(faceFiltersUnlocked("member-2", false, new Date("2026-11-01T16:00:00Z"))).toBe(true);
    expect(faceFiltersUnlocked("owner", true, at)).toBe(true);
  });
});
