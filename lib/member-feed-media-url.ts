import { getPlatformPublicOrigin, PLATFORM_PUBLIC_ORIGIN } from "./platform-urls";

/** True when the address is a picture or video this site stored for a member. */
export function isMemberFeedMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (!/^\/api\/member-feed-media\/[a-f0-9]{32}$/.test(parsed.pathname)) return false;
    const allowed = new Set<string>([
      new URL(getPlatformPublicOrigin()).host,
      new URL(PLATFORM_PUBLIC_ORIGIN).host,
      "localhost",
      "127.0.0.1",
    ]);
    return allowed.has(parsed.host) || allowed.has(parsed.hostname);
  } catch {
    return false;
  }
}
