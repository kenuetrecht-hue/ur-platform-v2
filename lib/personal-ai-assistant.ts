import axios from "axios";

export interface PersonalAIProfile {
  id: string;
  creatorId: string;
  name: string;
  personality: string;
  learningData: CreatorLearningData;
  capabilities: string[];
  voiceSettings: VoiceSettings;
}

export interface CreatorLearningData {
  contentHistory: ContentItem[];
  discussionHistory: DiscussionItem[];
  preferences: CreatorPreferences;
  style: ContentStyle;
  topics: string[];
  lastUpdated: string;
}

export interface ContentItem {
  id: string;
  type: "video" | "audio" | "article" | "image";
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  engagement: number;
}

export interface DiscussionItem {
  id: string;
  topic: string;
  content: string;
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface CreatorPreferences {
  favoriteTopics: string[];
  contentStyle: string;
  uploadFrequency: string;
  targetAudience: string;
  monetizationGoals: string[];
}

export interface ContentStyle {
  tone: string;
  format: string;
  colorPalette: string[];
  fontPreference: string;
  pacing: string;
}

export interface VoiceSettings {
  language: string;
  accent: string;
  speed: number;
  pitch: number;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
}

export interface AIResponse {
  text: string;
  suggestions: string[];
  actions: string[];
  confidence: number;
}

class PersonalAIAssistant {
  private profile: PersonalAIProfile;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private maxHistoryLength = 50;

  constructor(profile: PersonalAIProfile) {
    this.profile = profile;
  }

  /**
   * Learn from creator's content
   */
  async learnFromContent(content: ContentItem): Promise<void> {
    this.profile.learningData.contentHistory.push(content);

    // Extract topics and tags
    const topics = this.extractTopics(content.title, content.description);
    this.profile.learningData.topics = Array.from(
      new Set([...this.profile.learningData.topics, ...topics])
    );

    // Update preferences based on engagement
    if (content.engagement > 100) {
      const newTopics = topics.filter(
        (t) => !this.profile.learningData.preferences.favoriteTopics.includes(t)
      );
      this.profile.learningData.preferences.favoriteTopics.push(...newTopics);
    }

    this.profile.learningData.lastUpdated = new Date().toISOString();
  }

  /**
   * Learn from creator's discussions
   */
  async learnFromDiscussion(
    topic: string,
    content: string,
    sentiment: "positive" | "neutral" | "negative"
  ): Promise<void> {
    const discussion: DiscussionItem = {
      id: `disc-${Date.now()}`,
      topic,
      content,
      timestamp: new Date().toISOString(),
      sentiment,
    };

    this.profile.learningData.discussionHistory.push(discussion);

    // Update topics based on discussions
    const discussionTopics = this.extractTopics(topic, content);
    this.profile.learningData.topics = Array.from(
      new Set([...this.profile.learningData.topics, ...discussionTopics])
    );

    this.profile.learningData.lastUpdated = new Date().toISOString();
  }

  /**
   * Search the web for information
   */
  async searchWeb(query: string): Promise<WebSearchResult[]> {
    try {
      // Mock web search - in production, use actual search API
      const results: WebSearchResult[] = [
        {
          title: `Results for "${query}"`,
          url: `https://search.example.com?q=${encodeURIComponent(query)}`,
          snippet: `Information about ${query}...`,
          source: "Example Search",
          relevance: 0.95,
        },
        {
          title: `${query} - Guide`,
          url: `https://guide.example.com/${query}`,
          snippet: `Complete guide to ${query}...`,
          source: "Example Guide",
          relevance: 0.85,
        },
        {
          title: `Latest on ${query}`,
          url: `https://news.example.com/${query}`,
          snippet: `Recent updates about ${query}...`,
          source: "Example News",
          relevance: 0.75,
        },
      ];

      return results;
    } catch (error) {
      console.error("Web search error:", error);
      return [];
    }
  }

  /**
   * Process voice command from creator
   */
  async processVoiceCommand(command: string): Promise<AIResponse> {
    // Add to conversation history
    this.conversationHistory.push({ role: "creator", content: command });

    // Analyze command
    const intent = this.analyzeIntent(command);
    const context = this.getContext();

    // Generate response
    const response = this.generateResponse(intent, context, command);

    // Add AI response to history
    this.conversationHistory.push({ role: "ai", content: response.text });

    // Keep history manageable
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }

