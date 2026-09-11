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

  it("prefers a natural online voice over an old desktop robot", () => {
    const picked = pickHumanSpeechVoice([
      { name: "Microsoft David Desktop", lang: "en-US", localService: true, default: true },
      { name: "Microsoft Andrew Online (Natural)", lang: "en-US", localService: false },
    ]);
    expect(picked?.name).toBe("Microsoft Andrew Online (Natural)");
  });
});

describe("human speech prep", () => {
  it("says I.D. and eighteen plus the way a person would", async () => {
    const { prepareSpeechForHumanVoice, splitSpeechChunks } = await import("../lib/speak-page-copy");
    const spoken = prepareSpeechForHumanVoice(
      "I understand fully you do not want to do this. Photograph the ID. UR is 18+.",
    );
    expect(spoken).toMatch(/Look, I get it/i);
    expect(spoken).toContain("I.D.");
    expect(spoken).toContain("this app");
    expect(spoken).toContain("eighteen plus");
    expect(splitSpeechChunks(spoken).length).toBeGreaterThan(1);
  });
});
