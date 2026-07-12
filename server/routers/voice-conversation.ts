/**
 * Voice Conversation Router
 * tRPC endpoints for voice-based AI conversations
 */

import { z } from "zod";
import { publicProcedure, router } from "@/server/_core/trpc";
import RealTimeVoiceStreamingService from "@/server/voice-streaming-service";
import AvatarAnimationSyncEngine from "@/server/avatar-animation-sync";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateSessionSchema = z.object({
  userId: z.string(),
  aiAgentId: z.string(),
  sampleRate: z.number().optional(),
});

const SendMessageSchema = z.object({
  sessionId: z.string(),
  userMessage: z.string(),
  aiAgentId: z.string(),
  aiAgentVoiceId: z.string(),
});

const GetSessionSchema = z.object({
  sessionId: z.string(),
});

const StartListeningSchema = z.object({
  sessionId: z.string(),
});

const StopListeningSchema = z.object({
  sessionId: z.string(),
});

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

const voiceStreamingService = new RealTimeVoiceStreamingService();
const animationSyncEngine = new AvatarAnimationSyncEngine();

// ============================================================================
// VOICE CONVERSATION ROUTER
// ============================================================================

export const voiceConversationRouter = router({
  /**
   * Create a new voice conversation session
   */
  createSession: publicProcedure
    .input(CreateSessionSchema)
    .mutation(async ({ input }) => {
      const session = voiceStreamingService.createSession(
        input.userId,
        input.aiAgentId,
        input.sampleRate ? { sampleRate: input.sampleRate } : undefined
      );

      return {
        sessionId: session.id,
        status: session.status,
        startTime: session.startTime,
      };
    }),

  /**
   * Get session details
   */
  getSession: publicProcedure
    .input(GetSessionSchema)
    .query(async ({ input }) => {
      const session = voiceStreamingService.getSession(input.sessionId);

      if (!session) {
        throw new Error(`Session ${input.sessionId} not found`);
      }

      return {
        id: session.id,
        userId: session.userId,
        aiAgentId: session.aiAgentId,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        transcription: session.transcription,
        aiResponse: session.aiResponse,
        audioUrl: session.audioUrl,
      };
    }),

  /**
   * Start listening for user voice input
   */
  startListening: publicProcedure
    .input(StartListeningSchema)
    .mutation(async ({ input }) => {
      await voiceStreamingService.startListening(input.sessionId);

      return {
        status: "listening",
        sessionId: input.sessionId,
      };
    }),

  /**
   * Stop listening and process audio
   */
  stopListening: publicProcedure
    .input(StopListeningSchema)
    .mutation(async ({ input }) => {
      const transcription = await voiceStreamingService.stopListening(
        input.sessionId
      );

      return {
        status: "processing",
        sessionId: input.sessionId,
        transcription,
      };
    }),

  /**
   * Send message to AI and get voice response
   */
  sendMessage: publicProcedure
    .input(SendMessageSchema)
    .mutation(async ({ input }) => {
      const { response, audioUrl } =
        await voiceStreamingService.getAIVoiceResponse(
          input.sessionId,
          input.userMessage,
          input.aiAgentVoiceId
        );

      // Generate animation sequence for the AI response
      const speechAnalysis =
        animationSyncEngine.analyzeSpeechForAnimation(response);
      const animationSequence = animationSyncEngine.generateAnimationSequence(
        input.aiAgentId,
        input.sessionId,
        speechAnalysis,
        5000 // Assume 5 second audio duration
      );

      return {
        sessionId: input.sessionId,
        aiResponse: response,
        audioUrl,
        animationSequence: {
          id: animationSequence.id,
          duration: animationSequence.duration,
          emotionalTone: animationSequence.emotionalTone,
          animationCount: animationSequence.animations.length,
          gestureCount: animationSequence.gestures.length,
        },
      };
    }),

  /**
   * Get streaming metrics
   */
  getMetrics: publicProcedure
    .input(GetSessionSchema)
    .query(async ({ input }) => {
      const metrics = voiceStreamingService.getMetrics(input.sessionId);

      return {
        sessionId: metrics.sessionId,
        audioInputLatency: metrics.audioInputLatency,
        processingLatency: metrics.processingLatency,
        synthesisLatency: metrics.synthesisLatency,
        totalLatency: metrics.totalLatency,
        audioQuality: metrics.audioQuality,
        packetLoss: metrics.packetLoss,
      };
    }),

  /**
   * End voice conversation session
   */
  endSession: publicProcedure
    .input(GetSessionSchema)
    .mutation(async ({ input }) => {
      const session = voiceStreamingService.endSession(input.sessionId);

      return {
        sessionId: session.id,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        audioChunkCount: session.audioChunks.length,
      };
    }),

  /**
   * Get all active sessions
   */
  getActiveSessions: publicProcedure.query(async () => {
    const sessions = voiceStreamingService.getActiveSessions();

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      aiAgentId: session.aiAgentId,
      status: session.status,
      startTime: session.startTime,
    }));
  }),

  /**
   * Get animation at specific time
   */
  getAnimationAtTime: publicProcedure
    .input(
      z.object({
        sequenceId: z.string(),
        timeMs: z.number(),
      })
    )
    .query(async ({ input }) => {
      const animation = animationSyncEngine.getAnimationAtTime(
        input.sequenceId,
        input.timeMs
      );

      if (!animation) {
        return null;
      }

      return {
        id: animation.id,
        type: animation.type,
        duration: animation.duration,
        startTime: animation.startTime,
        endTime: animation.endTime,
        intensity: animation.intensity,
      };
    }),

  /**
   * Get gestures at specific time
   */
  getGesturesAtTime: publicProcedure
    .input(
      z.object({
        sequenceId: z.string(),
        timeMs: z.number(),
        windowMs: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const gestures = animationSyncEngine.getGesturesAtTime(
        input.sequenceId,
        input.timeMs,
        input.windowMs
      );

      return gestures.map((gesture) => ({
        id: gesture.id,
        type: gesture.type,
        timestamp: gesture.timestamp,
        duration: gesture.duration,
        position: gesture.position,
        intensity: gesture.intensity,
        targetObjectId: gesture.targetObjectId,
      }));
    }),

  /**
   * Get animation statistics
   */
  getStatistics: publicProcedure.query(async () => {
    const voiceStats = {
      activeSessions: voiceStreamingService.getActiveSessions().length,
    };

    const animationStats = animationSyncEngine.getStatistics();

    return {
      voice: voiceStats,
      animation: animationStats,
    };
  }),
});

export type VoiceConversationRouter = typeof voiceConversationRouter;
