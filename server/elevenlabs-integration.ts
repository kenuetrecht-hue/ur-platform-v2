import { z } from "zod";
import { applyAffiliateDisclosures } from "../lib/affiliate-disclosure";

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

    const voiceText = applyAffiliateDisclosures(request.text, "voice").text;
    const remaining = await peekElevenLabsRemainingCharacters(this.apiKey);
    if (remaining !== null && remaining < voiceText.length) {
      throw new Error(mapElevenLabsVoiceError(402, "character_limit exceeded"));
    }

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
            text: voiceText,
            model_id: config.modelId,
            voice_settings: {
              stability: config.stability,
              similarity_boost: config.similarityBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(mapElevenLabsVoiceError(response.status, bodyText));
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");

      // Calculate approximate duration (rough estimate: 150 words per minute)
      const wordCount = voiceText.split(/\s+/).length;
      const duration = (wordCount / 150) * 60;

      noteElevenLabsCharactersUsed(voiceText.length);

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

    const voiceText = applyAffiliateDisclosures(request.text, "voice").text;

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${config.voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: voiceText,
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
/** Premade ElevenLabs Voice IDs from this account's /v1/voices list. */
export const AI_PERSONA_VOICES = {
  REAL_ESTATE_MASTER: {
    voiceId: "cjVigY5qzO86Huf0OWal",
    name: "Eric — smooth, trustworthy",
    stability: 0.6,
    similarityBoost: 0.8,
  },
  PLUMBING_FOREMAN: {
    voiceId: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie — deep, confident",
    stability: 0.7,
    similarityBoost: 0.75,
  },
  PHYSICS_ENGINEER: {
    voiceId: "SAz9YHcvj6GT2YYXdXww",
    name: "River — relaxed, informative",
    stability: 0.5,
    similarityBoost: 0.85,
  },
  COMPLIANCE_DOCTOR: {
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah — mature, reassuring",
    stability: 0.65,
    similarityBoost: 0.8,
  },
  TECH_BUILDER: {
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam — energetic builder",
    stability: 0.55,
    similarityBoost: 0.82,
  },
  GAME_FORGE: {
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura — quirky creative",
    stability: 0.6,
    similarityBoost: 0.78,
  },
  STEWARD: {
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    name: "George — warm storyteller",
    stability: 0.72,
    similarityBoost: 0.7,
  },
  URI_HOST: {
    voiceId: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger — laid-back, apologetic host",
    stability: 0.7,
    similarityBoost: 0.68,
  },
  LINGUA: {
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice — clear educator",
    stability: 0.58,
    similarityBoost: 0.8,
  },
};

export type AiPersonaVoiceKey = keyof typeof AI_PERSONA_VOICES;

let cachedRemainingChars: number | null = null;
let cachedRemainingAt = 0;

async function peekElevenLabsRemainingCharacters(apiKey: string): Promise<number | null> {
  if (cachedRemainingChars !== null && Date.now() - cachedRemainingAt < 60_000) {
    return cachedRemainingChars;
  }
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
    });
    if (!response.ok) return cachedRemainingChars;
    const data = (await response.json()) as {
      subscription?: { character_count?: number; character_limit?: number };
    };
    const used = data.subscription?.character_count ?? 0;
    const limit = data.subscription?.character_limit ?? 0;
    cachedRemainingChars = Math.max(0, limit - used);
    cachedRemainingAt = Date.now();
    return cachedRemainingChars;
  } catch {
    return cachedRemainingChars;
  }
}

function noteElevenLabsCharactersUsed(count: number): void {
  if (cachedRemainingChars === null) return;
  cachedRemainingChars = Math.max(0, cachedRemainingChars - count);
}

