import { describe, expect, it } from "vitest";
import { FACE_FILTERS, drawFaceFilter, isFaceFilterId } from "../lib/face-filters";

describe("face filters", () => {
  it("offers plain, glasses, mustache, ears, stars, and a cap", () => {
    expect(FACE_FILTERS.map((filter) => filter.id)).toEqual([
      "plain",
      "glasses",
      "mustache",
      "ears",
      "stars",
      "cap",
    ]);
    expect(isFaceFilterId("glasses")).toBe(true);
    expect(isFaceFilterId("snap")).toBe(false);
  });

  it("draws a filter onto a canvas without throwing", () => {
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => undefined,
      ellipse: () => calls.push("ellipse"),
      stroke: () => undefined,
      fill: () => calls.push("fill"),
      arc: () => undefined,
      fillRect: () => undefined,
      fillText: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "left" as CanvasTextAlign,
    };
    drawFaceFilter(ctx as unknown as CanvasRenderingContext2D, 400, 600, "glasses");
    expect(calls).toContain("ellipse");
    drawFaceFilter(ctx as unknown as CanvasRenderingContext2D, 400, 600, "plain");
  });
});
