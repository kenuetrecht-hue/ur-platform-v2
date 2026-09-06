import { z } from "zod";
import { ownerProcedure, router, secureProcedure } from "../_core/trpc";
import {
  COMMUNITY_PURPOSE_POLICY,
  CONDUCT_CHECKBOX_LABEL,
  CONDUCT_RULES_VERSION,
  listConductRuleBullets,
  PURCHASE_NO_REFUND_CHECKBOX_LABEL,
  TERMS_EFFECTIVE_DATE,
} from "../../lib/platform-terms-of-use";
import {
  assertConductAccepted,
  getConductStatus,
  listCommunicationsForOwner,
  listConductAcceptancesForOwner,
  listPurchaseAcksForOwner,
  recordConductAcceptance,
  type ConductChannel,
} from "../_core/conduct-ledger-service";
import {
  assertNotUnderWorldReview,
  listWorldRedFlagsForOwner,
  memberWorldHoldForClient,
  ownerClearWorldReview,
  ownerDiscontinueWorldUser,
} from "../_core/world-monitor-service";
import {
  acknowledgeSecurityIncidentNotice,
  getActiveSecurityNoticeForMember,
  listSecurityIncidentNotices,
  publishSecurityIncidentNotice,
} from "../_core/security-incident-notice-service";

const channelSchema = z.enum([
  "ai_chat",
  "direct_message",
  "social_post",
  "talk_transcript",
  "ur_world",
]);

export const conductRouter = router({
  status: secureProcedure("auth").query(({ ctx }) => {
    const status = getConductStatus(String(ctx.user.id));
    return {
      ...status,
      isPlatformOwner: ctx.isPlatformOwner,
      required: !ctx.isPlatformOwner,
      checkboxLabel: CONDUCT_CHECKBOX_LABEL,
      purpose: COMMUNITY_PURPOSE_POLICY,
      bullets: listConductRuleBullets(),
      noRefundCheckboxLabel: PURCHASE_NO_REFUND_CHECKBOX_LABEL,
      effectiveDate: TERMS_EFFECTIVE_DATE,
      reviewHold: memberWorldHoldForClient({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    };
  }),

  accept: secureProcedure("auth")
    .input(
      z.object({
        accepted: z.literal(true, {
          errorMap: () => ({ message: "Check the box to sign the UR rules." }),
        }),
        version: z.string().trim().min(1).max(32),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (input.version !== CONDUCT_RULES_VERSION) {
        return {
          ok: false as const,
          message: "These rules were updated. Refresh and check the box on the current version.",
        };
      }
      const userAgent =
        typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : undefined;
      const record = recordConductAcceptance({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        ipAddress: ctx.ip,
        userAgent,
      });
      return {
        ok: true as const,
        version: record.version,
        acceptedAt: record.acceptedAt,
      };
    }),

  review: ownerProcedure
    .input(
      z
        .object({
          channel: channelSchema.optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(({ input }) => ({
      version: CONDUCT_RULES_VERSION,
      communications: listCommunicationsForOwner({
        channel: input?.channel as ConductChannel | undefined,
        limit: input?.limit,
      }),
      purchaseAcks: listPurchaseAcksForOwner(80),
      signatures: listConductAcceptancesForOwner(80),
      worldRedFlags: listWorldRedFlagsForOwner(80),
    })),

  securityNotice: secureProcedure("auth").query(({ ctx }) =>
    getActiveSecurityNoticeForMember(String(ctx.user.id)),
  ),

  acknowledgeSecurityNotice: secureProcedure("auth")
    .input(z.object({ noticeId: z.string().uuid(), acknowledged: z.literal(true) }))
    .mutation(({ ctx, input }) =>
      acknowledgeSecurityIncidentNotice({
        userId: String(ctx.user.id),
        noticeId: input.noticeId,
      }),
    ),

  publishSecurityNotice: ownerProcedure
    .input(
      z.object({
        title: z.string().trim().min(8).max(120),
        body: z.string().trim().min(20).max(2000),
      }),
    )
    .mutation(({ ctx, input }) =>
      publishSecurityIncidentNotice({
        ownerUserId: String(ctx.user.id),
        title: input.title,
        body: input.body,
      }),
    ),

  listSecurityNotices: ownerProcedure.query(() => listSecurityIncidentNotices()),

  resolveWorldHold: ownerProcedure
    .input(
      z.object({
        userId: z.string().trim().min(1).max(80),
        action: z.enum(["reactivate", "discontinue"]),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.action === "reactivate") {
        const hold = ownerClearWorldReview(input.userId);
        return { ok: true as const, status: hold.status, userId: hold.userId };
      }
      const hold = await ownerDiscontinueWorldUser(input.userId);
      return { ok: true as const, status: hold.status, userId: hold.userId };
    }),
});

export function requireSignedConduct(ctx: { user: { id: string | number }; isPlatformOwner?: boolean }): void {
  assertConductAccepted({
    userId: String(ctx.user.id),
    isPlatformOwner: ctx.isPlatformOwner,
  });
}

export function requireWorldAccess(ctx: { user: { id: string | number }; isPlatformOwner?: boolean }): void {
  requireSignedConduct(ctx);
  assertNotUnderWorldReview({
    userId: String(ctx.user.id),
    isPlatformOwner: ctx.isPlatformOwner,
  });
}
