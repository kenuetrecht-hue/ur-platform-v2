import { z } from "zod";

/**
 * ElevenLabs Voice API Integration
 * Provides real-time audio synthesis for AI personas
 */

export const ElevenLabsConfigSchema = z.object({
  apiKey: z.string().min(1),
  voiceId: z.string().min(1),
  modelId: z.enum(["eleven_monolingual_v1", "eleven_multilingual_v2"]).default("eleven_multilingual_v2"),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
});

export type ElevenLabsConfig = z.infer<typeof ElevenLabsConfigSchema>;

export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
  audioBase64: string;
  duration: number;
  voiceId: string;
}

/**
 * ElevenLabs Voice Synthesis Service
 */
export class ElevenLabsVoiceService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("ElevenLabs API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Synthesize text to speech using ElevenLabs API
   */
  async synthesizeVoice(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse> {
    const config = ElevenLabsConfigSchema.parse({
      apiKey: this.apiKey,
      voiceId: request.voiceId,
      modelId: request.modelId,
      stability: request.stability,
      similarityBoost: request.similarityBoost,
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${config.voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: request.text,
            model_id: config.modelId,
            voice_settings: {
              stability: config.stability,
              similarity_boost: config.similarityBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");

      // Calculate approximate duration (rough estimate: 150 words per minute)
      const wordCount = request.text.split(/\s+/).length;
      const duration = (wordCount / 150) * 60;

      return {
        audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
        audioBase64,
        duration,
        voiceId: config.voiceId,
      };
    } catch (error) {
      console.error("ElevenLabs synthesis error:", error);
      throw error;
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching voices:", error);
      throw error;
    }
  }

  /**
   * Get voice details
   */
  async getVoiceDetails(voiceId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voice details: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching voice details:", error);
      throw error;
    }
  }

  /**
   * Stream audio synthesis (for real-time voice interactions)
   */
  async streamVoiceSynthesis(request: VoiceSynthesisRequest): Promise<ReadableStream<Uint8Array>> {
    const config = ElevenLabsConfigSchema.parse({
      apiKey: this.apiKey,
      voiceId: request.voiceId,
      modelId: request.modelId,
      stability: request.stability,
      similarityBoost: request.similarityBoost,
    });

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${config.voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: request.text,
          model_id: config.modelId,
          voice_settings: {
            stability: config.stability,
            similarity_boost: config.similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs streaming error: ${response.statusText}`);
    }

    return response.body as ReadableStream<Uint8Array>;
  }
}

/**
 * Initialize ElevenLabs service with environment variables
 */
export function initializeElevenLabsService(): ElevenLabsVoiceService {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }
  return new ElevenLabsVoiceService(apiKey);
}

/**
 * AI Persona Voice Configurations
 */
export const AI_PERSONA_VOICES = {
  REAL_ESTATE_MASTER: {
    voiceId: "voice_model_corporate_acquisitions_01",
    name: "Acquisitions Director",
    stability: 0.6,
    similarityBoost: 0.8,
  },
  PLUMBING_FOREMAN: {
    voiceId: "voice_model_seasoned_tradesman_05",
    name: "Master Plumber Vance",
    stability: 0.7,
    similarityBoost: 0.75,
  },
  PHYSICS_ENGINEER: {
    voiceId: "voice_model_academic_precise_09",
    name: "Structural Physics Engineer",
    stability: 0.5,
    similarityBoost: 0.85,
  },
  COMPLIANCE_DOCTOR: {
    voiceId: "voice_model_regulatory_counsel_02",
    name: "Compliance Doctor",
    stability: 0.65,
    similarityBoost: 0.8,
  },
};
