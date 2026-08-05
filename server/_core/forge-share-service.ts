/**
 * Ephemeral share links — read-only project preview (competitive with Replit sharing).
 */

import { randomUUID } from "crypto";
import type { SandboxProject } from "./coder-sandbox-service";
import { buildSandboxPreview } from "./forge-preview-service";

export type ShareLink = {
  token: string;
  ownerUserId: string;
  projectName: string;
  expiresAt: string;
  viewCount: number;
  readOnly: true;
};

const SHARE_TTL_MS = 24 * 60 * 60 * 1000;
const links = new Map<string, ShareLink & { projectSnapshot: SandboxProject }>();

export function createShareLink(params: {
  userId: string;
  project: SandboxProject;
}): { token: string; expiresAt: string; sharePath: string } {
  const token = randomUUID().replace(/-/g, "").slice(0, 24);
  const expiresAt = new Date(Date.now() + SHARE_TTL_MS).toISOString();
  links.set(token, {
    token,
    ownerUserId: params.userId,
    projectName: params.project.name,
    expiresAt,
    viewCount: 0,
    readOnly: true,
    projectSnapshot: structuredClone(params.project),
  });
  return {
    token,
    expiresAt,
    sharePath: `/api/forge/share/${token}`,
  };
}

export function getSharePreview(token: string): {
  projectName: string;
  preview: ReturnType<typeof buildSandboxPreview>;
  expiresAt: string;
} | null {
  const link = links.get(token);
  if (!link || Date.parse(link.expiresAt) <= Date.now()) {
    links.delete(token);
    return null;
  }
  link.viewCount += 1;
  return {
    projectName: link.projectName,
    preview: buildSandboxPreview(link.projectSnapshot),
    expiresAt: link.expiresAt,
  };
}

export function revokeShareLink(userId: string, token: string): boolean {
  const link = links.get(token);
  if (!link || link.ownerUserId !== userId) return false;
  links.delete(token);
  return true;
}

export function sweepExpiredShareLinks(): number {
  const now = Date.now();
  let n = 0;
  for (const [token, link] of links) {
    if (Date.parse(link.expiresAt) <= now) {
      links.delete(token);
      n += 1;
    }
  }
  return n;
}
