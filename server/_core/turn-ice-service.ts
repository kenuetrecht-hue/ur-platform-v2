/**
 * TURN / ICE for 1-to-1 WebRTC.
 * Secrets stay on the server. Callers only receive short-lived credentials.
 *
 * Hosted: Cloudflare Realtime TURN (CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN).
 * Self-host: coturn REST auth (TURN_URLS + TURN_AUTH_SECRET). See turn/docker-compose.yml.
 */

import { createHmac } from "crypto";
import { ENV } from "./env";
import {
  mergeIceServers,
  parseTurnUrls,
  TURN_CREDENTIAL_TTL_SEC,
  type UrIceServer,
} from "../../lib/webrtc-ice";

export type TurnPublicStatus = {
  configured: boolean;
  provider: "cloudflare" | "coturn" | "none";
};

type CloudflareTurnAdapter = (params: {
  keyId: string;
  apiToken: string;
  ttlSec: number;
}) => Promise<UrIceServer[]>;

let cloudflareAdapter: CloudflareTurnAdapter | null = null;
let envOverride: Record<string, string> | null = null;

export function _resetTurnIceForTests(): void {
  cloudflareAdapter = null;
  envOverride = null;
}

export function _setTurnEnvForTests(env: Record<string, string> | null): void {
  envOverride = env;
}

export function _setCloudflareTurnAdapterForTests(adapter: CloudflareTurnAdapter | null): void {
  cloudflareAdapter = adapter;
}

function envValue(name: string): string {
  if (/^(EXPO_PUBLIC_|NEXT_PUBLIC_|VITE_)/.test(name)) return "";
  const fromOverride = envOverride?.[name]?.trim() ?? "";
  if (fromOverride) return fromOverride;
  return (typeof process !== "undefined" ? process.env[name]?.trim() : "") ?? "";
}

function cloudflareTurnKeyId(): string {
  return envValue("CLOUDFLARE_TURN_KEY_ID") || envValue("CLOUDFLARE_TURN_TOKEN_ID");
}

function cloudflareTurnApiToken(): string {
  return envValue("CLOUDFLARE_TURN_API_TOKEN") || envValue("CLOUDFLARE_TURN_KEY_API_TOKEN");
}

function turnUrls(): string[] {
  return parseTurnUrls(envValue("TURN_URLS"));
}

function turnAuthSecret(): string {
  return envValue("TURN_AUTH_SECRET");
}

function turnUsername(): string {
  return envValue("TURN_USERNAME");
}

function turnPassword(): string {
  return envValue("TURN_PASSWORD") || envValue("TURN_CREDENTIAL");
}

export function isTurnConfigured(): boolean {
  if (cloudflareTurnKeyId() && cloudflareTurnApiToken()) return true;
  if (turnUrls().length > 0 && turnAuthSecret()) return true;
  if (turnUrls().length > 0 && turnUsername() && turnPassword()) return true;
  return false;
}

export function getTurnPublicStatus(): TurnPublicStatus {
  if (cloudflareTurnKeyId() && cloudflareTurnApiToken()) {
    return { configured: true, provider: "cloudflare" };
  }
  if (turnUrls().length > 0 && (turnAuthSecret() || (turnUsername() && turnPassword()))) {
    return { configured: true, provider: "coturn" };
  }
  return { configured: false, provider: "none" };
}

/** coturn --use-auth-secret (draft-uberti TURN REST). */
export function mintCoturnRestCredentials(params: {
  secret: string;
  userId: string;
  nowMs?: number;
  ttlSec?: number;
}): { username: string; credential: string; ttlSec: number } {
  const ttlSec = Math.min(Math.max(params.ttlSec ?? TURN_CREDENTIAL_TTL_SEC, 60), 172_800);
  const expiry = Math.floor((params.nowMs ?? Date.now()) / 1000) + ttlSec;
  const safeUser = params.userId.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || "ur";
  const username = `${expiry}:${safeUser}`;
  const credential = createHmac("sha1", params.secret).update(username).digest("base64");
  return { username, credential, ttlSec };
}

function coturnIceServers(userId: string): UrIceServer[] {
  const urls = turnUrls();
  if (urls.length === 0) return [];
  const secret = turnAuthSecret();
  if (secret) {
    const minted = mintCoturnRestCredentials({ secret, userId });
    return [{ urls, username: minted.username, credential: minted.credential }];
  }
  const username = turnUsername();
  const credential = turnPassword();
  if (username && credential) {
    if (ENV.isProduction) return [];
    return [{ urls, username, credential }];
  }
  return [];
}

function stripPort53(servers: UrIceServer[]): UrIceServer[] {
  return servers
    .map((server) => {
      const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
        (url) => !/:(?:53)(?:[/?]|$)/.test(url),
      );
      if (urls.length === 0) return null;
      return { ...server, urls: urls.length === 1 ? urls[0]! : urls };
    })
    .filter((server): server is UrIceServer => server != null);
}

async function defaultCloudflareTurn(params: {
  keyId: string;
  apiToken: string;
  ttlSec: number;
}): Promise<UrIceServer[]> {
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(params.keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: params.ttlSec }),
    },
  );
  if (!response.ok) {
    throw new Error("TURN credential request failed.");
  }
  const payload = (await response.json()) as { iceServers?: UrIceServer[] };
  if (!Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
    throw new Error("TURN credential request returned no servers.");
  }
  return stripPort53(payload.iceServers);
}

export async function getIceServersForCall(params: { userId: string }): Promise<{
  iceServers: UrIceServer[];
  turn: TurnPublicStatus;
}> {
  const extra: UrIceServer[] = [];
  const keyId = cloudflareTurnKeyId();
  const apiToken = cloudflareTurnApiToken();
  if (keyId && apiToken) {
    try {
      const fetchIce = cloudflareAdapter ?? defaultCloudflareTurn;
      extra.push(
        ...(await fetchIce({
          keyId,
          apiToken,
          ttlSec: TURN_CREDENTIAL_TTL_SEC,
        })),
      );
    } catch (error) {
      console.warn("[turn] Cloudflare TURN credentials unavailable.");
      if (!process.env.NODE_ENV || process.env.NODE_ENV !== "production") {
        void error;
      }
    }
  }
  extra.push(...coturnIceServers(params.userId));
  return {
    iceServers: mergeIceServers(extra),
    turn: getTurnPublicStatus(),
  };
}
