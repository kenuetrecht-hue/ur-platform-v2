import { z } from "zod";
import {
  generateGoogleChatReply,
  isGoogleCloudAiConfigured,
} from "./_core/google-ai";
import { assertUserCanUseAi, enforceAiGuardrails } from "./_core/ai-guardrails";
import { assertUserIsAgeVerified } from "./_core/age-kyc-service";
import { assertNoAiTakeoverInMessage } from "./_core/ai-control";
import { assertMessageWithinAiRole } from "./_core/ai-roles";
import { assertAiEntitled } from "./_core/access-entitlements";
import { assertAndConsumeAiUsage } from "./_core/ai-usage-meter";
import {
  sanitizeChatHistory,
  sanitizeLanguageLabel,
  sanitizeUserText,
} from "./_core/input-sanitize";
import { LANGUAGE_AI_SYSTEM_PROMPT } from "./_core/multilingual-prompts";
import {
  appendAiChatTurns,
  loadAiChatHistoryForModel,
} from "./_core/ai-chat-persistence-service";
import { mapServiceErrorToTrpc } from "./_core/service-errors";
import { notifyAiChatThreadUpdated } from "./_core/ai-chat-realtime-ws";
import { secureProcedure, router, TRPCError } from "./_core/trpc";

function assertLinguamateEntitled(ctx: {
  user: { id: string | number; email?: string | null };
  isPlatformOwner: boolean;
}) {
  assertAiEntitled({
    userId: ctx.user.id,
    email: ctx.user.email,
    isPlatformOwner: ctx.isPlatformOwner,
    feature: "ai_chat",
    creatorId: "linguamate",
  });
}

function consumeLinguamateMessage(ctx: {
  user: { id: string | number; email?: string | null };
  isPlatformOwner: boolean;
}) {
  if (ctx.isPlatformOwner) return;
  assertAndConsumeAiUsage({
    userId: String(ctx.user.id),
    email: ctx.user.email,
    creatorId: "linguamate",
    isPlatformOwner: false,
  });
}

const chatHistorySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  }),
);

const languageLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const aiLanguageRouter = router({
  chat: secureProcedure("aiLanguage")
    .input(
      z.object({
        message: z.string().trim().min(1).max(4000),
        history: chatHistorySchema.max(30).optional(),
        targetLanguage: z.string().max(64).optional(),
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
        assertLinguamateEntitled(ctx);
        consumeLinguamateMessage(ctx);
        await assertUserIsAgeVerified(ctx.user.id);
        assertUserCanUseAi(String(ctx.user.id), ctx.isPlatformOwner);

        const message = sanitizeUserText(input.message, 4000);
        assertNoAiTakeoverInMessage(message, ctx.isPlatformOwner);
        assertMessageWithinAiRole(message, "linguamate", ctx.isPlatformOwner);

        let serverHistory = await loadAiChatHistoryForModel({
          userId: Number(ctx.user.id),
          creatorId: "linguamate",
          maxTurns: 30,
        });
        while (serverHistory.length > 0 && serverHistory[0]?.role === "assistant") {
          serverHistory = serverHistory.slice(1);
        }
        const history =
          serverHistory.length > 0
            ? sanitizeChatHistory(serverHistory, 30, 4000)
            : sanitizeChatHistory(input.history ?? [], 30, 4000);
        const targetLanguage = input.targetLanguage
          ? sanitizeLanguageLabel(input.targetLanguage)
          : undefined;

        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: LANGUAGE_AI_SYSTEM_PROMPT,
          history,
          message,
          responseLanguage: targetLanguage || undefined,
        });

        const reply = enforceAiGuardrails({
          userMessage: message,
          aiReply: rawReply,
          userId: String(ctx.user.id),
          isOwner: ctx.isPlatformOwner,
          role: "linguamate",
        });

        let syncMeta: { threadId: string; updatedAt: string } | undefined;
        try {
          syncMeta = await appendAiChatTurns({
            userId: Number(ctx.user.id),
            creatorId: "linguamate",
            turns: [
              { role: "user", content: message },
              { role: "assistant", content: reply },
            ],
          });
        } catch (persistError) {
          console.warn("[ai-chat-sync] LinguaMate persist failed:", persistError);
        }

        if (syncMeta) {
          notifyAiChatThreadUpdated({
            userId: Number(ctx.user.id),
            creatorId: "linguamate",
            updatedAt: syncMeta.updatedAt,
            threadId: syncMeta.threadId,
          });
        }

        return {
          reply,
          model,
          userId: ctx.user.id,
          threadId: syncMeta?.threadId,
          threadUpdatedAt: syncMeta?.updatedAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        mapServiceErrorToTrpc(error);
      }
    }),

  translate: secureProcedure("aiLanguage")
    .input(
      z.object({
        text: z.string().trim().min(1).max(4000),
        sourceLanguage: z.string().max(64).optional(),
        targetLanguage: z.string().trim().min(1).max(64),
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
        assertLinguamateEntitled(ctx);
        consumeLinguamateMessage(ctx);
        await assertUserIsAgeVerified(ctx.user.id);
        assertUserCanUseAi(String(ctx.user.id), ctx.isPlatformOwner);

        const text = sanitizeUserText(input.text, 4000);
        assertNoAiTakeoverInMessage(text, ctx.isPlatformOwner);
        assertMessageWithinAiRole(text, "linguamate", ctx.isPlatformOwner);
        const targetLanguage = sanitizeLanguageLabel(input.targetLanguage);
        if (!targetLanguage) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid target language." });
        }

        const sourceHint = input.sourceLanguage
          ? `Source language: ${sanitizeLanguageLabel(input.sourceLanguage)}.`
          : "Auto-detect the source language.";

        const prompt = `${sourceHint}
Translate the following text into ${targetLanguage}.

Format your response exactly as:
**Detected source:** [language name]
**Translation:** [translated text]
**Pronunciation:** [simple phonetic guide if non-Latin script]
**Notes:** [cultural or idiomatic notes, or "None"]

Text to translate:
"""
${text}
"""`;

        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: LANGUAGE_AI_SYSTEM_PROMPT,
          history: [],
          message: prompt,
          responseLanguage: targetLanguage,
        });

        const translation = enforceAiGuardrails({
          userMessage: text,
          aiReply: rawReply,
          userId: String(ctx.user.id),
          isOwner: ctx.isPlatformOwner,
          role: "linguamate",
        });

        return { translation, model, userId: ctx.user.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        mapServiceErrorToTrpc(error);
      }
    }),

  teach: secureProcedure("aiLanguage")
    .input(
      z.object({
        targetLanguage: z.string().trim().min(1).max(64),
        topic: z.string().trim().max(200).optional(),
        level: languageLevelSchema.default("beginner"),
        mode: z
          .enum(["lesson", "practice", "conversation", "vocabulary"])
          .default("lesson"),
        userMessage: z.string().trim().max(2000).optional(),
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
        assertLinguamateEntitled(ctx);
        consumeLinguamateMessage(ctx);
        await assertUserIsAgeVerified(ctx.user.id);
        assertUserCanUseAi(String(ctx.user.id), ctx.isPlatformOwner);

        const targetLanguage = sanitizeLanguageLabel(input.targetLanguage);
        if (!targetLanguage) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid target language." });
        }

        const topicLine = input.topic
          ? `Topic: ${sanitizeUserText(input.topic, 200)}.`
          : "Choose a practical everyday topic for this level.";

        const instruction = input.userMessage
          ? sanitizeUserText(input.userMessage, 2000)
          : `Start a ${input.mode} session in ${targetLanguage} for a ${input.level} learner. ${topicLine}
Use sections: **Goal**, **New words**, **Grammar tip**, **Example dialogue**, **Your turn** (a prompt for the learner).`;

        assertNoAiTakeoverInMessage(instruction, ctx.isPlatformOwner);
        assertMessageWithinAiRole(instruction, "linguamate", ctx.isPlatformOwner);

        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: LANGUAGE_AI_SYSTEM_PROMPT,
          history: sanitizeChatHistory(input.history ?? [], 20, 4000),
          message: instruction,
          responseLanguage: targetLanguage,
        });

        const lesson = enforceAiGuardrails({
          userMessage: instruction,
          aiReply: rawReply,
          userId: String(ctx.user.id),
          isOwner: ctx.isPlatformOwner,
          role: "linguamate",
        });

        return {
          lesson,
          model,
          targetLanguage,
          level: input.level,
          mode: input.mode,
          userId: ctx.user.id,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        mapServiceErrorToTrpc(error);
      }
    }),

  getCapabilities: secureProcedure("aiLanguage").query(() => ({
    name: "LinguaMate",
    subtitle: "Universal Language Translator & Teacher",
    supportedModes: ["chat", "translate", "teach"] as const,
    teachModes: ["lesson", "practice", "conversation", "vocabulary"] as const,
    levels: ["beginner", "intermediate", "advanced"] as const,
    languageCount: "100+",
    features: [
      "Real-time translation in any direction",
      "Auto-detect source language",
      "Interactive lessons and conversation coaching",
      "Pronunciation and cultural context",
      "Code-switching and transliteration support",
    ],
  })),
});