    return response;
  }

  /**
   * Get personalized suggestions based on learning
   */
  async getSuggestions(topic: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggest based on favorite topics
    if (this.profile.learningData.preferences.favoriteTopics.includes(topic)) {
      suggestions.push(`Create content about ${topic} - your audience loves this!`);
    }

    // Suggest based on past engagement
    const topContent = this.profile.learningData.contentHistory.sort(
      (a, b) => b.engagement - a.engagement
    ).slice(0, 3);

    if (topContent.length > 0) {
      suggestions.push(`Your top content: ${topContent.map((c) => c.title).join(", ")}`);
    }

    // Suggest based on upload frequency
    suggestions.push(`Keep up your ${this.profile.learningData.preferences.uploadFrequency} schedule!`);

    return suggestions;
  }

  /**
   * Get creator's learning profile
   */
  getProfile(): PersonalAIProfile {
    return this.profile;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    return this.conversationHistory;
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(settings: Partial<VoiceSettings>): void {
    this.profile.voiceSettings = {
      ...this.profile.voiceSettings,
      ...settings,
    };
  }

  // Private helper methods

  private extractTopics(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const commonTopics = [
      "music",
      "art",
      "design",
      "technology",
      "business",
      "health",
      "fitness",
      "education",
      "entertainment",
      "lifestyle",
      "travel",
      "food",
      "fashion",
      "gaming",
      "sports",
    ];

    return commonTopics.filter((topic) => text.includes(topic));
  }

  private analyzeIntent(command: string): string {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes("search") || lowerCommand.includes("find")) {
      return "search";
    }
    if (lowerCommand.includes("edit") || lowerCommand.includes("crop")) {
      return "edit";
    }
    if (lowerCommand.includes("create") || lowerCommand.includes("generate")) {
      return "create";
    }
    if (lowerCommand.includes("suggest") || lowerCommand.includes("recommend")) {
      return "suggest";
    }
    if (lowerCommand.includes("help") || lowerCommand.includes("how")) {
      return "help";
    }

    return "general";
  }

  private getContext(): string {
    const recentTopics = this.profile.learningData.topics.slice(-5);
    const favoriteTopics = this.profile.learningData.preferences.favoriteTopics.slice(-3);

    return `Recent topics: ${recentTopics.join(", ")}. Favorite topics: ${favoriteTopics.join(", ")}`;
  }

  private generateResponse(intent: string, context: string, command: string): AIResponse {
    const responses: Record<string, AIResponse> = {
      search: {
        text: `I'll help you search for information about "${command.replace("search", "").trim()}". Let me find the latest resources for you.`,
        suggestions: [
          "Check the top 3 results",
          "Filter by date",
          "Save results for later",
        ],
        actions: ["search_web", "save_results"],
        confidence: 0.9,
      },
      edit: {
        text: "I can help you edit your content. What would you like to adjust?",
        suggestions: [
          "Crop video",
          "Trim audio",
          "Adjust brightness",
          "Add effects",
        ],
        actions: ["open_editor"],
        confidence: 0.85,
      },
      create: {
        text: "Let's create something amazing! What type of content would you like to generate?",
        suggestions: [
          "Generate image",
          "Create graph",
          "Write script",
          "Design thumbnail",
        ],
        actions: ["open_generator"],
        confidence: 0.8,
      },
      suggest: {
        text: `Based on your ${context}, here are my suggestions:`,
        suggestions: [
          "Post a video this week",
          "Try a new topic",
          "Engage with comments",
        ],
        actions: ["show_suggestions"],
        confidence: 0.75,
      },
      help: {
        text: "I'm here to help! I can assist with content creation, editing, searching, and more.",
        suggestions: [
          "Show all capabilities",
          "Get started guide",
          "Contact support",
        ],
        actions: ["show_help"],
        confidence: 0.9,
      },
      general: {
        text: `I understand you want to: ${command}. How can I help?`,
        suggestions: ["Tell me more", "Show options", "Start over"],
        actions: ["clarify"],
        confidence: 0.6,
      },
    };

    return responses[intent] || responses.general;
  }
}

export default PersonalAIAssistant;
