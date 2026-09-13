/** Supabase returns this when the email or password does not match. */

export function isInvalidLoginAuthError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();
  return (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("wrong password") ||
    lower.includes("wrong email or password") ||
    lower.includes("invalid email or password")
  );
}
