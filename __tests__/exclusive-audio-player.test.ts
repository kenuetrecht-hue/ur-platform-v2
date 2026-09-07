import { describe, expect, it } from "vitest";
import { isExclusiveAudioPlaying, stopExclusiveAudio } from "../lib/exclusive-audio-player";

describe("exclusive audio player", () => {
  it("is idle and safe to stop when no clip is playing", () => {
    stopExclusiveAudio();
    expect(isExclusiveAudioPlaying()).toBe(false);
  });
});
