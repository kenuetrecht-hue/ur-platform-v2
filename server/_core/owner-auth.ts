import type { User } from "../../drizzle/schema";
import { ENV } from "./env";

const SUPABASE_OPEN_ID_PREFIX = "supabase:";

function toOwnerSupabaseOpenId(supabaseUserId: string): string {
  return `${SUPABASE_OPEN_ID_PREFIX}${supabaseUserId}`;
}

/** All openIds that identify the platform owner (you). */
export function getOwnerOpenIds(): Set<string> {
  const ids = new Set<string>();

  if (ENV.ownerOpenId) {
    ids.add(ENV.ownerOpenId);
  }

  if (ENV.platformOwnerSupabaseId) {
    ids.add(toOwnerSupabaseOpenId(ENV.platformOwnerSupabaseId));
  }

  return ids;
}

export function isOwnerOpenId(openId: string | null | undefined): boolean {
  if (!openId) return false;
  return getOwnerOpenIds().has(openId);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email || !ENV.platformOwnerEmail) return false;
  return email.toLowerCase().trim() === ENV.platformOwnerEmail.toLowerCase().trim();
}

/** Display name for the platform owner (Kenneth Uetrecht). */
export function getPlatformOwnerDisplayName(): string {
  const configured = ENV.platformOwnerName?.trim();
  if (configured) return configured;
  if (ENV.platformOwnerEmail) {
    const local = ENV.platformOwnerEmail.split("@")[0] ?? "owner";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "Platform Owner";
}

/** True only for the platform owner — not other users, even with admin metadata. */
export function isPlatformOwner(user: Pick<User, "openId" | "email" | "id" | "role"> | null | undefined): boolean {
  if (!user) return false;
  if (isOwnerOpenId(user.openId)) return true;
  if (isOwnerEmail(user.email)) return true;
  // Dev-only in-memory session — must still match owner email
  if (
    !ENV.isProduction &&
    user.id === -1 &&
    user.role === "admin" &&
    isOwnerEmail(user.email)
  ) {
    return true;
  }
  return false;
}

/**
 * Resolve DB role on sign-in. Only the platform owner may be admin.
 * Never trust client-supplied user_metadata.role for elevation.
 */
export function resolveUserRole(
  openId: string,
  email: string | null | undefined,
): "user" | "admin" {
  if (isOwnerOpenId(openId) || isOwnerEmail(email)) {
    return "admin";
  }
  return "user";
}
