/**
 * Custom environment loader that prioritizes system environment variables
 * over .env file values. This ensures that Manus platform-injected variables
 * are not overridden by placeholder values in .env
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  lines.forEach((line) => {
    // Skip comments and empty lines
    if (!line || line.trim().startsWith("#")) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes

      // Only set if not already defined in environment
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Map system variables to Expo public variables
const mappings = {
  VITE_APP_ID: "EXPO_PUBLIC_APP_ID",
  VITE_OAUTH_PORTAL_URL: "EXPO_PUBLIC_OAUTH_PORTAL_URL",
  OAUTH_SERVER_URL: "EXPO_PUBLIC_OAUTH_SERVER_URL",
  OWNER_OPEN_ID: "EXPO_PUBLIC_OWNER_OPEN_ID",
  OWNER_NAME: "EXPO_PUBLIC_OWNER_NAME",
};

for (const [systemVar, expoVar] of Object.entries(mappings)) {
  if (process.env[systemVar] && !process.env[expoVar]) {
    process.env[expoVar] = process.env[systemVar];
  }
}

// Never expose server-only secrets to the Expo client bundle
const SERVER_ONLY_KEYS = [
  "CONTENTMATE_GEMINI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BUILT_IN_FORGE_API_KEY",
  "JWT_SECRET",
  "DATABASE_URL",
];

for (const key of SERVER_ONLY_KEYS) {
  const publicKey = `EXPO_PUBLIC_${key}`;
  if (process.env[publicKey]) {
    delete process.env[publicKey];
    console.warn(
      `[load-env] Removed "${publicKey}" — API keys must use server-only "${key}".`,
    );
  }
}
