/**
 * GameForge security — scan uploads & block tampering / abuse in game dev sandbox.
 */

import { TRPCError } from "@trpc/server";

const FORBIDDEN_CODE_PATTERNS: RegExp[] = [
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/i,
  /child_process|exec\s*\(|spawn\s*\(/i,
  /require\s*\(\s*['"]fs['"]\s*\)/i,
  /process\.env/i,
  /document\.cookie/i,
  /localStorage\.setItem/i,
  /cheat\s*engine|memory\s*scan|inject\s*dll/i,
  /bypass.*drm|crack.*game|pirate/i,
  /keylogger|cryptominer|coinhive/i,
  /reverse\s*shell|bind\s*shell/i,
];

const FORBIDDEN_PATH_PATTERNS: RegExp[] = [
  /\.\.\//,
  /^\/etc\//i,
  /\.exe$/i,
  /\.dll$/i,
  /\.bat$/i,
];

export type GameSecurityScanResult = {
  safe: boolean;
  issues: string[];
  warnings: string[];
};

export const GAME_FORGE_CREATOR_ID = "ai-game-dev-001";

export function isGameForgeCreator(creatorId: string): boolean {
  return creatorId === GAME_FORGE_CREATOR_ID;
}

export function scanGameSandboxPath(path: string): GameSecurityScanResult {
  const issues: string[] = [];
  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (pattern.test(path)) issues.push(`Blocked path: ${path}`);
  }
  return { safe: issues.length === 0, issues, warnings: [] };
}

export function scanGameSandboxContent(content: string, path: string): GameSecurityScanResult {
  const pathScan = scanGameSandboxPath(path);
  if (!pathScan.safe) return pathScan;

  const issues: string[] = [];
  const warnings: string[] = [];

  if (content.length > 5_000_000) issues.push("File exceeds maximum safe size.");

  for (const pattern of FORBIDDEN_CODE_PATTERNS) {
    if (pattern.test(content)) {
      issues.push(`Blocked content in ${path}`);
    }
  }

  if (/password\s*=\s*['"][^'"]+['"]/i.test(content)) {
    warnings.push(`${path}: avoid hardcoded secrets in game builds.`);
  }

  return { safe: issues.length === 0, issues, warnings };
}

export function assertGameSandboxFileSecure(path: string, content: string): void {
  const result = scanGameSandboxContent(content, path);
  if (!result.safe) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Security block: ${result.issues[0] ?? "unsafe content"}. GameForge sandbox is protected against tampering.`,
    });
  }
}
