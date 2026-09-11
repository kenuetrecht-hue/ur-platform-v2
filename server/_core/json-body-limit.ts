/** Default JSON body size. Large uploads stay on dedicated routes. */
export const DEFAULT_JSON_BODY_LIMIT = "1mb";

/** ID front + back + selfie as base64. Only `/api/trpc` paths that name ageKyc. */
export const AGE_KYC_JSON_BODY_LIMIT = "8mb";

export function jsonBodyLimitForPath(path: string): string {
  if (path.toLowerCase().includes("agekyc")) return AGE_KYC_JSON_BODY_LIMIT;
  return DEFAULT_JSON_BODY_LIMIT;
}

export function isPayloadTooLargeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const row = error as { status?: number; type?: string; statusCode?: number };
  return row.status === 413 || row.statusCode === 413 || row.type === "entity.too.large";
}
