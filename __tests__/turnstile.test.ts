import { afterEach, describe, expect, it, vi } from "vitest";

describe("turnstile siteverify", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("skips verification in development when no secret is set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const { assertTurnstileToken, isTurnstileEnforced } = await import("../server/_core/turnstile");
    expect(isTurnstileEnforced()).toBe(false);
    await expect(
      assertTurnstileToken({ token: "", action: "login" }),
    ).resolves.toBeUndefined();
  });

  it("rejects a missing token when a secret is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const { assertTurnstileToken } = await import("../server/_core/turnstile");
    await expect(
      assertTurnstileToken({ token: "", action: "login" }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/security check/i) });
  });

  it("accepts a Cloudflare success response", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ success: true, action: "signup" }),
      })),
    );
    const { assertTurnstileToken } = await import("../server/_core/turnstile");
    await expect(
      assertTurnstileToken({
        token: "ok-token-abcdefghijklmnopqrstuvwxyz",
        action: "signup",
        ip: "203.0.113.9",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects action mismatch", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ success: true, action: "login" }),
      })),
    );
    const { assertTurnstileToken } = await import("../server/_core/turnstile");
    await expect(
      assertTurnstileToken({
        token: "ok-token-abcdefghijklmnopqrstuvwxyz",
        action: "signup",
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/security check failed/i) });
  });
});
