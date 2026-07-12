import { z } from "zod";

/**
 * ElevenLabs Voice API Integration Service
 * Provides real-time voice synthesis for AI personas
 */

export interface AIPersonaVoiceConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style?: number;
  useSpeaker?: boolean;
}

export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
  duration: number;
  format: "mp3" | "wav";
  voiceId: string;
  timestamp: number;
}

// ElevenLabs voice configurations for each AI persona
export const ELEVENLABS_VOICE_CONFIGS: Record<string, AIPersonaVoiceConfig> = {
  REAL_ESTATE_MASTER: {
    voiceId: "voice_model_corporate_acquisitions_01",
    modelId: "eleven_monolingual_v1",
    stability: 0.75,
    similarityBoost: 0.85,
    style: 0.5,
    useSpeaker: false,
  },
  PLUMBING_FOREMAN: {
    voiceId: "voice_model_seasoned_tradesman_05",
    modelId: "eleven_monolingual_v1",
    stability: 0.8,
    similarityBoost: 0.9,
    style: 0.3,
    useSpeaker: false,
  },
  PHYSICS_ENGINEER: {
    voiceId: "voice_model_academic_precise_09",
    modelId: "eleven_monolingual_v1",
    stability: 0.85,
    similarityBoost: 0.88,
    style: 0.6,
    useSpeaker: false,
  },
  COMPLIANCE_DOCTOR: {
    voiceId: "voice_model_regulatory_counsel_02",
    modelId: "eleven_monolingual_v1",
    stability: 0.8,
    similarityBoost: 0.82,
    style: 0.4,
    useSpeaker: false,
  },
};

/**
 * Synthesize speech from text using ElevenLabs API
 * Returns audio URL and metadata
 */
export async function synthesizeVoice(
  request: VoiceSynthesisRequest,
): Promise<VoiceSynthesisResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    // Fallback to mock response in development
    console.warn(
      "ELEVENLABS_API_KEY not set. Using mock voice synthesis response.",
    );
    return {
      audioUrl: `https://mock-audio.urmedia.io/${request.voiceId}-${Date.now()}.mp3`,
      duration: Math.ceil(request.text.length / 15), // Rough estimate: ~15 chars per second
      format: "mp3",
      voiceId: request.voiceId,
      timestamp: Date.now(),
    };
  }

  const voiceConfig = ELEVENLABS_VOICE_CONFIGS[request.voiceId] || {
    stability: 0.75,
    similarityBoost: 0.85,
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.modelId || voiceConfig.modelId,
          voice_settings: {
            stability: request.stability ?? voiceConfig.stability,
            similarity_boost: request.similarityBoost ?? voiceConfig.similarityBoost,
            style: voiceConfig.style,
            use_speaker_boost: voiceConfig.useSpeaker,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${error.detail || error.message}`,
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const audioUrl = await uploadAudioToS3(audioBuffer, request.voiceId);
    
    // Estimate duration based on text length (rough approximation)
    const estimatedDuration = Math.ceil(request.text.length / 15);

    return {
      audioUrl,
      duration: estimatedDuration,
      format: "mp3",
      voiceId: request.voiceId,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Voice synthesis error:", error);
    throw error;
  }
}

/**
 * Get voice settings for a specific AI persona
 */
export function getVoiceConfig(personaId: string): AIPersonaVoiceConfig {
  return (
    ELEVENLABS_VOICE_CONFIGS[personaId] || {
      voiceId: "default",
      modelId: "eleven_monolingual_v1",
      stability: 0.75,
      similarityBoost: 0.85,
    }
  );
}

/**
 * Stream voice synthesis for real-time audio
 * Returns a readable stream for WebRTC or direct playback
 */
export async function streamVoiceSynthesis(
  request: VoiceSynthesisRequest,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  const voiceConfig = ELEVENLABS_VOICE_CONFIGS[request.voiceId] || {
    stability: 0.75,
    similarityBoost: 0.85,
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: request.text,
        model_id: request.modelId || voiceConfig.modelId,
        voice_settings: {
          stability: request.stability ?? voiceConfig.stability,
          similarity_boost: request.similarityBoost ?? voiceConfig.similarityBoost,
          style: voiceConfig.style,
          use_speaker_boost: voiceConfig.useSpeaker,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Voice streaming failed: ${response.statusText}`);
  }

  return response.body as ReadableStream<Uint8Array>;
}

/**
 * Upload audio buffer to S3 for persistent storage
 * (Mock implementation - replace with actual S3 upload)
 */
async function uploadAudioToS3(
  audioBuffer: ArrayBuffer,
  voiceId: string,
): Promise<string> {
  // In production, upload to S3 and return the URL
  // For now, return a mock URL
  const timestamp = Date.now();
  const hash = Math.random().toString(36).substring(7);
  return `https://audio.urmedia.io/voices/${voiceId}/${timestamp}-${hash}.mp3`;
}

/**
 * Validate voice synthesis request
 */
export const VoiceSynthesisRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string(),
  modelId: z.string().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
});

export type ValidatedVoiceSynthesisRequest = z.infer<
  typeof VoiceSynthesisRequestSchema
>;
