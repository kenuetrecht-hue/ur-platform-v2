/**
 * Client-side owner hints — NEVER used for authorization.
 * All access decisions are made server-side via platformOps.checkAccess.
 */
export const PLATFORM_OWNER_NAME =
  process.env.EXPO_PUBLIC_PLATFORM_OWNER_NAME ?? "Platform Owner";
