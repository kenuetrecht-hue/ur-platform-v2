/**
 * Helper AI tRPC Router
 * Endpoints for managing Tier 2 Helper AI for human content creators
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { Tier2HelperAI } from "../tier2-helper-ai";
import { ContentCreationTools } from "../content-creation-tools";
import { CreatorWebSearch } from "../creator-web-search";
import { HelperAIVoiceInteraction } from "../helper-ai-voice-interaction";

// ============================================================================
// INSTANCES
// ============================================================================

const helperAI = new Tier2HelperAI();
const contentTools = new ContentCreationTools();
const webSearch = new CreatorWebSearch();
const voiceInteraction = new HelperAIVoiceInteraction();

// ============================================================================
// ROUTER
// ============================================================================

export const helperAIRouter = router({
  /**
   * Create helper AI for content creator
   */
  createHelperAI: publicProcedure
    .input(
      z.object({
        creatorId: z.string().describe("Creator ID"),
        name: z.string().describe("Helper AI name"),
        type: z.enum([
          "writing_assistant",
          "editor",
          "formatter",
          "researcher",
          "multi_tool",
        ] as const),
      })
    )
    .mutation(({ input }: any) => {
      const profile = helperAI.createHelperAI(
        input.creatorId,
        input.name,
        input.type
      );

      return {
        success: true,
        helperAI: profile,
      };
    }),

  /**
   * Get helper AI profile
   */
  getHelperAI: publicProcedure
    .input(z.object({ helperAIId: z.string() }))
    .query(({ input }: any) => {
      const profile = helperAI.getProfile(input.helperAIId);

      if (!profile) {
        return {
          success: false,
          error: "Helper AI not found",
        };
      }

      return {
        success: true,
        helperAI: profile,
      };
    }),

  /**
   * Get creator's helper AIs
   */
  getCreatorHelpers: publicProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(({ input }: any) => {
      const helpers = helperAI.getCreatorHelpers(input.creatorId);

      return {
        success: true,
        helpers,
        count: helpers.length,
      };
    }),

  /**
   * Generate writing assistance
   */
  generateWritingAssistance: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        contentType: z.string(),
        title: z.string(),
        topic: z.string(),
      })
    )
    .mutation(({ input }: any) => {
      const assistance = helperAI.generateWritingAssistance(
        input.creatorId,
        input.contentType,
        input.title,
        input.topic
      );

      return {
        success: true,
        assistance,
      };
    }),

  /**
   * Perform editing task
   */
  performEditing: publicProcedure
    .input(
      z.object({
        contentId: z.string(),
        originalText: z.string(),
        editType: z.string(),
      })
    )
    .mutation(({ input }: any) => {
      const task = helperAI.performEditing(
        input.contentId,
        input.originalText,
        input.editType
      );

      return {
        success: true,
        editingTask: task,
      };
    }),

  /**
   * Get formatting options
   */
  getFormattingOptions: publicProcedure.query(() => {
    const options = helperAI.getFormattingOptions();

    return {
      success: true,
      options,
      count: options.length,
    };
  }),

  /**
   * Get content templates
   */
  getContentTemplates: publicProcedure.query(() => {
    const templates = contentTools.getAllTemplates();

    return {
      success: true,
      templates,
      count: templates.length,
    };
  }),

  /**
   * Get tone options
   */
  getToneOptions: publicProcedure.query(() => {
    const tones = contentTools.getAllTones();

    return {
      success: true,
      tones,
      count: tones.length,
    };
  }),

  /**
   * Analyze content
   */
  analyzeContent: publicProcedure
    .input(
      z.object({
        contentId: z.string(),
        text: z.string(),
        tone: z.string(),
      })
    )
    .mutation(({ input }: any) => {
      const analysis = contentTools.analyzeContent(
        input.contentId,
        input.text,
        input.tone
      );

      return {
        success: true,
        analysis,
      };
    }),

  /**
   * Perform web search
   */
  performWebSearch: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        helperAIId: z.string(),
        query: z.string(),
        category: z.string(),
      })
    )
    .mutation(({ input }: any) => {
      const searchQuery = webSearch.performSearch(
        input.creatorId,
        input.helperAIId,
        input.query,
        input.category
      );

      return {
        success: true,
        searchQuery,
        resultCount: searchQuery.results.length,
      };
    }),

  /**
   * Fact-check claim
   */
  factCheckClaim: publicProcedure
    .input(z.object({ claim: z.string() }))
    .mutation(({ input }: any) => {
      const factCheck = webSearch.factCheckClaim(input.claim);

      return {
        success: true,
        factCheck,
      };
    }),

  /**
   * Start voice conversation
   */
  startVoiceConversation: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        helperAIId: z.string(),
        topic: z.string(),
      })
    )
    .mutation(({ input }: any) => {
      const conversation = voiceInteraction.startVoiceConversation(
        input.creatorId,
        input.helperAIId,
        input.topic
      );

      return {
        success: true,
        conversation,
      };
    }),

  /**
   * Add voice message
   */
  addVoiceMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        speaker: z.enum(["creator", "helper_ai"] as const),
        text: z.string(),
        audioUrl: z.string().optional(),
        duration: z.number().optional(),
        confidence: z.number().optional(),
      })
    )
    .mutation(({ input }: any) => {
      const message = voiceInteraction.addVoiceMessage(
        input.conversationId,
        input.speaker,
        input.text,
        input.audioUrl,
        input.duration,
        input.confidence
      );

      if (!message) {
        return {
          success: false,
          error: "Conversation not found",
        };
      }

      return {
        success: true,
        message,
      };
    }),

  /**
   * End voice conversation
   */
  endVoiceConversation: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(({ input }: any) => {
      const conversation = voiceInteraction.endVoiceConversation(
        input.conversationId
      );

      if (!conversation) {
        return {
          success: false,
          error: "Conversation not found",
        };
      }

      return {
        success: true,
        conversation,
      };
    }),

  /**
   * Get audio settings
   */
  getAudioSettings: publicProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(({ input }: any) => {
      let settings = voiceInteraction.getAudioSettings(input.creatorId);

      if (!settings) {
        settings = voiceInteraction.initializeAudioSettings(input.creatorId);
      }

      return {
        success: true,
        settings,
      };
    }),

  /**
   * Update audio settings
   */
  updateAudioSettings: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        voiceGender: z.enum(["male", "female", "neutral"] as const).optional(),
        voiceAccent: z.enum(["american", "british", "australian", "neutral"] as const).optional(),
        speechRate: z.number().min(0.5).max(2.0).optional(),
        volume: z.number().min(0).max(100).optional(),
        audioQuality: z.enum(["low", "medium", "high", "ultra"] as const).optional(),
      })
    )
    .mutation(({ input }: any) => {
      const settings = voiceInteraction.updateAudioSettings(
        input.creatorId,
        input
      );

      return {
        success: true,
        settings,
      };
    }),

  /**
   * Generate transcript
   */
  generateTranscript: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        format: z.enum([
          "plain_text",
          "markdown",
          "formatted",
          "with_timestamps",
        ] as const),
      })
    )
    .mutation(({ input }: any) => {
      const transcript = voiceInteraction.generateTranscript(
        input.conversationId,
        input.format
      );

      if (!transcript) {
        return {
          success: false,
          error: "Conversation not found",
        };
      }

      return {
        success: true,
        transcript,
      };
    }),

  /**
   * Get voice commands
   */
  getVoiceCommands: publicProcedure.query(() => {
    const commands = voiceInteraction.getAllVoiceCommands();

    return {
      success: true,
      commands,
      count: commands.length,
    };
  }),

  /**
   * Get creator statistics
   */
  getCreatorStatistics: publicProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(({ input }: any) => {
      const helperStats = helperAI.getCreatorStatistics(input.creatorId);
      const voiceStats = voiceInteraction.getStatistics(input.creatorId);

      return {
        success: true,
        statistics: {
          helpers: helperStats,
          voice: voiceStats,
        },
      };
    }),

  /**
   * Get system statistics
   */
  getSystemStatistics: publicProcedure.query(() => {
    return {
      success: true,
      statistics: {
        totalHelpers: "Multiple",
        totalFeatures: "50+",
        capabilities: [
          "Writing assistance",
          "Editing",
          "Formatting",
          "Web search",
          "Voice interaction",
          "Content analysis",
          "Fact-checking",
          "Transcription",
        ],
      },
    };
  }),
});
