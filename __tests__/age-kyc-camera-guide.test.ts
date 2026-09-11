import { describe, expect, it } from "vitest";
import {
  ID_CARD_ASPECT,
  guideBoxInView,
  videoCropForCoverGuide,
} from "../lib/age-kyc-camera-guide";
import { parseFlexibleDob } from "../lib/age-kyc-policy";

describe("ID camera guide", () => {
  it("places a landscape card box in the middle of the view", () => {
    const box = guideBoxInView(400, 300, "id");
    expect(box.width / box.height).toBeCloseTo(ID_CARD_ASPECT, 2);
    expect(box.left).toBeGreaterThan(0);
    expect(box.top).toBeGreaterThan(0);
    expect(box.left + box.width).toBeLessThan(400);
    expect(box.top + box.height).toBeLessThan(300);
  });

  it("crops the camera frame to that same box", () => {
    const crop = videoCropForCoverGuide({
      videoWidth: 1920,
      videoHeight: 1080,
      viewWidth: 400,
      viewHeight: 300,
      kind: "id",
    });
    expect(crop.sw).toBeGreaterThan(200);
    expect(crop.sh).toBeGreaterThan(100);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(1920);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(1080);
  });

  it("reads a US printed birth date", () => {
    expect(parseFlexibleDob("05/20/1990")).toBe("1990-05-20");
    expect(parseFlexibleDob("1990-05-20")).toBe("1990-05-20");
  });
});
