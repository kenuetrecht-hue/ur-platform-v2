import { TRPCError } from "@trpc/server";
import { assertNoAiTakeoverInMessage } from "./ai-control";
import { assertMissionUseAllowed } from "./ai-mission-use";
import {
  buildCreatorSystemPrompt,
  getCreatorAi,
  isCreatorAiId,
  isPlatformAiRole,
} from "./ai-creator-registry";
import { assertUserCanUseAi, enforceAiGuardrails } from "./ai-guardrails";
import { assertUserIsAgeVerified } from "./age-kyc-service";
import {
  assertMessageWithinAiRole,
  sanitizeAiReplyForRole,
} from "./ai-roles";
import { sanitizeChatAttachments, type SanitizedChatAttachment } from "./chat-attachment-service";
import { getHiveCapabilities } from "./ai-hive-capabilities";
import type { ChatSearchCitation } from "../../lib/chat-attachment-types";
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
import {
  buildLandingDemoPromptAppend,
  LANDING_DEMO_MESSAGE_MAX,
  LANDING_DEMO_REPLY_MAX,
  truncateLandingDemoReply,
} from "../../lib/landing-demo-policy";
import { isOwnerOnlyPlatformAi, canChatOwnerOpsAi } from "./platform-ops-ai";
import { assertAiEntitled } from "./access-entitlements";
import { assertAndConsumeAiUsage } from "./ai-usage-meter";
import { tryConsumeCredit } from "./usage-credits-service";
import { VISION_UPLOAD_MESSAGE_UNITS } from "../../lib/usage-caps-catalog";
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
  /** Homepage one-shot demo — entitlement/usage skipped; guardrails remain */
  landingDemo?: boolean;
};

