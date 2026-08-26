import { z } from "zod";
import { router, secureProcedure, securePublicProcedure, TRPCError } from "../_core/trpc";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import {
  addDailyLog,
  addPunchListItem,
  addSafetyReport,
  checkoutInventoryToJob,
  clockIn,
  clockOut,
  completePunchListItem,
  consumeInventoryOnJob,
  createInventoryItem,
  createJobsiteCompany,
  createJobsiteJob,
  getMyJobsiteContext,
  getOfficeDashboard,
  ingestEquipmentPing,
  inviteJobsiteMember,
  listDailyLogs,
  listEquipment,
  listInventory,
  listJobsiteJobs,
  listJobsiteMembers,
  listJobsiteRoster,
  listPunchList,
  listSafetyReports,
  recordEquipmentPing,
  registerEquipment,
  revokeJobsiteMember,
  rotateEquipmentToken,
  updateJobsiteCompany,
} from "../_core/jobsite-service";

const companyIdSchema = z.string().uuid();
const jobIdSchema = z.string().uuid();
const latSchema = z.number().gte(-90).lte(90);
const lngSchema = z.number().gte(-180).lte(180);

function actorFrom(ctx: { user: { id: number | string; email?: string | null; name?: string | null } }) {
  return {
    userId: String(ctx.user.id),
    email: ctx.user.email,
    displayName: ctx.user.name,
  };
}

function gate(ctx: { isPlatformOwner: boolean }) {
  assertSectionEnabledForRequest("jobsite", ctx.isPlatformOwner);
}

export const jobsiteRouter = router({
  getMyContext: secureProcedure("jobsite").query(({ ctx }) => {
    gate(ctx);
    return getMyJobsiteContext(actorFrom(ctx));
  }),

  createCompany: secureProcedure("jobsite")
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        yardLat: latSchema.optional(),
        yardLng: lngSchema.optional(),
        requireOnSiteToClock: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return createJobsiteCompany(actorFrom(ctx), input);
    }),

  updateCompany: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        name: z.string().trim().min(2).max(120).optional(),
        yardLat: latSchema.optional(),
        yardLng: lngSchema.optional(),
        yardRadiusMeters: z.number().int().min(25).max(5000).optional(),
        requireOnSiteToClock: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return updateJobsiteCompany(actorFrom(ctx), input);
    }),

  inviteMember: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        email: z.string().email().max(320),
        role: z.enum(["office_manager", "crew"]),
        displayName: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return inviteJobsiteMember(actorFrom(ctx), input);
    }),

  revokeMember: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema, memberId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      gate(ctx);
      revokeJobsiteMember(actorFrom(ctx), input);
      return { ok: true as const };
    }),

  listMembers: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listJobsiteMembers(actorFrom(ctx), input.companyId);
    }),

  createJob: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        name: z.string().trim().min(2).max(120),
        address: z.string().trim().min(2).max(200),
        lat: latSchema,
        lng: lngSchema,
        radiusMeters: z.number().int().min(25).max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return createJobsiteJob(actorFrom(ctx), input);
    }),

  listJobs: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listJobsiteJobs(actorFrom(ctx), input.companyId);
    }),

  clockIn: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        jobId: jobIdSchema,
        lat: latSchema.optional(),
        lng: lngSchema.optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return clockIn(actorFrom(ctx), input);
    }),

  clockOut: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        lat: latSchema.optional(),
        lng: lngSchema.optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return clockOut(actorFrom(ctx), input);
    }),

  listRoster: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listJobsiteRoster(actorFrom(ctx), input.companyId);
    }),

  dashboard: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return getOfficeDashboard(actorFrom(ctx), input.companyId);
    }),

  createInventoryItem: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        sku: z.string().trim().min(1).max(40),
        name: z.string().trim().min(1).max(120),
        unit: z.string().trim().min(1).max(16).default("ea"),
        qtyYard: z.number().int().min(0).max(1_000_000).optional(),
        qtyTruck: z.number().int().min(0).max(1_000_000).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return createInventoryItem(actorFrom(ctx), input);
    }),

  listInventory: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listInventory(actorFrom(ctx), input.companyId);
    }),

  checkoutToJob: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        itemId: z.string().uuid(),
        jobId: jobIdSchema,
        source: z.enum(["yard", "truck"]),
        quantity: z.number().int().min(1).max(10_000),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return checkoutInventoryToJob(actorFrom(ctx), input);
    }),

  consumeOnJob: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        itemId: z.string().uuid(),
        jobId: jobIdSchema,
        quantity: z.number().int().min(1).max(10_000),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return consumeInventoryOnJob(actorFrom(ctx), input);
    }),

  registerEquipment: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        name: z.string().trim().min(2).max(120),
        make: z.string().trim().max(80).optional(),
        model: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return registerEquipment(actorFrom(ctx), input);
    }),

  rotateEquipmentToken: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema, equipmentId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return rotateEquipmentToken(actorFrom(ctx), input);
    }),

  recordEquipmentPing: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        equipmentId: z.string().uuid(),
        lat: latSchema,
        lng: lngSchema,
        engineHours: z.number().min(0).max(200_000).optional(),
        fuelPercent: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return recordEquipmentPing(actorFrom(ctx), input);
    }),

  /** Hardware puck ingest — device token only. Never returns equipment data. */
  ingestEquipmentPing: securePublicProcedure("jobsite")
    .input(
      z.object({
        equipmentId: z.string().uuid(),
        deviceToken: z.string().min(32).max(128),
        lat: latSchema,
        lng: lngSchema,
        engineHours: z.number().min(0).max(200_000).optional(),
        fuelPercent: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      try {
        return ingestEquipmentPing(input);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid credentials." });
      }
    }),

  listEquipment: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listEquipment(actorFrom(ctx), input.companyId);
    }),

  addDailyLog: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        jobId: jobIdSchema,
        weather: z.string().trim().max(200),
        crewNotes: z.string().trim().min(1).max(2000),
        materials: z.string().trim().max(1000).default(""),
        delays: z.string().trim().max(1000).default(""),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return addDailyLog(actorFrom(ctx), input);
    }),

  listDailyLogs: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema, jobId: jobIdSchema.optional() }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listDailyLogs(actorFrom(ctx), input.companyId, input.jobId);
    }),

  addPunchItem: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        jobId: jobIdSchema,
        title: z.string().trim().min(2).max(200),
        locationNote: z.string().trim().max(200).default(""),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return addPunchListItem(actorFrom(ctx), input);
    }),

  completePunchItem: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema, itemId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return completePunchListItem(actorFrom(ctx), input);
    }),

  listPunchList: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema, jobId: jobIdSchema.optional() }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listPunchList(actorFrom(ctx), input.companyId, input.jobId);
    }),

  addSafetyReport: secureProcedure("jobsite")
    .input(
      z.object({
        companyId: companyIdSchema,
        jobId: jobIdSchema,
        checklist: z.string().trim().min(2).max(500),
        notes: z.string().trim().max(2000).default(""),
        incident: z.boolean().default(false),
      }),
    )
    .mutation(({ ctx, input }) => {
      gate(ctx);
      return addSafetyReport(actorFrom(ctx), input);
    }),

  listSafetyReports: secureProcedure("jobsite")
    .input(z.object({ companyId: companyIdSchema, jobId: jobIdSchema.optional() }))
    .query(({ ctx, input }) => {
      gate(ctx);
      return listSafetyReports(actorFrom(ctx), input.companyId, input.jobId);
    }),
});
