import { describe, expect, it } from "vitest";
import { AI_VOICE_SPEED, smoothElevenLabsVoiceSettings } from "../lib/ai-voice-delivery";

describe("AI voice delivery", () => {
  it("slows the voice only a little", () => {
    expect(AI_VOICE_SPEED).toBeGreaterThan(0.88);
    expect(AI_VOICE_SPEED).toBeLessThan(0.96);
  });

  it("smooths delivery without pinning every voice to the same flat tone", () => {
    const relaxed = smoothElevenLabsVoiceSettings(0.5, 0.85);
    const alreadySteady = smoothElevenLabsVoiceSettings(0.8, 0.7);
    expect(relaxed.stability).toBeGreaterThan(0.5);
    expect(relaxed.stability).toBeLessThan(0.7);
    expect(alreadySteady.stability).toBeLessThanOrEqual(0.84);
    expect(relaxed.use_speaker_boost).toBe(true);
    expect(relaxed.style).toBeGreaterThan(0);
    expect(relaxed.style).toBeLessThan(0.3);
  });
});
