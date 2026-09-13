/** Supabase returns this when sign-up is retried for an email that already exists. */

export function isAlreadyRegisteredAuthError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("user already exists") ||
    lower.includes("already been registered") ||
    lower.includes("email address is already") ||
    lower.includes("already on ur") ||
    lower.includes("already collected")
  );
}
