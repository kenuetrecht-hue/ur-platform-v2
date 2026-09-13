/** Only wipe a saved sign-in when the service says the tokens are dead. */

export function isUnrecoverableSessionError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();
  return (
    (lower.includes("refresh token") &&
      (lower.includes("not found") || lower.includes("invalid") || lower.includes("expired"))) ||
    lower.includes("session_not_found")
  );
}

export function shouldClearStoredSessionAfterRestore(params: {
  unrecoverable: boolean;
}): boolean {
  return params.unrecoverable;
}
