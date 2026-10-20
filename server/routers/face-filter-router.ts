import { z } from "zod";
import { router, secureProcedure, secureCheckoutProcedure } from "../_core/trpc";
import { billingStateSchema } from "../../lib/billing-state-schema";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import {
  assertPaymentChannelAllowed,
  assertSimulatedPurchaseAllowed,
  paymentChannelNote,
} from "../_core/payment-channel-guard";
import { redirectToLiveCheckout } from "../_core/platform-checkout";
import { FACE_FILTER_AI_NAME, faceFilterPlanLabel } from "../../lib/face-filter-pricing";
import {
  assertFaceFilterPlan,
  faceFilterCatalog,
  faceFilterChargeCents,
  grantFaceFilterPass,
} from "../_core/face-filter-pass-service";
import { mapServiceErrorToTrpc } from "../_core/service-errors";

const clientPlatformSchema = z.enum(["web", "native"]);

export const faceFilterRouter = router({
  catalog: secureProcedure("ai").query(({ ctx }) =>
    faceFilterCatalog(String(ctx.user.id), ctx.isPlatformOwner),
  ),

  buy: secureCheckoutProcedure("ai")
    .input(
      z.object({
        planId: z.enum(["week", "month"]),
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const planId = assertFaceFilterPlan(input.planId);
        const priceCents = faceFilterChargeCents(planId);
        const userId = String(ctx.user.id);
        if (ctx.isPlatformOwner) {
          const pass = grantFaceFilterPass({ userId, planId });
          return {
            ok: true as const,
            complimentary: true,
            expiresAt: pass.expiresAt,
            message: "Owner complimentary. This week's looks are open. No card charged.",
          };
        }
        const liveCheckout = await redirectToLiveCheckout({
          userId,
          userEmail: ctx.user.email ?? "",
          productName: `${FACE_FILTER_AI_NAME} face looks`,
          description: faceFilterPlanLabel(planId),
          priceCents,
          billingStateCode: input.stateCode,
          successPath: "/face-filters?paid=1",
          cancelPath: "/face-filters?paid=0",
          metadata: {
            kind: "face_filter_pass",
            planId,
            priceCents: String(priceCents),
          },
        });
        if (liveCheckout) return { ok: true as const, ...liveCheckout };
        assertSimulatedPurchaseAllowed();
        assertPaymentChannelAllowed({
          subtotalCents: priceCents,
          clientPlatform: input.clientPlatform,
        });
        assertAndRecordNoRefundAck({
          userId,
          userEmail: ctx.user.email ?? undefined,
          sku: `face_filter.${planId}`,
          amountCents: priceCents,
          acceptedNoRefund: true,
          ipAddress: ctx.ip,
        });
        const pass = grantFaceFilterPass({ userId, planId });
        return {
          ok: true as const,
          complimentary: false,
          expiresAt: pass.expiresAt,
          message: `${faceFilterPlanLabel(planId)} is open.`,
          paymentChannel: paymentChannelNote(priceCents),
        };
      } catch (error) {
        mapServiceErrorToTrpc(error);
      }
    }),
});
