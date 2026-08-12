/**
 * Canonical public URLs for UR Platform (web, app handoff, affiliate links).
 * Override in production with EXPO_PUBLIC_APP_URL / APP_URL in .env.
 */
export const PLATFORM_PUBLIC_ORIGIN = "https://urplatform.llc";

export function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Public site origin — env override, then production default. */
export function getPlatformPublicOrigin(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);
  return PLATFORM_PUBLIC_ORIGIN;
}

/** Build absolute URL on the public site (e.g. /signup?ref=CODE). */
export function buildPlatformPublicUrl(path: string): string {
  const base = getPlatformPublicOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
