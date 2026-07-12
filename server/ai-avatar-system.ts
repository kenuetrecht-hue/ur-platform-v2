/**
 * AI Avatar System
 * Manages AI agent avatars, animations, and real-time rendering in 3D workspace
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AvatarAppearance {
  modelUrl: string; // URL to 3D model (GLTF/GLB)
  scale: number;
  animationSet: string; // idle, talking, working, pointing, etc.
  uniformColor: string;
  badgeText: string; // "AI Electrician", "AI Plumber", etc.
  toolsHeld: string[]; // Array of tool names
}

export interface AvatarAnimation {
  name: string;
  duration: number; // milliseconds
  loop: boolean;
  speed: number;
}

export interface AvatarState {
  agentId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  currentAnimation: string;
  isVisible: boolean;
  isSpeaking: boolean;
  speechBubbleText: string;
  gestureType: "pointing" | "gesturing" | "working" | "idle" | "celebrating" | "concerned";
}

export interface AIAvatarProfile {
  agentId: string;
  displayName: string;
  field: string;
  appearance: AvatarAppearance;
  voiceId: string;
  voiceTone: string;
  personality: {
    confidence: number; // 0-1
    friendliness: number; // 0-1
    expertise: number; // 0-1
  };
  animations: AvatarAnimation[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AvatarAppearanceSchema = z.object({
  modelUrl: z.string().url(),
  scale: z.number().min(0.1).max(10),
  animationSet: z.string(),
  uniformColor: z.string(),
  badgeText: z.string(),
  toolsHeld: z.array(z.string()),
});

const AvatarAnimationSchema = z.object({
  name: z.string(),
  duration: z.number().min(100),
  loop: z.boolean(),
  speed: z.number().min(0.1).max(5),
});

const AvatarStateSchema = z.object({
  agentId: z.string(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotation: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  currentAnimation: z.string(),
  isVisible: z.boolean(),
  isSpeaking: z.boolean(),
  speechBubbleText: z.string(),
  gestureType: z.enum(["pointing", "gesturing", "working", "idle", "celebrating", "concerned"]),
});

const PersonalitySchema = z.object({
  confidence: z.number().min(0).max(1),
  friendliness: z.number().min(0).max(1),
  expertise: z.number().min(0).max(1),
});

const AIAvatarProfileSchema = z.object({
  agentId: z.string(),
  displayName: z.string(),
  field: z.string(),
  appearance: AvatarAppearanceSchema,
  voiceId: z.string(),
  voiceTone: z.string(),
  personality: PersonalitySchema,
  animations: z.array(AvatarAnimationSchema),
});

// ============================================================================
// AVATAR SYSTEM
// ============================================================================

export class AIAvatarSystem {
  private avatarProfiles: Map<string, AIAvatarProfile> = new Map();
  private avatarStates: Map<string, AvatarState> = new Map();
  private animationQueue: Map<string, AvatarAnimation[]> = new Map();

  /**
   * Register an AI avatar profile
   */
  registerAvatar(profile: AIAvatarProfile): AIAvatarProfile {
    const validated = AIAvatarProfileSchema.parse(profile);
    this.avatarProfiles.set(profile.agentId, validated);
    this.animationQueue.set(profile.agentId, []);

    // Initialize avatar state
    const initialState: AvatarState = {
      agentId: profile.agentId,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      currentAnimation: "idle",
      isVisible: true,
      isSpeaking: false,
      speechBubbleText: "",
      gestureType: "idle",
    };

    this.avatarStates.set(profile.agentId, initialState);
    return validated;
  }

  /**
   * Get avatar profile
   */
  getAvatarProfile(agentId: string): AIAvatarProfile | null {
    return this.avatarProfiles.get(agentId) || null;
  }

  /**
   * Get avatar state
   */
  getAvatarState(agentId: string): AvatarState | null {
    return this.avatarStates.get(agentId) || null;
  }

  /**
   * Update avatar position
   */
  updateAvatarPosition(
    agentId: string,
    position: { x: number; y: number; z: number }
  ): AvatarState | null {
    const state = this.avatarStates.get(agentId);
    if (!state) return null;

    state.position = position;
    this.avatarStates.set(agentId, state);
    return state;
  }

  /**
   * Update avatar rotation
   */
  updateAvatarRotation(
    agentId: string,
    rotation: { x: number; y: number; z: number }
  ): AvatarState | null {
    const state = this.avatarStates.get(agentId);
    if (!state) return null;

    state.rotation = rotation;
    this.avatarStates.set(agentId, state);
    return state;
  }

  /**
   * Play animation on avatar
   */
  playAnimation(agentId: string, animationName: string): boolean {
    const profile = this.avatarProfiles.get(agentId);
    const state = this.avatarStates.get(agentId);

    if (!profile || !state) return false;

    const animation = profile.animations.find((a) => a.name === animationName);
    if (!animation) return false;

    state.currentAnimation = animationName;
    this.avatarStates.set(agentId, state);

    return true;
  }

  /**
   * Queue multiple animations
   */
  queueAnimations(agentId: string, animations: AvatarAnimation[]): boolean {
    if (!this.avatarProfiles.has(agentId)) return false;

    const queue = this.animationQueue.get(agentId) || [];
    queue.push(...animations);
    this.animationQueue.set(agentId, queue);

    return true;
  }

  /**
   * Make avatar speak with gesture
   */
  speak(agentId: string, text: string, duration: number = 3000): boolean {
    const state = this.avatarStates.get(agentId);
    if (!state) return false;

    state.isSpeaking = true;
    state.speechBubbleText = text;
    state.gestureType = "gesturing";

    this.avatarStates.set(agentId, state);

    // Auto-stop speaking after duration
    setTimeout(() => {
      const updatedState = this.avatarStates.get(agentId);
      if (updatedState) {
        updatedState.isSpeaking = false;
        updatedState.speechBubbleText = "";
        updatedState.gestureType = "idle";
        this.avatarStates.set(agentId, updatedState);
      }
    }, duration);

    return true;
  }

  /**
   * Make avatar point at object
   */
  pointAt(agentId: string, targetPosition: { x: number; y: number; z: number }): boolean {
    const state = this.avatarStates.get(agentId);
    if (!state) return false;

    state.gestureType = "pointing";
    this.avatarStates.set(agentId, state);

    return true;
  }

  /**
   * Make avatar show concern
   */
  showConcern(agentId: string, message: string): boolean {
    const state = this.avatarStates.get(agentId);
    if (!state) return false;

    state.gestureType = "concerned";
    state.speechBubbleText = message;
    state.isSpeaking = true;

    this.avatarStates.set(agentId, state);

    return true;
  }

  /**
   * Make avatar celebrate
   */
  celebrate(agentId: string): boolean {
    const state = this.avatarStates.get(agentId);
    if (!state) return false;

    state.gestureType = "celebrating";
    this.playAnimation(agentId, "celebrate");

    return true;
  }

  /**
   * Toggle avatar visibility
   */
  setVisibility(agentId: string, visible: boolean): AvatarState | null {
    const state = this.avatarStates.get(agentId);
    if (!state) return null;

    state.isVisible = visible;
    this.avatarStates.set(agentId, state);
    return state;
  }

  /**
   * Get all avatar states
   */
  getAllAvatarStates(): AvatarState[] {
    return Array.from(this.avatarStates.values());
  }

  /**
   * Get all visible avatars
   */
  getVisibleAvatars(): AvatarState[] {
    return Array.from(this.avatarStates.values()).filter((s) => s.isVisible);
  }

  /**
   * Remove avatar
   */
  removeAvatar(agentId: string): boolean {
    this.avatarProfiles.delete(agentId);
    this.avatarStates.delete(agentId);
    this.animationQueue.delete(agentId);
    return true;
  }

  /**
   * Get avatar interaction context
   */
  getInteractionContext(agentId: string): string {
    const profile = this.avatarProfiles.get(agentId);
    const state = this.avatarStates.get(agentId);

    if (!profile || !state) return "";

    return `${profile.displayName} is currently ${state.gestureType}${
      state.isSpeaking ? ` and saying: "${state.speechBubbleText}"` : ""
    }`;
  }
}

export default AIAvatarSystem;
