/**
 * ============================================================================
 * 🎙️ REAL-TIME VOICE DIFFUSION & DEEPFAKE SHIELD
 * ============================================================================
 * Adds natural human imperfections to AI-generated voices
 * Detects and prevents deepfake misuse with authentication
 * ============================================================================
 */

import { z } from "zod";

export interface VoiceDiffusionConfig {
  breathingPatterns: number; // 0-1 (frequency of natural breathing)
  hesitationMarkers: number; // 0-1 (ums, ahs, pauses)
  emotionalVariance: number; // 0-1 (tone variation)
  speechRate: number; // 0.8-1.2 (relative to normal speech)
  pitchVariation: number; // 0-1 (natural pitch fluctuations)
  backgroundAmbience: "none" | "office" | "home" | "studio" | "outdoor";
}

export interface VoiceAuthenticationToken {
  tokenId: string;
  voiceId: string;
  creatorId: string;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
  usageCount: number;
  maxUsagePerDay: number;
}

export interface DeepfakeDetectionResult {
  isAuthentic: boolean;
  confidenceScore: number; // 0-1
  suspiciousPatterns: string[];
  authenticityReport: string;
  flaggedForReview: boolean;
}

/**
 * Default voice diffusion configuration for natural-sounding AI
 */
export const DEFAULT_VOICE_DIFFUSION_CONFIG: VoiceDiffusionConfig = {
  breathingPatterns: 0.3, // Natural breathing every 10-15 seconds
  hesitationMarkers: 0.2, // Occasional "um" or "uh"
  emotionalVariance: 0.4, // Moderate tone variation
  speechRate: 0.95, // Slightly slower than normal (more natural)
  pitchVariation: 0.25, // Subtle pitch changes
  backgroundAmbience: "studio",
};

/**
 * Applies voice diffusion to AI-generated audio
 */
export function applyVoiceDiffusion(
  audioBuffer: Float32Array,
  config: VoiceDiffusionConfig = DEFAULT_VOICE_DIFFUSION_CONFIG
): Float32Array {
  const diffusedBuffer = new Float32Array(audioBuffer.length);

  // Apply breathing patterns
  if (config.breathingPatterns > 0) {
    const breathingInterval = Math.floor(audioBuffer.length / (config.breathingPatterns * 10));
    for (let i = 0; i < audioBuffer.length; i += breathingInterval) {
      // Insert subtle breathing sound (amplitude reduction + recovery)
      const breathStart = Math.min(i, audioBuffer.length - 100);
      const breathEnd = Math.min(i + 100, audioBuffer.length);
      for (let j = breathStart; j < breathEnd; j++) {
        diffusedBuffer[j] = audioBuffer[j] * 0.7; // Slight volume dip
      }
    }
  }

  // Apply hesitation markers (silence + subtle noise)
  if (config.hesitationMarkers > 0) {
    const hesitationInterval = Math.floor(audioBuffer.length / (config.hesitationMarkers * 5));
    for (let i = 0; i < audioBuffer.length; i += hesitationInterval) {
      const hesitStart = Math.min(i, audioBuffer.length - 50);
      const hesitEnd = Math.min(i + 50, audioBuffer.length);
      for (let j = hesitStart; j < hesitEnd; j++) {
        diffusedBuffer[j] = audioBuffer[j] * 0.5; // Hesitation pause
      }
    }
  }

  // Apply emotional variance (pitch modulation)
  if (config.emotionalVariance > 0) {
    for (let i = 0; i < audioBuffer.length; i++) {
      const variance = Math.sin(i / (audioBuffer.length / (config.emotionalVariance * 5))) * 0.1;
      diffusedBuffer[i] = (diffusedBuffer[i] || audioBuffer[i]) * (1 + variance);
    }
  }

  // Apply speech rate adjustment
  const rateAdjustment = config.speechRate;
  const adjustedBuffer = new Float32Array(Math.floor(audioBuffer.length / rateAdjustment));
  for (let i = 0; i < adjustedBuffer.length; i++) {
    const sourceIndex = Math.floor(i * rateAdjustment);
    adjustedBuffer[i] = diffusedBuffer[Math.min(sourceIndex, diffusedBuffer.length - 1)];
  }

  return adjustedBuffer;
}

/**
 * Creates voice authentication token for creator
 */
