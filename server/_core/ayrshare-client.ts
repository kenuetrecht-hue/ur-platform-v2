/**
 * Ayrshare personal / Premium posting (single linked profile).
 * Business multi-user Profile-Key is optional and unused until that plan is ready.
 *
 * Use api.ayrshare.com. app.ayrshare.com answers with an HTML page, which
 * shows up as "DOCTYPE is not valid JSON".
 */

import { getAyrshareApiKey, getAyrshareProfileKey } from "./secrets";
import { InternalServiceError } from "./service-errors";
import type { SocialNetwork } from "../../lib/social-publisher-types";

const AYRSHARE_API_ROOT = "https://api.ayrshare.com/api";
const AYRSHARE_TIMEOUT_MS = 18_000;

const HTML_REPLY = "Ayrshare sent a web page instead of a result. Try Post now again.";
const UNREADABLE_REPLY = "Ayrshare sent a result this site could not read. Try Post now again.";
const SLOW_REPLY = "Ayrshare took too long. Try Post now again.";
const UNREACHABLE_REPLY = "Ayrshare could not be reached. Try Post now again.";
const KEY_REPLY = "Ayrshare rejected the key. Check AYRSHARE_API_KEY on the server.";
const BUSY_REPLY = "Ayrshare is busy. Wait a minute and try Post now again.";
const FAILED_REPLY = "Ayrshare could not send that post. Check the key and linked accounts.";

export function isAyrshareConfigured(): boolean {
  return Boolean(getAyrshareApiKey());
}

function ayrshareHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const profileKey = getAyrshareProfileKey();
  if (profileKey) headers["Profile-Key"] = profileKey;
  return headers;
}

async function ayrshareFetch(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  try {
    return await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(AYRSHARE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof InternalServiceError) throw error;
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new InternalServiceError("UPSTREAM_FAILED", SLOW_REPLY);
    }
    throw new InternalServiceError("UPSTREAM_FAILED", UNREACHABLE_REPLY);
  }
}

async function readAyrshareJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<") || /<!doctype/i.test(trimmed.slice(0, 80))) {
    throw new InternalServiceError("UPSTREAM_FAILED", HTML_REPLY);
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new InternalServiceError("UPSTREAM_FAILED", UNREADABLE_REPLY);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InternalServiceError) throw error;
    throw new InternalServiceError("UPSTREAM_FAILED", UNREADABLE_REPLY);
  }
}

function ownerSafeAyrshareDetail(json: Record<string, unknown>): string | null {
  const errors = Array.isArray(json.errors) ? json.errors : [];
  for (const row of errors) {
    if (!row || typeof row !== "object") continue;
    const message = (row as { message?: unknown }).message;
    const platform = (row as { platform?: unknown }).platform;
    if (typeof message !== "string" || !message.trim()) continue;
    const text = message.replace(/\s+/g, " ").trim().slice(0, 220);
    if (/<|>|doctype|not valid json|unexpected token/i.test(text)) continue;
    return typeof platform === "string" && platform.trim() ? `${platform.trim()}: ${text}` : text;
  }
  if (typeof json.message === "string") {
    const text = json.message.replace(/\s+/g, " ").trim().slice(0, 220);
    if (text && !/<|>|doctype|not valid json|unexpected token/i.test(text)) return text;
  }
  return null;
}

export async function listAyrshareLinkedNetworks(
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const apiKey = getAyrshareApiKey();
  if (!apiKey) return [];
  try {
    const response = await ayrshareFetch(
      `${AYRSHARE_API_ROOT}/user`,
      { headers: ayrshareHeaders(apiKey) },
      fetchImpl,
    );
    if (!response.ok) return [];
    const json = await readAyrshareJson(response);
    const fromActive = Array.isArray(json.activeSocialAccounts)
      ? json.activeSocialAccounts.filter((name): name is string => typeof name === "string")
      : [];
    const fromNames = Array.isArray(json.displayNames)
      ? json.displayNames
          .map((row) =>
            row && typeof row === "object" && typeof (row as { platform?: unknown }).platform === "string"
              ? (row as { platform: string }).platform
              : "",
          )
          .filter(Boolean)
      : [];
    return [...fromActive, ...fromNames].map((name) => name.trim().toLowerCase()).filter(Boolean);
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
  if (!apiKey) throw new InternalServiceError("NOT_CONFIGURED", FAILED_REPLY);

  const payload: Record<string, unknown> = {
    post: params.body,
    platforms: params.platforms,
  };
  if (params.scheduledAt) {
    payload.scheduleDate = params.scheduledAt.toISOString();
  }

  const fetchImpl = params.fetchImpl ?? fetch;
  const response = await ayrshareFetch(
    `${AYRSHARE_API_ROOT}/post`,
    {
      method: "POST",
      headers: ayrshareHeaders(apiKey),
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );

  if (response.status === 401 || response.status === 403) {
    throw new InternalServiceError("UPSTREAM_FAILED", KEY_REPLY);
  }
  if (response.status === 429) {
    throw new InternalServiceError("UPSTREAM_FAILED", BUSY_REPLY);
  }

  const json = await readAyrshareJson(response);
  if (!response.ok || json.status === "error") {
    throw new InternalServiceError("UPSTREAM_FAILED", ownerSafeAyrshareDetail(json) ?? FAILED_REPLY);
  }

  const postIds = json.postIds;
  const fromList = Array.isArray(postIds)
    ? postIds.find((row) => row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string")
    : undefined;
  const fromListId =
    fromList && typeof fromList === "object" ? (fromList as { id?: string }).id : undefined;
  const fromMap =
    postIds && typeof postIds === "object" && !Array.isArray(postIds)
      ? Object.values(postIds as Record<string, unknown>).find((value) => typeof value === "string")
      : undefined;
  const id = typeof json.id === "string" ? json.id : fromListId ?? (typeof fromMap === "string" ? fromMap : null);
  return { id };
}
