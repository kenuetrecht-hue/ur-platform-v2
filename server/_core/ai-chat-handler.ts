import { TRPCError } from "@trpc/server";
import { assertNoAiTakeoverInMessage } from "./ai-control";
import {
  buildCreatorSystemPrompt,
  getCreatorAi,
  isCreatorAiId,
  isPlatformAiRole,
} from "./ai-creator-registry";
import { assertUserCanUseAi, enforceAiGuardrails } from "./ai-guardrails";
import {
  assertMessageWithinAiRole,
  sanitizeAiReplyForRole,
} from "./ai-roles";
import {
  buildHiveEnhancedSystemPrompt,
  isComplexHiveProblem,
  recordHiveInteraction,
  runHiveConsultation,
} from "./ai-hive-orchestrator";
import { recordUserActivity } from "./daily-engagement-service";
import { buildCoderLearningContext, hydrateCoderLearning } from "./coder-learning-bridge";
import { buildGameLearningContext, hydrateGameLearning } from "./game-dev-learning-bridge";
import {
  generateGoogleChatReply,
  isGoogleCloudAiConfigured,
  type GoogleChatTurn,
} from "./google-ai";
import { sanitizeChatHistory, sanitizeUserText } from "./input-sanitize";
import { mapServiceErrorToTrpc } from "./service-errors";
import { isOwnerOnlyPlatformAi, canChatOwnerOpsAi } from "./platform-ops-ai";
import { assertAiEntitled } from "./access-entitlements";
import { assertAndConsumeAiUsage } from "./ai-usage-meter";
import {
  createOpsIncident,
  inferIncidentFromOpsChat,
  runPlatformHealthChecks,
} from "./platform-ops-service";
import { processPitchConsentFlow } from "./ai-pitch-consent-service";
import {
  isAffiliateOnlyAi,
  canChatAffiliateAssociate,
} from "./affiliate-associate-ai";
import {
  STORE_MANAGER_AI_ID,
  canUseStoreManagerAi,
  buildStoreManagerContext,
} from "./commerce-catalog-service";
import { getAffiliateProfile } from "./partner-program-service";
import {
  BLUEPRINT_READER_AI_ID,
  buildBlueprintReaderContextForChat,
} from "./blueprint-reading-service";

export type AiChatContext = {
  userId: string | number;
  isPlatformOwner: boolean;
  userEmail?: string | null;
  /** Staff with chat_ops_ai from administration dashboard */
  canChatOwnerOps?: boolean;
};

