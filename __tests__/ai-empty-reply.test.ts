import { describe, expect, it } from "vitest";
import { resolveAiReplyOrFallback } from "../lib/ai-empty-reply";

describe("empty AI reply fallback", () => {
  it("keeps a real reply", () => {
    expect(resolveAiReplyOrFallback("  Dice the onion, not your fingers.  ", "Culinary Arts AI")).toBe(
      "Dice the onion, not your fingers.",
    );
  });

  it("fills in when Gemini returns a blank body", () => {
    const fallback = resolveAiReplyOrFallback("   ", "Culinary Arts AI");
    expect(fallback).toContain("Culinary Arts AI");
    expect(fallback.length).toBeGreaterThan(20);
  });
});
