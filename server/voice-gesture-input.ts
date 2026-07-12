/**
 * Voice & Gesture Input System
 * Handles voice recognition, gesture detection, and hands-free control
 */

import { z } from "zod";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type GestureType =
  | "point"
  | "grab"
  | "pinch"
  | "swipe"
  | "rotate"
  | "scale"
  | "thumbs_up"
  | "thumbs_down"
  | "wave"
  | "open_hand";

export type VoiceCommand =
  | "add_object"
  | "remove_object"
  | "move_object"
  | "rotate_object"
  | "scale_object"
  | "add_agent"
  | "remove_agent"
  | "analyze_structure"
  | "run_simulation"
  | "export_model"
  | "undo"
  | "redo"
  | "clear_workspace"
  | "help";

export interface VoiceInput {
  id: string;
  userId: string;
  workspaceId: string;
  audioData: string; // Base64 encoded audio
  duration: number; // milliseconds
  language: string;
  confidence: number; // 0-1
  timestamp: Date;
}

export interface VoiceRecognitionResult {
  id: string;
  voiceInputId: string;
  command: VoiceCommand | null | undefined;
  text: string;
  confidence: number;
  parameters: Record<string, unknown>;
  timestamp: Date;
}

export interface GestureInput {
  id: string;
  userId: string;
  workspaceId: string;
  type: GestureType;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  intensity: number; // 0-1
  duration: number; // milliseconds
  timestamp: Date;
}

export interface GestureAction {
  id: string;
  gestureInputId: string;
  action: string;
  targetObjectId?: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
}

export interface InputContext {
  userId: string;
  workspaceId: string;
  selectedObjects: string[];
  selectedAgents: string[];
  lastCommand?: string | null;
  lastGesture?: string | null;
  commandHistory: string[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const VoiceInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  audioData: z.string(),
  duration: z.number().positive(),
  language: z.string().default("en-US"),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
});

const VoiceRecognitionResultSchema = z.object({
  id: z.string(),
  voiceInputId: z.string(),
  command: z.enum([
    "add_object",
    "remove_object",
    "move_object",
    "rotate_object",
    "scale_object",
    "add_agent",
    "remove_agent",
    "analyze_structure",
    "run_simulation",
    "export_model",
    "undo",
    "redo",
    "clear_workspace",
    "help",
  ]).nullable().optional(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  parameters: z.record(z.string(), z.unknown()),
  timestamp: z.date(),
});

const GestureInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  type: z.enum([
    "point",
    "grab",
    "pinch",
    "swipe",
    "rotate",
    "scale",
    "thumbs_up",
    "thumbs_down",
    "wave",
    "open_hand",
  ]),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  direction: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  intensity: z.number().min(0).max(1),
  duration: z.number().positive(),
  timestamp: z.date(),
});

const GestureActionSchema = z.object({
  id: z.string(),
  gestureInputId: z.string(),
  action: z.string(),
  targetObjectId: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()),
  timestamp: z.date(),
});

const InputContextSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  selectedObjects: z.array(z.string()),
  selectedAgents: z.array(z.string()),
  lastCommand: z.string().nullable().optional(),
  lastGesture: z.string().nullable().optional(),
  commandHistory: z.array(z.string()),
});

// ============================================================================
// VOICE & GESTURE INPUT SYSTEM
// ============================================================================

export class VoiceGestureInputSystem {
  private voiceInputs: Map<string, VoiceInput> = new Map();
  private voiceResults: Map<string, VoiceRecognitionResult> = new Map();
  private gestureInputs: Map<string, GestureInput> = new Map();
  private gestureActions: Map<string, GestureAction> = new Map();
  private contexts: Map<string, InputContext> = new Map();

  // Voice command mappings
  private voiceCommandMap: Record<string, VoiceCommand> = {
    "add box": "add_object",
    "add sphere": "add_object",
    "add cylinder": "add_object",
    "remove object": "remove_object",
    "move object": "move_object",
    "rotate object": "rotate_object",
    "scale object": "scale_object",
    "add electrician": "add_agent",
    "add plumber": "add_agent",
    "add roofing": "add_agent",
    "remove agent": "remove_agent",
    "analyze structure": "analyze_structure",
    "run simulation": "run_simulation",
    "export model": "export_model",
    "undo": "undo",
    "redo": "redo",
    "clear workspace": "clear_workspace",
    help: "help",
  };

  /**
   * Process voice input
   */
  processVoiceInput(input: VoiceInput): VoiceRecognitionResult {
    const validated = VoiceInputSchema.parse(input);
    this.voiceInputs.set(input.id, validated);

    // Simulate speech-to-text recognition
    const recognizedText = this.simulateSTT(input.audioData);
    const command = this.parseVoiceCommand(recognizedText);

    const result = {
      id: `vr-${Date.now()}`,
      voiceInputId: input.id,
      command: command || undefined,
      text: recognizedText,
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
      parameters: this.extractParameters(recognizedText, command),
      timestamp: new Date(),
    };

    const validatedResult = VoiceRecognitionResultSchema.parse(result) as VoiceRecognitionResult;
    this.voiceResults.set(result.id, validatedResult);

    return validatedResult;
  }

  /**
   * Process gesture input
   */
  processGestureInput(gesture: GestureInput): GestureAction {
    const validated = GestureInputSchema.parse(gesture);
    this.gestureInputs.set(gesture.id, validated);

    const action = this.mapGestureToAction(gesture);

    const gestureAction: GestureAction = {
      id: `ga-${Date.now()}`,
      gestureInputId: gesture.id,
      action: action.action,
      targetObjectId: action.targetObjectId,
      parameters: action.parameters,
      timestamp: new Date(),
    };

    const validatedAction = GestureActionSchema.parse(gestureAction);
    this.gestureActions.set(gestureAction.id, validatedAction);

    return validatedAction;
  }

