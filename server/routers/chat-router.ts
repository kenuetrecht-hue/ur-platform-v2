import { z } from "zod";
import {
  generateGoogleChatReply,
  isGoogleCloudAiConfigured,
} from "../_core/google-ai";
import { assertUserCanUseAi, enforceAiGuardrails } from "../_core/ai-guardrails";
import { assertUserIsAgeVerified } from "../_core/age-kyc-service";
import { assertConductAccepted } from "../_core/conduct-ledger-service";
import {
  assertNotUnderWorldReview,
  getNativeLanguage,
  recordAndMonitorCommunication,
} from "../_core/world-monitor-service";
import { assertNoAiTakeoverInMessage } from "../_core/ai-control";
import { assertMessageWithinAiRole } from "../_core/ai-roles";
import { sanitizeChatHistory, sanitizeUserText } from "../_core/input-sanitize";
import { CONTENTMATE_SYSTEM_PROMPT } from "../_core/multilingual-prompts";
import { mapServiceErrorToTrpc } from "../_core/service-errors";
import { secureProcedure, router, TRPCError } from "../_core/trpc";

const chatHistorySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  }),
);

export const chatRouter = router({
  sendMessage: secureProcedure("chat")
    .input(
      z.object({
        message: z.string().trim().min(1).max(2000),
        history: chatHistorySchema.max(20).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!isGoogleCloudAiConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This feature is not available right now.",
        });
      }

      try {
        await assertUserIsAgeVerified(ctx.user.id);
        assertConductAccepted({
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
        });
        assertNotUnderWorldReview({
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
        });
        assertUserCanUseAi(String(ctx.user.id), ctx.isPlatformOwner);

        const message = sanitizeUserText(input.message, 2000);
        assertNoAiTakeoverInMessage(message, ctx.isPlatformOwner);
        assertMessageWithinAiRole(message, "contentmate", ctx.isPlatformOwner);
        const { flag } = await recordAndMonitorCommunication({
          channel: "ai_chat",
          userId: String(ctx.user.id),
          userEmail: ctx.user.email ?? undefined,
          peerId: "contentmate",
          original: message,
          isPlatformOwner: ctx.isPlatformOwner,
        });
        if (flag) {
          return {
            reply: flag.memberWarning,
            model: "world-director-monitor",
            userId: ctx.user.id,
          };
        }
        const history = sanitizeChatHistory(input.history ?? [], 20, 4000);
        const nativeReplyLanguage = ctx.isPlatformOwner
          ? undefined
          : getNativeLanguage(String(ctx.user.id));

        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: CONTENTMATE_SYSTEM_PROMPT,
          history,
          message,
          responseLanguage: nativeReplyLanguage,
        });

        const reply = enforceAiGuardrails({
          userMessage: message,
          aiReply: rawReply,
          userId: String(ctx.user.id),
          isOwner: ctx.isPlatformOwner,
          role: "contentmate",
        });

        return {
          reply,
          model,
          userId: ctx.user.id,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        mapServiceErrorToTrpc(error);
      }
    }),
});
