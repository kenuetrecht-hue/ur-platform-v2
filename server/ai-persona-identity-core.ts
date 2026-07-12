/**
 * ============================================================================
 * 👑🎙️🖼️ UR MEDIA LLC — MULTI-AGENT VOCAL & VISUAL IDENTITY CONTRACT
 * ============================================================================
 * Logic: Hardcodes unique vocal audio models and visual digital avatars 
 * directly into the application's runtime state for human-like interaction.
 * ============================================================================
 */

import { z } from "zod";

export interface IAiPersonaIdentity {
  agentId: string;
  displayName: string;
  avatarImageUrl: string;       // High-resolution visual persona rendering
  elevenLabsVoiceModelId: string; // Unique voice clone audio ID
  vocalPitchModifier: number;
  vocalSpeed: number;           // Speech rate (0.5 - 2.0)
  vocalTone: "professional" | "casual" | "authoritative" | "empathetic" | "analytical";
  realWorldVibe: string;        // Description of the persona's real-world archetype
  visualBackdrop: string;       // Background setting description
  category: string;             // AI category (wellness, business, trades, etc.)
}

/**
 * Identity Stream Controller: Loads the avatar and voice profile for live conversations
 */
export function loadActiveAgentIdentity(agentId: string): IAiPersonaIdentity {
  console.log(`🖼️ IDENTITY CORE: Injecting visual avatar and vocal models for Agent: [${agentId}]`);

  // Hardcoded identity definitions inside the core build
  const identityRegistry: Record<string, IAiPersonaIdentity> = {
    // ===== WELLNESS & LIFESTYLE =====
    "AI_WELLNESS_COACH": {
      agentId: "AI_WELLNESS_COACH",
      displayName: "Wellness Guide",
      avatarImageUrl: "https://assets.urmedia.io/avatars/wellness-coach-serene.png",
      elevenLabsVoiceModelId: "voice_model_calm_therapeutic_01",
      vocalPitchModifier: 1.1,
      vocalSpeed: 0.9,
      vocalTone: "empathetic",
      realWorldVibe: "Certified wellness coach with 15+ years experience",
      visualBackdrop: "Serene meditation studio with soft lighting",
      category: "Wellness",
    },

    "AI_FITNESS_TRAINER": {
      agentId: "AI_FITNESS_TRAINER",
      displayName: "Fitness Coach",
      avatarImageUrl: "https://assets.urmedia.io/avatars/fitness-trainer-energetic.png",
      elevenLabsVoiceModelId: "voice_model_energetic_motivational_02",
      vocalPitchModifier: 1.0,
      vocalSpeed: 1.1,
      vocalTone: "authoritative",
      realWorldVibe: "Elite personal trainer, competitive athlete background",
      visualBackdrop: "Modern gym with state-of-the-art equipment",
      category: "Fitness",
    },

    // ===== FINANCIAL & BUSINESS =====
    "AI_CRYPTO_ANALYST": {
      agentId: "AI_CRYPTO_ANALYST",
      displayName: "Crypto Strategist",
      avatarImageUrl: "https://assets.urmedia.io/avatars/crypto-analyst-sharp.png",
      elevenLabsVoiceModelId: "voice_model_sharp_analytical_03",
      vocalPitchModifier: 0.95,
      vocalSpeed: 1.0,
      vocalTone: "analytical",
      realWorldVibe: "Seasoned cryptocurrency analyst, former Wall Street trader",
      visualBackdrop: "High-tech trading floor with live market data",
      category: "Finance",
    },

    "AI_BUSINESS_ADVISOR": {
      agentId: "AI_BUSINESS_ADVISOR",
      displayName: "Business Strategist",
      avatarImageUrl: "https://assets.urmedia.io/avatars/business-advisor-executive.png",
      elevenLabsVoiceModelId: "voice_model_corporate_authoritative_04",
      vocalPitchModifier: 0.9,
      vocalSpeed: 0.95,
      vocalTone: "professional",
      realWorldVibe: "C-suite executive, 25+ years business strategy",
      visualBackdrop: "Executive boardroom with panoramic city views",
      category: "Business",
    },

    // ===== LEGAL & COMPLIANCE =====
    "AI_LEGAL_REFERENCE": {
      agentId: "AI_LEGAL_REFERENCE",
      displayName: "Legal Counsel",
      avatarImageUrl: "https://assets.urmedia.io/avatars/legal-counsel-professional.png",
      elevenLabsVoiceModelId: "voice_model_legal_measured_05",
      vocalPitchModifier: 1.0,
      vocalSpeed: 0.85,
      vocalTone: "professional",
      realWorldVibe: "Senior attorney, white-glove legal practice",
      visualBackdrop: "Prestigious law office with leather and mahogany",
      category: "Legal",
    },

    // ===== CREATIVE & TECHNICAL =====
    "AI_CREATIVE_MUSE": {
      agentId: "AI_CREATIVE_MUSE",
      displayName: "Creative Director",
      avatarImageUrl: "https://assets.urmedia.io/avatars/creative-director-artistic.png",
      elevenLabsVoiceModelId: "voice_model_creative_inspiring_06",
      vocalPitchModifier: 1.05,
      vocalSpeed: 1.0,
      vocalTone: "empathetic",
      realWorldVibe: "Award-winning creative director, artist mentor",
      visualBackdrop: "Modern creative studio with art and instruments",
      category: "Creative",
    },

    "AI_AUTHOR_MUSE": {
      agentId: "AI_AUTHOR_MUSE",
      displayName: "Writing Coach",
      avatarImageUrl: "https://assets.urmedia.io/avatars/author-coach-thoughtful.png",
      elevenLabsVoiceModelId: "voice_model_literary_articulate_07",
      vocalPitchModifier: 1.0,
      vocalSpeed: 0.9,
      vocalTone: "professional",
      realWorldVibe: "Published author, literary agent, writing mentor",
      visualBackdrop: "Cozy library with floor-to-ceiling bookshelves",
      category: "Writing",
    },

    "AI_CODER_FORGE": {
      agentId: "AI_CODER_FORGE",
      displayName: "Code Architect",
      avatarImageUrl: "https://assets.urmedia.io/avatars/coder-architect-technical.png",
      elevenLabsVoiceModelId: "voice_model_technical_precise_08",
      vocalPitchModifier: 0.95,
      vocalSpeed: 1.0,
      vocalTone: "analytical",
      realWorldVibe: "Senior software architect, open-source contributor",
      visualBackdrop: "High-tech development environment with code displays",
      category: "Development",
    },

    // ===== TRADES & SPECIALIZATIONS =====
    "PLUMBING_MASTER": {
      agentId: "PLUMBING_MASTER",
      displayName: "Master Plumber Vance",
      avatarImageUrl: "https://assets.urmedia.io/avatars/plumber-vance-experienced.png",
      elevenLabsVoiceModelId: "voice_model_gritty_tradesman_09",
      vocalPitchModifier: 0.85,
      vocalSpeed: 0.95,
      vocalTone: "authoritative",
      realWorldVibe: "30-year master plumber, union foreman",
      visualBackdrop: "Professional workshop with blueprints and tools",
      category: "Trades",
    },

    "REAL_ESTATE_MASTER": {
      agentId: "REAL_ESTATE_MASTER",
      displayName: "Acquisitions Director",
      avatarImageUrl: "https://assets.urmedia.io/avatars/real-estate-executive-sharp.png",
      elevenLabsVoiceModelId: "voice_model_sharp_corporate_alpha_10",
      vocalPitchModifier: 1.0,
      vocalSpeed: 1.0,
      vocalTone: "professional",
      realWorldVibe: "Elite real estate acquisitions partner",
      visualBackdrop: "Modern boardroom with city skyline views",
      category: "Real Estate",
    },

    "PHYSICS_AERO_JUDGE": {
      agentId: "PHYSICS_AERO_JUDGE",
      displayName: "Structural Engineer",
      avatarImageUrl: "https://assets.urmedia.io/avatars/engineer-physics-technical.png",
      elevenLabsVoiceModelId: "voice_model_deep_academic_precise_11",
      vocalPitchModifier: 0.9,
      vocalSpeed: 0.85,
      vocalTone: "analytical",
      realWorldVibe: "PhD structural engineer, aerospace consultant",
      visualBackdrop: "Engineering lab with holographic displays",
      category: "Engineering",
    },

    "COMPLIANCE_DOCTOR": {
      agentId: "COMPLIANCE_DOCTOR",
      displayName: "General Counsel",
      avatarImageUrl: "https://assets.urmedia.io/avatars/compliance-doctor-corporate.png",
      elevenLabsVoiceModelId: "voice_model_calm_reassuring_objective_12",
      vocalPitchModifier: 0.95,
      vocalSpeed: 0.9,
      vocalTone: "professional",
      realWorldVibe: "White-glove general counsel, compliance expert",
      visualBackdrop: "Immaculate corporate legal office",
      category: "Compliance",
    },
  };

  return identityRegistry[agentId] || identityRegistry["AI_BUSINESS_ADVISOR"];
}

