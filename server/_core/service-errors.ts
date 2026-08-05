import { TRPCError } from "@trpc/server";
import { RESOURCE_NOT_FOUND } from "./input-sanitize";

/**
 * Internal service errors — never expose internal details to clients.
 * Routers catch these and map to TRPCError.
 */
export class InternalServiceError extends Error {
  readonly code: "NOT_CONFIGURED" | "UPSTREAM_FAILED" | "EMPTY_RESPONSE";

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

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}
