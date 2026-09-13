import type { SupabaseClient } from "@supabase/supabase-js";
import { isInvalidLoginAuthError } from "@/lib/auth-invalid-login";

/**
 * Sign in, then retry once without a captcha token.
 * A leftover Sign up check token makes Supabase say "invalid login credentials"
 * even when the password is right.
 */
export async function signInWithPasswordRetryingCaptcha(
  supabase: SupabaseClient,
  email: string,
  password: string,
  captchaToken: string | undefined,
  withTimeout: <T>(promise: Promise<T>, ms: number, label: string) => Promise<T>,
) {
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const first = await withTimeout(
    supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
      options: captchaToken ? { captchaToken } : undefined,
    }),
    15_000,
    "Login",
  );
  if (!first.error || !captchaToken || !isInvalidLoginAuthError(first.error)) {
    return first;
  }
  return withTimeout(
    supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
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