/**
 * Get all agent identities for initialization
 */
export function getAllAgentIdentities(): IAiPersonaIdentity[] {
  const identityRegistry: Record<string, IAiPersonaIdentity> = {
    "AI_WELLNESS_COACH": {
      agentId: "AI_WELLNESS_COACH",
      displayName: "Wellness Guide",
      avatarImageUrl: "https://assets.urmedia.io/avatars/wellness-coach-serene.png",
      elevenLabsVoiceModelId: "voice_model_calm_therapeutic_01",
      vocalPitchModifier: 1.1,
      vocalSpeed: 0.9,
      vocalTone: "empathetic",
      realWorldVibe: "Certified wellness coach with 15+ years experience",
      visualBackdrop: "Serene meditation studio with soft lighting",
      category: "Wellness",
    },
    "AI_FITNESS_TRAINER": {
      agentId: "AI_FITNESS_TRAINER",
      displayName: "Fitness Coach",
      avatarImageUrl: "https://assets.urmedia.io/avatars/fitness-trainer-energetic.png",
      elevenLabsVoiceModelId: "voice_model_energetic_motivational_02",
      vocalPitchModifier: 1.0,
      vocalSpeed: 1.1,
      vocalTone: "authoritative",
      realWorldVibe: "Elite personal trainer, competitive athlete background",
      visualBackdrop: "Modern gym with state-of-the-art equipment",
      category: "Fitness",
    },
    "AI_CRYPTO_ANALYST": {
      agentId: "AI_CRYPTO_ANALYST",
      displayName: "Crypto Strategist",
      avatarImageUrl: "https://assets.urmedia.io/avatars/crypto-analyst-sharp.png",
      elevenLabsVoiceModelId: "voice_model_sharp_analytical_03",
      vocalPitchModifier: 0.95,
      vocalSpeed: 1.0,
      vocalTone: "analytical",
      realWorldVibe: "Seasoned cryptocurrency analyst, former Wall Street trader",
      visualBackdrop: "High-tech trading floor with live market data",
      category: "Finance",
    },
    "AI_BUSINESS_ADVISOR": {
      agentId: "AI_BUSINESS_ADVISOR",
      displayName: "Business Strategist",
      avatarImageUrl: "https://assets.urmedia.io/avatars/business-advisor-executive.png",
      elevenLabsVoiceModelId: "voice_model_corporate_authoritative_04",
      vocalPitchModifier: 0.9,
      vocalSpeed: 0.95,
      vocalTone: "professional",
      realWorldVibe: "C-suite executive, 25+ years business strategy",
      visualBackdrop: "Executive boardroom with panoramic city views",
      category: "Business",
    },
    "AI_LEGAL_REFERENCE": {
      agentId: "AI_LEGAL_REFERENCE",
      displayName: "Legal Counsel",
      avatarImageUrl: "https://assets.urmedia.io/avatars/legal-counsel-professional.png",
      elevenLabsVoiceModelId: "voice_model_legal_measured_05",
      vocalPitchModifier: 1.0,
      vocalSpeed: 0.85,
      vocalTone: "professional",
      realWorldVibe: "Senior attorney, white-glove legal practice",
      visualBackdrop: "Prestigious law office with leather and mahogany",
      category: "Legal",
    },
    "AI_CREATIVE_MUSE": {
      agentId: "AI_CREATIVE_MUSE",
      displayName: "Creative Director",
      avatarImageUrl: "https://assets.urmedia.io/avatars/creative-director-artistic.png",
      elevenLabsVoiceModelId: "voice_model_creative_inspiring_06",
      vocalPitchModifier: 1.05,
      vocalSpeed: 1.0,
      vocalTone: "empathetic",
      realWorldVibe: "Award-winning creative director, artist mentor",
      visualBackdrop: "Modern creative studio with art and instruments",
      category: "Creative",
    },
    "AI_AUTHOR_MUSE": {
      agentId: "AI_AUTHOR_MUSE",
      displayName: "Writing Coach",
      avatarImageUrl: "https://assets.urmedia.io/avatars/author-coach-thoughtful.png",
      elevenLabsVoiceModelId: "voice_model_literary_articulate_07",
      vocalPitchModifier: 1.0,
      vocalSpeed: 0.9,
      vocalTone: "professional",
      realWorldVibe: "Published author, literary agent, writing mentor",
      visualBackdrop: "Cozy library with floor-to-ceiling bookshelves",
      category: "Writing",
    },
    "AI_CODER_FORGE": {
      agentId: "AI_CODER_FORGE",
      displayName: "Code Architect",
      avatarImageUrl: "https://assets.urmedia.io/avatars/coder-architect-technical.png",
      elevenLabsVoiceModelId: "voice_model_technical_precise_08",
      vocalPitchModifier: 0.95,
      vocalSpeed: 1.0,
      vocalTone: "analytical",
      realWorldVibe: "Senior software architect, open-source contributor",
      visualBackdrop: "High-tech development environment with code displays",
      category: "Development",
    },
    "PLUMBING_MASTER": {
      agentId: "PLUMBING_MASTER",
      displayName: "Master Plumber Vance",
      avatarImageUrl: "https://assets.urmedia.io/avatars/plumber-vance-experienced.png",
      elevenLabsVoiceModelId: "voice_model_gritty_tradesman_09",
      vocalPitchModifier: 0.85,
      vocalSpeed: 0.95,
      vocalTone: "authoritative",
      realWorldVibe: "30-year master plumber, union foreman",
      visualBackdrop: "Professional workshop with blueprints and tools",
      category: "Trades",
    },
    "REAL_ESTATE_MASTER": {
      agentId: "REAL_ESTATE_MASTER",
      displayName: "Acquisitions Director",
      avatarImageUrl: "https://assets.urmedia.io/avatars/real-estate-executive-sharp.png",
      elevenLabsVoiceModelId: "voice_model_sharp_corporate_alpha_10",
      vocalPitchModifier: 1.0,
      vocalSpeed: 1.0,
      vocalTone: "professional",
      realWorldVibe: "Elite real estate acquisitions partner",
      visualBackdrop: "Modern boardroom with city skyline views",
      category: "Real Estate",
    },
    "PHYSICS_AERO_JUDGE": {
      agentId: "PHYSICS_AERO_JUDGE",
      displayName: "Structural Engineer",
      avatarImageUrl: "https://assets.urmedia.io/avatars/engineer-physics-technical.png",
      elevenLabsVoiceModelId: "voice_model_deep_academic_precise_11",
      vocalPitchModifier: 0.9,
      vocalSpeed: 0.85,
      vocalTone: "analytical",
      realWorldVibe: "PhD structural engineer, aerospace consultant",
      visualBackdrop: "Engineering lab with holographic displays",
      category: "Engineering",
    },
    "COMPLIANCE_DOCTOR": {
      agentId: "COMPLIANCE_DOCTOR",
      displayName: "General Counsel",
      avatarImageUrl: "https://assets.urmedia.io/avatars/compliance-doctor-corporate.png",
      elevenLabsVoiceModelId: "voice_model_calm_reassuring_objective_12",
      vocalPitchModifier: 0.95,
      vocalSpeed: 0.9,
      vocalTone: "professional",
      realWorldVibe: "White-glove general counsel, compliance expert",
      visualBackdrop: "Immaculate corporate legal office",
      category: "Compliance",
    },
  };

  return Object.values(identityRegistry);
}

