import { describe, expect, it } from "vitest";
import { toSupabaseOpenId } from "../server/supabase-auth";
import { isLikelySupabaseAccessToken, peekJwtAlgorithm } from "../shared/supabase-config";

describe("supabase-auth", () => {
  it("maps Supabase user ids to stable openId values", () => {
    expect(toSupabaseOpenId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "supabase:550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("detects ES256 tokens as Supabase (not HS256 session cookies)", () => {
    const header = Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: "https://x.supabase.co/auth/v1" })).toString(
      "base64url",
    );
    const fake = `${header}.${payload}.sig`;
    expect(peekJwtAlgorithm(fake)).toBe("ES256");
    expect(isLikelySupabaseAccessToken(fake)).toBe(true);
  });

  it("does not treat HS256 tokens as Supabase access tokens", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const fake = `${header}.payload.sig`;
    expect(isLikelySupabaseAccessToken(fake)).toBe(false);
  });
});
