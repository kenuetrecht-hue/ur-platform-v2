import { TRPCError } from "@trpc/server";
import { RESOURCE_NOT_FOUND } from "./input-sanitize";
import { ENV } from "./env";
import { redactSecrets } from "./secrets";

/**
 * Internal service errors — never expose internal details to clients.
 * Routers catch these and map to TRPCError.
 */
export class InternalServiceError extends Error {
  readonly code:
    | "NOT_CONFIGURED"
    | "UPSTREAM_FAILED"
    | "EMPTY_RESPONSE"
    | "INVALID_API_KEY"
    | "RATE_LIMITED";

  constructor(code: InternalServiceError["code"], message?: string) {
    super(message ?? code);
    this.name = "InternalServiceError";
    this.code = code;
  }
}

export function mapServiceErrorToTrpc(error: unknown): never {
  if (error instanceof InternalServiceError) {
    switch (error.code) {
      case "NOT_CONFIGURED":
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This feature is not available right now.",
        });
      case "EMPTY_RESPONSE":
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "AI returned an empty response. Please try again.",
        });
      case "INVALID_API_KEY":
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Gemini API key is invalid or expired. Get a key at https://aistudio.google.com/apikey, " +
            "set CONTENTMATE_GEMINI_API_KEY in .env, save the file, then restart pnpm dev.",
        });
      case "RATE_LIMITED":
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Gemini free-tier quota reached. Wait 2 minutes, check usage at https://ai.dev/rate-limit, " +
            "or create a new API key at https://aistudio.google.com/apikey (new Google Cloud project). " +
            "For higher limits, enable billing on that project.",
        });
      default:
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Upstream service error. Please try again.",
        });
    }
  }

  if (error instanceof Error && error.message === RESOURCE_NOT_FOUND) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
  }

  if (!ENV.isProduction && error instanceof Error) {
    console.error("[service-errors]", redactSecrets(error.message));
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}