/**
 * Stream agent identity for real-time voice/video interaction
 */
export function streamAgentIdentity(agentId: string) {
  const identity = loadActiveAgentIdentity(agentId);

  return {
    agentId: identity.agentId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarImageUrl,
    voiceModelId: identity.elevenLabsVoiceModelId,
    voiceConfig: {
      pitch: identity.vocalPitchModifier,
      speed: identity.vocalSpeed,
      tone: identity.vocalTone,
    },
    backdrop: identity.visualBackdrop,
    realWorldVibe: identity.realWorldVibe,
    category: identity.category,
    streamStatus: "READY_FOR_INTERACTION",
    timestamp: new Date(),
  };
}

// Zod validation schema
export const AIPersonaIdentitySchema = z.object({
  agentId: z.string(),
  displayName: z.string(),
  avatarImageUrl: z.string().url(),
  elevenLabsVoiceModelId: z.string(),
  vocalPitchModifier: z.number().min(0.5).max(2.0),
  vocalSpeed: z.number().min(0.5).max(2.0),
  vocalTone: z.enum(["professional", "casual", "authoritative", "empathetic", "analytical"]),
  realWorldVibe: z.string(),
  visualBackdrop: z.string(),
  category: z.string(),
});

export type AIPersonaIdentity = z.infer<typeof AIPersonaIdentitySchema>;
