import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { persistJoinPassword } from "../lib/persist-join-password";

function fakeSupabase(params: {
  currentEmail?: string | null;
  signUp?: { user?: { id: string }; session?: { access_token: string } | null; error?: Error | null };
  signIn?: { session?: { access_token: string } | null; error?: Error | null };
}) {
  const updateUser = vi.fn(async () => ({ error: null }));
  const signOut = vi.fn(async () => ({ error: null }));
  const signUp = vi.fn(async () => ({
    data: {
      user: params.signUp?.user ?? { id: "new" },
      session: params.signUp?.session === undefined ? { access_token: "s" } : params.signUp.session,
    },
    error: params.signUp?.error ?? null,
  }));
  const signInWithPassword = vi.fn(async () => ({
    data: { session: params.signIn?.session ?? { access_token: "s" } },
    error: params.signIn?.error ?? null,
  }));
  return {
    auth: {
      getUser: async () => ({
        data: { user: params.currentEmail ? { email: params.currentEmail } : null },
      }),
      updateUser,
      signOut,
      signUp,
      signInWithPassword,
    },
    updateUser,
    signOut,
    signUp,
    signInWithPassword,
  };
}

describe("persist join password", () => {
  it("saves the typed password when that email is already signed in", async () => {
    const supabase = fakeSupabase({ currentEmail: "ken@example.com" });
    const result = await persistJoinPassword({
      supabase: supabase as never,
      email: "ken@example.com",
      password: "brand-new-pass",
      name: "Ken",
    });
    expect(result).toEqual({ status: "ready" });
    expect(supabase.updateUser).toHaveBeenCalledWith({
      password: "brand-new-pass",
      data: { name: "Ken" },
    });
    expect(supabase.signUp).not.toHaveBeenCalled();
  });

  it("creates the account when nobody is signed in", async () => {
    const supabase = fakeSupabase({ currentEmail: null });
    const result = await persistJoinPassword({
      supabase: supabase as never,
      email: "new@example.com",
      password: "secret12",
      name: "Pat",
    });
    expect(result).toEqual({ status: "ready" });
    expect(supabase.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret12",
      options: { data: { name: "Pat", role: "creator" } },
    });
  });

  it("signs out a leftover different email, then creates the new account", async () => {
    const supabase = fakeSupabase({ currentEmail: "old@example.com" });
    const result = await persistJoinPassword({
      supabase: supabase as never,
      email: "new@example.com",
      password: "secret12",
      name: "Pat",
    });
    expect(result).toEqual({ status: "ready" });
    expect(supabase.signOut).toHaveBeenCalled();
    expect(supabase.signUp).toHaveBeenCalled();
  });

  it("creates the account when a leftover session cannot save the password", async () => {
    const supabase = fakeSupabase({ currentEmail: "ken@example.com" });
    supabase.updateUser.mockResolvedValueOnce({ error: new Error("User not found") });
    const result = await persistJoinPassword({
      supabase: supabase as never,
      email: "ken@example.com",
      password: "secret12",
      name: "Ken",
    });
    expect(result).toEqual({ status: "ready" });
    expect(supabase.signOut).toHaveBeenCalled();
    expect(supabase.signUp).toHaveBeenCalled();
  });

  it("does not send a Turnstile token to Sign up", () => {
    const register = readFileSync("lib/auth-context.tsx", "utf8");
    const persist = readFileSync("lib/persist-join-password.ts", "utf8");
    const hook = readFileSync("hooks/use-enter-app-after-pictures.ts", "utf8");
    expect(register).not.toContain("captchaToken } : {}");
    expect(persist).toContain("Never send a Turnstile");
    expect(hook).toContain("persistJoinPassword");
    expect(hook).not.toContain("if (!signedIn && nameValue");
    expect(readFileSync("components/finish-account-after-id-pass.tsx", "utf8")).toContain(
      "persistJoinPassword",
    );
  });
});
