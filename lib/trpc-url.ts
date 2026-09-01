import { getApiBaseUrl } from "@/constants/oauth";

/** Absolute tRPC endpoint on the Express API (never Metro :8081/:8082). */
export function getTrpcApiUrl(): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base || "http://localhost:3000"}/api/trpc`;
}
