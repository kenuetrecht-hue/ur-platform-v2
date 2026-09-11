import { describe, expect, it } from "vitest";
import { canSpeakPageCopy, speakPageCopy, stopPageCopy } from "../lib/speak-page-copy";

describe("speak-page-copy", () => {
  it("does not throw when the browser has no voice", async () => {
    expect(canSpeakPageCopy()).toBe(false);
    await expect(speakPageCopy("Hi — I'm Uri.")).resolves.toBeUndefined();
    expect(() => stopPageCopy()).not.toThrow();
  });
});
