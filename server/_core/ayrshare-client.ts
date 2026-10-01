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

export type AyrshareNetworkPost = {
  network: SocialNetwork;
  ok: boolean;
  remoteId: string | null;
  error: string | null;
};

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

const SMALL_MEDIA_BYTES = 10 * 1024 * 1024;

export async function uploadViaAyrshare(params: {
  bytes: Buffer;
  fileName: string;
  contentType: string;
  fetchImpl?: typeof fetch;
}): Promise<{ url: string }> {
  const apiKey = getAyrshareApiKey();
  if (!apiKey) throw new InternalServiceError("NOT_CONFIGURED", "Add AYRSHARE_API_KEY before uploading.");
  const fetchImpl = params.fetchImpl ?? fetch;
  if (params.bytes.length <= SMALL_MEDIA_BYTES) {
    return uploadSmallAyrshareMedia(params.bytes, params.fileName, params.contentType, apiKey, fetchImpl);
  }
  return uploadLargeAyrshareMedia(params.bytes, params.fileName, params.contentType, apiKey, fetchImpl);
}

async function uploadSmallAyrshareMedia(
  bytes: Buffer,
  fileName: string,
  contentType: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), fileName);
  form.append("fileName", fileName);
  const response = await ayrshareFetch(
    `${AYRSHARE_API_ROOT}/media/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      body: form,
    },
    fetchImpl,
  );
  return readUploadedMediaUrl(response);
}

async function uploadLargeAyrshareMedia(
  bytes: Buffer,
  fileName: string,
  contentType: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<{ url: string }> {
  const ticketUrl = new URL(`${AYRSHARE_API_ROOT}/media/uploadUrl`);
  ticketUrl.searchParams.set("fileName", fileName);
  ticketUrl.searchParams.set("contentType", contentType);
  const ticket = await ayrshareFetch(
    ticketUrl.toString(),
    { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } },
    fetchImpl,
  );
  const ticketJson = await readAyrshareJson(ticket);
  const uploadUrl = firstHttpUrl(ticketJson, ["uploadUrl", "uploadURL"]);
  const accessUrl = firstHttpUrl(ticketJson, ["accessUrl", "accessURL", "url"]);
  if (!uploadUrl || !accessUrl) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Ayrshare did not give a place to put that file.");
  }
  const putType = typeof ticketJson.contentType === "string" ? ticketJson.contentType : contentType;
  const put = await ayrshareFetch(
    uploadUrl,
    {
      method: "PUT",
      headers: { "Content-Type": putType },
      body: bytes,
    },
    fetchImpl,
  );
  if (!put.ok) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Ayrshare could not store that file. Try a smaller one.");
  }
  return { url: accessUrl };
}

async function readUploadedMediaUrl(response: Response): Promise<{ url: string }> {
  if (response.status === 401 || response.status === 403) {
    throw new InternalServiceError("UPSTREAM_FAILED", KEY_REPLY);
  }
  const json = await readAyrshareJson(response);
  const url = firstHttpUrl(json, ["url", "accessUrl", "accessURL"]);
  if (!response.ok || json.status === "error" || !url) {
    throw new InternalServiceError(
      "UPSTREAM_FAILED",
      ownerSafeAyrshareDetail(json) ?? "Ayrshare could not store that file.",
    );
  }
  return { url };
}

function firstHttpUrl(json: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = json[key];
    if (typeof value === "string" && /^https:\/\//i.test(value.trim())) return value.trim();
  }
  return null;
}

export async function postViaAyrshare(params: {
  body: string;
  platforms: SocialNetwork[];
  mediaUrls?: string[];
  scheduledAt?: Date;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string | null; networks: AyrshareNetworkPost[] }> {
  const apiKey = getAyrshareApiKey();
  if (!apiKey) throw new InternalServiceError("NOT_CONFIGURED", FAILED_REPLY);

  const payload: Record<string, unknown> = {
    post: params.body,
    platforms: params.platforms,
  };
  if (params.mediaUrls?.length) payload.mediaUrls = params.mediaUrls;
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
  const id = ayrsharePostId(json);
  const failed = !response.ok || json.status === "error";
  const detail = ownerSafeAyrshareDetail(json) ?? FAILED_REPLY;
  const errorByNetwork = ayrshareErrorsByNetwork(json);
  const postedIds = ayrsharePostedIds(json);

  return {
    id,
    networks: params.platforms.map((network) => {
      const remoteId = postedIds.get(network) ?? null;
      const networkError = errorByNetwork.get(network);
      if (!failed || remoteId) {
        return { network, ok: true, remoteId: remoteId ?? id, error: null };
      }
      return { network, ok: false, remoteId: null, error: networkError ?? detail };
    }),
  };
}

function ayrsharePostId(json: Record<string, unknown>): string | null {
  if (typeof json.id === "string" && json.id.trim()) return json.id;
  const posted = ayrsharePostedIds(json);
  for (const id of posted.values()) {
    if (id) return id;
  }
  return null;
}

function ayrsharePostedIds(json: Record<string, unknown>): Map<SocialNetwork, string | null> {
  const posted = new Map<SocialNetwork, string | null>();
  const postIds = json.postIds;
  if (!Array.isArray(postIds)) return posted;
  for (const row of postIds) {
    if (!row || typeof row !== "object") continue;
    const platform = (row as { platform?: unknown }).platform;
    const status = (row as { status?: unknown }).status;
    const id = (row as { id?: unknown }).id;
    if (typeof platform !== "string" || status === "error") continue;
    posted.set(platform.trim().toLowerCase() as SocialNetwork, typeof id === "string" ? id : null);
  }
  return posted;
}

function ayrshareErrorsByNetwork(json: Record<string, unknown>): Map<SocialNetwork, string> {
  const errors = new Map<SocialNetwork, string>();
  if (!Array.isArray(json.errors)) return errors;
  for (const row of json.errors) {
    if (!row || typeof row !== "object") continue;
    const platform = (row as { platform?: unknown }).platform;
    const message = (row as { message?: unknown }).message;
    if (typeof platform !== "string" || typeof message !== "string" || !message.trim()) continue;
    const text = message.replace(/\s+/g, " ").trim().slice(0, 220);
    if (/<|>|doctype|not valid json|unexpected token/i.test(text)) continue;
    errors.set(platform.trim().toLowerCase() as SocialNetwork, text);
  }
  return errors;
}
