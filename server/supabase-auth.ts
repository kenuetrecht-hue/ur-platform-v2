import { createClient, type SupabaseClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { resolveUserRole, isOwnerEmail, getPlatformOwnerDisplayName } from "./_core/owner-auth";
import {
  resolveSupabasePublicConfig,
  resolveSupabaseServerKey,
} from "../shared/supabase-config";

const SUPABASE_OPEN_ID_PREFIX = "supabase:";

let supabaseClient: SupabaseClient | null = null;
let lastSupabaseAuthLogMs = 0;

function logSupabaseAuthOnce(message: string): void {
  const now = Date.now();
  if (now - lastSupabaseAuthLogMs < 30_000) return;
  lastSupabaseAuthLogMs = now;
  console.warn("[SupabaseAuth]", message);
}

function getSupabaseClient(): SupabaseClient | null {
  const { url } = resolveSupabasePublicConfig();
  const key = resolveSupabaseServerKey();

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

export function isSupabaseConfiguredOnServer(): boolean {
  return getSupabaseClient() !== null;
}

let supabaseReachableCache: { at: number; reachable: boolean } | null = null;
const SUPABASE_REACHABLE_TTL_MS = 30_000;

/** Cached probe — login UI uses this so "Failed to fetch" is explained before submit. */
export async function isSupabaseAuthReachable(): Promise<boolean> {
  const now = Date.now();
  if (supabaseReachableCache && now - supabaseReachableCache.at < SUPABASE_REACHABLE_TTL_MS) {
    return supabaseReachableCache.reachable;
  }

  const { url } = resolveSupabasePublicConfig();
  if (!url) {
    supabaseReachableCache = { at: now, reachable: false };
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    const reachable = res.ok || res.status === 401 || res.status === 403;
    supabaseReachableCache = { at: now, reachable };
    return reachable;
  } catch {
    supabaseReachableCache = { at: now, reachable: false };
    return false;
  }
}

export function toSupabaseOpenId(supabaseUserId: string): string {
  return `${SUPABASE_OPEN_ID_PREFIX}${supabaseUserId}`;
}

export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<SupabaseUser | null> {
  const client = getSupabaseClient();
  if (!client) {
    logSupabaseAuthOnce("Supabase is not configured on the server");
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser(accessToken);

    if (error || !user) {
      const msg = error?.message ?? "unknown error";
      if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
        logSupabaseAuthOnce(
          "Cannot reach Supabase — check EXPO_PUBLIC_SUPABASE_URL in .env (project may be deleted or DNS offline).",
        );
      } else {
        logSupabaseAuthOnce(`Token verification failed: ${msg}`);
      }
      return null;
    }

    return user;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
      logSupabaseAuthOnce(
        "Cannot reach Supabase — check EXPO_PUBLIC_SUPABASE_URL in .env (project may be deleted or DNS offline).",
      );
    } else {
      logSupabaseAuthOnce(`Token verification failed: ${msg}`);
    }
    return null;
  }
}

export async function syncSupabaseUser(
  supabaseUser: SupabaseUser,
): Promise<User | null> {
  const openId = toSupabaseOpenId(supabaseUser.id);
  const signedInAt = new Date();
  const email = supabaseUser.email ?? null;

  // Only the platform owner may receive admin — never trust user_metadata.role
  const role = resolveUserRole(openId, email);

  const existing = await db.getUserByOpenId(openId);

  await db.upsertUser({
    openId,
    name: isOwnerEmail(email)
      ? getPlatformOwnerDisplayName()
      : supabaseUser.user_metadata?.name ??
        supabaseUser.email?.split("@")[0] ??
        null,
    email,
    loginMethod: "supabase",
    role,
    lastSignedIn: signedInAt,
  });

  const user = await db.getUserByOpenId(openId);
  if (!user) {
    console.error("[SupabaseAuth] User sync failed for openId:", openId);
    return null;
  }

  const { registerSocialUser, ensureOwnerWelcomeFriendship } = await import(
    "./_core/social-service"
  );
  registerSocialUser({
    userId: String(user.id),
    email: user.email ?? "",
    displayName: user.name ?? "User",
  });
  if (!existing && !isOwnerEmail(email)) {
    await ensureOwnerWelcomeFriendship({
      userId: String(user.id),
      email: user.email ?? "",
      displayName: user.name ?? "User",
    });
  }

  return user;
}

export async function authenticateSupabaseToken(
  accessToken: string,
): Promise<User | null> {
  const supabaseUser = await verifySupabaseAccessToken(accessToken);
  if (!supabaseUser) {
    return null;
  }

  return syncSupabaseUser(supabaseUser);
}
