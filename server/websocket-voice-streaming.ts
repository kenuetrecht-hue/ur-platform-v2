import { z } from "zod";

/**
 * WebSocket Voice Streaming Service
 * Provides real-time audio capture, transmission, and AI response streaming
 */

export const VoiceStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("audio_chunk"),
    data: z.string(), // base64 encoded audio
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("start_stream"),
    voiceId: z.string(),
    personaId: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("end_stream"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("ai_response"),
    text: z.string(),
    audioBase64: z.string(),
    voiceId: z.string(),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    code: z.string(),
  }),
]);

export type VoiceStreamMessage = z.infer<typeof VoiceStreamMessageSchema>;

export interface VoiceStreamSession {
  sessionId: string;
  userId: string;
  personaId: string;
  voiceId: string;
  startTime: number;
  audioChunks: string[];
  isActive: boolean;
}

export interface StreamingConfig {
  sampleRate: number; // 16000 Hz
  channels: number; // 1 (mono)
  encoding: string; // "LINEAR16"
  chunkSize: number; // bytes per chunk
  maxDuration: number; // max session duration in seconds
}

/**
 * WebSocket Voice Streaming Manager
 */
export class WebSocketVoiceStreamManager {
  private sessions: Map<string, VoiceStreamSession> = new Map();
  private config: StreamingConfig = {
    sampleRate: 16000,
    channels: 1,
    encoding: "LINEAR16",
    chunkSize: 1024,
    maxDuration: 300, // 5 minutes max
  };

  /**
   * Create a new voice streaming session
   */
  createSession(
    sessionId: string,
    userId: string,
    personaId: string,
    voiceId: string
  ): VoiceStreamSession {
    const session: VoiceStreamSession = {
      sessionId,
      userId,
      personaId,
      voiceId,
      startTime: Date.now(),
      audioChunks: [],
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add audio chunk to session
   */
  addAudioChunk(sessionId: string, audioChunk: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isActive) {
      throw new Error(`Session ${sessionId} is not active`);
    }

    const duration = (Date.now() - session.startTime) / 1000;
    if (duration > this.config.maxDuration) {
      throw new Error(`Session ${sessionId} exceeded max duration`);
    }

    session.audioChunks.push(audioChunk);
  }

  /**
   * Get combined audio from session
   */
  getSessionAudio(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Combine all audio chunks
    return session.audioChunks.join("");
  }

  /**
   * End voice streaming session
   */
  endSession(sessionId: string): VoiceStreamSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.isActive = false;
    return session;
  }

  /**
   * Get session details
   */
  getSession(sessionId: string): VoiceStreamSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clean up old sessions (older than 1 hour)
   */
  cleanupOldSessions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const sessionsToDelete: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (session.startTime < oneHourAgo) {
        sessionsToDelete.push(sessionId);
      }
    });

    sessionsToDelete.forEach((sessionId) => {
      this.sessions.delete(sessionId);
    });
  }

  /**
   * Get streaming configuration
   */
  getConfig(): StreamingConfig {
    return this.config;
  }

  /**
   * Update streaming configuration
   */
  updateConfig(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const duration = (Date.now() - session.startTime) / 1000;
    const audioSize = session.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);

    return {
      sessionId,
      userId: session.userId,
      personaId: session.personaId,
      duration,
      audioChunks: session.audioChunks.length,
      audioSize,
      isActive: session.isActive,
    };
  }
}

/**
 * Voice Stream Processor
 * Handles audio processing and transcription
 */
export class VoiceStreamProcessor {
  /**
   * Decode base64 audio to buffer
   */
  static decodeAudio(audioBase64: string): Buffer {
    return Buffer.from(audioBase64, "base64");
  }

  /**
   * Encode buffer to base64 audio
   */
  static encodeAudio(audioBuffer: Buffer): string {
    return audioBuffer.toString("base64");
  }

  /**
   * Calculate audio duration from buffer
   */
  static calculateDuration(
    audioBuffer: Buffer,
    sampleRate: number = 16000,
    channels: number = 1
  ): number {
    // Duration = (buffer size in bytes) / (sample rate * channels * bytes per sample)
    // For 16-bit audio: 2 bytes per sample
    const bytesPerSample = 2;
    const totalSamples = audioBuffer.length / (channels * bytesPerSample);
    return totalSamples / sampleRate;
  }

  /**
   * Validate audio format
   */
  static validateAudioFormat(
    audioBuffer: Buffer,
    expectedSize?: number
  ): boolean {
    if (!audioBuffer || audioBuffer.length === 0) {
      return false;
    }

    if (expectedSize && audioBuffer.length !== expectedSize) {
      return false;
    }

    return true;
  }

  /**
   * Combine multiple audio chunks
   */
  static combineAudioChunks(chunks: Buffer[]): Buffer {
    return Buffer.concat(chunks);
  }

  /**
   * Split audio into chunks
   */
  static splitAudioIntoChunks(
    audioBuffer: Buffer,
    chunkSize: number = 1024
  ): Buffer[] {
    const chunks: Buffer[] = [];
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      chunks.push(audioBuffer.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * Voice Stream Event Emitter
 * Handles WebSocket events for voice streaming
 */
export class VoiceStreamEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Emit event
   */
  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Initialize WebSocket voice streaming manager
 */
export function initializeVoiceStreamManager(): WebSocketVoiceStreamManager {
  return new WebSocketVoiceStreamManager();
}

/**
 * Initialize voice stream event emitter
 */
export function initializeVoiceStreamEmitter(): VoiceStreamEventEmitter {
  return new VoiceStreamEventEmitter();
}
