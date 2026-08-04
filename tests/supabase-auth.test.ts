import { describe, expect, it } from "vitest";
import { toSupabaseOpenId } from "../server/supabase-auth";

describe("supabase-auth", () => {
  it("maps Supabase user ids to stable openId values", () => {
    expect(toSupabaseOpenId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "supabase:550e8400-e29b-41d4-a716-446655440000",
    );
  });
});
