import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sign in with email and password only.
 * Never send a Turnstile / Sign up check token to Supabase — that makes
 * Supabase say "invalid login credentials" even when the password is right.
 * Our server already checks Turnstile before this runs.
 */
export async function signInWithPasswordRetryingCaptcha(
  supabase: SupabaseClient,
  email: string,
  password: string,
  _captchaToken: string | undefined,
  withTimeout: <T>(promise: Promise<T>, ms: number, label: string) => Promise<T>,
) {
  return withTimeout(
    supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    }),
    15_000,
    "Login",
  );
}

export function passwordResetRedirectUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/new-password`;
  }
  return "/new-password";
}