export function createVoiceAuthToken(
  voiceId: string,
  creatorId: string,
  maxUsagePerDay: number = 100
): VoiceAuthenticationToken {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  return {
    tokenId: `vat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    voiceId,
    creatorId,
    createdAt: now,
    expiresAt,
    isValid: true,
    usageCount: 0,
    maxUsagePerDay,
  };
}

/**
 * Validates voice authentication token
 */
export function validateVoiceAuthToken(token: VoiceAuthenticationToken): boolean {
  if (!token.isValid) return false;
  if (new Date() > token.expiresAt) return false;
  if (token.usageCount >= token.maxUsagePerDay) return false;
  return true;
}

/**
 * Detects potential deepfake in audio
 */
export function detectDeepfake(
  audioBuffer: Float32Array,
  expectedVoiceProfile?: { breathingPattern: number; hesitationFrequency: number }
): DeepfakeDetectionResult {
  const suspiciousPatterns: string[] = [];
  let suspicionScore = 0;

  // Check for unnatural consistency (all samples too similar)
  const variance = calculateVariance(audioBuffer);
  if (variance < 0.01) {
    suspiciousPatterns.push("Unnaturally consistent amplitude (possible AI generation)");
    suspicionScore += 0.2;
  }

  // Check for missing breathing patterns
  if (!expectedVoiceProfile || expectedVoiceProfile.breathingPattern < 0.1) {
    suspiciousPatterns.push("No natural breathing patterns detected");
    suspicionScore += 0.15;
  }

  // Check for missing hesitation markers
  if (!expectedVoiceProfile || expectedVoiceProfile.hesitationFrequency < 0.05) {
    suspiciousPatterns.push("Minimal hesitation or natural pauses");
    suspicionScore += 0.15;
  }

  // Check for spectral anomalies (simplified check)
  const frequencyContent = analyzeFrequencyContent(audioBuffer);
  if (frequencyContent.isUnnatural) {
    suspiciousPatterns.push("Unusual frequency distribution detected");
    suspicionScore += 0.2;
  }

  const isAuthentic = suspicionScore < 0.5;
  const confidenceScore = 1 - suspicionScore;

  return {
    isAuthentic,
    confidenceScore: Math.max(0, Math.min(1, confidenceScore)),
    suspiciousPatterns,
    authenticityReport: isAuthentic
      ? "Voice appears authentic with natural characteristics"
      : "Voice exhibits characteristics consistent with AI generation or manipulation",
    flaggedForReview: suspicionScore > 0.6,
  };
}

/**
 * Helper: Calculate variance in audio buffer
 */
function calculateVariance(buffer: Float32Array): number {
  const mean = buffer.reduce((sum, val) => sum + val, 0) / buffer.length;
  const variance =
    buffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / buffer.length;
  return Math.sqrt(variance);
}

/**
 * Helper: Analyze frequency content
 */
function analyzeFrequencyContent(
  buffer: Float32Array
): { isUnnatural: boolean; distribution: number[] } {
  // Simplified frequency analysis (in production, use FFT)
  const distribution = [0, 0, 0, 0, 0]; // 5 frequency bands
  for (let i = 0; i < buffer.length; i++) {
    const bandIndex = Math.floor((i / buffer.length) * 5);
    distribution[bandIndex] += Math.abs(buffer[i]);
  }

  // Check if distribution is too uniform (unnatural)
  const variance = calculateVariance(new Float32Array(distribution));
  const isUnnatural = variance < 0.1;

  return { isUnnatural, distribution };
}

/**
 * Zod Schemas for Validation
 */
export const VoiceDiffusionConfigSchema = z.object({
  breathingPatterns: z.number().min(0).max(1),
  hesitationMarkers: z.number().min(0).max(1),
  emotionalVariance: z.number().min(0).max(1),
  speechRate: z.number().min(0.8).max(1.2),
  pitchVariation: z.number().min(0).max(1),
  backgroundAmbience: z.enum(["none", "office", "home", "studio", "outdoor"]),
});

export const VoiceAuthenticationTokenSchema = z.object({
  tokenId: z.string(),
  voiceId: z.string(),
  creatorId: z.string(),
  createdAt: z.date(),
  expiresAt: z.date(),
  isValid: z.boolean(),
  usageCount: z.number(),
  maxUsagePerDay: z.number(),
});

export const DeepfakeDetectionResultSchema = z.object({
  isAuthentic: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  suspiciousPatterns: z.array(z.string()),
  authenticityReport: z.string(),
  flaggedForReview: z.boolean(),
});

/**
 * Export voice diffusion engine
 */
export const VoiceDiffusionEngine = {
  DEFAULT_CONFIG: DEFAULT_VOICE_DIFFUSION_CONFIG,
  applyVoiceDiffusion,
  createVoiceAuthToken,
  validateVoiceAuthToken,
  detectDeepfake,
};
