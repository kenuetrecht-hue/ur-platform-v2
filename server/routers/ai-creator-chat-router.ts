import { z } from "zod";
import { handleCreatorAiChat } from "../_core/ai-chat-handler";
import {
  isCreatorAiId,
  listCreatorsForClient,
} from "../_core/ai-creator-registry";
import { getCreatorHiveProfile } from "../_core/ai-hive-orchestrator";
import { getHiveCapabilities } from "../_core/ai-hive-capabilities";
import { generateImage } from "../_core/imageGeneration";
import { ENV } from "../_core/env";
import { sanitizeChatAttachments } from "../_core/chat-attachment-service";
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
import { assertTalkTimeAvailable, getTalkMillisecondsRemaining, secondsToBillingMs } from "../_core/ai-talk-time-tracker";
import { startMeterSession } from "../_core/ai-metering-session-service";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { AFFILIATE_ASSOCIATE_ID, isAffiliateOnlyAi } from "../_core/affiliate-associate-ai";
import {
  appendAiChatTurns,
  getOrCreateAiChatThread,
  listAiChatMessages,
  loadAiChatHistoryForModel,
} from "../_core/ai-chat-persistence-service";
import { mapServiceErrorToTrpc } from "../_core/service-errors";
import { notifyAiChatThreadUpdated } from "../_core/ai-chat-realtime-ws";
import { assertUserCanUseAi } from "../_core/ai-guardrails";
import { assertNoAiTakeoverInMessage } from "../_core/ai-control";
import { assertAndConsumeCredit } from "../_core/usage-credits-service";

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

