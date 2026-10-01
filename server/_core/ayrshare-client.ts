/**
 * Ayrshare personal / Premium posting (single linked profile).
 * Business multi-user Profile-Key is optional and unused until that plan is ready.
 */

import { getAyrshareApiKey, getAyrshareProfileKey } from "./secrets";
import { InternalServiceError } from "./service-errors";
import type { SocialNetwork } from "../../lib/social-publisher-types";

const AYRSHARE_POST_URL = "https://app.ayrshare.com/api/post";

export function isAyrshareConfigured(): boolean {
  return Boolean(getAyrshareApiKey());
}

export async function listAyrshareLinkedNetworks(
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const apiKey = getAyrshareApiKey();
  if (!apiKey) return [];
  try {
    const response = await fetchImpl("https://app.ayrshare.com/api/user", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return [];
    const json = (await response.json()) as {
      displayNames?: Array<{ platform?: string }>;
    };
    return (json.displayNames ?? [])
      .map((row) => row.platform?.trim().toLowerCase() ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function postViaAyrshare(params: {
  body: string;
  platforms: SocialNetwork[];
  scheduledAt?: Date;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string | null }> {
  const apiKey = getAyrshareApiKey();
  if (!apiKey) throw new InternalServiceError("NOT_CONFIGURED");

  const payload: Record<string, unknown> = {
    post: params.body,
    platforms: params.platforms,
  };
  if (params.scheduledAt) {
    payload.scheduleDate = params.scheduledAt.toISOString();
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const profileKey = getAyrshareProfileKey();
  if (profileKey) headers["Profile-Key"] = profileKey;

  const fetchImpl = params.fetchImpl ?? fetch;
  const response = await fetchImpl(AYRSHARE_POST_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: { status?: string; id?: string; message?: string; postIds?: Record<string, string> | Array<{ id?: string }> } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    json = {};
  }

  if (!response.ok || json.status === "error") {
    if (response.status === 401 || response.status === 403) {
      throw new InternalServiceError("INVALID_API_KEY");
    }
    if (response.status === 429) throw new InternalServiceError("RATE_LIMITED");
    throw new InternalServiceError("UPSTREAM_FAILED");
  }

  const fromList = Array.isArray(json.postIds) ? json.postIds.find((row) => row.id)?.id : undefined;
  const fromMap = json.postIds && !Array.isArray(json.postIds) ? Object.values(json.postIds)[0] : undefined;
  return { id: json.id ?? fromList ?? fromMap ?? null };
}