export async function handleCreatorAiChat(params: {
  creatorId: string;
  message: string;
  history?: GoogleChatTurn[];
  ctx: AiChatContext;
  useHiveConsult?: boolean;
}): Promise<{
  reply: string;
  model: string;
  creatorId: string;
  creatorName: string;
  hiveConsulted?: Array<{ id: string; name: string }>;
  opsIncidentId?: string;
  pitchConsentRequest?: boolean;
  pitchAccepted?: boolean;
  pitchDeclined?: boolean;
}> {
  if (!isGoogleCloudAiConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This feature is not available right now.",
    });
  }

  if (!isCreatorAiId(params.creatorId)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That AI assistant is not available.",
    });
  }

  const def = getCreatorAi(params.creatorId)!;
  const userId = String(params.ctx.userId);

  if (params.creatorId === "ai-coder-001") {
    await hydrateCoderLearning(userId);
  }
  if (params.creatorId === "ai-game-dev-001") {
    await hydrateGameLearning(userId);
  }

  if (
    isOwnerOnlyPlatformAi(params.creatorId) &&
    !canChatOwnerOpsAi({
      isPlatformOwner: params.ctx.isPlatformOwner,
      canChatOwnerOps: params.ctx.canChatOwnerOps,
    })
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Doctor AI, Administration AI, and Security AI are restricted to the Administration Dashboard.",
    });
  }

  if (isAffiliateOnlyAi(params.creatorId)) {
    const enrolled = Boolean(getAffiliateProfile(userId));
    if (
      !canChatAffiliateAssociate({
        isPlatformOwner: params.ctx.isPlatformOwner,
        isEnrolledAffiliate: enrolled,
      })
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Associate AI is available on the Affiliate Dashboard after you join the affiliate program.",
      });
    }
  } else if (params.creatorId === STORE_MANAGER_AI_ID) {
    if (
      !canUseStoreManagerAi({
        userId,
        isPlatformOwner: params.ctx.isPlatformOwner,
      })
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Store Manager AI is available to the platform owner and enrolled content creators with a merch store.",
      });
    }
    assertAiEntitled({
      userId: params.ctx.userId,
      email: params.ctx.userEmail,
      isPlatformOwner: params.ctx.isPlatformOwner,
      feature: "ai_chat",
      creatorId: params.creatorId,
    });
  } else {
    assertAiEntitled({
      userId: params.ctx.userId,
      email: params.ctx.userEmail,
      isPlatformOwner: params.ctx.isPlatformOwner,
      feature: "ai_chat",
      creatorId: params.creatorId,
    });
  }

  try {
    assertUserCanUseAi(userId, params.ctx.isPlatformOwner);

    const message = sanitizeUserText(params.message, 2000);
    assertNoAiTakeoverInMessage(message, params.ctx.isPlatformOwner);

    if (isPlatformAiRole(params.creatorId)) {
      assertMessageWithinAiRole(message, params.creatorId, params.ctx.isPlatformOwner);
    } else {
      assertMessageWithinAiRole(message, params.creatorId, params.ctx.isPlatformOwner, def.name);
    }

    const history = sanitizeChatHistory(params.history ?? [], 20, 4000);

    const useHive =
      !isAffiliateOnlyAi(params.creatorId) &&
      (params.useHiveConsult === true || isComplexHiveProblem(message));

    if (!params.ctx.isPlatformOwner && !isAffiliateOnlyAi(params.creatorId)) {
      assertAndConsumeAiUsage({
        userId,
        email: params.ctx.userEmail,
        creatorId: params.creatorId,
        isPlatformOwner: false,
        useHive,
      });
    }

    let rawReply: string;
    let model: string;
    let hiveConsulted: Array<{ id: string; name: string }> | undefined;

    if (useHive) {
      const hiveResult = await runHiveConsultation({
        creatorId: params.creatorId,
        message,
        userId,
        history,
      });
      rawReply = hiveResult.reply;
      model = hiveResult.model;
      hiveConsulted = hiveResult.consultedPeers.map((p) => ({
        id: p.id,
        name: p.name,
      }));
    } else {
      let basePrompt = buildCreatorSystemPrompt(params.creatorId);
      if (params.creatorId === "ai-coder-001") {
        basePrompt += `\n\n${buildCoderLearningContext(userId)}`;
      }
      if (params.creatorId === "ai-game-dev-001") {
        basePrompt += `\n\n${buildGameLearningContext(userId)}`;
      }
      if (params.creatorId === STORE_MANAGER_AI_ID) {
        basePrompt += `\n\n${buildStoreManagerContext({
          userId,
          isPlatformOwner: params.ctx.isPlatformOwner,
        })}`;
      }
      if (params.creatorId === BLUEPRINT_READER_AI_ID) {
        basePrompt += `\n\n${buildBlueprintReaderContextForChat(userId)}`;
      }

      let systemPrompt: string;
      if (isAffiliateOnlyAi(params.creatorId)) {
        systemPrompt = buildCreatorSystemPrompt(params.creatorId);
      } else {
        systemPrompt = await buildHiveEnhancedSystemPrompt({
          creatorId: params.creatorId,
          userId,
          message,
          basePrompt,
        });
      }

      const result = await generateGoogleChatReply({
        systemPrompt,
        history,
        message,
      });
      rawReply = result.reply;
      model = result.model;
    }

    let reply = enforceAiGuardrails({
      userMessage: message,
      aiReply: rawReply,
      userId,
      isOwner: params.ctx.isPlatformOwner,
      role: isPlatformAiRole(params.creatorId) ? params.creatorId : undefined,
    });

    if (!isPlatformAiRole(params.creatorId)) {
      reply = sanitizeAiReplyForRole(reply, params.creatorId, params.ctx.isPlatformOwner, def.name);
    }

    recordHiveInteraction({
      userId,
      creatorId: params.creatorId,
      userMessage: message,
      aiReply: reply,
    });

    recordUserActivity({
      userId,
      creatorId: params.creatorId,
      activityType: "chat",
    });

    let opsIncidentId: string | undefined;
    if (isOwnerOnlyPlatformAi(params.creatorId) && params.ctx.isPlatformOwner) {
      const healthContext = runPlatformHealthChecks();
      if (healthContext.length > 0 && /scan|status|health|check|monitor/.test(message.toLowerCase())) {
        reply += `\n\n📊 **Live health scan:** ${healthContext.length} issue(s) detected. See Owner Ops Console for incidents awaiting your approval.`;
      }

      const inferred = inferIncidentFromOpsChat(params.creatorId, message, reply);
      if (inferred?.shouldFile) {
        const incident = await createOpsIncident({
          sourceAi: params.creatorId,
          severity: inferred.severity,
          category: inferred.category,
          title: inferred.title,
          problem: inferred.problem,
          proposedFix: inferred.proposedFix,
          actionsTaken: ["Ops AI analyzed the report", "Notification sent to platform owner"],
        });
        opsIncidentId = incident.id;
        reply += `\n\n🔔 **Incident filed** (${incident.id.slice(0, 8)}…) — awaiting your final approval in Owner Ops.`;
      }
    }

    let pitchConsentRequest: boolean | undefined;
    let pitchAccepted: boolean | undefined;
    let pitchDeclined: boolean | undefined;

    if (!isOwnerOnlyPlatformAi(params.creatorId) && !isAffiliateOnlyAi(params.creatorId)) {
      const pitchResult = processPitchConsentFlow({
        userId,
        creatorId: params.creatorId,
        creatorName: def.name,
        userMessage: message,
        aiReply: reply,
      });
      reply = pitchResult.reply;
      pitchConsentRequest = pitchResult.pitchConsentRequest;
      pitchAccepted = pitchResult.pitchAccepted;
      pitchDeclined = pitchResult.pitchDeclined;
    }

    return {
      reply,
      model,
      creatorId: def.id,
      creatorName: def.name,
      hiveConsulted,
      opsIncidentId,
      pitchConsentRequest,
      pitchAccepted,
      pitchDeclined,
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    mapServiceErrorToTrpc(error);
  }
}
