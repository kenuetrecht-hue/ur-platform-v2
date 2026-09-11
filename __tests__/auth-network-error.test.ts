import { describe, expect, it } from "vitest";
import { explainAuthFailure } from "../lib/auth-network-error";

describe("explainAuthFailure", () => {
  it("rewrites Failed to fetch into a Supabase setup hint", () => {
    const msg = explainAuthFailure(new Error("Failed to fetch"));
    expect(msg.toLowerCase()).toContain("sign-in service");
    expect(msg.toLowerCase()).toContain("supabase");
  });

  it("passes through normal credential errors", () => {
    expect(explainAuthFailure(new Error("Invalid login credentials"))).toBe(
      "Invalid login credentials",
    );
  });

  it("rewrites HTML-as-JSON (DOCTYPE) into a check-again hint on the live site", () => {
    const msg = explainAuthFailure(
      new Error("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"),
    );
    expect(msg.toLowerCase()).toContain("pictures");
    expect(msg.toLowerCase()).toContain("check my three pictures");
    expect(msg.toLowerCase()).not.toContain("8082");
  });
});
