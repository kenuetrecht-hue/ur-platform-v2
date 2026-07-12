/**
 * Real-Time Voice Streaming Service
 * Handles bidirectional audio streaming between users and AI agents
 * Integrates with ElevenLabs for voice synthesis and Web Audio API for capture
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AudioFormat = "wav" | "mp3" | "pcm";
export type VoiceStreamStatus = "idle" | "listening" | "processing" | "speaking" | "error";

export interface AudioChunk {
  id: string;
  data: ArrayBuffer;
  timestamp: number;
  format: AudioFormat;
  sampleRate: number;
}

export interface VoiceStreamSession {
  id: string;
  userId: string;
  aiAgentId: string;
  status: VoiceStreamStatus;
  startTime: Date;
  endTime?: Date;
  audioChunks: AudioChunk[];
  transcription?: string;
  aiResponse?: string;
  audioUrl?: string;
}

export interface VoiceStreamConfig {
  sampleRate: number; // 16000, 24000, 44100, 48000
  channelCount: number; // 1 (mono) or 2 (stereo)
  bitDepth: number; // 16 or 24
  format: AudioFormat;
  bufferSize: number; // milliseconds
  vadThreshold: number; // 0-1 (voice activity detection)
}

export interface StreamingMetrics {
  sessionId: string;
  audioInputLatency: number; // ms
  processingLatency: number; // ms
  synthesisLatency: number; // ms
  totalLatency: number; // ms
  audioQuality: number; // 0-1
  packetLoss: number; // 0-1
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AudioChunkSchema = z.object({
  id: z.string(),
  data: z.instanceof(ArrayBuffer),
  timestamp: z.number(),
  format: z.enum(["wav", "mp3", "pcm"]),
  sampleRate: z.number().positive(),
});

const VoiceStreamSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  aiAgentId: z.string(),
  status: z.enum(["idle", "listening", "processing", "speaking", "error"]),
  startTime: z.date(),
  endTime: z.date().optional(),
  audioChunks: z.array(AudioChunkSchema),
  transcription: z.string().optional(),
  aiResponse: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

const VoiceStreamConfigSchema = z.object({
  sampleRate: z.number().refine((val) => [16000, 24000, 44100, 48000].includes(val)),
  channelCount: z.number().refine((val) => [1, 2].includes(val)),
  bitDepth: z.number().refine((val) => [16, 24].includes(val)),
  format: z.enum(["wav", "mp3", "pcm"]),
  bufferSize: z.number().positive(),
  vadThreshold: z.number().min(0).max(1),
});

const StreamingMetricsSchema = z.object({
  sessionId: z.string(),
  audioInputLatency: z.number().nonnegative(),
  processingLatency: z.number().nonnegative(),
  synthesisLatency: z.number().nonnegative(),
  totalLatency: z.number().nonnegative(),
  audioQuality: z.number().min(0).max(1),
  packetLoss: z.number().min(0).max(1),
});

// ============================================================================
// REAL-TIME VOICE STREAMING SERVICE
// ============================================================================

export class RealTimeVoiceStreamingService {
  private sessions: Map<string, VoiceStreamSession> = new Map();
  private metrics: Map<string, StreamingMetrics> = new Map();
  private audioProcessors: Map<string, AudioProcessor> = new Map();

  private defaultConfig: VoiceStreamConfig = {
    sampleRate: 16000,
    channelCount: 1,
    bitDepth: 16,
    format: "wav",
    bufferSize: 100,
    vadThreshold: 0.3,
  };

  /**
   * Create a new voice streaming session
   */
  createSession(
    userId: string,
    aiAgentId: string,
    config?: Partial<VoiceStreamConfig>
  ): VoiceStreamSession {
    const finalConfig = { ...this.defaultConfig, ...config };
    VoiceStreamConfigSchema.parse(finalConfig);

    const session: VoiceStreamSession = {
      id: `vs-${Date.now()}-${Math.random()}`,
      userId,
      aiAgentId,
      status: "idle",
      startTime: new Date(),
      audioChunks: [],
    };

    const validated = VoiceStreamSessionSchema.parse(session);
    this.sessions.set(session.id, validated);

    // Create audio processor for this session
    const processor = new AudioProcessor(session.id, finalConfig);
    this.audioProcessors.set(session.id, processor);

    return validated;
  }

  /**
   * Start listening for user voice input
   */
  async startListening(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = "listening";
    const processor = this.audioProcessors.get(sessionId);
    if (processor) {
      processor.startCapture();
    }
  }

  /**
   * Stop listening and process captured audio
   */
  async stopListening(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = "processing";
    const processor = this.audioProcessors.get(sessionId);

    if (!processor) throw new Error(`Processor for ${sessionId} not found`);

    const audioData = processor.stopCapture();
    const transcription = await this.transcribeAudio(audioData);

    session.transcription = transcription;
    return transcription;
  }

  /**
   * Send user message to AI and get voice response
   */
  async getAIVoiceResponse(
    sessionId: string,
    userMessage: string,
    aiAgentVoiceId: string
  ): Promise<{ response: string; audioUrl: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = "processing";

    // Get AI response text (this would call your AI backend)
    const aiResponse = await this.getAIResponse(userMessage);
    session.aiResponse = aiResponse;

    // Synthesize AI response to speech
    session.status = "speaking";
    const audioUrl = await this.synthesizeToSpeech(
      aiResponse,
      aiAgentVoiceId
    );
    session.audioUrl = audioUrl;

    return { response: aiResponse, audioUrl };
  }

  /**
   * Transcribe audio to text using speech-to-text API
   */
  private async transcribeAudio(audioData: ArrayBuffer): Promise<string> {
    // This would integrate with a speech-to-text service
    // For now, return mock transcription
    console.log("Transcribing audio...");
    return "Mock transcription of user speech";
  }

  /**
   * Get AI response (placeholder - would call actual AI backend)
   */
  private async getAIResponse(userMessage: string): Promise<string> {
    // This would call your tRPC AI endpoint
    console.log(`Getting AI response for: ${userMessage}`);
    return `AI response to: "${userMessage}"`;
  }

  /**
   * Synthesize text to speech using ElevenLabs
   */
  private async synthesizeToSpeech(
    text: string,
    voiceId: string
  ): Promise<string> {
    // This would call ElevenLabs API
    // For now, return mock URL
    console.log(`Synthesizing speech with voice ${voiceId}: ${text}`);
    return `https://mock-audio-url.com/audio-${Date.now()}.mp3`;
  }

  /**
   * Add audio chunk to session
   */
  addAudioChunk(
    sessionId: string,
    data: ArrayBuffer,
    format: AudioFormat = "wav",
    sampleRate: number = 16000
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const chunk: AudioChunk = {
      id: `chunk-${Date.now()}`,
      data,
      timestamp: Date.now(),
      format,
      sampleRate,
    };

    AudioChunkSchema.parse(chunk);
    session.audioChunks.push(chunk);
  }

  /**
   * End streaming session
   */
  endSession(sessionId: string): VoiceStreamSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = "idle";
    session.endTime = new Date();

    // Clean up processor
    const processor = this.audioProcessors.get(sessionId);
    if (processor) {
      processor.cleanup();
      this.audioProcessors.delete(sessionId);
    }

    return session;
  }

  /**
   * Get streaming metrics for a session
   */
  getMetrics(sessionId: string): StreamingMetrics {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) {
      // Create default metrics
      const newMetrics: StreamingMetrics = {
        sessionId,
        audioInputLatency: 0,
        processingLatency: 0,
        synthesisLatency: 0,
        totalLatency: 0,
        audioQuality: 1.0,
        packetLoss: 0,
      };
      StreamingMetricsSchema.parse(newMetrics);
      this.metrics.set(sessionId, newMetrics);
      return newMetrics;
    }
    return metrics;
  }

  /**
   * Update metrics for a session
   */
  updateMetrics(sessionId: string, updates: Partial<StreamingMetrics>): void {
    let metrics = this.metrics.get(sessionId);
    if (!metrics) {
      metrics = {
        sessionId,
        audioInputLatency: 0,
        processingLatency: 0,
        synthesisLatency: 0,
        totalLatency: 0,
        audioQuality: 1.0,
        packetLoss: 0,
      };
    }

    const updated = { ...metrics, ...updates };
    StreamingMetricsSchema.parse(updated);
    this.metrics.set(sessionId, updated);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): VoiceStreamSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status !== "idle"
    );
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): VoiceStreamSession | undefined {
    return this.sessions.get(sessionId);
  }
}

