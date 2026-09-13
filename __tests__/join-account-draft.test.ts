import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearJoinAccountDraft,
  loadJoinAccountDraft,
  saveJoinAccountDraft,
} from "../lib/join-account-draft";

describe("join account draft", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    clearJoinAccountDraft();
    vi.unstubAllGlobals();
  });

  it("remembers name email and password so pictures can sign the person in", () => {
    saveJoinAccountDraft({
      name: "Ken",
      email: "ken@example.com",
      password: "secret1",
      confirmPassword: "secret1",
      acceptedTerms: true,
      turnstileToken: "",
    });
    expect(loadJoinAccountDraft()).toEqual({
      name: "Ken",
      email: "ken@example.com",
      password: "secret1",
      confirmPassword: "secret1",
      acceptedTerms: true,
      turnstileToken: "",
    });
  });
});
