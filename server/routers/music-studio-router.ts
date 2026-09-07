import { z } from "zod";
import { router, secureProcedure } from "../_core/trpc";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { mapServiceErrorToTrpc } from "../_core/service-errors";
import { billingStateSchema } from "../../lib/billing-state-schema";
import { acceptedNoRefundSchema } from "../_core/conduct-ledger-service";
import { assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import {
  assertPaymentChannelAllowed,
  assertSimulatedPurchaseAllowed,
  paymentChannelNote,
} from "../_core/payment-channel-guard";
import {
  MUSIC_BPM_MAX,
  MUSIC_BPM_MIN,
  MUSIC_KEYS,
  MUSIC_KITS,
  MUSIC_LYRICS_MAX,
  MUSIC_NOTES_MAX,
  MUSIC_STEPS,
  MUSIC_TITLE_MAX,
  MUSIC_TRACKS,
} from "../../lib/music-studio";
import {
  MUSIC_STUDIO_BILLING_NOTES,
  MUSIC_STUDIO_PLANS,
  quoteMusicStudio,
} from "../../lib/music-studio-pricing";
import { buildMusicStudioPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import {
  consumeMusicExport,
  consumeMusicVocalTake,
  getMusicStudioStatus,
  purchaseMusicStudioPlan,
} from "../_core/music-studio-entitlement-service";
import {
  createMusicProject,
  getMusicProject,
  joinMusicProject,
  listMusicProjects,
  saveMusicProject,
} from "../_core/music-studio-service";

const patternSchema = z.object({
  kick: z.array(z.boolean()).length(MUSIC_STEPS),
  snare: z.array(z.boolean()).length(MUSIC_STEPS),
  hat: z.array(z.boolean()).length(MUSIC_STEPS),
  bass: z.array(z.boolean()).length(MUSIC_STEPS),
  clap: z.array(z.boolean()).length(MUSIC_STEPS),
  perc: z.array(z.boolean()).length(MUSIC_STEPS),
  pad: z.array(z.boolean()).length(MUSIC_STEPS),
  lead: z.array(z.boolean()).length(MUSIC_STEPS),
});

const mixerChannelSchema = z.object({
  volume: z.number().min(0).max(100),
  pan: z.number().min(-100).max(100),
  mute: z.boolean(),
  solo: z.boolean(),
});

const mixerSchema = z.object(
  Object.fromEntries(MUSIC_TRACKS.map((track) => [track, mixerChannelSchema])) as Record<
    (typeof MUSIC_TRACKS)[number],
    typeof mixerChannelSchema
  >,
);

const planSchema = z.enum(["session", "month", "year"]);
const clientPlatformSchema = z.enum(["web", "native"]);

function gate(isPlatformOwner: boolean): void {
  assertSectionEnabledForRequest("music_studio", isPlatformOwner);
}

export const musicStudioRouter = router({
  catalog: secureProcedure("aiCreators").query(({ ctx }) => {
    gate(ctx.isPlatformOwner);
    return {
      plans: MUSIC_STUDIO_PLANS,
      billingNotes: [...MUSIC_STUDIO_BILLING_NOTES],
      quotes: MUSIC_STUDIO_PLANS.map((plan) => quoteMusicStudio(plan.id)),
      status: getMusicStudioStatus(String(ctx.user.id), ctx.isPlatformOwner),
    };
  }),

  quote: secureProcedure("aiCreators")
    .input(z.object({ planId: planSchema, stateCode: billingStateSchema.optional() }))
    .query(({ ctx, input }) => {
      gate(ctx.isPlatformOwner);
      const quote = quoteMusicStudio(input.planId);
      return {
        quote,
        purchaseSummary: buildMusicStudioPurchaseSummary({
          planId: input.planId,
          stateCode: input.stateCode,
        }),
      };
    }),

  status: secureProcedure("aiCreators").query(({ ctx }) => {
    gate(ctx.isPlatformOwner);
    return getMusicStudioStatus(String(ctx.user.id), ctx.isPlatformOwner);
  }),

  purchase: secureProcedure("aiCreators")
    .input(
      z.object({
        planId: planSchema,
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      try {
        gate(ctx.isPlatformOwner);
        const quote = quoteMusicStudio(input.planId);
        if (ctx.isPlatformOwner) {
          const result = purchaseMusicStudioPlan({
            userId: String(ctx.user.id),
            planId: input.planId,
            isPlatformOwner: true,
          });
          return {
            ok: true as const,
            complimentary: true,
            ...result,
            receipt: buildMusicStudioPurchaseSummary({
              planId: input.planId,
              stateCode: input.stateCode,
            }),
            message: "Owner complimentary — UR Studio Pro is on. No card charged.",
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
        const result = purchaseMusicStudioPlan({
          userId: String(ctx.user.id),
          planId: input.planId,
        });
        const receipt = buildMusicStudioPurchaseSummary({
          planId: input.planId,
          stateCode: input.stateCode,
        });
        return {
          ok: true as const,
          complimentary: false,
          ...result,
          receipt,
          message: formatPurchaseReceiptMessage(receipt),
          paymentChannel: paymentChannelNote(quote.subtotalCents),
        };
      } catch (error) {
        mapServiceErrorToTrpc(error);
      }
    }),

  consumeExport: secureProcedure("aiCreators").mutation(({ ctx }) => {
    try {
      gate(ctx.isPlatformOwner);
      return consumeMusicExport(String(ctx.user.id), ctx.isPlatformOwner);
    } catch (error) {
      mapServiceErrorToTrpc(error);
    }
  }),

  consumeVocalTake: secureProcedure("aiCreators").mutation(({ ctx }) => {
    try {
      gate(ctx.isPlatformOwner);
      return consumeMusicVocalTake(String(ctx.user.id), ctx.isPlatformOwner);
    } catch (error) {
      mapServiceErrorToTrpc(error);
    }
  }),

  list: secureProcedure("aiCreators").query(({ ctx }) => {
    try {
      gate(ctx.isPlatformOwner);
      return { projects: listMusicProjects(String(ctx.user.id)) };
    } catch (error) {
      mapServiceErrorToTrpc(error);
    }
  }),

  get: secureProcedure("aiCreators")
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      try {
        gate(ctx.isPlatformOwner);
        return getMusicProject(input.projectId, String(ctx.user.id));
      } catch (error) {
        mapServiceErrorToTrpc(error);
      }
    }),

  create: secureProcedure("aiCreators")
    .input(z.object({ title: z.string().trim().max(MUSIC_TITLE_MAX).optional() }))
    .mutation(({ ctx, input }) => {
      try {
        gate(ctx.isPlatformOwner);
        return createMusicProject({ userId: String(ctx.user.id), title: input.title });
      } catch (error) {
        mapServiceErrorToTrpc(error);
      }
    }),

  save: secureProcedure("aiCreators")
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().trim().max(MUSIC_TITLE_MAX).optional(),
        bpm: z.number().int().min(MUSIC_BPM_MIN).max(MUSIC_BPM_MAX).optional(),
        kit: z.enum(MUSIC_KITS).optional(),
        key: z.enum(MUSIC_KEYS).optional(),
        pattern: patternSchema.optional(),
        mixer: mixerSchema.optional(),
        fx: z
          .object({
            reverb: z.number().min(0).max(100),
            delay: z.number().min(0).max(100),
            filter: z.number().min(0).max(100),
          })
          .optional(),
        bars: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
        lyrics: z.string().max(MUSIC_LYRICS_MAX).optional(),
        notes: z.string().max(MUSIC_NOTES_MAX).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      try {
        gate(ctx.isPlatformOwner);
        return saveMusicProject({
          userId: String(ctx.user.id),
          projectId: input.projectId,
          title: input.title,
          bpm: input.bpm,
          kit: input.kit,
          key: input.key,
          pattern: input.pattern,
          mixer: input.mixer,
          fx: input.fx,
          bars: input.bars,
          lyrics: input.lyrics,
          notes: input.notes,
        });
      } catch (error) {
        mapServiceErrorToTrpc(error);
      }
    }),

  join: secureProcedure("aiCreators")
    .input(z.object({ joinCode: z.string().trim().min(4).max(8) }))
    .mutation(({ ctx, input }) => {
      try {
        gate(ctx.isPlatformOwner);
        return joinMusicProject({ userId: String(ctx.user.id), joinCode: input.joinCode });
      } catch (error) {
        mapServiceErrorToTrpc(error);
      }
    }),
});