/** Safe, user-facing ElevenLabs failures — never include the API key. */
export function mapElevenLabsVoiceError(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();
  if (status === 401 || /unauthorized|invalid.?api.?key/.test(lower)) {
    return "Studio voice key was rejected. Playing on this device instead.";
  }
  if (
    status === 402 ||
    status === 429 ||
    /quota|credit|character.?limit|payment_required|exceed/.test(lower)
  ) {
    return "Studio voice quota is used up for now. Playing on this device instead.";
  }
  if (status === 404) {
    return "That studio voice is missing. Playing on this device instead.";
  }
  return `Studio voice failed (${status || "network"}). Playing on this device instead.`;
}

const CREATOR_VOICE_PERSONA: Record<string, AiPersonaVoiceKey> = {
  "ai-coder-001": "TECH_BUILDER",
  "ai-game-dev-001": "GAME_FORGE",
  "ai-blockchain-001": "TECH_BUILDER",
  contentmate: "GAME_FORGE",
  "affiliate-associate": "COMPLIANCE_DOCTOR",
  "platform-business-steward-ai": "STEWARD",
  linguamate: "LINGUA",
  "ai-translator-001": "LINGUA",
  "ai-reading-001": "LINGUA",
  "ai-electrician-001": "PLUMBING_FOREMAN",
  "ai-plumber-001": "PLUMBING_FOREMAN",
  "ai-hvac-001": "PLUMBING_FOREMAN",
  "ai-welder-001": "PLUMBING_FOREMAN",
  "ai-cnc-master-001": "PLUMBING_FOREMAN",
  "ai-automotive-001": "PLUMBING_FOREMAN",
  "ai-marina-mechanic-001": "PLUMBING_FOREMAN",
  "ai-small-engine-001": "PLUMBING_FOREMAN",
  "ai-realestate-001": "REAL_ESTATE_MASTER",
  "ai-business-001": "REAL_ESTATE_MASTER",
  "ai-funding-001": "REAL_ESTATE_MASTER",
};

/** Every chat AI can speak — mapped voice, or a category fallback. */
export function resolveCreatorVoicePersona(creatorId: string): AiPersonaVoiceKey {
  const mapped = CREATOR_VOICE_PERSONA[creatorId];
  if (mapped) return mapped;
  if (creatorId.includes("steward")) return "STEWARD";
  if (
    creatorId.includes("lingua") ||
    creatorId.includes("translator") ||
    creatorId.includes("reading")
  ) {
    return "LINGUA";
  }
  if (creatorId.includes("game") || creatorId.includes("content") || creatorId.includes("author") || creatorId.includes("song") || creatorId.includes("poet") || creatorId.includes("creative")) {
    return "GAME_FORGE";
  }
  if (
    creatorId.includes("coder") ||
    creatorId.includes("3d") ||
    creatorId.includes("blockchain") ||
    creatorId.includes("product")
  ) {
    return "TECH_BUILDER";
  }
  if (
    creatorId.includes("legal") ||
    creatorId.includes("attorney") ||
    creatorId.includes("tax") ||
    creatorId.includes("compliance") ||
    creatorId.includes("hr")
  ) {
    return "COMPLIANCE_DOCTOR";
  }
  if (
    creatorId.includes("estate") ||
    creatorId.includes("business") ||
    creatorId.includes("funding") ||
    creatorId.includes("sales") ||
    creatorId.includes("marketing")
  ) {
    return "REAL_ESTATE_MASTER";
  }
  if (
    creatorId.includes("plumb") ||
    creatorId.includes("hvac") ||
    creatorId.includes("electric") ||
    creatorId.includes("weld") ||
    creatorId.includes("cnc") ||
    creatorId.includes("auto") ||
    creatorId.includes("marina") ||
    creatorId.includes("engine") ||
    creatorId.includes("contractor") ||
    creatorId.includes("roofer") ||
    creatorId.includes("drywall") ||
    creatorId.includes("framer") ||
    creatorId.includes("tree") ||
    creatorId.includes("robot")
  ) {
    return "PLUMBING_FOREMAN";
  }
  return "URI_HOST";
}
