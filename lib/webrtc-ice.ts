/**
 * ICE servers for 1-to-1 calls.
 * STUN is always available. TURN credentials are minted on the server
 * (never EXPO_PUBLIC_) so calls can get through hard NATs and firewalls.
 */
export type UrIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export const UR_STUN_ICE_SERVERS: UrIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export const TURN_CREDENTIAL_TTL_SEC = 4 * 60 * 60;

export function parseTurnUrls(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((url) => url.trim())
    .filter((url) => /^(turns?:|stuns?:)/i.test(url) && !/:(?:53)(?:[/?]|$)/.test(url));
}

export function mergeIceServers(extra: UrIceServer[]): UrIceServer[] {
  const seen = new Set<string>();
  const out: UrIceServer[] = [];
  for (const server of [...UR_STUN_ICE_SERVERS, ...extra]) {
    const key = `${JSON.stringify(server.urls)}:${server.username ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(server);
  }
  return out;
}
