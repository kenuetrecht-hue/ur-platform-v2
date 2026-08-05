import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import {
  isOwnerEmail,
  isOwnerOpenId,
  getPlatformOwnerDisplayName,
  resolveUserRole,
} from "./owner-auth";
import { toSupabaseOpenId } from "../supabase-auth";

type JwtPayload = {
  sub?: string;
  email?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function getBearerToken(req: CreateExpressContextOptions["req"]): string | undefined {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return undefined;
}

/**
 * Dev-only fallback when Supabase getUser() fails.
 * SECURITY: disabled in production; requires PLATFORM_OWNER_EMAIL; never grants when unset.
 * JWT is decoded without signature verify — dev convenience only when Supabase is unreachable.
 */
export async function resolveDevOwnerFromRequest(
  req: CreateExpressContextOptions["req"],
): Promise<User | null> {
  if (ENV.isProduction) return null;

  const ownerConfigured = Boolean(ENV.platformOwnerEmail?.trim());
  if (!ownerConfigured) {
    return null;
  }

  const token = getBearerToken(req);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return null;

  const email = payload.email ?? null;
  const openId = toSupabaseOpenId(payload.sub);
  const emailMatchesOwner = isOwnerEmail(email) || isOwnerOpenId(openId);

  if (!emailMatchesOwner) {
    return null;
  }

  const role = resolveUserRole(openId, email);
  const signedInAt = new Date();

  try {
    await db.upsertUser({
      openId,
      email,
      name: getPlatformOwnerDisplayName(),
      loginMethod: "supabase",
      role,
      lastSignedIn: signedInAt,
    });
  } catch {
    console.warn("[Auth] DB upsert failed — continuing with dev owner session");
  }

  const user = await db.getUserByOpenId(openId);
  if (user) {
    return user;
  }

  const now = new Date();
  return {
    id: -1,
    openId,
    email,
    name: getPlatformOwnerDisplayName(),
    loginMethod: "supabase",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}
