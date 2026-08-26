import { z } from "zod";
import { router, secureProcedure } from "../_core/trpc";
import { getAgeKycPublicStatus, submitAgeKyc } from "../_core/age-kyc-service";
import { AGE_KYC_MIME_TYPES } from "../../lib/age-kyc-policy";
import { assertTurnstileToken } from "../_core/turnstile";

const photoSchema = z.object({
  mimeType: z.enum(AGE_KYC_MIME_TYPES),
  base64: z.string().trim().min(80).max(6_000_000),
});

export const ageKycRouter = router({
  getStatus: secureProcedure("auth").query(async ({ ctx }) => {
    return getAgeKycPublicStatus(ctx.user.id);
  }),

  submit: secureProcedure("auth")
    .input(
      z.object({
        documentType: z.enum(["driver_license", "state_id", "passport", "national_id"]),
        idFront: photoSchema,
        idBack: photoSchema,
        selfie: photoSchema,
        turnstileToken: z.string().trim().max(4096).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTurnstileToken({
        token: input.turnstileToken,
        action: "age_kyc",
        ip: ctx.ip,
      });
      return submitAgeKyc({
        userId: ctx.user.id,
        documentType: input.documentType,
        idFront: input.idFront,
        idBack: input.idBack,
        selfie: input.selfie,
      });
    }),
});
