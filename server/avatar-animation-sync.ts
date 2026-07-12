/**
 * Avatar Animation Synchronization System
 * Synchronizes avatar gestures and animations with voice playback
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AnimationType =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "gesture_point"
  | "gesture_grab"
  | "gesture_pinch"
  | "gesture_swipe"
  | "gesture_rotate"
  | "gesture_scale"
  | "expression_happy"
  | "expression_neutral"
  | "expression_concerned"
  | "expression_confident";

export type GestureType =
  | "point"
  | "grab"
  | "pinch"
  | "swipe"
  | "rotate"
  | "scale"
  | "thumbs_up"
  | "wave"
  | "nod"
  | "shake";

export interface AnimationFrame {
  id: string;
  type: AnimationType;
  duration: number; // milliseconds
  startTime: number; // relative to audio start
  endTime: number;
  intensity: number; // 0-1
  metadata: Record<string, unknown>;
}

export interface GestureEvent {
  id: string;
  type: GestureType;
  timestamp: number; // relative to audio start
  duration: number; // milliseconds
  position: { x: number; y: number; z: number };
  intensity: number; // 0-1
  targetObjectId?: string;
}

export interface AvatarAnimationSequence {
  id: string;
  aiAgentId: string;
  audioSessionId: string;
  duration: number; // total duration in ms
  animations: AnimationFrame[];
  gestures: GestureEvent[];
  emotionalTone: "neutral" | "happy" | "concerned" | "confident" | "excited";
  createdAt: Date;
}

export interface SpeechAnalysis {
  text: string;
  sentiment: number; // -1 to 1
  intensity: number; // 0-1
  pace: number; // 0-2 (0.5 = slow, 1 = normal, 2 = fast)
  emphasis: string[]; // words to emphasize
  pauses: number[]; // timestamps of pauses
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AnimationFrameSchema = z.object({
  id: z.string(),
  type: z.enum([
    "idle",
    "listening",
    "thinking",
    "speaking",
    "gesture_point",
    "gesture_grab",
    "gesture_pinch",
    "gesture_swipe",
    "gesture_rotate",
    "gesture_scale",
    "expression_happy",
    "expression_neutral",
    "expression_concerned",
    "expression_confident",
  ]),
  duration: z.number().positive(),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative(),
  intensity: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.unknown()),
});

const GestureEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "point",
    "grab",
    "pinch",
    "swipe",
    "rotate",
    "scale",
    "thumbs_up",
    "wave",
    "nod",
    "shake",
  ]),
  timestamp: z.number().nonnegative(),
  duration: z.number().positive(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  intensity: z.number().min(0).max(1),
  targetObjectId: z.string().optional(),
});

const AvatarAnimationSequenceSchema = z.object({
  id: z.string(),
  aiAgentId: z.string(),
  audioSessionId: z.string(),
  duration: z.number().positive(),
  animations: z.array(AnimationFrameSchema),
  gestures: z.array(GestureEventSchema),
  emotionalTone: z.enum(["neutral", "happy", "concerned", "confident", "excited"]),
  createdAt: z.date(),
});

const SpeechAnalysisSchema = z.object({
  text: z.string(),
  sentiment: z.number().min(-1).max(1),
  intensity: z.number().min(0).max(1),
  pace: z.number().min(0).max(2),
  emphasis: z.array(z.string()),
  pauses: z.array(z.number()),
});

// ============================================================================
// AVATAR ANIMATION SYNCHRONIZATION ENGINE
// ============================================================================

export class AvatarAnimationSyncEngine {
  private sequences: Map<string, AvatarAnimationSequence> = new Map();
  private currentAnimations: Map<string, AnimationFrame> = new Map();

  /**
   * Generate animation sequence from speech analysis
   */
  generateAnimationSequence(
    aiAgentId: string,
    audioSessionId: string,
    speechAnalysis: SpeechAnalysis,
    audioDuration: number
  ): AvatarAnimationSequence {
    const animations: AnimationFrame[] = [];
    const gestures: GestureEvent[] = [];

    // Determine emotional tone based on sentiment
    let emotionalTone: "neutral" | "happy" | "concerned" | "confident" | "excited" =
      "neutral";
    if (speechAnalysis.sentiment > 0.5) emotionalTone = "happy";
    else if (speechAnalysis.sentiment < -0.3) emotionalTone = "concerned";
    else if (speechAnalysis.intensity > 0.7) emotionalTone = "confident";
    else if (speechAnalysis.intensity > 0.8) emotionalTone = "excited";

    // Generate base speaking animation
    animations.push({
      id: `anim-speaking-${Date.now()}`,
      type: "speaking",
      duration: audioDuration,
      startTime: 0,
      endTime: audioDuration,
      intensity: speechAnalysis.intensity,
      metadata: { pace: speechAnalysis.pace },
    });

    // Add expression animation
    const expressionType =
      emotionalTone === "happy"
        ? "expression_happy"
        : emotionalTone === "concerned"
          ? "expression_concerned"
          : emotionalTone === "confident"
            ? "expression_confident"
            : "expression_neutral";

    animations.push({
      id: `anim-expr-${Date.now()}`,
      type: expressionType as AnimationType,
      duration: audioDuration,
      startTime: 0,
      endTime: audioDuration,
      intensity: Math.abs(speechAnalysis.sentiment),
      metadata: { tone: emotionalTone },
    });

    // Generate gestures based on emphasis words
    speechAnalysis.emphasis.forEach((word, index) => {
      const gestureTypes: GestureType[] = [
        "point",
        "grab",
        "thumbs_up",
        "wave",
        "nod",
      ];
      const gestureType = gestureTypes[index % gestureTypes.length];

      // Distribute gestures throughout the audio
      const timestamp = (index / speechAnalysis.emphasis.length) * audioDuration;

      gestures.push({
        id: `gesture-${index}-${Date.now()}`,
        type: gestureType,
        timestamp,
        duration: 500 + Math.random() * 500,
        position: {
          x: -0.5 + Math.random(),
          y: 0.2 + Math.random() * 0.3,
          z: 0,
        },
        intensity: 0.6 + Math.random() * 0.4,
      });
    });

    // Add pauses as thinking animations
    speechAnalysis.pauses.forEach((pauseTime) => {
      animations.push({
        id: `anim-think-${pauseTime}`,
        type: "thinking",
        duration: 300,
        startTime: pauseTime,
        endTime: pauseTime + 300,
        intensity: 0.5,
        metadata: {},
      });
    });

    const sequence: AvatarAnimationSequence = {
      id: `seq-${Date.now()}`,
      aiAgentId,
      audioSessionId,
      duration: audioDuration,
      animations,
      gestures,
      emotionalTone,
      createdAt: new Date(),
    };

    const validated = AvatarAnimationSequenceSchema.parse(sequence);
    this.sequences.set(sequence.id, validated);

    return validated;
  }

  /**
   * Get animation frame at specific time
   */
  getAnimationAtTime(
    sequenceId: string,
    timeMs: number
  ): AnimationFrame | undefined {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return undefined;

    return sequence.animations.find(
      (anim) => anim.startTime <= timeMs && timeMs < anim.endTime
    );
  }

  /**
   * Get gestures at specific time
   */
  getGesturesAtTime(
    sequenceId: string,
    timeMs: number,
    windowMs: number = 500
  ): GestureEvent[] {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return [];

    return sequence.gestures.filter(
      (gesture) =>
        gesture.timestamp <= timeMs &&
        timeMs < gesture.timestamp + gesture.duration + windowMs
    );
  }

  /**
   * Get next animation event
   */
  getNextAnimationEvent(
    sequenceId: string,
    currentTimeMs: number
  ): AnimationFrame | undefined {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return undefined;

    return sequence.animations.find((anim) => anim.startTime > currentTimeMs);
  }

  /**
   * Analyze speech for animation cues
   */
  analyzeSpeechForAnimation(text: string): SpeechAnalysis {
    // Simple sentiment analysis
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "perfect",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "horrible",
      "poor",
      "wrong",
    ];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((w) =>
      lowerText.includes(w)
    ).length;
    const negativeCount = negativeWords.filter((w) =>
      lowerText.includes(w)
    ).length;

    const sentiment = (positiveCount - negativeCount) / (text.length / 100);

    // Detect emphasis words (all caps or with exclamation)
    const emphasis = text
      .split(" ")
      .filter((word) => word === word.toUpperCase() || word.endsWith("!"))
      .map((w) => w.replace(/[!.?]/g, ""));

    // Detect pauses (periods, commas)
    const pauses: number[] = [];
    let charCount = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "." || text[i] === "," || text[i] === "?") {
        pauses.push((charCount / text.length) * 5000); // Assume 5 second audio
      }
      charCount++;
    }

    return {
      text,
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      intensity: Math.min(1, (positiveCount + negativeCount) / 5),
      pace: 1 + (emphasis.length - 3) * 0.2,
      emphasis,
      pauses,
    };
  }

  /**
   * Get animation sequence
   */
  getSequence(sequenceId: string): AvatarAnimationSequence | undefined {
    return this.sequences.get(sequenceId);
  }

  /**
   * Get all sequences for an AI agent
   */
  getSequencesForAgent(aiAgentId: string): AvatarAnimationSequence[] {
    return Array.from(this.sequences.values()).filter(
      (seq) => seq.aiAgentId === aiAgentId
    );
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalSequences: number;
    totalAnimations: number;
    totalGestures: number;
  } {
    const sequences = Array.from(this.sequences.values());
    const totalAnimations = sequences.reduce(
      (sum, seq) => sum + seq.animations.length,
      0
    );
    const totalGestures = sequences.reduce(
      (sum, seq) => sum + seq.gestures.length,
      0
    );

    return {
      totalSequences: sequences.length,
      totalAnimations,
      totalGestures,
    };
  }
}

export default AvatarAnimationSyncEngine;
