import { NOT_ADMIN_ERR_MSG, NOT_ADMIN_DASHBOARD_ERR_MSG, NOT_OWNER_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import {
  type ApiNamespace,
  assertNamespaceCircuitClosed,
  checkIpNamespaceLimit,
  checkUserNamespaceLimit,
  isIpBlocked,
  recordNamespaceFailure,
  recordNamespaceSuccess,
  sanitizeErrorMessage,
} from "./api-security";
import { isPlatformOwner } from "./owner-auth";
import {
  assertAdminPermission,
  getAdminAccessForUser,
  type AdminAccessSnapshot,
  type AdminPermission,
} from "./admin-access-service";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isInternal =
      error.code === "INTERNAL_SERVER_ERROR" ||
      error.code === "BAD_GATEWAY" ||
      error.code === "SERVICE_UNAVAILABLE";

    return {
      ...shape,
      message: isInternal
        ? sanitizeErrorMessage(shape.message)
        : shape.message,
      data: {
        ...shape.data,
        stack: ENV.isProduction ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

const requireUser = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      isPlatformOwner: isPlatformOwner(ctx.user),
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/** Admin = platform owner only. No other user can hold admin privileges. */
export const adminProcedure = t.procedure.use(
  middleware(async ({ ctx, next }) => {
    if (!ctx.user || !isPlatformOwner(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_OWNER_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        isPlatformOwner: true,
      },
    });
  }),
);

/** Alias for adminProcedure — owner-only operations. */
export const ownerProcedure = adminProcedure;

function resolveAdminAccess(ctx: TrpcContext): AdminAccessSnapshot {
  return getAdminAccessForUser({
    userId: ctx.user?.id,
    email: ctx.user?.email,
    isPlatformOwner: ctx.isPlatformOwner,
  });
}

/** Platform owner OR staff with administration dashboard access. */
export const adminDashboardProcedure = protectedProcedure.use(
  middleware(async ({ ctx, next }) => {
    const adminAccess = resolveAdminAccess(ctx);
    if (!adminAccess.canAccessAdminDashboard) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_DASHBOARD_ERR_MSG });
    }
    return next({ ctx: { ...ctx, adminAccess } });
  }),
);

/** Requires a specific administration permission (owner always passes). */
export function adminPermissionProcedure(permission: AdminPermission) {
  return adminDashboardProcedure.use(
    middleware(async ({ ctx, next }) => {
      assertAdminPermission(ctx.adminAccess, permission);
      return next({ ctx });
    }),
  );
}

function namespaceSecurity(namespace: ApiNamespace) {
  return middleware(async ({ ctx, next }) => {
    assertNamespaceCircuitClosed(namespace);

    if (isIpBlocked(ctx.ip)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    // Platform owner is not rate-limited
    if (!ctx.isPlatformOwner) {
      checkIpNamespaceLimit(namespace, ctx.ip);
      if (ctx.user) {
        checkUserNamespaceLimit(namespace, String(ctx.user.id));
      }
    }

    try {
      const result = await next();
      recordNamespaceSuccess(namespace);
      return result;
    } catch (error) {
      if (
        error instanceof TRPCError &&
        (error.code === "INTERNAL_SERVER_ERROR" || error.code === "BAD_GATEWAY")
      ) {
        recordNamespaceFailure(namespace);
      } else if (!(error instanceof TRPCError)) {
        recordNamespaceFailure(namespace);
      }
      throw error;
    }
  });
}

export function secureProcedure(namespace: ApiNamespace) {
  return protectedProcedure.use(namespaceSecurity(namespace));
}

export function securePublicProcedure(namespace: ApiNamespace) {
  return publicProcedure.use(namespaceSecurity(namespace));
}

export { TRPCError, NOT_ADMIN_ERR_MSG, NOT_OWNER_ERR_MSG };
