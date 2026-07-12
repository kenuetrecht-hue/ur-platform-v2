/**
 * Helper AI Voice Interaction System
 * Enables two-way voice conversation between human content creators and helper AI
 * Speech-to-text, text-to-speech, and real-time conversation tracking
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const VoiceMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  speaker: z.enum(["creator", "helper_ai"] as const),
  text: z.string(),
  audioUrl: z.string().optional(),
  duration: z.number(), // seconds
  timestamp: z.date(),
  confidence: z.number().min(0).max(100).optional(), // For speech-to-text
});

const VoiceConversationSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  helperAIId: z.string(),
  topic: z.string(),
  messages: z.array(VoiceMessageSchema),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // total duration in seconds
  status: z.enum(["active", "paused", "completed"] as const),
  transcript: z.string(), // Full conversation transcript
});

const VoiceCommandSchema = z.object({
  id: z.string(),
  command: z.string(),
  action: z.enum([
    "start_recording",
    "stop_recording",
    "pause",
    "resume",
    "save",
    "export",
    "search",
    "format",
    "edit",
    "analyze",
    "suggest",
  ] as const),
  description: z.string(),
  example: z.string(),
});

const AudioSettingsSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  voiceGender: z.enum(["male", "female", "neutral"] as const),
  voiceAccent: z.enum(["american", "british", "australian", "neutral"] as const),
  speechRate: z.number().min(0.5).max(2.0), // 0.5x to 2.0x speed
  volume: z.number().min(0).max(100),
  audioQuality: z.enum(["low", "medium", "high", "ultra"] as const),
  autoTranscribe: z.boolean(),
  language: z.string(),
});

const ConversationAnalysisSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  totalMessages: z.number(),
  creatorMessages: z.number(),
  helperMessages: z.number(),
  averageMessageLength: z.number(),
  sentiment: z.enum(["positive", "neutral", "negative"] as const),
  topics: z.array(z.string()),
  actionItems: z.array(z.string()),
  keyInsights: z.array(z.string()),
});

const VoiceTranscriptSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  format: z.enum(["plain_text", "markdown", "formatted", "with_timestamps"] as const),
  content: z.string(),
  wordCount: z.number(),
  readabilityScore: z.number().min(0).max(100),
  generatedAt: z.date(),
});

// ============================================================================
// TYPES
// ============================================================================

type VoiceMessage = z.infer<typeof VoiceMessageSchema>;
type VoiceConversation = z.infer<typeof VoiceConversationSchema>;
type VoiceCommand = z.infer<typeof VoiceCommandSchema>;
type AudioSettings = z.infer<typeof AudioSettingsSchema>;
type ConversationAnalysis = z.infer<typeof ConversationAnalysisSchema>;
type VoiceTranscript = z.infer<typeof VoiceTranscriptSchema>;

// ============================================================================
// HELPER AI VOICE INTERACTION SYSTEM
// ============================================================================

export class HelperAIVoiceInteraction {
  private conversations: Map<string, VoiceConversation> = new Map();
  private audioSettings: Map<string, AudioSettings> = new Map();
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private analyses: Map<string, ConversationAnalysis> = new Map();
  private transcripts: Map<string, VoiceTranscript> = new Map();

  constructor() {
    this.initializeVoiceCommands();
  }

  /**
   * Initialize voice commands
   */
  private initializeVoiceCommands(): void {
    const commands: VoiceCommand[] = [
      {
        id: "cmd-1",
        command: "start recording",
        action: "start_recording",
        description: "Begin recording a new voice conversation",
        example: "Start recording",
      },
      {
        id: "cmd-2",
        command: "stop recording",
        action: "stop_recording",
        description: "Stop recording and save conversation",
        example: "Stop recording",
      },
      {
        id: "cmd-3",
        command: "pause",
        action: "pause",
        description: "Pause the current conversation",
        example: "Pause",
      },
      {
        id: "cmd-4",
        command: "resume",
        action: "resume",
        description: "Resume paused conversation",
        example: "Resume",
      },
      {
        id: "cmd-5",
        command: "save conversation",
        action: "save",
        description: "Save current conversation",
        example: "Save conversation",
      },
      {
        id: "cmd-6",
        command: "export transcript",
        action: "export",
        description: "Export conversation as transcript",
        example: "Export transcript",
      },
      {
        id: "cmd-7",
        command: "search content",
        action: "search",
        description: "Search web for content topic",
        example: "Search for information about marketing",
      },
      {
        id: "cmd-8",
        command: "format content",
        action: "format",
        description: "Format content in specific style",
        example: "Format as blog post",
      },
      {
        id: "cmd-9",
        command: "edit content",
        action: "edit",
        description: "Edit content for grammar and clarity",
        example: "Edit for grammar",
      },
      {
        id: "cmd-10",
        command: "analyze content",
        action: "analyze",
        description: "Analyze content readability and tone",
        example: "Analyze readability",
      },
      {
        id: "cmd-11",
        command: "suggest improvements",
        action: "suggest",
        description: "Get suggestions for content improvement",
        example: "Suggest improvements",
      },
    ];

    commands.forEach((c) => this.voiceCommands.set(c.id, c));
  }

  /**
   * Start voice conversation
   */
  startVoiceConversation(
    creatorId: string,
    helperAIId: string,
    topic: string
  ): VoiceConversation {
    const conversation: VoiceConversation = {
      id: `voice-conv-${Date.now()}`,
      creatorId,
      helperAIId,
      topic,
      messages: [],
      startTime: new Date(),
      status: "active",
      transcript: "",
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  /**
   * Add voice message to conversation
   */
  addVoiceMessage(
    conversationId: string,
    speaker: VoiceMessage["speaker"],
    text: string,
    audioUrl?: string,
    duration?: number,
    confidence?: number
  ): VoiceMessage | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const message: VoiceMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      speaker,
      text,
      audioUrl,
      duration: duration || 0,
      timestamp: new Date(),
      confidence,
    };

    conversation.messages.push(message);

    // Update transcript
    const speakerLabel = speaker === "creator" ? "Creator" : "Helper AI";
    conversation.transcript += `\n${speakerLabel}: ${text}`;

    return message;
  }

  /**
   * End voice conversation
   */
  endVoiceConversation(conversationId: string): VoiceConversation | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    conversation.status = "completed";
    conversation.endTime = new Date();
    conversation.duration =
      (conversation.endTime.getTime() - conversation.startTime.getTime()) /
      1000; // seconds

    // Auto-analyze conversation
    this.analyzeConversation(conversationId);

    return conversation;
  }

  /**
   * Pause conversation
   */
  pauseConversation(conversationId: string): VoiceConversation | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    conversation.status = "paused";
    return conversation;
  }

  /**
   * Resume conversation
   */
  resumeConversation(conversationId: string): VoiceConversation | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    conversation.status = "active";
    return conversation;
  }

  /**
   * Initialize audio settings for creator
   */
  initializeAudioSettings(creatorId: string): AudioSettings {
    const settings: AudioSettings = {
      id: `audio-${creatorId}`,
      creatorId,
      voiceGender: "female",
      voiceAccent: "american",
      speechRate: 1.0,
      volume: 80,
      audioQuality: "high",
      autoTranscribe: true,
      language: "en-US",
    };

    this.audioSettings.set(creatorId, settings);
    return settings;
  }

  /**
   * Update audio settings
   */
  updateAudioSettings(
    creatorId: string,
    updates: Partial<AudioSettings>
  ): AudioSettings | null {
    let settings = this.audioSettings.get(creatorId);
    if (!settings) {
      settings = this.initializeAudioSettings(creatorId);
    }

    Object.assign(settings, updates);
    return settings;
  }

  /**
   * Get audio settings
   */
  getAudioSettings(creatorId: string): AudioSettings | null {
    return this.audioSettings.get(creatorId) || null;
  }

  /**
   * Analyze conversation
   */
  private analyzeConversation(conversationId: string): ConversationAnalysis | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const creatorMessages = conversation.messages.filter(
      (m) => m.speaker === "creator"
    );
    const helperMessages = conversation.messages.filter(
      (m) => m.speaker === "helper_ai"
    );

    const totalWords = conversation.messages.reduce(
      (sum, m) => sum + m.text.split(/\s+/).length,
      0
    );
    const averageMessageLength =
      conversation.messages.length > 0
        ? totalWords / conversation.messages.length
        : 0;

    // Extract topics from messages
    const topics = this.extractTopics(conversation.messages);

    // Extract action items
    const actionItems = this.extractActionItems(conversation.messages);

    // Determine sentiment
    const sentiment = this.analyzeSentiment(conversation.transcript);

    const analysis: ConversationAnalysis = {
      id: `analysis-${Date.now()}`,
      conversationId,
      totalMessages: conversation.messages.length,
      creatorMessages: creatorMessages.length,
      helperMessages: helperMessages.length,
      averageMessageLength: Math.round(averageMessageLength),
      sentiment,
      topics,
      actionItems,
      keyInsights: this.generateInsights(
        conversation.messages,
        topics,
        actionItems
      ),
    };

    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  /**
   * Extract topics from messages
   */
  private extractTopics(messages: VoiceMessage[]): string[] {
    const topicKeywords = [
      "blog",
      "article",
      "content",
      "writing",
      "editing",
      "formatting",
      "research",
      "marketing",
      "social media",
      "email",
      "newsletter",
    ];

    const topics: Set<string> = new Set();
    messages.forEach((m) => {
      const lowerText = m.text.toLowerCase();
      topicKeywords.forEach((keyword) => {
        if (lowerText.includes(keyword)) {
          topics.add(keyword);
        }
      });
    });

    return Array.from(topics);
  }

  /**
   * Extract action items
   */
  private extractActionItems(messages: VoiceMessage[]): string[] {
    const actionItems: string[] = [];
    const actionKeywords = ["need to", "should", "must", "will", "can you"];

    messages.forEach((m) => {
      const lowerText = m.text.toLowerCase();
      actionKeywords.forEach((keyword) => {
        if (lowerText.includes(keyword)) {
          actionItems.push(m.text);
        }
      });
    });

    return actionItems.slice(0, 5); // Top 5 action items
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(
    text: string
  ): ConversationAnalysis["sentiment"] {
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "helpful",
      "perfect",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "poor",
      "frustrating",
      "difficult",
    ];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((w) =>
      lowerText.includes(w)
    ).length;
    const negativeCount = negativeWords.filter((w) =>
      lowerText.includes(w)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  /**
   * Generate insights
   */
  private generateInsights(
    messages: VoiceMessage[],
    topics: string[],
    actionItems: string[]
  ): string[] {
    const insights: string[] = [];

    if (topics.length > 0) {
      insights.push(`Primary topics discussed: ${topics.join(", ")}`);
    }

    if (actionItems.length > 0) {
      insights.push(`${actionItems.length} action items identified`);
    }

    if (messages.length > 0) {
      const avgLength = messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length;
      if (avgLength > 100) {
        insights.push("Detailed, in-depth conversation");
      } else {
        insights.push("Quick, focused discussion");
      }
    }

    return insights;
  }

  /**
   * Generate transcript
   */
  generateTranscript(
    conversationId: string,
    format: VoiceTranscript["format"]
  ): VoiceTranscript | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    let content = "";
    switch (format) {
      case "plain_text":
        content = conversation.transcript;
        break;
      case "markdown":
        content = this.formatAsMarkdown(conversation.messages);
        break;
      case "formatted":
        content = this.formatAsFormatted(conversation.messages);
        break;
      case "with_timestamps":
        content = this.formatWithTimestamps(conversation.messages);
        break;
    }

    const wordCount = content.split(/\s+/).length;
    const readabilityScore = Math.max(60, 100 - wordCount / 50);

    const transcript: VoiceTranscript = {
      id: `transcript-${Date.now()}`,
      conversationId,
      format,
      content,
      wordCount,
      readabilityScore: Math.round(readabilityScore),
      generatedAt: new Date(),
    };

    this.transcripts.set(transcript.id, transcript);
    return transcript;
  }

  /**
   * Format as markdown
   */
  private formatAsMarkdown(messages: VoiceMessage[]): string {
    return messages
      .map((m) => {
        const speaker = m.speaker === "creator" ? "**Creator**" : "**Helper AI**";
        return `${speaker}: ${m.text}`;
      })
      .join("\n\n");
  }

  /**
   * Format as formatted text
   */
  private formatAsFormatted(messages: VoiceMessage[]): string {
    return messages
      .map((m) => {
        const speaker = m.speaker === "creator" ? "CREATOR" : "HELPER AI";
        return `[${speaker}]\n${m.text}\n`;
      })
      .join("\n");
  }

  /**
   * Format with timestamps
   */
  private formatWithTimestamps(messages: VoiceMessage[]): string {
    return messages
      .map((m) => {
        const speaker = m.speaker === "creator" ? "Creator" : "Helper AI";
        const time = m.timestamp.toLocaleTimeString();
        return `[${time}] ${speaker}: ${m.text}`;
      })
      .join("\n");
  }

  /**
   * Get conversation
   */
  getConversation(conversationId: string): VoiceConversation | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get conversation analysis
   */
  getConversationAnalysis(analysisId: string): ConversationAnalysis | null {
    return this.analyses.get(analysisId) || null;
  }

  /**
   * Get transcript
   */
  getTranscript(transcriptId: string): VoiceTranscript | null {
    return this.transcripts.get(transcriptId) || null;
  }

  /**
   * Get all voice commands
   */
  getAllVoiceCommands(): VoiceCommand[] {
    return Array.from(this.voiceCommands.values());
  }

  /**
   * Get voice command by action
   */
  getVoiceCommandByAction(
    action: VoiceCommand["action"]
  ): VoiceCommand | null {
    const commands = Array.from(this.voiceCommands.values());
    return commands.find((c) => c.action === action) || null;
  }

  /**
   * Get creator conversations
   */
  getCreatorConversations(creatorId: string): VoiceConversation[] {
    return Array.from(this.conversations.values()).filter(
      (c) => c.creatorId === creatorId
    );
  }

  /**
   * Get statistics
   */
  getStatistics(creatorId: string) {
    const conversations = this.getCreatorConversations(creatorId);
    const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
    const totalDuration = conversations.reduce((sum, c) => sum + (c.duration || 0), 0);

    return {
      creatorId,
      totalConversations: conversations.length,
      activeConversations: conversations.filter((c) => c.status === "active").length,
      totalMessages,
      totalDuration: Math.round(totalDuration),
      averageConversationLength: conversations.length > 0 ? Math.round(totalDuration / conversations.length) : 0,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  VoiceMessageSchema,
  VoiceConversationSchema,
  VoiceCommandSchema,
  AudioSettingsSchema,
  ConversationAnalysisSchema,
  VoiceTranscriptSchema,
};

export type {
  VoiceMessage,
  VoiceConversation,
  VoiceCommand,
  AudioSettings,
  ConversationAnalysis,
  VoiceTranscript,
};
