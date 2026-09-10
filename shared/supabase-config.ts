/**
 * Shared Supabase project config — used by Expo client and Express server.
 * Supabase access tokens are ES256 JWTs; verify via supabase.auth.getUser(), not HS256 JWT_SECRET.
 */
export const DEFAULT_SUPABASE_URL = "https://nqwxefkhidmreilwirro.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_fkKZZ1mwk4qbr9puiyaMWw_0Mbh9mla";

function looksLikePlaceholder(url: string, key: string): boolean {
  return (
    !url ||
    !key ||
    url.includes("placeholder") ||
    url.includes("your-project") ||
    key.includes("your-supabase") ||
    key === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
  );
}

/** True when the value is the app/Railway name, not a copied Supabase Project URL. */
export function isInventedSupabaseProjectUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  if (!lower) return false;
  return (
    lower.includes("railway") ||
    lower.includes("ur-platform") ||
    lower.includes("/login") ||
    lower.includes("your-project")
  );
}

/** Shown when the auth project URL does not resolve (paused, deleted, or unset). */
export function supabaseUnreachableHint(): string {
  const configured = (
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ""
  ).trim();
  if (isInventedSupabaseProjectUrl(configured)) {
    return (
      "Cannot reach the sign-in service. EXPO_PUBLIC_SUPABASE_URL is still a name you typed " +
      "(ur-platform or railway). That is not the Project URL. Open supabase.com/dashboard → " +
      "your project → Settings → API → Copy Project URL and paste it on EXPO_PUBLIC_SUPABASE_URL. " +
      "It looks like https:// plus a random word plus .supabase.co — not ur-platform-v2."
    );
  }
  if (process.env.NODE_ENV === "production") {
    return (
      "Cannot reach the sign-in service. In Railway → Variables, set EXPO_PUBLIC_SUPABASE_URL " +
      "and EXPO_PUBLIC_SUPABASE_ANON_KEY from supabase.com/dashboard (Settings → API), then Redeploy."
    );
  }
  return (
    "Cannot reach the sign-in service. Create a Supabase project at supabase.com/dashboard " +
    "and put the Project URL and anon key in .env, then restart pnpm dev:web."
  );
}

/** Client + server public config (URL + anon key). */
export function resolveSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  ).trim();

  if (looksLikePlaceholder(url, anonKey)) {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }

  return { url, anonKey };
}

/** Server auth: prefer service role, fall back to anon (works with auth.getUser). */
export function resolveSupabaseServerKey(): string {
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (service && !service.includes("your-supabase")) {
    return service;
  }
  return resolveSupabasePublicConfig().anonKey;
}

export function peekJwtAlgorithm(token: string): string | null {
  try {
    const segment = token.split(".")[0];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const header = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as {
      alg?: string;
    };
    return typeof header.alg === "string" ? header.alg : null;
  } catch {
    return null;
  }
}

/** True when token is a Supabase-issued access JWT (ES256/RS256), not our HS256 app session. */
export function isLikelySupabaseAccessToken(token: string): boolean {
  const alg = peekJwtAlgorithm(token);
  if (alg === "ES256" || alg === "RS256") return true;
  if (alg === "HS256") return false;
  try {
    const segment = token.split(".")[1];
    if (!segment) return false;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as {
      iss?: string;
    };
    return typeof payload.iss === "string" && payload.iss.includes("supabase");
  } catch {
    return false;
  }
}
