import { z } from "zod";
import { router, secureProcedure, securePublicProcedure } from "../_core/trpc";
import {
  claimAgeKycPass,
  getAgeKycPublicStatus,
  precheckAgeKyc,
  submitAgeKyc,
} from "../_core/age-kyc-service";
import { AGE_KYC_MIME_TYPES } from "../../lib/age-kyc-policy";
import { assertTurnstileToken } from "../_core/turnstile";

const photoSchema = z.object({
  mimeType: z.enum(AGE_KYC_MIME_TYPES),
  base64: z.string().trim().min(80).max(6_000_000),
});

const photoCheckInput = z.object({
  documentType: z.enum(["driver_license", "state_id", "passport", "national_id"]),
  idFront: photoSchema,
  idBack: photoSchema,
  selfie: photoSchema,
  turnstileToken: z.string().trim().max(4096).optional(),
});

export const ageKycRouter = router({
  getStatus: secureProcedure("auth").query(async ({ ctx }) => {
    return getAgeKycPublicStatus(ctx.user.id);
  }),

  /** Check ID photos before create-account or sign-in. No login required. */
  precheck: securePublicProcedure("auth")
    .input(photoCheckInput)
    .mutation(async ({ ctx, input }) => {
      await assertTurnstileToken({
        token: input.turnstileToken,
        action: "age_kyc",
        ip: ctx.ip,
      });
      return precheckAgeKyc({
        ip: ctx.ip,
        documentType: input.documentType,
        idFront: input.idFront,
        idBack: input.idBack,
        selfie: input.selfie,
      });
    }),

  claimPass: secureProcedure("auth")
    .input(z.object({ passToken: z.string().trim().min(20).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      return claimAgeKycPass({
        userId: ctx.user.id,
        passToken: input.passToken,
      });
    }),

  submit: secureProcedure("auth")
    .input(photoCheckInput)
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
