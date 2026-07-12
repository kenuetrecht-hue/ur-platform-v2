/**
 * AI Creator Voice Profiles
 * 
 * Manages voice personalities and subscription-gated conversations for AI creators.
 * Only paid subscribers can access voice chat with AI creators.
 */

export interface AICreatorVoiceProfile {
  aiId: string;
  aiName: string;
  voiceId: string;
  voiceGender: "male" | "female" | "neutral";
  voiceAccent: string;
  speechRate: number; // 0.5 to 2.0
  personality: string;
  expertise: string[];
  conversationStyle: "professional" | "casual" | "educational" | "entertaining";
  greetingMessage: string;
  disclaimers: string[];
}

export interface SubscriberVoiceChatAccess {
  subscriberId: string;
  aiId: string;
  isSubscribed: boolean;
  subscriptionTier: "free" | "basic" | "pro" | "premium";
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  canAccessVoiceChat: boolean;
  voiceChatLimit: number; // minutes per month
  voiceChatUsed: number; // minutes used this month
}

// AI Creator Voice Profiles
export const AI_CREATOR_VOICE_PROFILES: Record<string, AICreatorVoiceProfile> = {
  ai_wellness: {
    aiId: "ai_wellness",
    aiName: "AI Wellness Coach",
    voiceId: "wellness_voice_001",
    voiceGender: "neutral",
    voiceAccent: "American",
    speechRate: 1.0,
    personality: "Warm, encouraging, supportive",
    expertise: ["fitness", "nutrition", "mental health", "wellness"],
    conversationStyle: "professional",
    greetingMessage:
      "Hello! I'm your AI Wellness Coach. I'm here to help you achieve your health and fitness goals. What would you like to talk about today?",
    disclaimers: [
      "🤖 I'm an AI assistant created by UR LLC",
      "This conversation is for educational and entertainment purposes only",
      "I'm not a licensed medical professional - always consult a doctor for medical advice",
      "My recommendations are based on general wellness principles, not personalized medical guidance",
    ],
  },

  ai_fitness: {
    aiId: "ai_fitness",
    aiName: "AI Fitness Trainer",
    voiceId: "fitness_voice_001",
    voiceGender: "male",
    voiceAccent: "American",
    speechRate: 1.1,
    personality: "Energetic, motivating, enthusiastic",
    expertise: ["workout routines", "strength training", "cardio", "nutrition"],
    conversationStyle: "entertaining",
    greetingMessage:
      "Hey there! I'm your AI Fitness Trainer. Let's get you in the best shape of your life! What's your fitness goal?",
    disclaimers: [
      "🤖 I'm an AI assistant created by UR LLC",
      "This conversation is for entertainment and educational purposes only",
      "Always consult with a healthcare provider before starting a new exercise program",
      "I cannot provide personalized medical or physical therapy advice",
    ],
  },

  ai_crypto: {
    aiId: "ai_crypto",
    aiName: "AI Crypto Analyst",
    voiceId: "crypto_voice_001",
    voiceGender: "neutral",
    voiceAccent: "American",
    speechRate: 1.0,
    personality: "Analytical, informative, data-driven",
    expertise: ["cryptocurrency", "blockchain", "DeFi", "market analysis"],
    conversationStyle: "professional",
    greetingMessage:
      "Welcome! I'm your AI Crypto Analyst. I provide market insights and analysis on cryptocurrency trends. What would you like to know?",
    disclaimers: [
      "🤖 I'm an AI assistant created by UR LLC",
      "This is not financial advice - for entertainment and educational purposes only",
      "Cryptocurrency is highly volatile and risky - do your own research",
      "Never invest more than you can afford to lose",
      "Consult a financial advisor before making investment decisions",
    ],
  },

  ai_news: {
    aiId: "ai_news",
    aiName: "AI News Daily",
    voiceId: "news_voice_001",
    voiceGender: "female",
    voiceAccent: "American",
    speechRate: 1.0,
    personality: "Professional, informative, balanced",
    expertise: ["news", "current events", "trending topics", "analysis"],
    conversationStyle: "professional",
    greetingMessage:
      "Good day! I'm AI News Daily. I keep you updated on the latest news and trends. What topics interest you?",
    disclaimers: [
      "🤖 I'm an AI assistant created by UR LLC",
      "News summaries are for informational purposes only",
      "Always verify news from multiple credible sources",
      "My analysis reflects available data and may not capture all perspectives",
    ],
  },

  ai_career: {
    aiId: "ai_career",
    aiName: "AI Career Coach",
    voiceId: "career_voice_001",
    voiceGender: "neutral",
    voiceAccent: "American",
    speechRate: 1.0,
    personality: "Supportive, strategic, practical",
    expertise: ["career development", "job search", "resume", "interview prep"],
    conversationStyle: "professional",
    greetingMessage:
      "Hello! I'm your AI Career Coach. I'm here to help you advance your career. What's on your mind?",
    disclaimers: [
      "🤖 I'm an AI assistant created by UR LLC",
      "Career advice is general guidance, not personalized consultation",
      "For legal employment matters, consult an HR professional",
      "Job market information may vary by location and industry",
    ],
  },

  ai_investment: {
    aiId: "ai_investment",
    aiName: "AI Investment Advisor",
    voiceId: "investment_voice_001",
    voiceGender: "male",
    voiceAccent: "American",
    speechRate: 1.0,
    personality: "Analytical, cautious, educational",
    expertise: ["stocks", "bonds", "portfolio management", "investment strategy"],
    conversationStyle: "professional",
    greetingMessage:
      "Welcome! I'm your AI Investment Advisor. Let's discuss your investment goals and strategy.",
    disclaimers: [
      "🤖 I'm an AI assistant created by UR LLC",
      "This is NOT financial advice - for educational purposes only",
      "Past performance does not guarantee future results",
      "All investments carry risk, including potential loss of principal",
      "Consult a licensed financial advisor before making investment decisions",
    ],
  },
};

