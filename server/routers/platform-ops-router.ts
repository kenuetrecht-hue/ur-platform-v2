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
  getStewardAdBudgetStatus,
} from "../_core/steward-ad-budget-service";
import {
  getStewardCommission,
  listStewardCommissions,
  publicStewardCommission,
} from "../_core/steward-commission-service";
import {
  getSocialPublisherStatus,
  publishOwnerSocialPost,
} from "../_core/social-publisher-service";
import { SOCIAL_NETWORKS } from "../../lib/social-publisher-types";
import {
  getOwnerCommandCenterSnapshot,
  hydrateOwnerCommandCenter,
  listOwnerCommandEvents,
} from "../_core/owner-command-center-service";
import {
  createOpsIncident,
  executeIncidentRemediation,
  getOpsDashboardSummary,
  getOpsIncident,
  hydratePlatformOpsState,
  listOpsIncidents,
  listOwnerNotifications,
  markNotificationsRead,
  recordOwnerReopenedSection,
  rejectOpsIncident,
  resolveOpsIncident,
  rerunIncidentSandbox,
  runPlatformHealthChecks,
  runPlatformHealthScan,
  proposeSectionMaintenance,
  ownerDisableSection,
  ownerEnableSection,
  submitOwnerInstructions,
} from "../_core/platform-ops-service";
import {
  getPublicSectionFlags,
  hydratePlatformSectionFlags,
  listPlatformSectionStates,
} from "../_core/platform-section-flags-service";
import { hydrateSandboxRepairs, listPendingSandboxRepairs } from "../_core/ops-sandbox-repair-service";
import { registerOwnerPushToken, listOwnerPushTokens } from "../_core/owner-push-service";
import { getOwnerEmergencyState } from "../_core/owner-emergency-service";
import {
  buildOwnerComplianceArchive,
  getOwnerAuditBackupDirHint,
  maybeRotateOwnerComplianceBackup,
  readLastComplianceBackup,
  writeOwnerComplianceSnapshot,
} from "../_core/owner-compliance-archive-service";
import { PLATFORM_SECTION_IDS } from "../../lib/platform-section-flags";
import {
  listOwnerPriceCatalog,
  resetOwnerPriceSku,
  setOwnerPriceSku,
} from "../_core/owner-price-catalog-service";
import { OWNER_PRICE_MAX_CENTS, OWNER_PRICE_MIN_CENTS } from "../../lib/owner-price-catalog";

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

  getStewardAdBudget: ownerProcedure.query(() => getStewardAdBudgetStatus()),

  listStewardCommissions: ownerProcedure.query(() =>
    listStewardCommissions().map(publicStewardCommission),
  ),

  getSocialPublisherStatus: ownerProcedure.query(() => getSocialPublisherStatus()),

  publishOwnerSocialPost: ownerProcedure
    .input(
      z.object({
        body: z.string().min(1).max(2200).trim(),
        platforms: z.array(z.enum(SOCIAL_NETWORKS)).min(1).max(6),
        scheduledAt: z.string().datetime().optional(),
        sourceJobId: z.string().min(8).max(80).optional(),
      }),
    )
    .mutation(({ input }) => {
      if (input.sourceJobId && !getStewardCommission(input.sourceJobId)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That Steward draft is gone. Assign the work again, then post.",
        });
      }
      return publishOwnerSocialPost({
        body: input.body,
        platforms: input.platforms,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      });
    }),

  getCommandCenter: ownerProcedure.query(async () => {
    await Promise.all([
      hydrateOwnerCommandCenter(),
      hydratePlatformOpsState(),
      hydratePlatformSectionFlags(),
      hydrateSandboxRepairs(),
    ]);
    const openIds = new Set(
      listOpsIncidents()
        .filter((i) => i.status !== "resolved" && i.status !== "rejected" && i.status !== "deploy_executed")
        .map((i) => i.id),
    );
    void maybeRotateOwnerComplianceBackup().catch(() => undefined);
    return getOwnerCommandCenterSnapshot(listPendingSandboxRepairs(openIds));
  }),

  getOwnerEmergency: ownerProcedure.query(async () => {
    await hydratePlatformOpsState();
    const tokens = await listOwnerPushTokens();
    return getOwnerEmergencyState(tokens.length > 0);
  }),

  registerOwnerPushDevice: ownerProcedure
    .input(
      z.object({
        token: z.string().trim().min(20).max(255),
        platform: z.enum(["ios", "android", "web"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      registerOwnerPushToken({
        token: input.token,
        ownerUserId: String(ctx.user.id),
        platform: input.platform,
      });
      return { registered: true as const };
    }),

  exportComplianceArchive: ownerProcedure.query(async () => {
    await Promise.all([
      hydrateOwnerCommandCenter(),
      hydratePlatformOpsState(),
      hydratePlatformSectionFlags(),
      hydrateSandboxRepairs(),
    ]);
    const archive = await buildOwnerComplianceArchive("owner_download");
    if (archive.incidents.length === 0) {
      archive.incidents = listOpsIncidents();
      archive.counts.incidents = archive.incidents.length;
    }
    return archive;
  }),

  saveComplianceArchiveToDisk: ownerProcedure.mutation(async () => {
    await Promise.all([
      hydrateOwnerCommandCenter(),
      hydratePlatformOpsState(),
      hydratePlatformSectionFlags(),
      hydrateSandboxRepairs(),
    ]);
    return writeOwnerComplianceSnapshot("owner_manual_save");
  }),

  getComplianceArchiveStatus: ownerProcedure.query(async () => {
    const last = await readLastComplianceBackup();
    return {
      backupDir: getOwnerAuditBackupDirHint(),
      last,
      configuredExternalDrive: Boolean(process.env.OWNER_AUDIT_BACKUP_DIR?.trim()),
    };
  }),

  listCommandCenterEvents: ownerProcedure
    .input(
      z
        .object({
          since: z.string().datetime().optional(),
          limit: z.number().int().min(1).max(200).optional(),
          kind: z
            .enum([
              "ops_chat",
              "hive_consult",
              "town_hall",
              "specialist_chat",
              "incident",
              "remediation",
              "health_scan",
              "section",
              "protection",
              "sandbox_repair",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      await hydrateOwnerCommandCenter();
      return listOwnerCommandEvents(input);
    }),

  dashboard: adminPermissionProcedure("view_ops_dashboard").query(async () => {
    await Promise.all([hydratePlatformOpsState(), hydratePlatformSectionFlags()]);
    return getOpsDashboardSummary();
  }),

  listIncidents: adminPermissionProcedure("view_incidents").query(async () => {
    await hydratePlatformOpsState();
    return listOpsIncidents();
  }),

  getIncident: adminPermissionProcedure("view_incidents")
    .input(z.object({ incidentId: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      await hydratePlatformOpsState();
      const incident = getOpsIncident(input.incidentId);
      if (!incident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }
      return incident;
    }),

  listNotifications: adminPermissionProcedure("view_notifications").query(async () => {
    await hydratePlatformOpsState();
    return listOwnerNotifications();
  }),

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
    .mutation(async ({ input, ctx }) =>
      createOpsIncident({
        ...input,
        /** Staff may file a report; only the owner auto-isolates from this route. */
        autoIsolateSection: ctx.isPlatformOwner,
      }),
    ),

  approveIncident: ownerProcedure
    .input(
      z.object({
        incidentId: z.string().min(8).max(64),
        ownerNote: z.string().max(1000).optional(),
        confirmPhrase: z.string().min(1).max(40),
      }),
    )
    .mutation(async ({ input }) =>
      executeIncidentRemediation(input.incidentId, input.ownerNote, input.confirmPhrase),
    ),

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
    .mutation(async ({ input }) => recordOwnerReopenedSection(input.incidentId, input.ownerNote)),

  runSandboxRepair: ownerProcedure
    .input(z.object({ incidentId: z.string().min(8).max(64) }))
    .mutation(async ({ input }) => rerunIncidentSandbox(input.incidentId)),

  rejectIncident: ownerProcedure
    .input(
      z.object({
        incidentId: z.string().min(8).max(64),
        ownerNote: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ input }) => rejectOpsIncident(input.incidentId, input.ownerNote)),

  resolveIncident: ownerProcedure
    .input(z.object({ incidentId: z.string().min(8).max(64) }))
    .mutation(async ({ input }) => resolveOpsIncident(input.incidentId)),

  /** Public — client maintenance banners (enabled flags only). */
  getPublicSectionFlags: securePublicProcedure("platformOps").query(async () => {
    await hydratePlatformSectionFlags();
    return { sections: getPublicSectionFlags() };
  }),

  listSections: adminPermissionProcedure("view_ops_dashboard").query(async () => {
    await hydratePlatformSectionFlags();
    return listPlatformSectionStates();
  }),

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
    .mutation(async ({ input, ctx }) =>
      proposeSectionMaintenance({
        ...input,
        autoIsolateSection: ctx.isPlatformOwner,
      }),
    ),

  listOwnerPriceCatalog: ownerProcedure.query(() => listOwnerPriceCatalog()),

  setOwnerPrice: ownerProcedure
    .input(
      z.object({
        skuId: z.string().trim().min(3).max(96),
        priceCents: z.number().int().min(OWNER_PRICE_MIN_CENTS).max(OWNER_PRICE_MAX_CENTS),
      }),
    )
    .mutation(({ input }) => setOwnerPriceSku(input)),

  resetOwnerPrice: ownerProcedure
    .input(z.object({ skuId: z.string().trim().min(3).max(96) }))
    .mutation(({ input }) => resetOwnerPriceSku(input.skuId)),
});
