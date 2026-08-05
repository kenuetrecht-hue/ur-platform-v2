import { z } from "zod";
import { handleCreatorAiChat } from "../_core/ai-chat-handler";
import {
  isCreatorAiId,
  listCreatorsForClient,
} from "../_core/ai-creator-registry";
import { getCreatorHiveProfile } from "../_core/ai-hive-orchestrator";
import { isOwnerOnlyPlatformAi, canChatOwnerOpsAi } from "../_core/platform-ops-ai";
import { getAdminAccessForUser } from "../_core/admin-access-service";
import { assertAiEntitled } from "../_core/access-entitlements";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import { ElevenLabsVoiceService, AI_PERSONA_VOICES } from "../elevenlabs-integration";
import { getHandoffSuggestions, buildHandoffMessage } from "../_core/ai-handoff-service";
import {
  consumePremiumMinute,
  getPremiumMediaStatus,
  hasAffiliateVoiceAccess,
  hasAiVideoTalkAccess,
  hasCreatorVoiceAccess,
} from "../_core/ai-premium-media-service";
import { AFFILIATE_ASSOCIATE_ID, isAffiliateOnlyAi } from "../_core/affiliate-associate-ai";

const CREATOR_VOICE_PERSONA: Record<string, keyof typeof AI_PERSONA_VOICES> = {
  "ai-coder-001": "TECH_BUILDER",
  "ai-game-dev-001": "GAME_FORGE",
  contentmate: "GAME_FORGE",
  "affiliate-associate": "COMPLIANCE_DOCTOR",
};

const chatHistorySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  }),
);

const creatorIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isCreatorAiId, { message: "Unknown AI assistant." });