  /**
   * Get input context for user
   */
  getInputContext(userId: string, workspaceId: string): InputContext {
    const key = `${userId}-${workspaceId}`;
    let context = this.contexts.get(key);

    if (!context) {
      context = {
        userId,
        workspaceId,
        selectedObjects: [],
        selectedAgents: [],
        commandHistory: [],
      };
      this.contexts.set(key, context);
    }

    return context;
  }

  /**
   * Update input context
   */
  updateInputContext(
    userId: string,
    workspaceId: string,
    updates: Partial<InputContext>
  ): InputContext {
    const key = `${userId}-${workspaceId}`;
    let context = this.contexts.get(key) || this.getInputContext(userId, workspaceId);

    const merged: InputContext = {
      userId: context.userId,
      workspaceId: context.workspaceId,
      selectedObjects: updates.selectedObjects ?? context.selectedObjects,
      selectedAgents: updates.selectedAgents ?? context.selectedAgents,
      commandHistory: updates.commandHistory ?? context.commandHistory,
      ...(updates.lastCommand !== undefined && { lastCommand: updates.lastCommand }),
      ...(updates.lastGesture !== undefined && { lastGesture: updates.lastGesture }),
    };
    const validated = InputContextSchema.parse(merged);
    this.contexts.set(key, validated);

    return validated;
  }

  /**
   * Get voice history for user
   */
  getVoiceHistory(userId: string, limit: number = 50): VoiceRecognitionResult[] {
    const results = Array.from(this.voiceResults.values());
    return results.filter((r) => r.id.startsWith("vr-")).slice(-limit);
  }

  /**
   * Get gesture history for user
   */
  getGestureHistory(userId: string, limit: number = 50): GestureAction[] {
    const actions = Array.from(this.gestureActions.values());
    return actions.filter((a) => a.id.startsWith("ga-")).slice(-limit);
  }

  /**
   * Simulate speech-to-text (in production, use Google Speech-to-Text, Azure, etc.)
   */
  private simulateSTT(audioData: string): string {
    // Mock implementation - in production, call actual STT API
    const mockCommands = [
      "add a box",
      "add sphere",
      "remove object",
      "analyze structure",
      "run simulation",
    ];
    return mockCommands[Math.floor(Math.random() * mockCommands.length)];
  }

  /**
   * Parse voice command from text
   */
  private parseVoiceCommand(text: string): VoiceCommand | null {
    const normalized = text.toLowerCase();

    for (const [key, command] of Object.entries(this.voiceCommandMap)) {
      if (normalized.includes(key)) {
        return command;
      }
    }

    return null;
  }

  /**
   * Extract parameters from voice command
   */
  private extractParameters(
    text: string,
    command: VoiceCommand | null
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (command === "add_object") {
      if (text.includes("box")) params.objectType = "box";
      else if (text.includes("sphere")) params.objectType = "sphere";
      else if (text.includes("cylinder")) params.objectType = "cylinder";
    }

    if (command === "scale_object") {
      const match = text.match(/(\d+)\s*(?:times|x)/i);
      if (match) params.scale = parseFloat(match[1]);
    }

    if (command === "rotate_object") {
      const match = text.match(/(\d+)\s*degrees/i);
      if (match) params.rotation = parseFloat(match[1]);
    }

    return params;
  }

  /**
   * Map gesture to action
   */
  private mapGestureToAction(
    gesture: GestureInput
  ): { action: string; targetObjectId?: string; parameters: Record<string, unknown> } {
    const actions: Record<GestureType, string> = {
      point: "select_object",
      grab: "grab_object",
      pinch: "scale_object",
      swipe: "move_object",
      rotate: "rotate_object",
      scale: "scale_object",
      thumbs_up: "confirm",
      thumbs_down: "cancel",
      wave: "reset_view",
      open_hand: "release_object",
    };

    return {
      action: actions[gesture.type],
      parameters: {
        position: gesture.position,
        direction: gesture.direction,
        intensity: gesture.intensity,
      },
    };
  }

  /**
   * Clear all input history
   */
  clearHistory(userId: string, workspaceId: string): void {
    const key = `${userId}-${workspaceId}`;
    this.contexts.delete(key);

    // Clear related inputs
    this.voiceInputs.forEach((v, k) => {
      if (v.userId === userId && v.workspaceId === workspaceId) {
        this.voiceInputs.delete(k);
      }
    });

    this.gestureInputs.forEach((g, k) => {
      if (g.userId === userId && g.workspaceId === workspaceId) {
        this.gestureInputs.delete(k);
      }
    });
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalVoiceInputs: number;
    totalGestureInputs: number;
    totalCommands: number;
    averageVoiceConfidence: number;
  } {
    const voiceInputsArray = Array.from(this.voiceInputs.values());
    const gestureInputsArray = Array.from(this.gestureInputs.values());

    const avgConfidence =
      voiceInputsArray.length > 0
        ? voiceInputsArray.reduce((sum, v) => sum + v.confidence, 0) /
          voiceInputsArray.length
        : 0;

    return {
      totalVoiceInputs: voiceInputsArray.length,
      totalGestureInputs: gestureInputsArray.length,
      totalCommands: this.voiceResults.size + this.gestureActions.size,
      averageVoiceConfidence: avgConfidence,
    };
  }
}

export default VoiceGestureInputSystem;