export async function handleCreatorAiChat(params: {
  creatorId: string;
  message: string;
  history?: GoogleChatTurn[];
  ctx: AiChatContext;
  useHiveConsult?: boolean;
  attachments?: SanitizedChatAttachment[];
}): Promise<{
  reply: string;
  model: string;
  creatorId: string;
  creatorName: string;
  hiveConsulted?: Array<{ id: string; name: string }>;
  searchResults?: ChatSearchCitation[];
  attachmentsAnalyzed?: number;
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

  if (!params.ctx.landingDemo) {
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
  }

  try {
    if (!params.ctx.landingDemo) {
      await assertUserIsAgeVerified(params.ctx.userId);
    }
    assertUserCanUseAi(userId, params.ctx.isPlatformOwner);

    const message = sanitizeUserText(
      params.message,
      params.ctx.landingDemo ? LANDING_DEMO_MESSAGE_MAX : 2000,
    );
    assertNoAiTakeoverInMessage(message, params.ctx.isPlatformOwner);
    assertMissionUseAllowed(message, params.ctx.isPlatformOwner);

    if (isPlatformAiRole(params.creatorId)) {
      assertMessageWithinAiRole(message, params.creatorId, params.ctx.isPlatformOwner);
    } else {
      assertMessageWithinAiRole(message, params.creatorId, params.ctx.isPlatformOwner, def.name);
    }

    const history = sanitizeChatHistory(params.history ?? [], 20, 4000);

    const caps = getHiveCapabilities(params.creatorId);
    const attachments = params.attachments ?? [];
    if (attachments.length > 0) {
      if (!caps.photoAnalysis) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This specialist does not support photo or document analysis.",
        });
      }
    }

    const visionAttachments = attachments.map((a) => ({
      mimeType: a.mimeType,
      base64: a.base64,
    }));

    const useHive =
      !params.ctx.landingDemo &&
      !isAffiliateOnlyAi(params.creatorId) &&
      (params.useHiveConsult === true || isComplexHiveProblem(message));

    if (
      !params.ctx.landingDemo &&
      !params.ctx.isPlatformOwner &&
      !isAffiliateOnlyAi(params.creatorId)
    ) {
      // Usage is consumed only after a successful AI reply — failed requests are not billed.
    }

    let rawReply: string;
    let model: string;
    let hiveConsulted: Array<{ id: string; name: string }> | undefined;
    let searchResults: ChatSearchCitation[] | undefined;

    if (useHive) {
      const hiveResult = await runHiveConsultation({
        creatorId: params.creatorId,
        message,
        userId,
        history,
        attachments: visionAttachments,
      });
      rawReply = hiveResult.reply;
      model = hiveResult.model;
      hiveConsulted = hiveResult.consultedPeers.map((p) => ({
        id: p.id,
        name: p.name,
      }));
      searchResults = hiveResult.searchResults.map((s) => ({
        title: s.title,
        description: s.description,
        url: s.url,
        source: s.source,
      }));
    } else {
      let basePrompt = buildCreatorSystemPrompt(params.creatorId);
      if (params.ctx.landingDemo) {
        basePrompt += `\n\n${buildLandingDemoPromptAppend(def.name)}`;
      } else {
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
      }

      let systemPrompt: string;
      if (params.ctx.landingDemo || isAffiliateOnlyAi(params.creatorId)) {
        systemPrompt = basePrompt;
      } else {
        systemPrompt = await buildHiveEnhancedSystemPrompt({
          creatorId: params.creatorId,
          userId,
          message,
          basePrompt,
          isPlatformOwner: params.ctx.isPlatformOwner,
        }).then((r) => {
          searchResults = r.searchResults.map((s) => ({
            title: s.title,
            description: s.description,
            url: s.url,
            source: s.source,
          }));
          return r.systemPrompt;
        });
      }

      const result = await generateGoogleChatReply({
        systemPrompt,
        history: params.ctx.landingDemo ? [] : history,
        message,
        maxOutputTokens: params.ctx.landingDemo ? 80 : undefined,
        temperature: params.ctx.landingDemo ? 0.85 : undefined,
        attachments: visionAttachments.length ? visionAttachments : undefined,
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

    if (params.ctx.landingDemo) {
      reply = truncateLandingDemoReply(reply, LANDING_DEMO_REPLY_MAX);
    } else {
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
    }

    let opsIncidentId: string | undefined;
    if (isOwnerOnlyPlatformAi(params.creatorId) && params.ctx.isPlatformOwner) {
      const healthContext = runPlatformHealthChecks();
      if (healthContext.length > 0 && /scan|status|health|check|monitor/.test(message.toLowerCase())) {
        reply += `\n\n📊 **Live health scan:** ${healthContext.length} issue(s) detected. See Owner Ops Console for incidents awaiting your approval.`;
      }

      const inferred = inferIncidentFromOpsChat(params.creatorId, message, reply);
      if (inferred?.shouldFile) {
        const incident = await createOpsIncident({
          sourceAi: params.creatorId as import("./platform-ops-ai").OwnerPlatformAiId,
          severity: inferred.severity,
          category: inferred.category,
          title: inferred.title,
          problem: inferred.problem,
          proposedFix: inferred.proposedFix,
          affectedSectionId: inferred.affectedSectionId,
          sectionAction: inferred.sectionAction,
          autoIsolateSection: inferred.sectionAction !== "reopen",
          actionsTaken: ["Ops AI analyzed the report", "Owner notified immediately"],
        });
        opsIncidentId = incident.id;
        if (incident.autoIsolated && incident.affectedSectionId) {
          reply += `\n\n🛑 **Section offline:** \`${incident.affectedSectionId}\` — isolated while we investigate.\n🔔 **Incident filed** (${incident.id.slice(0, 8)}…) — review problem + fix in Owner Ops, then approve or send instructions.`;
        } else {
          reply += `\n\n🔔 **Incident filed** (${incident.id.slice(0, 8)}…) — review in Owner Ops and approve the fix plan when ready.`;
        }
      }
    }

    let pitchConsentRequest: boolean | undefined;
    let pitchAccepted: boolean | undefined;
    let pitchDeclined: boolean | undefined;

    if (
      !params.ctx.landingDemo &&
      !isOwnerOnlyPlatformAi(params.creatorId) &&
      !isAffiliateOnlyAi(params.creatorId)
    ) {
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

    if (
      !params.ctx.landingDemo &&
      !params.ctx.isPlatformOwner &&
      !isAffiliateOnlyAi(params.creatorId)
    ) {
      let extraMessageUnits = 0;
      if (attachments.length > 0) {
        let visionCreditsUsed = 0;
        for (let i = 0; i < attachments.length; i++) {
          if (
            tryConsumeCredit({
              userId,
              productId: "images-vision",
              units: 1,
              isPlatformOwner: false,
            })
          ) {
            visionCreditsUsed++;
          }
        }
        const unpaidAttachments = attachments.length - visionCreditsUsed;
        if (unpaidAttachments > 0) {
          extraMessageUnits += unpaidAttachments * VISION_UPLOAD_MESSAGE_UNITS;
        }
      }

      const hiveCreditUsed =
        useHive &&
        tryConsumeCredit({
          userId,
          productId: "hive-consult",
          units: 1,
          isPlatformOwner: false,
        });

      assertAndConsumeAiUsage({
        userId,
        email: params.ctx.userEmail,
        creatorId: params.creatorId,
        isPlatformOwner: false,
        useHive: useHive && !hiveCreditUsed,
        isLearnMode: false,
        extraMessageUnits,
        requireConcurrentAis: useHive && !hiveCreditUsed,
      });
    }

    return {
      reply,
      model,
      creatorId: def.id,
      creatorName: def.name,
      hiveConsulted,
      searchResults,
      attachmentsAnalyzed: attachments.length > 0 ? attachments.length : undefined,
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
