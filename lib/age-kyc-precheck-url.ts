/** Dedicated binary upload — not tRPC JSON / base64. Same host as the API. */
export function ageKycPrecheckUrlFromTrpc(trpcUrl: string): string {
  return trpcUrl.replace(/\/api\/trpc\/?$/i, "/api/age-kyc/precheck");
}
