import { afterEach, describe, expect, it } from "vitest";
import { assertServerSecretsSafe, getContentmateGeminiApiKey } from "../server/_core/secrets";

const SAMPLE = "AIzaSyTestGeminiKeyNotReal00000000000";

const saved: Record<string, string | undefined> = {};

function stash(name: string): void {
  saved[name] = process.env[name];
  delete process.env[name];
}

function restore(): void {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

describe("Gemini photo-checker key", () => {
  afterEach(() => {
    restore();
  });

  it("reads the key even when Railway wrapped it in quotes", () => {
    stash("CONTENTMATE_GEMINI_API_KEY");
    process.env.CONTENTMATE_GEMINI_API_KEY = `"${SAMPLE}"`;
    expect(getContentmateGeminiApiKey()).toBe(SAMPLE);
  });

  it("accepts GEMINI_API_KEY as a fallback name", () => {
    stash("CONTENTMATE_GEMINI_API_KEY");
    stash("GEMINI_API_KEY");
    process.env.GEMINI_API_KEY = SAMPLE;
    expect(getContentmateGeminiApiKey()).toBe(SAMPLE);
  });

  it("moves a Gemini key off a public Expo name so the live checker can use it", () => {
    stash("CONTENTMATE_GEMINI_API_KEY");
    stash("EXPO_PUBLIC_CONTENTMATE_GEMINI_API_KEY");
    process.env.EXPO_PUBLIC_CONTENTMATE_GEMINI_API_KEY = SAMPLE;
    expect(() => assertServerSecretsSafe()).not.toThrow();
    expect(process.env.EXPO_PUBLIC_CONTENTMATE_GEMINI_API_KEY).toBeUndefined();
    expect(getContentmateGeminiApiKey()).toBe(SAMPLE);
  });
});
