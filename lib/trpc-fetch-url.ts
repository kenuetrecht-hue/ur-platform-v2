/** Build the tRPC URL. Empty base + a page origin means same-host (website + API together). */
export function resolveTrpcApiUrl(base: string, pageOrigin?: string): string {
  const trimmed = base.replace(/\/$/, "");
  if (trimmed) return `${trimmed}/api/trpc`;
  const origin = pageOrigin?.replace(/\/$/, "");
  if (origin) return `${origin}/api/trpc`;
  return "http://localhost:3000/api/trpc";
}

/**
 * tRPC v11 `httpBatchLink` only accepts `string | URL`. A function is
 * coerced with `.toString()` (source code), which the browser then fetches
 * as a relative URL against Metro — HTML, then "DOCTYPE is not valid JSON".
 */
export function resolveTrpcFetchUrl(url: string, apiUrl: string): string {
  const api = apiUrl.replace(/\/$/, "");

  try {
    const parsed = new URL(url);
    if (parsed.port === "8081" || parsed.port === "8082") {
      const target = new URL(api);
      parsed.protocol = target.protocol;
      parsed.hostname = target.hostname;
      parsed.port = target.port;
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    const fnTail = url.match(/\}\s*(\/[\w.,]+(?:\?[\s\S]*)?)$/);
    if (fnTail?.[1]) {
      return `${api}${fnTail[1]}`;
    }
    const marker = url.match(/\/api\/trpc(\/[^?\s]*)?(\?[\s\S]*)?$/);
    if (marker) {
      return `${api}${marker[1] ?? ""}${marker[2] ?? ""}`;
    }
    return api;
  }
}
