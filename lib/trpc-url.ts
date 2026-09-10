import { getApiBaseUrl } from "@/constants/oauth";
import { resolveTrpcApiUrl } from "@/lib/trpc-fetch-url";

/** Absolute tRPC endpoint on the Express API (never Metro :8081/:8082). */
export function getTrpcApiUrl(): string {
  const pageOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : undefined;
  return resolveTrpcApiUrl(getApiBaseUrl(), pageOrigin);
}
