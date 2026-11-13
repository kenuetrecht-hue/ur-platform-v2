/**
 * Owner-only website repair. Doctor, Administration, and Security may draft
 * source patches. Nothing is written until the owner types the exact phrase.
 * Paths that hold secrets or owner login rules are refused.
 */

export const APPLY_SITE_PATCH_PHRASE = "APPLY SITE PATCH";

export const OWNER_SITE_ENGINEER_IDS = [
  "platform-doctor-ai",
  "platform-administration-ai",
  "platform-security-ai",
] as const;

export type OwnerSiteEngineerId = (typeof OWNER_SITE_ENGINEER_IDS)[number];

export type SitePatch = {
  path: string;
  content: string;
};

const MAX_PATCHES = 5;
const MAX_PATCH_CHARS = 80_000;

const ALLOWED_PREFIXES = [
  "app/",
  "components/",
  "server/",
  "lib/",
  "scripts/",
  "public/",
  "drizzle/",
  "__tests__/",
];

const ALLOWED_ROOT_FILES = new Set([
  "Dockerfile",
  "railway.json",
  "app.json",
  "package.json",
  "tsconfig.json",
  "metro.config.js",
]);

const DENIED_EXACT = new Set([
  "server/_core/secrets.ts",
  "server/_core/env.ts",
  "server/_core/owner-auth.ts",
  "package.json",
]);

export function isOwnerSiteEngineer(id: string): id is OwnerSiteEngineerId {
  return (OWNER_SITE_ENGINEER_IDS as readonly string[]).includes(id);
}

export function isApplySitePatchCommand(text: string): boolean {
  return text.trim().toUpperCase() === APPLY_SITE_PATCH_PHRASE;
}

/** Owner asking these AIs to change the website. A confirmed planted backdoor is not a repair request. */
export function isOwnerSiteRepairRequest(text: string): boolean {
  if (isApplySitePatchCommand(text)) return true;
  const lower = text.toLowerCase();
  if (
    /found a backdoor|backdoor (was )?(found|detected|confirmed|planted)|unauthorized (admin|route|access) (found|detected|confirmed)/.test(
      lower,
    )
  ) {
    return false;
  }
  return (
    /(fix|repair|rebuild|patch|refactor|debug|code|implement|update).{0,80}(website|site|app|page|screen|bug|error|code|button|banner|api)/.test(
      lower,
    ) || /keep (the )?(website|site) (up|running|functioning)/.test(lower)
  );
}

export function isAllowedRepairPath(input: string): boolean {
  const rel = input.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel || rel.length > 180) return false;
  if (rel.includes("..") || rel.includes("\0")) return false;
  if (rel.startsWith(".") || rel.includes("/.")) return false;
  const lower = rel.toLowerCase();
  if (
    lower.includes(".env") ||
    lower.endsWith(".pem") ||
    lower.endsWith(".key") ||
    lower.includes("secret") ||
    lower.includes("credential") ||
    lower.includes("id_rsa") ||
    lower.includes("node_modules/") ||
    lower.startsWith(".github/") ||
    lower.endsWith("pnpm-lock.yaml")
  ) {
    return false;
  }
  if (DENIED_EXACT.has(rel)) return false;
  if (!/\.(tsx?|jsx?|css|json|sql|md|html)$/.test(rel) && !ALLOWED_ROOT_FILES.has(rel)) {
    return false;
  }
  if (ALLOWED_ROOT_FILES.has(rel)) return rel !== "package.json";
  return ALLOWED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

export function parseSitePatches(reply: string): SitePatch[] {
  const match = reply.match(/```json\s*([\s\S]*?)```/i);
  if (!match?.[1]) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return [];
  }
  const raw = (parsed as { patches?: unknown }).patches;
  if (!Array.isArray(raw)) return [];
  const patches: SitePatch[] = [];
  for (const item of raw.slice(0, MAX_PATCHES)) {
    if (!item || typeof item !== "object") continue;
    const path = "path" in item && typeof item.path === "string" ? item.path.trim() : "";
    const content = "content" in item && typeof item.content === "string" ? item.content : "";
    if (!isAllowedRepairPath(path)) continue;
    if (content.length < 1 || content.length > MAX_PATCH_CHARS) continue;
    patches.push({ path: path.replace(/\\/g, "/").replace(/^\/+/, ""), content });
  }
  return patches;
}

export function repairContextPaths(message: string): string[] {
  const paths: string[] = [];
  const mentioned = message.match(/[A-Za-z0-9_./-]+\.(?:tsx?|jsx?|css|json|sql|md|html)/g) ?? [];
  for (const item of mentioned) {
    if (isAllowedRepairPath(item)) paths.push(item.replace(/\\/g, "/"));
  }
  const lower = message.toLowerCase();
  if (/banner|red alert|emergency|freeze|close/.test(lower)) {
    paths.push("components/owner-emergency-alarm.tsx");
  }
  if (/incident|doctor|health scan/.test(lower)) {
    paths.push("server/_core/platform-ops-service.ts");
  }
  return [...new Set(paths)].slice(0, 2);
}
