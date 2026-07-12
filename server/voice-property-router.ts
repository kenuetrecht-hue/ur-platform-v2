import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { ElevenLabsVoiceService, AI_PERSONA_VOICES } from "./elevenlabs-integration";
import { ZillowMLSService } from "./zillow-mls-integration";
import { WebSocketVoiceStreamManager, VoiceStreamProcessor } from "./websocket-voice-streaming";

/**
 * Initialize services
 */
const elevenLabsService = new ElevenLabsVoiceService(
  process.env.ELEVENLABS_API_KEY || "demo-key"
);

const zillowService = new ZillowMLSService(
  process.env.ZILLOW_API_KEY || "demo-key"
);

const voiceStreamManager = new WebSocketVoiceStreamManager();

/**
 * Voice & Property Integration Router
 */
export const voicePropertyRouter = router({
  /**
   * ElevenLabs Voice Synthesis
   */
  synthesizeVoice: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        personaId: z.enum([
          "REAL_ESTATE_MASTER",
          "PLUMBING_FOREMAN",
          "PHYSICS_ENGINEER",
          "COMPLIANCE_DOCTOR",
        ]),
      })
    )
    .mutation(async ({ input }: { input: { text: string; personaId: string } }) => {
      try {
        const voiceConfig =
          AI_PERSONA_VOICES[
            input.personaId as keyof typeof AI_PERSONA_VOICES
          ];

        const response = await elevenLabsService.synthesizeVoice({
          text: input.text,
          voiceId: voiceConfig.voiceId,
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
        });

        return {
          success: true,
          audioUrl: response.audioUrl,
          duration: response.duration,
          voiceId: response.voiceId,
        };
      } catch (error) {
        console.error("Voice synthesis error:", error);
        return {
          success: false,
          error: "Failed to synthesize voice",
        };
      }
    }),

  /**
   * Stream Voice Synthesis
   */
  streamVoiceSynthesis: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        personaId: z.enum([
          "REAL_ESTATE_MASTER",
          "PLUMBING_FOREMAN",
          "PHYSICS_ENGINEER",
          "COMPLIANCE_DOCTOR",
        ]),
      })
    )
    .query(async ({ input }: { input: { text: string; personaId: string } }) => {
      try {
        const voiceConfig =
          AI_PERSONA_VOICES[
            input.personaId as keyof typeof AI_PERSONA_VOICES
          ];

        await elevenLabsService.streamVoiceSynthesis({
          text: input.text,
          voiceId: voiceConfig.voiceId,
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
        });

        return {
          success: true,
          message: "Voice stream initiated",
        };
      } catch (error) {
        console.error("Voice stream error:", error);
        return {
          success: false,
          error: "Failed to stream voice",
        };
      }
    }),

  /**
   * Search Property
   */
  searchProperty: publicProcedure
    .input(
      z.object({
        address: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string().optional(),
      })
    )
    .query(async ({ input }: { input: { address: string; city: string; state: string; zipCode?: string } }) => {
      try {
        const property = await zillowService.searchProperty(input);
        return {
          success: true,
          property,
        };
      } catch (error) {
        console.error("Property search error:", error);
        return {
          success: false,
          error: "Failed to search property",
        };
      }
    }),

  /**
   * Get Comparable Sales
   */
  getComparableSales: publicProcedure
    .input(
      z.object({
        zpid: z.string(),
        count: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ input }: { input: { zpid: string; count: number } }) => {
      try {
        const comps = await zillowService.getComparableSales({
          zpid: input.zpid,
          count: input.count,
        });
        return {
          success: true,
          comps,
        };
      } catch (error) {
        console.error("Comparable sales error:", error);
        return {
          success: false,
          error: "Failed to get comparable sales",
        };
      }
    }),

  /**
   * Estimate ARV
   */
  estimateARV: publicProcedure
    .input(
      z.object({
        zpid: z.string(),
        afterRepairCondition: z
          .enum(["good", "excellent", "like-new"])
          .default("good"),
      })
    )
    .query(async ({ input }: { input: { zpid: string; afterRepairCondition: string } }) => {
      try {
        const arv = await zillowService.estimateARV({
          zpid: input.zpid,
          afterRepairCondition: (input.afterRepairCondition as "good" | "excellent" | "like-new") || "good",
        });
        return {
          success: true,
          arv,
        };
      } catch (error) {
        console.error("ARV estimation error:", error);
        return {
          success: false,
          error: "Failed to estimate ARV",
        };
      }
    }),

  /**
   * Calculate MAO
   */
  calculateMAO: publicProcedure
    .input(
      z.object({
        arvEstimate: z.number().min(1),
        desiredProfitMargin: z.number().min(0).max(1).default(0.2),
        repairCosts: z.number().min(0).default(0),
      })
    )
    .query(({ input }: { input: { arvEstimate: number; desiredProfitMargin: number; repairCosts: number } }) => {
      try {
        const mao = zillowService.calculateMAO(
          input.arvEstimate,
          input.desiredProfitMargin,
          input.repairCosts
        );
        return {
          success: true,
          mao,
        };
      } catch (error) {
        console.error("MAO calculation error:", error);
        return {
          success: false,
          error: "Failed to calculate MAO",
        };
      }
    }),

  /**
   * Create Voice Stream Session
   */
  createVoiceSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        personaId: z.enum([
          "REAL_ESTATE_MASTER",
          "PLUMBING_FOREMAN",
          "PHYSICS_ENGINEER",
          "COMPLIANCE_DOCTOR",
        ]),
      })
    )
    .mutation(({ input }: { input: { userId: string; personaId: string } }) => {
      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const voiceConfig =
          AI_PERSONA_VOICES[
            input.personaId as keyof typeof AI_PERSONA_VOICES
          ];

        const session = voiceStreamManager.createSession(
          sessionId,
          input.userId,
          input.personaId,
          voiceConfig.voiceId
        );

        return {
          success: true,
          sessionId: session.sessionId,
          voiceId: session.voiceId,
        };
      } catch (error) {
        console.error("Session creation error:", error);
        return {
          success: false,
          error: "Failed to create voice session",
        };
      }
    }),

  /**
   * Add Audio Chunk
   */
  addAudioChunk: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        audioChunk: z.string(), // base64 encoded
      })
    )
    .mutation(({ input }: { input: { sessionId: string; audioChunk: string } }) => {
      try {
        voiceStreamManager.addAudioChunk(input.sessionId, input.audioChunk);
        return {
          success: true,
          message: "Audio chunk added",
        };
      } catch (error) {
        console.error("Audio chunk error:", error);
        return {
          success: false,
          error: "Failed to add audio chunk",
        };
      }
    }),

  /**
   * End Voice Session
   */
  endVoiceSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(({ input }: { input: { sessionId: string } }) => {
      try {
        const session = voiceStreamManager.endSession(input.sessionId);
        const stats = voiceStreamManager.getSessionStats(input.sessionId);

        return {
          success: true,
          stats,
        };
      } catch (error) {
        console.error("Session end error:", error);
        return {
          success: false,
          error: "Failed to end voice session",
        };
      }
    }),

  /**
   * Get Session Stats
   */
  getSessionStats: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(({ input }: { input: { sessionId: string } }) => {
      try {
        const stats = voiceStreamManager.getSessionStats(input.sessionId);
        return {
          success: true,
          stats,
        };
      } catch (error) {
        console.error("Stats retrieval error:", error);
        return {
          success: false,
          error: "Failed to get session stats",
        };
      }
    }),

  /**
   * Cleanup Old Sessions
   */
  cleanupSessions: publicProcedure.mutation(() => {
    try {
      voiceStreamManager.cleanupOldSessions();
      return {
        success: true,
        message: "Old sessions cleaned up",
      };
    } catch (error) {
      console.error("Cleanup error:", error);
      return {
        success: false,
        error: "Failed to cleanup sessions",
      };
    }
  }),
});