const chatAttachmentSchema = z.object({
  mimeType: z.string().trim().min(3).max(64),
  base64: z.string().min(16).max(6_000_000),
  fileName: z.string().trim().max(120).optional(),
});

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

  /** Cross-device thread — same account on web + mobile. */
  getThread: secureProcedure("aiCreators")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(async ({ input, ctx }) => {
      if (isOwnerOnlyPlatformAi(input.creatorId) || isAffiliateOnlyAi(input.creatorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      try {
        const existing = await listAiChatMessages({
          userId: ctx.user.id,
          creatorId: input.creatorId,
        });
        if (existing) return existing;
        const created = await getOrCreateAiChatThread({
          userId: ctx.user.id,
          creatorId: input.creatorId,
        });
        return {
          threadId: created.threadId,
          creatorId: input.creatorId,
          updatedAt: created.updatedAt,
          messages: [],
        };
      } catch (error) {
        throw mapServiceErrorToTrpc(error);
      }
    }),

  /** Incremental sync for active chat screens (poll while online). */
  getThreadUpdates: secureProcedure("aiCreators")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        since: z.string().datetime().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (isOwnerOnlyPlatformAi(input.creatorId) || isAffiliateOnlyAi(input.creatorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      try {
        const sinceDate = input.since ? new Date(input.since) : undefined;
        const thread = await listAiChatMessages({
          userId: ctx.user.id,
          creatorId: input.creatorId,
          since: sinceDate,
          limit: sinceDate ? 100 : 40,
        });
        if (!thread) {
          const created = await getOrCreateAiChatThread({
            userId: ctx.user.id,
            creatorId: input.creatorId,
          });
          return {
            threadId: created.threadId,
            creatorId: input.creatorId,
            updatedAt: created.updatedAt,
            messages: [] as const,
          };
        }
        return thread;
      } catch (error) {
        throw mapServiceErrorToTrpc(error);
      }
    }),

  sendMessage: secureProcedure("aiCreators")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        message: z.string().trim().min(1).max(2000),
        history: chatHistorySchema.max(20).optional(),
        /** Explicitly invoke multi-AI hive consultation with peer specialists */
        useHiveConsult: z.boolean().optional(),
        /** User-owned photos/PDFs for vision analysis (specialists with photoAnalysis). */
        attachments: z.array(chatAttachmentSchema).max(2).optional(),
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
      if (!isOwnerOnlyPlatformAi(input.creatorId)) {
        assertSectionEnabledForRequest("ai_chat", ctx.isPlatformOwner);
      }

      let serverHistory = await loadAiChatHistoryForModel({
        userId: ctx.user.id,
        creatorId: input.creatorId,
        maxTurns: 20,
      });
      while (serverHistory.length > 0 && serverHistory[0]?.role === "assistant") {
        serverHistory = serverHistory.slice(1);
      }
      const history =
        serverHistory.length > 0
          ? serverHistory
          : (input.history ?? []).map((turn) => ({
              role: turn.role,
              content: turn.content,
            }));

      const attachments = sanitizeChatAttachments(input.attachments);

      const result = await handleCreatorAiChat({
        creatorId: input.creatorId,
        message: input.message,
        history,
        useHiveConsult: input.useHiveConsult,
        attachments,
        ctx: {
          userId,
          isPlatformOwner: ctx.isPlatformOwner,
          userEmail: ctx.user.email,
          canChatOwnerOps: adminAccess.permissions.includes("chat_ops_ai"),
        },
      });

      let syncMeta: { threadId: string; updatedAt: string } | undefined;
      try {
        syncMeta = await appendAiChatTurns({
          userId: ctx.user.id,
          creatorId: input.creatorId,
          turns: [
            { role: "user", content: input.message },
            { role: "assistant", content: result.reply },
          ],
        });
      } catch (persistError) {
        console.warn("[ai-chat-sync] Failed to persist turn:", persistError);
      }

      if (syncMeta) {
        notifyAiChatThreadUpdated({
          userId: ctx.user.id,
          creatorId: input.creatorId,
          updatedAt: syncMeta.updatedAt,
          threadId: syncMeta.threadId,
        });
      }

      return {
        ...result,
        userId,
        threadId: syncMeta?.threadId,
        threadUpdatedAt: syncMeta?.updatedAt,
      };
    }),

  /** Generate an image via Imagen (creative specialists + ContentMate). Requires Vertex AI. */
  generateImage: secureProcedure("aiCreators")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        prompt: z.string().trim().min(1).max(2000),
        aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const caps = getHiveCapabilities(input.creatorId);
      if (!caps.imageGeneration) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Image generation is not available for this specialist.",
        });
      }

      if (isOwnerOnlyPlatformAi(input.creatorId) || isAffiliateOnlyAi(input.creatorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }

      assertSectionEnabledForRequest("ai_chat", ctx.isPlatformOwner);
      assertAiEntitled({
        userId: ctx.user.id,
        email: ctx.user.email,
        isPlatformOwner: ctx.isPlatformOwner,
        feature: "ai_chat",
        creatorId: input.creatorId,
      });

      if (!ENV.googleCloudProject) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Image generation requires GOOGLE_CLOUD_PROJECT (Vertex AI Imagen). Text chat works with a Gemini API key alone.",
        });
      }

      try {
        assertUserCanUseAi(String(ctx.user.id), ctx.isPlatformOwner);
        assertNoAiTakeoverInMessage(input.prompt, ctx.isPlatformOwner);

        const image = await generateImage({
          prompt: input.prompt,
          aspectRatio: input.aspectRatio ?? "1:1",
        });

        if (!ctx.isPlatformOwner) {
          assertAndConsumeCredit({
            userId: String(ctx.user.id),
            productId: "images-imagen",
            units: 1,
            isPlatformOwner: false,
          });
        }

        return {
          url: image.url,
          model: image.model,
          creatorId: input.creatorId,
        };
      } catch (error) {
        throw mapServiceErrorToTrpc(error);
      }
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
      assertSectionEnabledForRequest("voice_talk", ctx.isPlatformOwner);

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
          creatorId: input.creatorId,
        });
        if (!ctx.isPlatformOwner) {
          assertTalkTimeAvailable(userId, 1);
        }
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

      let meterSessionId: string | null = null;
      let millisecondsRemaining: number | null = null;
      if (
        !ctx.isPlatformOwner &&
        input.creatorId !== AFFILIATE_ASSOCIATE_ID &&
        input.creatorId !== "contentmate"
      ) {
        const durationMs = secondsToBillingMs(response.duration);
        const session = startMeterSession({
          userId,
          creatorId: input.creatorId,
          kind: "voice_playback",
          maxBillableMs: durationMs,
          source: "client_playback",
        });
        meterSessionId = session.id;
        millisecondsRemaining = getTalkMillisecondsRemaining(userId);
      }

      return {
        success: true as const,
        audioUrl: response.audioUrl,
        audioBase64: response.audioBase64,
        duration: response.duration,
        durationMs: secondsToBillingMs(response.duration),
        persona: voiceConfig.name,
        meterSessionId,
        millisecondsRemaining,
        meteringNote:
          "Talk time bills only while connected and playing. Disconnect pauses billing; reconnect resumes your exact balance.",
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
    .mutation(({ ctx, input }) => {
      assertAiEntitled({
        userId: ctx.user.id,
        email: ctx.user.email,
        isPlatformOwner: ctx.isPlatformOwner,
        feature: "ai_chat",
        creatorId: input.creatorId,
      });
      if (!hasAiVideoTalkAccess(String(ctx.user.id)) && !ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Purchase AI talk time to start voice or video chat with this specialist.",
        });
      }
      if (!ctx.isPlatformOwner) {
        assertTalkTimeAvailable(String(ctx.user.id), 1);
        const balance = getTalkMillisecondsRemaining(String(ctx.user.id));
        const session = startMeterSession({
          userId: String(ctx.user.id),
          creatorId: input.creatorId,
          kind: "video_talk",
          maxBillableMs: balance,
          source: "video_session",
        });
        return {
          allowed: true as const,
          meterSessionId: session.id,
          millisecondsRemaining: balance,
        };
      }
      return { allowed: true as const, meterSessionId: null, millisecondsRemaining: null };
    }),
});
