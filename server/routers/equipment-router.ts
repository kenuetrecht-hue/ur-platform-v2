import { z } from "zod";
import { secureProcedure, router, TRPCError } from "../_core/trpc";
import {
  connectEquipment,
  createExportJob,
  createWorkspaceSession,
  disconnectEquipment,
  getExportJob,
  getLivePrinterStatus,
  getWorkspaceSession,
  listEquipmentProfiles,
  listUserConnections,
  listWorkspaceSessions,
  probeOctoPrint,
  processExportJob,
  sendFileToPrinter,
  startPrintOnConnection,
  updateWorkspaceSession,
  validateExportForEquipment,
} from "../_core/equipment-service";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { assertWorkspaceAiSlotLimit } from "../_core/workspace-3d-subscription-service";
import { getSessionDesign, saveSessionDesign } from "../_core/workspace-design-service";
import {
  ConnectivityTypeSchema,
} from "../equipment-integration";
import {
  ExportFormatSchema,
  ExportOptionsSchema,
} from "../universal-file-export";

const OctoPrintInputSchema = z.object({
  host: z.string().min(3).max(253),
  port: z.number().int().min(1).max(65535).optional(),
  apiKey: z.string().min(8).max(256),
  useHttps: z.boolean().optional(),
});

export const equipmentRouter = router({
  listProfiles: secureProcedure("equipment").query(() => listEquipmentProfiles()),

  listConnections: secureProcedure("equipment").query(({ ctx }) =>
    listUserConnections(String(ctx.user.id)),
  ),

  probeOctoPrint: secureProcedure("equipment")
    .input(OctoPrintInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await probeOctoPrint(input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Could not reach OctoPrint on your network.",
        });
      }
    }),

  connect: secureProcedure("equipment")
    .input(
      z.object({
        equipmentId: z.string().min(1).max(64),
        equipmentName: z.string().min(1).max(120),
        connectivity: ConnectivityTypeSchema,
        profileId: z.string().max(64).optional(),
        adapter: z.enum(["simulated", "octoprint"]).default("simulated"),
        connectionDetails: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await connectEquipment({
          userId: String(ctx.user.id),
          ...input,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Connection failed.",
        });
      }
    }),

  disconnect: secureProcedure("equipment")
    .input(z.object({ connectionId: z.string().min(4).max(128) }))
    .mutation(({ ctx, input }) => {
      const ok = disconnectEquipment(String(ctx.user.id), input.connectionId);
      if (!ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found." });
      }
      return { ok: true as const };
    }),

  printerStatus: secureProcedure("equipment")
    .input(z.object({ connectionId: z.string().min(4).max(128) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getLivePrinterStatus(String(ctx.user.id), input.connectionId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Status unavailable.",
        });
      }
    }),

  createExport: secureProcedure("equipment")
    .input(
      z.object({
        projectId: z.string().min(1).max(128),
        options: ExportOptionsSchema,
      }),
    )
    .mutation(({ input }) => createExportJob(input.projectId, input.options)),

  processExport: secureProcedure("equipment")
    .input(z.object({ jobId: z.string().min(4).max(128) }))
    .mutation(async ({ input }) => processExportJob(input.jobId)),

  getExport: secureProcedure("equipment")
    .input(z.object({ jobId: z.string().min(4).max(128) }))
    .query(({ input }) => getExportJob(input.jobId)),

  validateExport: secureProcedure("equipment")
    .input(
      z.object({
        equipmentProfileId: z.string().min(1).max(64),
        options: ExportOptionsSchema,
      }),
    )
    .query(({ input }) => validateExportForEquipment(input.equipmentProfileId, input.options)),

  sendToPrinter: secureProcedure("equipment")
    .input(
      z.object({
        connectionId: z.string().min(4).max(128),
        fileName: z.string().min(1).max(255),
        fileContentBase64: z.string().min(1).max(12_000_000),
        startPrint: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendFileToPrinter({
          userId: String(ctx.user.id),
          ...input,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }),

  startPrint: secureProcedure("equipment")
    .input(
      z.object({
        connectionId: z.string().min(4).max(128),
        fileName: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await startPrintOnConnection(
          String(ctx.user.id),
          input.connectionId,
          input.fileName,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Print start failed.",
        });
      }
    }),

  // 3D workspace — multi-AI collaboration hub
  listWorkspaceSessions: secureProcedure("equipment").query(({ ctx }) =>
    listWorkspaceSessions(String(ctx.user.id)),
  ),

  createWorkspaceSession: secureProcedure("equipment")
    .input(
      z.object({
        name: z.string().min(1).max(120),
        projectType: z
          .enum(["merchandise", "3d_printing", "architecture", "robotics", "software", "marine", "general"])
          .default("merchandise"),
        description: z.string().max(2000).default(""),
        activeAiIds: z.array(z.string().max(64)).max(8).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("3d_workspace", ctx.isPlatformOwner);
      assertWorkspaceAiSlotLimit({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        activeAiIds: input.activeAiIds,
      });
      return createWorkspaceSession({
        userId: String(ctx.user.id),
        ...input,
      });
    }),

  getWorkspaceSession: secureProcedure("equipment")
    .input(z.object({ sessionId: z.string().min(4).max(128) }))
    .query(({ ctx, input }) => {
      const session = getWorkspaceSession(String(ctx.user.id), input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace session not found." });
      }
      return session;
    }),

  updateWorkspaceSession: secureProcedure("equipment")
    .input(
      z.object({
        sessionId: z.string().min(4).max(128),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(2000).optional(),
        activeAiIds: z.array(z.string().max(64)).max(8).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("3d_workspace", ctx.isPlatformOwner);
      const { sessionId, ...patch } = input;
      assertWorkspaceAiSlotLimit({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        activeAiIds: patch.activeAiIds,
      });
      const session = updateWorkspaceSession(String(ctx.user.id), sessionId, patch);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace session not found." });
      }
      return session;
    }),

  getDesignState: secureProcedure("equipment")
    .input(z.object({ sessionId: z.string().min(4).max(128) }))
    .query(({ ctx, input }) => {
      const session = getWorkspaceSession(String(ctx.user.id), input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace session not found." });
      }
      return getSessionDesign(input.sessionId);
    }),

  saveDesignState: secureProcedure("equipment")
    .input(
      z.object({
        sessionId: z.string().min(4).max(128),
        design: z.unknown(),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("3d_workspace", ctx.isPlatformOwner);
      const session = getWorkspaceSession(String(ctx.user.id), input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace session not found." });
      }
      const saved = saveSessionDesign(input.sessionId, input.design);
      updateWorkspaceSession(String(ctx.user.id), input.sessionId, {});
      return saved;
    }),

  supportedExportFormats: secureProcedure("equipment").query(() => ({
    formats: ExportFormatSchema.options,
  })),
});
