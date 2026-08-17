/**
 * Creator content protection — pure helpers (no server imports).
 * Detect duplicate content, impersonation, and reserved platform names.
 */

/** Platform / AI specialist names that cannot be used as creator display names. */
export const RESERVED_CREATOR_NAMES = [
  "ur platform",
  "urplatform",
  "contentmate",
  "linguamate",
  "techbuilder",
  "ur llc",
  "urplatform llc",
  "admin",
  "support",
  "official",
] as const;

export type ContentProtectionBlockReason =
  | "duplicate_content"
  | "near_duplicate_content"
  | "impersonation"
  | "reserved_name"
  | "publish_blocked"
  | "rights_attestation_required"
  | "repost_attribution_required";

/** How the poster claims rights to the content. */
export type ContentRightsMode = "original" | "licensed_repost";

export const CONTENT_LICENSE_TYPES = [
  "creator_permission",
  "platform_public",
  "creative_commons",
  "fair_use",
] as const;

export type ContentLicenseType = (typeof CONTENT_LICENSE_TYPES)[number];

export const CONTENT_LICENSE_LABELS: Record<ContentLicenseType, string> = {
  creator_permission: "Creator gave permission",
  platform_public: "Public UR Platform post",
  creative_commons: "Creative Commons license",
  fair_use: "Fair use / commentary",
};

export function normalizeDisplayName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim()
    .slice(0, 80);
}

export function normalizeContentText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

export function normalizeMediaUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase().slice(0, 2000);
  }
}

/** Word shingles for near-duplicate text detection. */
export function textShingles(text: string, size = 3): Set<string> {
  const words = normalizeContentText(text).split(" ").filter(Boolean);
  const shingles = new Set<string>();
  if (words.length === 0) return shingles;
  if (words.length < size) {
    shingles.add(words.join(" "));
    return shingles;
  }
  for (let i = 0; i <= words.length - size; i++) {
    shingles.add(words.slice(i, i + size).join(" "));
  }
  return shingles;
}

/** Jaccard similarity 0–1 between two texts. */
export function textSimilarity(a: string, b: string): number {
  const sa = textShingles(a);
  const sb = textShingles(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  if (sa.size === 0 || sb.size === 0) return 0;
  let intersection = 0;
  for (const token of sa) {
    if (sb.has(token)) intersection += 1;
  }
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Levenshtein ratio 0–1 (1 = identical). */
export function nameSimilarity(a: string, b: string): number {
  const left = normalizeDisplayName(a);
  const right = normalizeDisplayName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= left.length; i++) matrix[i] = [i];
  for (let j = 0; j <= right.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  const distance = matrix[left.length]![right.length]!;
  const maxLen = Math.max(left.length, right.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export function isReservedCreatorName(displayName: string): boolean {
  const normalized = normalizeDisplayName(displayName);
  if (!normalized) return true;
  return RESERVED_CREATOR_NAMES.some(
    (reserved) => normalized === reserved || normalized.includes(reserved),
  );
}

export type ImpersonationMatch = {
  existingUserId: string;
  existingDisplayName: string;
  similarity: number;
};

export function findImpersonationMatch(
  displayName: string,
  existingCreators: Array<{ userId: string; displayName: string }>,
  excludeUserId?: string,
  threshold = 0.88,
): ImpersonationMatch | null {
  const candidate = displayName.trim();
  if (!candidate || isReservedCreatorName(candidate)) return null;

  let best: ImpersonationMatch | null = null;
  for (const creator of existingCreators) {
    if (excludeUserId && creator.userId === excludeUserId) continue;
    const similarity = nameSimilarity(candidate, creator.displayName);
    if (similarity >= threshold && (!best || similarity > best.similarity)) {
      best = {
        existingUserId: creator.userId,
        existingDisplayName: creator.displayName,
        similarity,
      };
    }
  }
  return best;
}

export function buildContentFingerprintPayload(params: {
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
}): string {
  const parts = [
    normalizeContentText(params.body),
    normalizeMediaUrl(params.imageUrl),
    normalizeMediaUrl(params.videoUrl),
    normalizeMediaUrl(params.linkUrl),
  ].filter(Boolean);
  return parts.join("\n");
}

/** Minimum similarity to block reposted / cloned captions. */
export const NEAR_DUPLICATE_TEXT_THRESHOLD = 0.86;

/** Minimum name similarity to block impersonation at enrollment. */
export const IMPERSONATION_NAME_THRESHOLD = 0.88;

/** Strikes before publish is blocked (DMCA repeat-infringer policy). */
export const PUBLISH_BLOCK_STRIKE_THRESHOLD = 3;

export function validateLicensedRepost(params: {
  attributionSourceName: string;
  attributionSourceUrl?: string;
  licenseType: ContentLicenseType;
}): { ok: true } | { ok: false; message: string } {
  const name = params.attributionSourceName.trim();
  if (name.length < 2) {
    return { ok: false, message: "Credit the original creator or source by name." };
  }

  if (params.attributionSourceUrl?.trim()) {
    try {
      const url = new URL(params.attributionSourceUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) {
        return { ok: false, message: "Source link must use http or https." };
      }
    } catch {
      return { ok: false, message: "Source link must be a valid URL." };
    }
  }

  if (!CONTENT_LICENSE_TYPES.includes(params.licenseType)) {
    return { ok: false, message: "Select how you are allowed to repost this content." };
  }

  return { ok: true };
}

export function buildAttributionCreditLine(params: {
  attributionSourceName: string;
  attributionSourceUrl?: string;
  licenseType: ContentLicenseType;
}): string {
  const credit = `Credit: ${params.attributionSourceName.trim()}`;
  const license = CONTENT_LICENSE_LABELS[params.licenseType];
  const url = params.attributionSourceUrl?.trim();
  return url ? `${credit} · ${license} · ${url}` : `${credit} · ${license}`;
}

/** Append attribution when reposting — skips if credit line already present. */
export function bodyWithAttribution(params: {
  body: string;
  attributionSourceName: string;
  attributionSourceUrl?: string;
  licenseType: ContentLicenseType;
}): string {
  const trimmed = params.body.trim();
  const creditLine = buildAttributionCreditLine(params);
  if (/credit\s*:/i.test(trimmed)) {
    return trimmed.slice(0, 4000);
  }
  if (!trimmed) return creditLine.slice(0, 4000);
  return `${trimmed}\n\n— ${creditLine}`.slice(0, 4000);
}
