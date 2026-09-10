import { randomBytes } from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PLATFORM_OWNER_LOGIN_EMAIL } from "../../lib/platform-terms-of-use";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

// Always load ur-platform-v2/.env regardless of shell cwd (e.g. running from app/)
dotenv.config({ path: path.join(projectRoot, ".env") });

/** Env wins; otherwise the public UR Gmail is the owner login. */
export function resolvePlatformOwnerEmail(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? "";
  return trimmed || PLATFORM_OWNER_LOGIN_EMAIL;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  /** Supabase auth user UUID for platform owner (without supabase: prefix) */
  platformOwnerSupabaseId: process.env.PLATFORM_OWNER_SUPABASE_ID ?? "",
  /** Platform owner email — only this account gets admin elevation */
  platformOwnerEmail: resolvePlatformOwnerEmail(process.env.PLATFORM_OWNER_EMAIL),
  /** Platform owner display name */
  platformOwnerName: process.env.PLATFORM_OWNER_NAME ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  supabaseUrl:
    process.env.SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "",
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  /** Google Cloud Vertex AI — server-only. Auth via GOOGLE_APPLICATION_CREDENTIALS. */
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
  googleGeminiModel:
    process.env.GOOGLE_GEMINI_MODEL ?? "gemini-3.6-flash",
  googleImagenModel:
    process.env.GOOGLE_IMAGEN_MODEL ?? "imagen-3.0-generate-002",
  /** Max minutes a forge cloud workspace may live before automatic wipe */
  forgeSessionTtlMinutes: parseInt(process.env.FORGE_SESSION_TTL_MINUTES ?? "30", 10),
  /** Optional server GitHub PAT for forge repo sync */
  githubToken: process.env.GITHUB_TOKEN ?? "",
};

export function isOwnerEmailConfigured(): boolean {
  return Boolean(
    ENV.platformOwnerEmail.trim() || ENV.platformOwnerSupabaseId.trim(),
  );
}

export function isWeakJwtSecret(jwt: string): boolean {
  const trimmed = jwt.trim();
  return (
    !trimmed ||
    trimmed.length < 32 ||
    /dev-jwt|change-in-production|your-jwt-secret|your-super-secret/i.test(trimmed)
  );
}

/** Manus cookie sessions need a stable secret. Supabase sign-in does not. */
export function manusOAuthIsConfigured(oAuthServerUrl = ENV.oAuthServerUrl): boolean {
  return Boolean(oAuthServerUrl.trim());
}

/** Fail closed in production if owner identity is not configured. */
export function assertProductionOwnerSecurity(): void {
  if (!ENV.isProduction) return;
  if (!isOwnerEmailConfigured()) {
    console.error(
      "[Security] FATAL: PLATFORM_OWNER_EMAIL or PLATFORM_OWNER_SUPABASE_ID must be set in production.",
    );
    process.exit(1);
  }
  if (!isWeakJwtSecret(ENV.cookieSecret)) return;

  if (manusOAuthIsConfigured()) {
    console.error(
      "[Security] FATAL: JWT_SECRET must be a unique production secret (32+ characters), not the development placeholder.",
    );
    process.exit(1);
  }

  const generated = randomBytes(48).toString("base64url");
  ENV.cookieSecret = generated;
  process.env.JWT_SECRET = generated;
  console.warn(
    "[Security] JWT_SECRET was missing. Generated a one-boot secret. Sign-in still uses Supabase. Set JWT_SECRET on Railway if you want the same secret after restart.",
  );
}
