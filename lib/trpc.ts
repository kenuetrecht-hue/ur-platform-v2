import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getAccessToken } from "@/lib/auth-storage";
import * as Auth from "@/lib/_core/auth";
import { getTrpcApiUrl } from "@/lib/trpc-url";
import { resolveTrpcFetchUrl } from "@/lib/trpc-fetch-url";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        // Must be a string. A function is stringified (not called) in tRPC 11.
        url: getTrpcApiUrl(),
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const supabaseToken = await getAccessToken();
          if (supabaseToken) {
            return { Authorization: `Bearer ${supabaseToken}` };
          }

          const sessionToken = await Auth.getSessionToken();
          return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
        },
        fetch(url, options) {
          const href =
            typeof url === "string"
              ? url
              : url instanceof URL
                ? url.href
                : url.url;
          return fetch(resolveTrpcFetchUrl(href, getTrpcApiUrl()), {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
