import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, secureProcedure } from "../_core/trpc";
import { CARTOON_STYLES, publicCartoonProject } from "../../lib/cartoon-studio";
import {
  CARTOON_STUDIO_BILLING_NOTES,
  CARTOON_STUDIO_TIERS,
  quoteCartoonStudio,
} from "../../lib/cartoon-studio-pricing";
import { buildCartoonStudioPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { billingStateSchema } from "../../lib/billing-state-schema";
import { acceptedNoRefundSchema } from "../_core/conduct-ledger-service";
import { assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import {
  assertPaymentChannelAllowed,
  assertSimulatedPurchaseAllowed,
  paymentChannelNote,
} from "../_core/payment-channel-guard";
import {
  createCartoonVideo,
  deleteCartoonVideo,
  getCartoonVideo,
  listCartoonVideos,
  updateCartoonTimeline,
} from "../_core/cartoon-studio-service";

const styleSchema = z.enum(["classic", "comic", "modern", "educational"]);
const tierSchema = z.enum(["draft", "lite", "mid", "cinema", "premiere"]);
const clientPlatformSchema = z.enum(["web", "native"]);
const musicMoodSchema = z.enum(["none", "upbeat", "calm", "lesson"]);

export const cartoonStudioRouter = router({
  catalog: secureProcedure("video").query(() => ({
    styles: CARTOON_STYLES,
    tiers: CARTOON_STUDIO_TIERS,
    billingNotes: [...CARTOON_STUDIO_BILLING_NOTES],
    quotes: [
      ...CARTOON_STUDIO_TIERS.flatMap((tier) =>
        tier.secondOptions.map((seconds) => quoteCartoonStudio(tier.id, seconds)),
      ),
    ],
  })),

  quote: secureProcedure("video")
    .input(
      z.object({
        tierId: tierSchema,
        seconds: z.number().int().min(8).max(32),
        stateCode: billingStateSchema.optional(),
      }),
    )
    .query(({ input }) => {
      const quote = quoteCartoonStudio(input.tierId, input.seconds);
      return {
        quote,
        purchaseSummary: buildCartoonStudioPurchaseSummary({
          tierId: input.tierId,
          seconds: input.seconds,
          stateCode: input.stateCode,
        }),
      };
    }),

  list: secureProcedure("video").query(({ ctx }) =>
    listCartoonVideos(String(ctx.user.id)).map(publicCartoonProject),
  ),

  get: secureProcedure("video")
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      publicCartoonProject(getCartoonVideo(String(ctx.user.id), input.projectId)),
    ),

  purchaseAndCreate: secureProcedure("video")
    .input(
      z.object({
        idea: z.string().trim().min(8).max(2000),
        style: styleSchema.default("classic"),
        tierId: tierSchema,
        seconds: z.number().int().min(8).max(32),
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quote = quoteCartoonStudio(input.tierId, input.seconds);
      if (ctx.isPlatformOwner) {
        const project = await createCartoonVideo({
          userId: String(ctx.user.id),
          isPlatformOwner: true,
          idea: input.idea,
          style: input.style,
          quote,
          complimentary: true,
        });
        const receipt = buildCartoonStudioPurchaseSummary({
          tierId: input.tierId,
          seconds: input.seconds,
          stateCode: input.stateCode,
        });
        return {
          ok: true as const,
          complimentary: true,
          project: publicCartoonProject(project),
          receipt,
          message: "Owner complimentary — no card charged.",
          paymentChannel: paymentChannelNote(quote.subtotalCents),
        };
      }

      assertSimulatedPurchaseAllowed();
      assertPaymentChannelAllowed({
        subtotalCents: quote.subtotalCents,
        clientPlatform: input.clientPlatform,
      });
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: quote.sku,
        amountCents: quote.subtotalCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });

      const project = await createCartoonVideo({
        userId: String(ctx.user.id),
        isPlatformOwner: false,
        idea: input.idea,
        style: input.style,
        quote,
      });
      const receipt = buildCartoonStudioPurchaseSummary({
        tierId: input.tierId,
        seconds: input.seconds,
        stateCode: input.stateCode,
      });
      return {
        ok: true as const,
        complimentary: false,
        project: publicCartoonProject(project),
        receipt,
        message: formatPurchaseReceiptMessage(receipt),
        paymentChannel: paymentChannelNote(quote.subtotalCents),
      };
    }),

  create: secureProcedure("video")
    .input(
      z.object({
        idea: z.string().trim().min(8).max(2000),
        style: styleSchema.default("classic"),
        tierId: tierSchema.default("draft"),
        seconds: z.number().int().min(8).max(32).default(16),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Customers pay first on Draft, Lite, Mid, Cinema, or Premiere. There is no free cartoon.",
        });
      }
      return publicCartoonProject(
        await createCartoonVideo({
          userId: String(ctx.user.id),
          isPlatformOwner: true,
          idea: input.idea,
          style: input.style,
          quote: quoteCartoonStudio(input.tierId, input.seconds),
          complimentary: true,
        }),
      );
    }),

  updateTimeline: secureProcedure("video")
    .input(
      z.object({
        projectId: z.string().uuid(),
        sceneOrder: z.array(z.string().uuid()).max(8).optional(),
        edits: z
          .array(
            z.object({
              sceneId: z.string().uuid(),
              title: z.string().trim().max(80).optional(),
              narration: z.string().trim().max(280).optional(),
              caption: z.string().trim().max(160).optional(),
              durationSeconds: z.number().int().min(3).max(12).optional(),
              voiceEnabled: z.boolean().optional(),
              musicMood: musicMoodSchema.optional(),
              musicVolume: z.number().int().min(0).max(100).optional(),
            }),
          )
          .max(8)
          .optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      publicCartoonProject(
        updateCartoonTimeline({
          userId: String(ctx.user.id),
          projectId: input.projectId,
          sceneOrder: input.sceneOrder,
          edits: input.edits,
        }),
      ),
    ),

  delete: secureProcedure("video")
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(({ ctx, input }) => deleteCartoonVideo(String(ctx.user.id), input.projectId)),
});
