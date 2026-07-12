/**
 * AI User Memory Service
 * Remembers user information, preferences, conversation history, and context
 * Enables personalized interactions across sessions
 */

export interface UserProfile {
  userId: string;
  creatorId: string;
  userName: string;
  joinedDate: Date;
  lastInteractionDate: Date;
  subscriptionTier: 'free' | 'silver' | 'gold' | 'platinum';
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'friendly';
    contentPreferences: string[];
    notificationSettings: {
      dailyDisclosureEnabled: boolean;
      emailNotifications: boolean;
      pushNotifications: boolean;
    };
  };
  interactionHistory: ConversationEntry[];
  totalInteractions: number;
  averageSessionDuration: number;
  lastDailyDisclosureSent?: Date;
}

export interface ConversationEntry {
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  engagementScore: number;
}

export interface UserMemoryContext {
  userId: string;
  creatorId: string;
  recentTopics: string[];
  userMood: string;
  preferredResponseStyle: string;
  conversationHistory: ConversationEntry[];
  lastSessionDate: Date;
  daysSinceLastSession: number;
  isNewSession: boolean;
  hasReceivedDailyDisclosure: boolean;
}

class AIUserMemoryService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private conversationHistories: Map<string, ConversationEntry[]> = new Map();
  private dailyDisclosureLog: Map<string, Date> = new Map();

  /**
   * Initialize or retrieve user profile
   */
  initializeUser(userId: string, creatorId: string, userName: string): UserProfile {
    const key = `${userId}_${creatorId}`;

    if (this.userProfiles.has(key)) {
      return this.userProfiles.get(key)!;
    }

    const profile: UserProfile = {
      userId,
      creatorId,
      userName,
      joinedDate: new Date(),
      lastInteractionDate: new Date(),
      subscriptionTier: 'free',
      preferences: {
        communicationStyle: 'friendly',
        contentPreferences: [],
        notificationSettings: {
          dailyDisclosureEnabled: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      },
      interactionHistory: [],
      totalInteractions: 0,
      averageSessionDuration: 0,
    };

    this.userProfiles.set(key, profile);
    this.conversationHistories.set(key, []);

    return profile;
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string, creatorId: string): UserProfile | undefined {
    const key = `${userId}_${creatorId}`;
    return this.userProfiles.get(key);
  }

  /**
   * Record conversation
   */
  recordConversation(userId: string, creatorId: string, userMessage: string, aiResponse: string, sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'): void {
    const key = `${userId}_${creatorId}`;
    const profile = this.userProfiles.get(key);

    if (!profile) return;

    const entry: ConversationEntry = {
      timestamp: new Date(),
      userMessage,
      aiResponse,
      sentiment,
      topics: this.extractTopics(userMessage),
      engagementScore: this.calculateEngagementScore(userMessage, sentiment),
    };

    profile.interactionHistory.push(entry);
    profile.totalInteractions++;
    profile.lastInteractionDate = new Date();

    // Keep last 100 conversations
    if (profile.interactionHistory.length > 100) {
      profile.interactionHistory = profile.interactionHistory.slice(-100);
    }

    const history = this.conversationHistories.get(key) || [];
    history.push(entry);
    this.conversationHistories.set(key, history);
  }

  /**
   * Extract topics from message
   */
  private extractTopics(message: string): string[] {
    const topics: string[] = [];
    const topicKeywords: Record<string, string[]> = {
      music: ['music', 'beat', 'production', 'song', 'audio'],
      wellness: ['health', 'fitness', 'wellness', 'exercise', 'meditation'],
      technology: ['code', 'tech', 'software', 'development', 'programming'],
      art: ['art', 'design', 'creative', 'drawing', 'visual'],
      business: ['business', 'marketing', 'sales', 'entrepreneur', 'growth'],
      education: ['learn', 'teach', 'study', 'course', 'education'],
    };

    const lowerMessage = message.toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(message: string, sentiment: string): number {
    let score = 0;

    // Message length factor
    if (message.length > 100) score += 3;
    else if (message.length > 50) score += 2;
    else score += 1;

    // Sentiment factor
    if (sentiment === 'positive') score += 2;
    else if (sentiment === 'negative') score += 1;

    // Question factor (indicates engagement)
    if (message.includes('?')) score += 1;

    return Math.min(score, 10);
  }

  /**
   * Get user memory context for current session
   */
  getUserMemoryContext(userId: string, creatorId: string): UserMemoryContext {
    const key = `${userId}_${creatorId}`;
    const profile = this.userProfiles.get(key);

    if (!profile) {
      return {
        userId,
        creatorId,
        recentTopics: [],
        userMood: 'neutral',
        preferredResponseStyle: 'friendly',
        conversationHistory: [],
        lastSessionDate: new Date(),
        daysSinceLastSession: 0,
        isNewSession: true,
        hasReceivedDailyDisclosure: false,
      };
    }

    // Get recent topics
    const recentTopics = this.getRecentTopics(profile, 5);

    // Determine user mood from recent sentiment
    const userMood = this.determineMood(profile);

    // Get conversation history
    const conversationHistory = profile.interactionHistory.slice(-10);

    // Calculate days since last session
    const daysSinceLastSession = Math.floor((new Date().getTime() - profile.lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if daily disclosure already sent
    const hasReceivedDailyDisclosure = this.hasDailyDisclosureBeenSent(userId, creatorId);

    return {
      userId,
      creatorId,
      recentTopics,
      userMood,
      preferredResponseStyle: profile.preferences.communicationStyle,
      conversationHistory,
      lastSessionDate: profile.lastInteractionDate,
      daysSinceLastSession,
      isNewSession: daysSinceLastSession > 0,
      hasReceivedDailyDisclosure,
    };
  }

  /**
   * Get recent topics
   */
  private getRecentTopics(profile: UserProfile, count: number): string[] {
    const topicFrequency: Record<string, number> = {};

    for (const entry of profile.interactionHistory.slice(-20)) {
      for (const topic of entry.topics) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      }
    }

    return Object.entries(topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([topic]) => topic);
  }

  /**
   * Determine user mood
   */
  private determineMood(profile: UserProfile): string {
    if (profile.interactionHistory.length === 0) return 'neutral';

    const recentSentiments = profile.interactionHistory.slice(-5).map(e => e.sentiment);
    const positiveCount = recentSentiments.filter(s => s === 'positive').length;
    const negativeCount = recentSentiments.filter(s => s === 'negative').length;

    if (positiveCount > negativeCount) return 'happy';
    if (negativeCount > positiveCount) return 'frustrated';
    return 'neutral';
  }

  /**
   * Check if daily disclosure already sent today
   */
  hasDailyDisclosureBeenSent(userId: string, creatorId: string): boolean {
    const key = `${userId}_${creatorId}`;
    const lastSent = this.dailyDisclosureLog.get(key);

    if (!lastSent) return false;

    const today = new Date();
    const lastSentDate = new Date(lastSent);

    return (
      today.getFullYear() === lastSentDate.getFullYear() &&
      today.getMonth() === lastSentDate.getMonth() &&
      today.getDate() === lastSentDate.getDate()
    );
  }

  /**
   * Mark daily disclosure as sent
   */
  markDailyDisclosureSent(userId: string, creatorId: string): void {
    const key = `${userId}_${creatorId}`;
    this.dailyDisclosureLog.set(key, new Date());

    const profile = this.userProfiles.get(key);
    if (profile) {
      profile.lastDailyDisclosureSent = new Date();
    }
  }

  /**
   * Update user preferences
   */
  updatePreferences(userId: string, creatorId: string, preferences: Partial<UserProfile['preferences']>): void {
    const key = `${userId}_${creatorId}`;
    const profile = this.userProfiles.get(key);

    if (!profile) return;

    profile.preferences = { ...profile.preferences, ...preferences };
  }

  /**
   * Update subscription tier
   */
  updateSubscriptionTier(userId: string, creatorId: string, tier: 'free' | 'silver' | 'gold' | 'platinum'): void {
    const key = `${userId}_${creatorId}`;
    const profile = this.userProfiles.get(key);

    if (!profile) return;

    profile.subscriptionTier = tier;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(userId: string, creatorId: string, limit: number = 20): ConversationEntry[] {
    const key = `${userId}_${creatorId}`;
    const profile = this.userProfiles.get(key);

    if (!profile) return [];

    return profile.interactionHistory.slice(-limit);
  }

  /**
   * Generate personalized greeting based on memory
   */
  generatePersonalizedGreeting(userId: string, creatorId: string, creatorName: string): string {
    const context = this.getUserMemoryContext(userId, creatorId);
    const profile = this.userProfiles.get(`${userId}_${creatorId}`);

    if (!profile) {
      return `Hi! I'm ${creatorName}. Welcome to our conversation!`;
    }

    if (context.isNewSession) {
      if (context.daysSinceLastSession === 1) {
        return `Welcome back! I'm ${creatorName}. I remember we were discussing ${context.recentTopics[0] || 'some great topics'} last time. How are you doing today?`;
      } else if (context.daysSinceLastSession > 1) {
        return `Great to see you again! I'm ${creatorName}. It's been ${context.daysSinceLastSession} days. I remember you were interested in ${context.recentTopics[0] || 'some amazing topics'}. What can I help you with today?`;
      }
    }

    return `Hey ${profile.userName}! I'm ${creatorName}. Ready to continue our conversation?`;
  }

  /**
   * Get user statistics
   */
  getUserStatistics(userId: string, creatorId: string): { totalInteractions: number; averageEngagement: number; favoriteTopics: string[]; lastActive: Date } {
    const key = `${userId}_${creatorId}`;
    const profile = this.userProfiles.get(key);

    if (!profile) {
      return {
        totalInteractions: 0,
        averageEngagement: 0,
        favoriteTopics: [],
        lastActive: new Date(),
      };
    }

    const avgEngagement = profile.interactionHistory.length > 0 ? profile.interactionHistory.reduce((sum, e) => sum + e.engagementScore, 0) / profile.interactionHistory.length : 0;

    const topicFrequency: Record<string, number> = {};
    for (const entry of profile.interactionHistory) {
      for (const topic of entry.topics) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      }
    }

    const favoriteTopics = Object.entries(topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    return {
      totalInteractions: profile.totalInteractions,
      averageEngagement: Math.round(avgEngagement * 100) / 100,
      favoriteTopics,
      lastActive: profile.lastInteractionDate,
    };
  }
}

export const aiUserMemoryService = new AIUserMemoryService();
