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
import {
  AI_CHAT_HISTORY_CONTENT_MAX,
  AI_CHAT_MEMBER_HISTORY_CONTENT_MAX,
  AI_CHAT_OWNER_HISTORY_TURNS,
  AI_CHAT_OWNER_MESSAGE_MAX,
} from "../lib/ai-chat-limits";
import { LANGUAGE_AI_SYSTEM_PROMPT } from "./_core/multilingual-prompts";
import {
  appendAiChatTurns,
  loadAiChatHistoryForModel,
} from "./_core/ai-chat-persistence-service";
import { chatAttachmentSchema, sanitizeChatAttachments } from "./_core/chat-attachment-service";
import { withChatVisionInstruction } from "./_core/chat-vision-prompt";
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
    content: z.string().max(AI_CHAT_HISTORY_CONTENT_MAX),
  }),
);

function ownerChatBounds(isPlatformOwner: boolean): { turns: number; content: number; message: number } {
  if (isPlatformOwner) {
    return {
      turns: AI_CHAT_OWNER_HISTORY_TURNS,
      content: AI_CHAT_HISTORY_CONTENT_MAX,
      message: AI_CHAT_OWNER_MESSAGE_MAX,
    };
  }
  return { turns: 30, content: AI_CHAT_MEMBER_HISTORY_CONTENT_MAX, message: 4000 };
}

const languageLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const aiLanguageRouter = router({
  chat: secureProcedure("aiLanguage")
    .input(
      z.object({
        message: z.string().trim().min(1).max(AI_CHAT_OWNER_MESSAGE_MAX),
        history: chatHistorySchema.max(AI_CHAT_OWNER_HISTORY_TURNS).optional(),
        targetLanguage: z.string().max(64).optional(),
        attachments: z.array(chatAttachmentSchema).max(2).optional(),
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

        const bounds = ownerChatBounds(ctx.isPlatformOwner);
        const message = sanitizeUserText(input.message, bounds.message);
        assertNoAiTakeoverInMessage(message, ctx.isPlatformOwner);
        assertMessageWithinAiRole(message, "linguamate", ctx.isPlatformOwner);

        let serverHistory = await loadAiChatHistoryForModel({
          userId: Number(ctx.user.id),
          creatorId: "linguamate",
          maxTurns: bounds.turns,
        });
        while (serverHistory.length > 0 && serverHistory[0]?.role === "assistant") {
          serverHistory = serverHistory.slice(1);
        }
        const history =
          serverHistory.length > 0
            ? sanitizeChatHistory(serverHistory, bounds.turns, bounds.content)
            : sanitizeChatHistory(input.history ?? [], bounds.turns, bounds.content);
        const targetLanguage = input.targetLanguage
          ? sanitizeLanguageLabel(input.targetLanguage)
          : undefined;

        const attachments = sanitizeChatAttachments(input.attachments);
        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: withChatVisionInstruction(LANGUAGE_AI_SYSTEM_PROMPT, attachments),
          history,
          message,
          responseLanguage: targetLanguage || undefined,
          attachments: attachments.length ? attachments : undefined,
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
        text: z.string().trim().min(1).max(AI_CHAT_OWNER_MESSAGE_MAX),
        sourceLanguage: z.string().max(64).optional(),
        targetLanguage: z.string().trim().min(1).max(64),
        attachments: z.array(chatAttachmentSchema).max(2).optional(),
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

        const text = sanitizeUserText(input.text, ownerChatBounds(ctx.isPlatformOwner).message);
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

        const attachments = sanitizeChatAttachments(input.attachments);
        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: withChatVisionInstruction(LANGUAGE_AI_SYSTEM_PROMPT, attachments),
          history: [],
          message: attachments.length
            ? `${prompt}\n\nA photo or document is attached. Read that file, say what is missing or cut off, then translate what you can see.`
            : prompt,
          responseLanguage: targetLanguage,
          attachments: attachments.length ? attachments : undefined,
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
        userMessage: z.string().trim().max(AI_CHAT_OWNER_MESSAGE_MAX).optional(),
        history: chatHistorySchema.max(AI_CHAT_OWNER_HISTORY_TURNS).optional(),
        attachments: z.array(chatAttachmentSchema).max(2).optional(),
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

        const teachBounds = ownerChatBounds(ctx.isPlatformOwner);
        const instruction = input.userMessage
          ? sanitizeUserText(input.userMessage, teachBounds.message)
          : `Start a ${input.mode} session in ${targetLanguage} for a ${input.level} learner. ${topicLine}
Use sections: **Goal**, **New words**, **Grammar tip**, **Example dialogue**, **Your turn** (a prompt for the learner).`;

        assertNoAiTakeoverInMessage(instruction, ctx.isPlatformOwner);
        assertMessageWithinAiRole(instruction, "linguamate", ctx.isPlatformOwner);

        const attachments = sanitizeChatAttachments(input.attachments);
        const { reply: rawReply, model } = await generateGoogleChatReply({
          systemPrompt: withChatVisionInstruction(LANGUAGE_AI_SYSTEM_PROMPT, attachments),
          history: sanitizeChatHistory(input.history ?? [], teachBounds.turns, teachBounds.content),
          message: attachments.length
            ? `${instruction}\n\nA photo or document is attached. Use what is in that file, and say what is missing, in this lesson.`
            : instruction,
          responseLanguage: targetLanguage,
          attachments: attachments.length ? attachments : undefined,
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