/**
 * Check if subscriber has access to AI creator voice chat
 */
export function checkVoiceChatAccess(
  subscriberId: string,
  aiId: string,
  subscriptionStatus: SubscriberVoiceChatAccess
): {
  hasAccess: boolean;
  reason: string;
  remainingMinutes: number;
} {
  // Check if subscribed
  if (!subscriptionStatus.isSubscribed) {
    return {
      hasAccess: false,
      reason: "You must be a paid subscriber to access voice chat with AI creators",
      remainingMinutes: 0,
    };
  }

  // Check if subscription is still active
  if (new Date() > subscriptionStatus.subscriptionEndDate) {
    return {
      hasAccess: false,
      reason: "Your subscription has expired",
      remainingMinutes: 0,
    };
  }

  // Check voice chat minutes remaining
  const remainingMinutes =
    subscriptionStatus.voiceChatLimit - subscriptionStatus.voiceChatUsed;

  if (remainingMinutes <= 0) {
    return {
      hasAccess: false,
      reason: `You've reached your monthly voice chat limit (${subscriptionStatus.voiceChatLimit} minutes)`,
      remainingMinutes: 0,
    };
  }

  return {
    hasAccess: true,
    reason: "You have access to voice chat",
    remainingMinutes,
  };
}

/**
 * Get AI creator voice profile
 */
export function getAICreatorVoiceProfile(aiId: string): AICreatorVoiceProfile | null {
  return AI_CREATOR_VOICE_PROFILES[aiId] || null;
}

/**
 * Get subscription-gated voice chat message
 */
export function getVoiceChatAccessMessage(
  aiId: string,
  hasAccess: boolean,
  reason: string
): string {
  const profile = getAICreatorVoiceProfile(aiId);

  if (!profile) {
    return "AI creator not found";
  }

  if (!hasAccess) {
    return `${reason}\n\nTo access voice chat with ${profile.aiName}, please subscribe to their channel.`;
  }

  return `${profile.greetingMessage}\n\n${profile.disclaimers.join("\n")}`;
}

/**
 * Log voice chat session
 */
export interface VoiceChatSession {
  sessionId: string;
  subscriberId: string;
  aiId: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  messageCount: number;
  isCompleted: boolean;
}

const voiceChatSessions: VoiceChatSession[] = [];

export function startVoiceChatSession(
  subscriberId: string,
  aiId: string
): VoiceChatSession {
  const session: VoiceChatSession = {
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    subscriberId,
    aiId,
    startTime: new Date(),
    durationMinutes: 0,
    messageCount: 0,
    isCompleted: false,
  };

  voiceChatSessions.push(session);
  return session;
}

export function endVoiceChatSession(
  sessionId: string,
  durationMinutes: number,
  messageCount: number
): VoiceChatSession | null {
  const session = voiceChatSessions.find((s) => s.sessionId === sessionId);

  if (!session) return null;

  session.endTime = new Date();
  session.durationMinutes = durationMinutes;
  session.messageCount = messageCount;
  session.isCompleted = true;

  return session;
}

/**
 * Get subscriber voice chat usage
 */
export function getSubscriberVoiceChatUsage(
  subscriberId: string,
  aiId?: string
): {
  totalSessions: number;
  totalMinutes: number;
  totalMessages: number;
  averageSessionDuration: number;
} {
  let sessions = voiceChatSessions.filter((s) => s.subscriberId === subscriberId);

  if (aiId) {
    sessions = sessions.filter((s) => s.aiId === aiId);
  }

  const completedSessions = sessions.filter((s) => s.isCompleted);
  const totalMinutes = completedSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalMessages = completedSessions.reduce((sum, s) => sum + s.messageCount, 0);

  return {
    totalSessions: completedSessions.length,
    totalMinutes,
    totalMessages,
    averageSessionDuration:
      completedSessions.length > 0 ? totalMinutes / completedSessions.length : 0,
  };
}

/**
 * Generate voice chat subscription tier benefits
 */
export function getVoiceChatBenefits(tier: string): {
  monthlyMinutes: number;
  priority: boolean;
  customVoice: boolean;
  description: string;
} {
  const benefits: Record<
    string,
    { monthlyMinutes: number; priority: boolean; customVoice: boolean; description: string }
  > = {
    free: {
      monthlyMinutes: 0,
      priority: false,
      customVoice: false,
      description: "No voice chat access",
    },
    basic: {
      monthlyMinutes: 30,
      priority: false,
      customVoice: false,
      description: "30 minutes/month of voice chat",
    },
    pro: {
      monthlyMinutes: 120,
      priority: true,
      customVoice: false,
      description: "120 minutes/month + priority access",
    },
    premium: {
      monthlyMinutes: 300,
      priority: true,
      customVoice: true,
      description: "300 minutes/month + custom voice + priority",
    },
  };

  return benefits[tier] || benefits.free;
}
