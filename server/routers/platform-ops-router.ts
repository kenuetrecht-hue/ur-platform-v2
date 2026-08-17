import { z } from "zod";
import {
  adminDashboardProcedure,
  adminPermissionProcedure,
  ownerProcedure,
  secureProcedure,
  securePublicProcedure,
  router,
  TRPCError,
} from "../_core/trpc";
import { isOwnerEmailConfigured } from "../_core/env";
import { getPlatformOwnerDisplayName } from "../_core/owner-auth";
import {
  getAccessStatus,
  grantFreeAccessByOwner,
  listAccessGrants,
  listActiveMemberships,
  revokeAccessGrant,
} from "../_core/access-entitlements";
import {
  ADMIN_STAFF_ROLES,
  getAdminAccessForUser,
  grantAdminStaffAccess,
  listAdminRoleOptions,
  listAdminStaff,
  revokeAdminStaffAccess,
} from "../_core/admin-access-service";
import { OWNER_ONLY_PLATFORM_AI_IDS } from "../_core/platform-ops-ai";
import {
  createOpsIncident,
  executeIncidentRemediation,
  getOpsDashboardSummary,
  getOpsIncident,
  listOpsIncidents,
  listOwnerNotifications,
  markNotificationsRead,
  rejectOpsIncident,
  resolveOpsIncident,
  runPlatformHealthChecks,
  runPlatformHealthScan,
  proposeSectionMaintenance,
  ownerDisableSection,
  ownerEnableSection,
  submitOwnerInstructions,
} from "../_core/platform-ops-service";
import {
  getPublicSectionFlags,
  listPlatformSectionStates,
} from "../_core/platform-section-flags-service";
import { PLATFORM_SECTION_IDS } from "../../lib/platform-section-flags";

