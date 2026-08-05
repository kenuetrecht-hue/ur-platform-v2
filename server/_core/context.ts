import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getClientIp, getRequestId } from "./api-security";
import { isPlatformOwner } from "./owner-auth";
import { sdk } from "./sdk";
import { resolveDevOwnerFromRequest } from "./dev-owner-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  ip: string;
  requestId: string;
  /** True only for the platform owner — set server-side only, never from client. */
  isPlatformOwner: boolean;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  const ip = getClientIp(opts.req);
  const requestId =
    (opts.req as CreateExpressContextOptions["req"] & { requestId?: string }).requestId ??
    getRequestId(opts.req);

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // Dev-only: Supabase unavailable — verified owner JWT fallback (never replaces authenticated non-owners).
  if (!user) {
    user = await resolveDevOwnerFromRequest(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    ip,
    requestId,
    isPlatformOwner: isPlatformOwner(user),
  };
}
