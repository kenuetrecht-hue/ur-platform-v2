import { describe, expect, it } from "vitest";
import {
  canSpeakPageCopy,
  pickHumanSpeechVoice,
  scoreSpeechVoice,
  speakPageCopy,
  stopPageCopy,
} from "../lib/speak-page-copy";

describe("speak-page-copy", () => {
  it("does not throw when the browser has no voice", async () => {
    expect(canSpeakPageCopy()).toBe(false);
    await expect(speakPageCopy("Hi — I'm Uri.")).resolves.toBeUndefined();
    expect(() => stopPageCopy()).not.toThrow();
  });

  it("prefers a natural English voice over a novelty robot voice", () => {
    const picked = pickHumanSpeechVoice([
      { name: "Bad News", lang: "en-US", localService: true },
      { name: "Samantha", lang: "en-US", localService: true },
      { name: "Zarvox", lang: "en-US" },
    ]);
    expect(picked?.name).toBe("Samantha");
    expect(scoreSpeechVoice({ name: "Samantha", lang: "en-US", localService: true })).toBeGreaterThan(
      scoreSpeechVoice({ name: "eSpeak Compact", lang: "en-US" }),
    );
  });
});