export const platformOpsRouter = router({
  /** Requires login — owner flag is server-verified only. */
  checkAccess: secureProcedure("platformOps").query(({ ctx }) => {
    const adminAccess = getAdminAccessForUser({
      userId: ctx.user?.id,
      email: ctx.user?.email,
      isPlatformOwner: ctx.isPlatformOwner,
    });
    return {
      isPlatformOwner: ctx.isPlatformOwner,
      hasFullAiAccess: ctx.isPlatformOwner,
      hasFullPlatformAccess: ctx.isPlatformOwner,
      canAccessAdminDashboard: adminAccess.canAccessAdminDashboard,
      adminRole: adminAccess.role,
      adminRoleLabel: adminAccess.roleLabel,
      adminPermissions: adminAccess.permissions,
      isAuthenticated: Boolean(ctx.user),
      ownerDisplayName: ctx.isPlatformOwner ? getPlatformOwnerDisplayName() : null,
      ownerEmailConfigured: ctx.isPlatformOwner ? isOwnerEmailConfigured() : undefined,
      configuredOwnerEmail: ctx.isPlatformOwner ? process.env.PLATFORM_OWNER_EMAIL : undefined,
    };
  }),

  getMyAdminAccess: secureProcedure("platformOps").query(({ ctx }) => {
    if (!ctx.user) {
      return getAdminAccessForUser({ isPlatformOwner: false });
    }
    return getAdminAccessForUser({
      userId: ctx.user.id,
      email: ctx.user.email,
      isPlatformOwner: ctx.isPlatformOwner,
    });
  }),

  listAdminRoleOptions: ownerProcedure.query(() => listAdminRoleOptions()),

  grantAdminStaff: ownerProcedure
    .input(
      z.object({
        userEmail: z.string().email().max(320),
        role: z.enum(ADMIN_STAFF_ROLES),
        note: z.string().max(500).optional(),
        expiresAt: z.string().datetime().optional(),
      }),
    )
    .mutation(({ input }) =>
      grantAdminStaffAccess({
        userEmail: input.userEmail,
        role: input.role,
        note: input.note,
        expiresAt: input.expiresAt,
      }),
    ),

  revokeAdminStaff: ownerProcedure
    .input(z.object({ grantId: z.string().min(8).max(64) }))
    .mutation(({ input }) => {
      const ok = revokeAdminStaffAccess(input.grantId);
      if (!ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff grant not found." });
      }
      return { ok: true as const };
    }),

  listAdminStaff: ownerProcedure
    .input(z.object({ includeRevoked: z.boolean().optional() }).optional())
    .query(({ input }) => listAdminStaff(input?.includeRevoked ?? false)),

  /** Any logged-in user — entitlement status for AI features. */
  getMyAccess: secureProcedure("platformOps").query(({ ctx }) =>
    getAccessStatus({
      userId: ctx.user.id,
      email: ctx.user.email,
      isPlatformOwner: ctx.isPlatformOwner,
    }),
  ),

  grantFreeAccess: adminPermissionProcedure("grant_user_access")
    .input(
      z.object({
        userEmail: z.string().email().max(320),
        reason: z.string().max(500).optional(),
        expiresAt: z.string().datetime().optional(),
      }),
    )
    .mutation(({ input }) =>
      grantFreeAccessByOwner({
        userEmail: input.userEmail,
        reason: input.reason,
        expiresAt: input.expiresAt,
      }),
    ),

  revokeFreeAccess: adminPermissionProcedure("grant_user_access")
    .input(z.object({ grantId: z.string().min(8).max(64) }))
    .mutation(({ input }) => revokeAccessGrant(input.grantId)),

  listAccessGrants: adminPermissionProcedure("grant_user_access")
    .input(z.object({ includeRevoked: z.boolean().optional() }).optional())
    .query(({ input }) => listAccessGrants(input?.includeRevoked ?? false)),

  listPaidMemberships: adminPermissionProcedure("view_ops_dashboard").query(() =>
    listActiveMemberships(),
  ),

  isOwner: ownerProcedure.query(() => ({ isOwner: true as const })),

  dashboard: adminPermissionProcedure("view_ops_dashboard").query(() =>
    getOpsDashboardSummary(),
  ),

  listIncidents: adminPermissionProcedure("view_incidents").query(() => listOpsIncidents()),

  getIncident: adminPermissionProcedure("view_incidents")
    .input(z.object({ incidentId: z.string().min(8).max(64) }))
    .query(({ input }) => {
      const incident = getOpsIncident(input.incidentId);
      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }
      return incident;
    }),

  listNotifications: adminPermissionProcedure("view_notifications").query(() =>
    listOwnerNotifications(),
  ),

  markNotificationsRead: adminPermissionProcedure("mark_notifications_read").mutation(() => {
    markNotificationsRead();
    return { ok: true as const };
  }),

  runHealthScan: adminPermissionProcedure("run_health_scan").mutation(async () =>
    runPlatformHealthScan(),
  ),

  healthChecks: adminPermissionProcedure("view_ops_dashboard").query(() =>
    runPlatformHealthChecks(),
  ),

  fileIncident: adminPermissionProcedure("chat_ops_ai")
    .input(
      z.object({
        sourceAi: z.enum(OWNER_ONLY_PLATFORM_AI_IDS),
        severity: z.enum(["low", "medium", "high", "critical"]),
        category: z.enum([
          "security",
          "bug",
          "compliance",
          "performance",
          "malware",
          "config",
          "monitoring",
        ]),
        title: z.string().min(3).max(200),
        problem: z.string().min(3).max(4000),
        proposedFix: z.string().min(3).max(4000),
        actionsTaken: z.array(z.string().max(500)).max(20).optional(),
      }),
    )
    .mutation(async ({ input }) => createOpsIncident(input)),

  approveIncident: adminPermissionProcedure("manage_incidents")
    .input(
      z.object({
        incidentId: z.string().min(8).max(64),
        ownerNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => executeIncidentRemediation(input.incidentId, input.ownerNote)),

  submitOwnerInstructions: ownerProcedure
    .input(
      z.object({
        incidentId: z.string().min(8).max(64),
        instructions: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ input }) =>
      submitOwnerInstructions(input.incidentId, input.instructions),
    ),

  reopenIncidentSection: ownerProcedure
    .input(
      z.object({
        incidentId: z.string().min(8).max(64),
        ownerNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const incident = getOpsIncident(input.incidentId);
      if (!incident?.affectedSectionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No section linked to this incident." });
      }
      ownerEnableSection({
        sectionId: incident.affectedSectionId,
        ownerNote: input.ownerNote ?? "Owner reopened section manually",
      });
      incident.actionsTaken.push(`Owner reopened section: ${incident.affectedSectionId}`);
      incident.updatedAt = new Date().toISOString();
      incidents.set(incident.id, incident);
      return incident;
    }),

  rejectIncident: adminPermissionProcedure("manage_incidents")
    .input(
      z.object({
        incidentId: z.string().min(8).max(64),
        ownerNote: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ input }) => rejectOpsIncident(input.incidentId, input.ownerNote)),

  resolveIncident: adminPermissionProcedure("manage_incidents")
    .input(z.object({ incidentId: z.string().min(8).max(64) }))
    .mutation(async ({ input }) => resolveOpsIncident(input.incidentId)),

  /** Public — client maintenance banners (enabled flags only). */
  getPublicSectionFlags: securePublicProcedure("platformOps").query(() => ({
    sections: getPublicSectionFlags(),
  })),

  listSections: adminPermissionProcedure("view_ops_dashboard").query(() =>
    listPlatformSectionStates(),
  ),

  disableSection: ownerProcedure
    .input(
      z.object({
        sectionId: z.enum(PLATFORM_SECTION_IDS),
        reason: z.string().min(3).max(2000),
        maintenanceMessage: z.string().max(500).optional(),
        incidentId: z.string().min(8).max(64).optional(),
      }),
    )
    .mutation(({ input }) =>
      ownerDisableSection({
        sectionId: input.sectionId,
        reason: input.reason,
        maintenanceMessage: input.maintenanceMessage,
        incidentId: input.incidentId,
      }),
    ),

  enableSection: ownerProcedure
    .input(
      z.object({
        sectionId: z.enum(PLATFORM_SECTION_IDS),
        ownerNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(({ input }) =>
      ownerEnableSection({
        sectionId: input.sectionId,
        ownerNote: input.ownerNote,
      }),
    ),

  proposeSectionMaintenance: adminPermissionProcedure("chat_ops_ai")
    .input(
      z.object({
        sourceAi: z.enum(OWNER_ONLY_PLATFORM_AI_IDS),
        sectionId: z.enum(PLATFORM_SECTION_IDS),
        action: z.enum(["isolate", "reopen"]),
        reason: z.string().min(3).max(4000),
        proposedFix: z.string().min(3).max(4000),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      }),
    )
    .mutation(async ({ input }) => proposeSectionMaintenance(input)),
});