export const aiCreatorChatRouter = router({
  /** Public — browsing AI specialists does not require login. Owner ops AIs are never listed. */
  list: securePublicProcedure("aiCreators").query(({ ctx }) => {
    const creators = listCreatorsForClient({ includeOwnerOps: false });
    return {
      total: creators.length,
      creators,
      isPlatformOwner: ctx.isPlatformOwner,
    };
  }),

  get: securePublicProcedure("aiCreators")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input, ctx }) => {
      if (isOwnerOnlyPlatformAi(input.creatorId) || isAffiliateOnlyAi(input.creatorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      const creators = listCreatorsForClient({ includeOwnerOps: false });
      const creator = creators.find((c) => c.id === input.creatorId);
      if (!creator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      const hive = getCreatorHiveProfile(input.creatorId);
      return { ...creator, hive };
    }),

  getHiveProfile: securePublicProcedure("aiCreators")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input }) => {
      if (isOwnerOnlyPlatformAi(input.creatorId) || isAffiliateOnlyAi(input.creatorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      const hive = getCreatorHiveProfile(input.creatorId);
      if (!hive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      return hive;
    }),

  sendMessage: secureProcedure("aiCreators")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        message: z.string().trim().min(1).max(2000),
        history: chatHistorySchema.max(20).optional(),
        /** Explicitly invoke multi-AI hive consultation with peer specialists */
        useHiveConsult: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const adminAccess = getAdminAccessForUser({
        userId: ctx.user.id,
        email: ctx.user.email,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      const allowedOpsChat = canChatOwnerOpsAi({
        isPlatformOwner: ctx.isPlatformOwner,
        canChatOwnerOps: adminAccess.permissions.includes("chat_ops_ai"),
      });
      if (isOwnerOnlyPlatformAi(input.creatorId) && !allowedOpsChat) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Doctor AI, Administration AI, and Security AI are restricted to the Administration Dashboard.",
        });
      }
      const result = await handleCreatorAiChat({
        creatorId: input.creatorId,
        message: input.message,
        history: input.history,
        useHiveConsult: input.useHiveConsult,
        ctx: {
          userId,
          isPlatformOwner: ctx.isPlatformOwner,
          userEmail: ctx.user.email,
          canChatOwnerOps: adminAccess.permissions.includes("chat_ops_ai"),
        },
      });

      return {
        ...result,
        userId,
      };
    }),

  /** Voice synthesis for specialists that support pair programming / read-aloud */
  synthesizeVoice: secureProcedure("aiCreators")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        text: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = String(ctx.user.id);

      if (input.creatorId === AFFILIATE_ASSOCIATE_ID) {
        if (!hasAffiliateVoiceAccess(userId) && !ctx.isPlatformOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Purchase an Associate AI voice pack from the Affiliate Dashboard to hear your sales assistant speak.",
          });
        }
        consumePremiumMinute({
          userId,
          kind: "affiliate_voice",
          creatorId: AFFILIATE_ASSOCIATE_ID,
        });
      } else if (input.creatorId === "contentmate") {
        if (!hasCreatorVoiceAccess(userId, "contentmate") && !ctx.isPlatformOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Purchase a ContentMate voice pack from the Creator Dashboard to hear your assistant speak.",
          });
        }
        consumePremiumMinute({ userId, kind: "creator_voice", creatorId: "contentmate" });
      } else {
        assertAiEntitled({
          userId: ctx.user.id,
          email: ctx.user.email,
          isPlatformOwner: ctx.isPlatformOwner,
          feature: "ai_chat",
        });
      }

      const personaKey = CREATOR_VOICE_PERSONA[input.creatorId];
      if (!personaKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voice is not available for this specialist yet.",
        });
      }

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return {
          success: false as const,
          error: "Voice requires ELEVENLABS_API_KEY in server environment.",
        };
      }

      const voiceConfig = AI_PERSONA_VOICES[personaKey];
      const service = new ElevenLabsVoiceService(apiKey);
      const response = await service.synthesizeVoice({
        text: input.text.slice(0, 5000),
        voiceId: voiceConfig.voiceId,
        stability: voiceConfig.stability,
        similarityBoost: voiceConfig.similarityBoost,
      });

      return {
        success: true as const,
        audioUrl: response.audioUrl,
        audioBase64: response.audioBase64,
        duration: response.duration,
        persona: voiceConfig.name,
      };
    }),

  getHandoffs: securePublicProcedure("aiCreators")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input }) => ({
      suggestions: getHandoffSuggestions(input.creatorId).filter(
        (h) => !isOwnerOnlyPlatformAi(h.targetCreatorId),
      ),
    })),

  prepareHandoff: secureProcedure("aiCreators")
    .input(
      z.object({
        fromCreatorId: creatorIdSchema,
        toCreatorId: creatorIdSchema,
        context: z.string().min(1).max(3000),
      }),
    )
    .mutation(({ input }) => ({
      prefillPrompt: buildHandoffMessage(
        input.fromCreatorId,
        input.toCreatorId,
        input.context,
      ),
      toCreatorId: input.toCreatorId,
    })),

  exportChat: secureProcedure("aiCreators")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        creatorName: z.string(),
        messages: z.array(
          z.object({
            role: z.enum(["user", "ai"]),
            text: z.string().max(8000),
          }),
        ),
      }),
    )
    .mutation(({ input }) => {
      const lines = [
        `# Chat export — ${input.creatorName}`,
        `Exported: ${new Date().toISOString()}`,
        "",
        ...input.messages.map((m) => `**${m.role === "user" ? "You" : input.creatorName}:** ${m.text}`),
      ];
      return {
        markdown: lines.join("\n\n"),
        messageCount: input.messages.length,
      };
    }),

  premiumMediaStatus: secureProcedure("aiCreators").query(({ ctx }) =>
    getPremiumMediaStatus(String(ctx.user.id)),
  ),

  assertVideoTalkAccess: secureProcedure("aiCreators")
    .input(z.object({ creatorId: creatorIdSchema }))
    .mutation(({ ctx }) => {
      if (!hasAiVideoTalkAccess(String(ctx.user.id)) && !ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Purchase an AI video talk pack to start video chat with this specialist.",
        });
      }
      consumePremiumMinute({ userId: String(ctx.user.id), kind: "ai_video_talk" });
      return { allowed: true as const };
    }),
});
