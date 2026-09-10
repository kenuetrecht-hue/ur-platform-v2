import { describe, it, expect } from "vitest";
import {
  isWeakJwtSecret,
  manusOAuthIsConfigured,
} from "../server/_core/env";

describe("production JWT gate", () => {
  it("rejects empty, short, and placeholder secrets", () => {
    expect(isWeakJwtSecret("")).toBe(true);
    expect(isWeakJwtSecret("short")).toBe(true);
    expect(isWeakJwtSecret("dev-jwt-please-change-in-production-now")).toBe(true);
    expect(isWeakJwtSecret("your-jwt-secret-is-not-good-enough-here")).toBe(true);
    expect(isWeakJwtSecret("a-unique-production-secret-that-is-long-enough")).toBe(
      false,
    );
  });

  it("only requires a persistent JWT when Manus OAuth is configured", () => {
    expect(manusOAuthIsConfigured("")).toBe(false);
    expect(manusOAuthIsConfigured("https://oauth.example")).toBe(true);
  });
});
