/**
 * Individual custom URL for every platform member — affiliates, creators, and users.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { getPlatformPublicOrigin } from "../../lib/platform-urls";

export type UserLinkRole = "member" | "creator" | "affiliate";

export type UserLinkProfile = {
  userId: string;
  slug: string;
  displayName: string;
  userEmail: string;
  role: UserLinkRole;
  customUrl: string;
  createdAt: string;
  updatedAt: string;
};

const linksByUserId = new Map<string, UserLinkProfile>();
const linksBySlug = new Map<string, UserLinkProfile>();

function appBaseUrl(): string {
  return getPlatformPublicOrigin();
}

function slugify(displayName: string, email: string): string {
  const fromName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const fromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 12) ?? "user";
  const base = fromName.length >= 3 ? fromName : fromEmail;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function uniqueSlug(displayName: string, email: string): string {
  let slug = slugify(displayName, email);
  let attempts = 0;
  while (linksBySlug.has(slug) && attempts < 20) {
    slug = slugify(displayName, email);
    attempts += 1;
  }
  if (linksBySlug.has(slug)) {
    slug = `ur-${randomUUID().slice(0, 8)}`;
  }
  return slug;
}

export function buildCustomUrl(slug: string): string {
  return `${appBaseUrl()}/link/${encodeURIComponent(slug)}`;
}

export function buildSignupUrlFromSlug(slug: string, role: "creator" | "affiliate" = "creator"): string {
  return `${appBaseUrl()}/signup?ref=${encodeURIComponent(slug)}&role=${role}`;
}

export function getOrCreateUserLink(params: {
  userId: string;
  userEmail: string;
  displayName: string;
  role?: UserLinkRole;
}): UserLinkProfile {
  const existing = linksByUserId.get(params.userId);
  if (existing) {
    if (params.role && params.role !== "member" && existing.role === "member") {
      existing.role = params.role;
      existing.updatedAt = new Date().toISOString();
      linksByUserId.set(params.userId, existing);
      linksBySlug.set(existing.slug, existing);
    }
    return existing;
  }

  const slug = uniqueSlug(params.displayName, params.userEmail);
  const profile: UserLinkProfile = {
    userId: params.userId,
    slug,
    displayName: params.displayName,
    userEmail: params.userEmail.toLowerCase().trim(),
    role: params.role ?? "member",
    customUrl: buildCustomUrl(slug),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  linksByUserId.set(params.userId, profile);
  linksBySlug.set(slug, profile);
  return profile;
}

export function getUserLink(userId: string): UserLinkProfile | null {
  return linksByUserId.get(userId) ?? null;
}

export function resolveUserLink(slug: string): UserLinkProfile | null {
  const key = slug.trim().toLowerCase();
  for (const [stored, profile] of linksBySlug.entries()) {
    if (stored.toLowerCase() === key) return profile;
  }
  return null;
}

export function setUserLinkRole(userId: string, role: UserLinkRole): UserLinkProfile {
  const link = linksByUserId.get(userId);
  if (!link) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User link not found." });
  }
  link.role = role;
  link.updatedAt = new Date().toISOString();
  linksByUserId.set(userId, link);
  linksBySlug.set(link.slug, link);
  return link;
}

export function resolvePublicLink(slug: string) {
  const profile = resolveUserLink(slug);
  if (!profile) return null;

  const redirectPath =
    profile.role === "affiliate"
      ? "/signup"
      : profile.role === "creator"
        ? "/creator-dashboard"
        : "/(tabs)";

  const signupParams =
    profile.role === "affiliate" || profile.role === "creator"
      ? { ref: profile.slug, role: "creator" as const }
      : undefined;

  return {
    userId: profile.userId,
    slug: profile.slug,
    displayName: profile.displayName,
    role: profile.role,
    customUrl: profile.customUrl,
    signupUrl: buildSignupUrlFromSlug(profile.slug),
    redirectPath,
    signupParams,
    shareMessage:
      profile.role === "affiliate"
        ? `Join UR Platform as a content creator: ${buildSignupUrlFromSlug(profile.slug)}`
        : profile.role === "creator"
          ? `Book a live class with me on UR Platform: ${profile.customUrl}`
          : `Join me on UR Platform: ${profile.customUrl}`,
  };
}

export function listAllUserLinks(): UserLinkProfile[] {
  return [...linksByUserId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
