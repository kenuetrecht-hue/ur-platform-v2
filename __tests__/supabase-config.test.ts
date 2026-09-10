import { describe, expect, it } from "vitest";
import { isInventedSupabaseProjectUrl } from "../shared/supabase-config";

describe("isInventedSupabaseProjectUrl", () => {
  it("flags the app name glued onto supabase.co", () => {
    expect(isInventedSupabaseProjectUrl("https://ur-platform-v2.supabase.co")).toBe(true);
  });

  it("flags the Railway site and /login", () => {
    expect(
      isInventedSupabaseProjectUrl("https://ur-platform-v2-production.up.railway.app/login"),
    ).toBe(true);
  });

  it("allows a copied Project URL shape", () => {
    expect(isInventedSupabaseProjectUrl("https://abcdefghijklmnopqr.supabase.co")).toBe(false);
  });
});
