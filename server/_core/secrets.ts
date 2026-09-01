/**
 * Server-only secret access. Never import this module from client code.
 * API keys are read directly from process.env — not exposed on the shared ENV object.
 */

const SERVER_ONLY_SECRET_NAMES = [
  "CONTENTMATE_GEMINI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BUILT_IN_FORGE_API_KEY",
  "JWT_SECRET",
  "DATABASE_URL",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_WEBHOOK_SECRET",
  "MUX_SIGNING_KEY_ID",
  "MUX_SIGNING_PRIVATE_KEY",
  "AYRSHARE_API_KEY",
  "AYRSHARE_PROFILE_KEY",
  "BUFFER_ACCESS_TOKEN",
  "BUFFER_FACEBOOK_PROFILE_ID",
  "BUFFER_INSTAGRAM_PROFILE_ID",
  "BUFFER_TWITTER_PROFILE_ID",
  "BUFFER_LINKEDIN_PROFILE_ID",
  "BUFFER_TIKTOK_PROFILE_ID",
  "BUFFER_YOUTUBE_PROFILE_ID",
] as const;

/** Env var prefixes that must never carry API keys or credentials. */
const FORBIDDEN_PUBLIC_PREFIXES = ["EXPO_PUBLIC_", "VITE_"] as const;

/** Patterns that indicate a Gemini / Google AI key in a public env var. */
const PUBLIC_KEY_PATTERNS = [
  /^AQ\.[A-Za-z0-9_-]{20,}$/,
  /^AIza[0-9A-Za-z_-]{20,}$/,
] as const;

function isLikelyApiKey(value: string): boolean {
  const trimmed = value.trim();
  return PUBLIC_KEY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function readServerSecret(name: (typeof SERVER_ONLY_SECRET_NAMES)[number]): string {
  return process.env[name]?.trim() ?? "";
}

/** ContentMate / LinguaMate Gemini key — server-only, never log or return to clients. */
export function getContentmateGeminiApiKey(): string {
  return (
    readServerSecret("CONTENTMATE_GEMINI_API_KEY") ||
    readServerSecret("GEMINI_API_KEY")
  );
}

export function isContentmateGeminiConfigured(): boolean {
  return Boolean(getContentmateGeminiApiKey());
}

export function getMuxTokenId(): string {
  return readServerSecret("MUX_TOKEN_ID");
}

export function getMuxTokenSecret(): string {
  return readServerSecret("MUX_TOKEN_SECRET");
}

export function getMuxWebhookSecret(): string {
  return readServerSecret("MUX_WEBHOOK_SECRET");
}

export function getMuxSigningKeyId(): string {
  return readServerSecret("MUX_SIGNING_KEY_ID");
}

export function getMuxSigningPrivateKey(): string {
  return readServerSecret("MUX_SIGNING_PRIVATE_KEY");
}

export function isMuxVideoConfigured(): boolean {
  return Boolean(getMuxTokenId() && getMuxTokenSecret());
}

export function isMuxSigningConfigured(): boolean {
  return Boolean(getMuxSigningKeyId() && getMuxSigningPrivateKey());
}

export function getAyrshareApiKey(): string {
  return readServerSecret("AYRSHARE_API_KEY");
}

/** Business-plan profile key — unused until that plan is ready. */
export function getAyrshareProfileKey(): string {
  return readServerSecret("AYRSHARE_PROFILE_KEY");
}

export function getBufferAccessToken(): string {
  return readServerSecret("BUFFER_ACCESS_TOKEN");
}

export function getBufferProfileId(
  name:
    | "BUFFER_FACEBOOK_PROFILE_ID"
    | "BUFFER_INSTAGRAM_PROFILE_ID"
    | "BUFFER_TWITTER_PROFILE_ID"
    | "BUFFER_LINKEDIN_PROFILE_ID"
    | "BUFFER_TIKTOK_PROFILE_ID"
    | "BUFFER_YOUTUBE_PROFILE_ID",
): string {
  return readServerSecret(name);
}

/**
 * Fail fast at startup if secrets are misconfigured for client exposure.
 * Call once when the API server boots.
 */
export function assertServerSecretsSafe(): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (!value?.trim()) continue;

    for (const prefix of FORBIDDEN_PUBLIC_PREFIXES) {
      if (!key.startsWith(prefix)) continue;

      const upper = key.toUpperCase();
      if (
        upper.includes("GEMINI") ||
        upper.includes("API_KEY") ||
        upper.includes("SECRET") ||
        upper.includes("SERVICE_ROLE") ||
        upper.includes("CREDENTIALS")
      ) {
        throw new Error(
          `[secrets] "${key}" must not be exposed to the client. ` +
            "Remove the EXPO_PUBLIC_/VITE_ prefix and use a server-only variable instead.",
        );
      }

      if (isLikelyApiKey(value)) {
        throw new Error(
          `[secrets] "${key}" appears to contain an API key. ` +
            "Move it to a server-only env var (no EXPO_PUBLIC_ / VITE_ prefix).",
        );
      }
    }
  }

  // Strip accidental public copies if someone pasted a key into the wrong var
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("EXPO_PUBLIC_") && !key.startsWith("VITE_")) continue;
    const value = process.env[key]?.trim() ?? "";
    if (isLikelyApiKey(value)) {
      delete process.env[key];
      console.warn(
        `[secrets] Removed API key from public env var "${key}". ` +
          "Use CONTENTMATE_GEMINI_API_KEY in .env (server-only).",
      );
    }
  }
}

/** Redact secret-like substrings before logging (defense in depth). */
export function redactSecrets(text: string): string {
  return text
    .replace(/AQ\.[A-Za-z0-9_-]{10,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_GOOGLE_KEY]")
    .replace(
      /(CONTENTMATE_GEMINI_API_KEY|GEMINI_API_KEY|TURNSTILE_SECRET_KEY|MUX_TOKEN_SECRET|MUX_WEBHOOK_SECRET|MUX_SIGNING_PRIVATE_KEY|AYRSHARE_API_KEY|AYRSHARE_PROFILE_KEY|BUFFER_ACCESS_TOKEN)(=|:)\s*["']?[^"'\s]+["']?/gi,
      "$1$2[REDACTED]",
    );
}