// ============================================================================
// AUDIO PROCESSOR (handles audio capture and processing)
// ============================================================================

class AudioProcessor {
  private sessionId: string;
  private config: VoiceStreamConfig;
  private audioBuffer: Float32Array[] = [];
  private isCapturing: boolean = false;
  private captureStartTime: number = 0;

  constructor(sessionId: string, config: VoiceStreamConfig) {
    this.sessionId = sessionId;
    this.config = config;
  }

  /**
   * Start capturing audio
   */
  startCapture(): void {
    this.isCapturing = true;
    this.captureStartTime = Date.now();
    this.audioBuffer = [];
    console.log(`Started audio capture for session ${this.sessionId}`);
  }

  /**
   * Stop capturing and return audio data
   */
  stopCapture(): ArrayBuffer {
    this.isCapturing = false;

    // Combine all audio chunks into single buffer
    const totalLength = this.audioBuffer.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    const combinedBuffer = new Float32Array(totalLength);

    let offset = 0;
    for (const chunk of this.audioBuffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(
      `Stopped audio capture for session ${this.sessionId}. Total samples: ${totalLength}`
    );

    return combinedBuffer.buffer;
  }

  /**
   * Add audio data to buffer
   */
  addAudioData(data: Float32Array): void {
    if (this.isCapturing) {
      this.audioBuffer.push(new Float32Array(data));
    }
  }

  /**
   * Detect voice activity
   */
  detectVoiceActivity(data: Float32Array, threshold: number): boolean {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += Math.abs(data[i]);
    }
    const rms = Math.sqrt(sum / data.length);
    return rms > threshold;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.audioBuffer = [];
    this.isCapturing = false;
  }
}

export default RealTimeVoiceStreamingService;
