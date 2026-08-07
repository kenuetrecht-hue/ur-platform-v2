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

export function toSupabaseOpenId(supabaseUserId: string): string {
  return `${SUPABASE_OPEN_ID_PREFIX}${supabaseUserId}`;
}

export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<SupabaseUser | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[SupabaseAuth] Supabase is not configured on the server");
    return null;
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    console.warn("[SupabaseAuth] Token verification failed:", error?.message);
    return null;
  }

  return user;
}

export async function syncSupabaseUser(
  supabaseUser: SupabaseUser,
): Promise<User | null> {
  const openId = toSupabaseOpenId(supabaseUser.id);
  const signedInAt = new Date();
  const email = supabaseUser.email ?? null;

  // Only the platform owner may receive admin — never trust user_metadata.role
  const role = resolveUserRole(openId, email);

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
