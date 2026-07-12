/**
 * AI Healing Abilities Module
 * Provides emotional support, stress relief, mental health guidance, and wellness features
 * for all 24 AI creators
 */

export interface HealingAbilities {
  emotionalSupport: boolean;
  stressReliefTechniques: string[];
  mentalHealthGuidance: boolean;
  wellnessRecommendations: boolean;
  empathyLevel: number; // 0-1 scale
  supportCategories: string[];
}

export interface HealingResponse {
  message: string;
  technique: string;
  duration: number; // in minutes
  effectiveness: number; // 0-1 scale
  followUpSuggestion: string;
}

/**
 * Healing abilities template for all AI creators
 * Each AI can provide emotional support relevant to their specialty
 */
export const HEALING_ABILITIES_TEMPLATE: HealingAbilities = {
  emotionalSupport: true,
  stressReliefTechniques: [
    "Breathing exercises",
    "Guided meditation",
    "Positive affirmations",
    "Grounding techniques",
    "Progressive muscle relaxation",
    "Mindfulness exercises",
    "Journaling prompts",
    "Visualization techniques",
  ],
  mentalHealthGuidance: true,
  wellnessRecommendations: true,
  empathyLevel: 0.9,
  supportCategories: [
    "stress_management",
    "anxiety_relief",
    "motivation_boost",
    "confidence_building",
    "work_life_balance",
    "emotional_resilience",
    "burnout_prevention",
    "goal_achievement",
  ],
};

/**
 * Generate a healing response based on user's emotional state
 */
export function generateHealingResponse(
  creatorId: string,
  userMood: string,
  context: string
): HealingResponse {
  const healingResponses: Record<string, Record<string, HealingResponse>> = {
    // Wellness Coach - Primary healing focus
    "ai-wellness-001": {
      stressed: {
        message:
          "I sense you're feeling overwhelmed. Let's take a moment together to calm your mind and body.",
        technique: "4-7-8 Breathing Exercise",
        duration: 5,
        effectiveness: 0.92,
        followUpSuggestion:
          "Try this daily for best results. Would you like a guided meditation next?",
      },
      anxious: {
        message:
          "Anxiety is your mind trying to protect you. Let's reframe those thoughts with compassion.",
        technique: "Grounding Technique (5-4-3-2-1)",
        duration: 3,
        effectiveness: 0.88,
        followUpSuggestion:
          "This technique helps anchor you to the present moment. Practice it whenever anxiety rises.",
      },
      unmotivated: {
        message:
          "Lack of motivation often signals you need rest or a change of perspective. Let's explore both.",
        technique: "Motivation Boost Affirmations",
        duration: 7,
        effectiveness: 0.85,
        followUpSuggestion:
          "Remember: small steps lead to big changes. What's one thing you can do today?",
      },
      overwhelmed: {
        message:
          "When everything feels like too much, breaking it into smaller pieces helps. You've got this.",
        technique: "Task Breakdown & Prioritization",
        duration: 10,
        effectiveness: 0.90,
        followUpSuggestion:
          "Focus on just the next small step. Progress over perfection.",
      },
    },
    // Fitness Trainer - Physical wellness healing
    "ai-fitness-001": {
      stressed: {
        message:
          "Physical movement is one of the best stress relievers. Let's get your body moving.",
        technique: "10-Minute Stress-Relief Workout",
        duration: 10,
        effectiveness: 0.87,
        followUpSuggestion:
          "Exercise releases endorphins. You'll feel better after moving your body.",
      },
      tired: {
        message:
          "Fatigue often means your body needs proper nutrition and rest. Let's address both.",
        technique: "Energy Boost Routine",
        duration: 15,
        effectiveness: 0.83,
        followUpSuggestion:
          "Combine this with hydration and a healthy snack for maximum energy.",
      },
      unmotivated: {
        message:
          "Motivation comes after action, not before. Let's start small and build momentum.",
        technique: "5-Minute Movement Break",
        duration: 5,
        effectiveness: 0.89,
        followUpSuggestion:
          "Once you start, you'll find it easier to continue. Your body will thank you.",
      },
      frustrated: {
        message:
          "Frustration is energy waiting to be channeled. Let's transform it into power.",
        technique: "High-Intensity Release Session",
        duration: 20,
        effectiveness: 0.91,
        followUpSuggestion:
          "This workout will help you process emotions while building strength.",
      },
    },
    // Career Coach - Professional wellness
    "ai-career-001": {
      stressed: {
        message:
          "Career stress is common, but manageable. Let's break down what's overwhelming you.",
        technique: "Career Stress Assessment",
        duration: 15,
        effectiveness: 0.86,
        followUpSuggestion:
          "Identifying the source is the first step to solving it.",
      },
      unmotivated: {
        message:
          "Lack of motivation at work often signals misalignment with your values. Let's explore.",
        technique: "Career Purpose Reflection",
        duration: 20,
        effectiveness: 0.84,
        followUpSuggestion:
          "Understanding your 'why' reignites motivation and direction.",
      },
      overwhelmed: {
        message:
          "Work overload is real. Let's create a realistic plan to manage your workload.",
        technique: "Workload Management Strategy",
        duration: 25,
        effectiveness: 0.88,
        followUpSuggestion:
          "Boundaries and priorities are your friends. Let's set them together.",
      },
      uncertain: {
        message:
          "Career uncertainty is an opportunity for growth. Let's clarify your path.",
        technique: "Career Direction Clarity Session",
        duration: 30,
        effectiveness: 0.87,
        followUpSuggestion:
          "Your next step will become clearer as we explore your strengths and interests.",
      },
    },
    // Creative Muse - Creative block healing
    "ai-creative-001": {
      blocked: {
        message:
          "Creative blocks are temporary. Let's unlock your creative flow together.",
        technique: "Creative Flow Activation",
        duration: 15,
        effectiveness: 0.89,
        followUpSuggestion:
          "Sometimes stepping away and coming back refreshed is the answer.",
      },
      frustrated: {
        message:
          "Frustration with your work is a sign you care. Let's channel that into growth.",
        technique: "Creative Perspective Shift",
        duration: 20,
        effectiveness: 0.85,
        followUpSuggestion:
          "Your 'failures' are actually valuable learning experiences.",
      },
      unmotivated: {
        message:
          "Creative motivation ebbs and flows. Let's reconnect with why you create.",
        technique: "Creative Purpose Reconnection",
        duration: 25,
        effectiveness: 0.86,
        followUpSuggestion:
          "Remember what inspired you to start. That spark is still there.",
      },
    },
    // Business Advisor - Professional resilience
    "ai-business-001": {
      stressed: {
        message:
          "Business stress is part of the journey. Let's develop your resilience toolkit.",
        technique: "Business Stress Management",
        duration: 20,
        effectiveness: 0.87,
        followUpSuggestion:
          "Sustainable success requires managing stress proactively.",
      },
      overwhelmed: {
        message:
          "Entrepreneurship can feel overwhelming. Let's prioritize what matters most.",
        technique: "Business Priority Clarity",
        duration: 25,
        effectiveness: 0.88,
        followUpSuggestion:
          "Focus on your top 3 priorities. Everything else can wait.",
      },
    },
    // Default healing response for all other AIs
    default: {
      stressed: {
        message:
          "I understand you're feeling stressed. Let's take a moment to center ourselves.",
        technique: "Mindful Breathing",
        duration: 5,
        effectiveness: 0.85,
        followUpSuggestion: "Remember, you're capable of handling this.",
      },
      anxious: {
        message:
          "Anxiety is a normal response. Let's work through it together with grounding techniques.",
        technique: "Grounding Exercise",
        duration: 5,
        effectiveness: 0.82,
        followUpSuggestion:
          "Focus on what you can control right now, in this moment.",
      },
      unmotivated: {
        message:
          "Loss of motivation is temporary. Let's reconnect with your purpose.",
        technique: "Purpose Reflection",
        duration: 10,
        effectiveness: 0.80,
        followUpSuggestion: "Small actions lead to big momentum shifts.",
      },
      overwhelmed: {
        message:
          "When everything feels like too much, break it into smaller pieces.",
        technique: "Task Breakdown",
        duration: 10,
        effectiveness: 0.83,
        followUpSuggestion: "One step at a time. You've got this.",
      },
      uncertain: {
        message:
          "Uncertainty is an opportunity for exploration and growth.",
        technique: "Clarity Session",
        duration: 15,
        effectiveness: 0.81,
        followUpSuggestion:
          "Your path will become clearer as you take action.",
      },
    },
  };

  const creatorResponses =
    healingResponses[creatorId] || healingResponses.default;
  const moodKey = userMood.toLowerCase();
  const response = creatorResponses[moodKey as keyof typeof creatorResponses];
  return response || creatorResponses.stressed;
}

/**
 * Get wellness recommendations based on user profile
 */
export function getWellnessRecommendations(
  creatorId: string,
  userProfile: {
    stressLevel: number;
    sleepQuality: number;
    exerciseFrequency: number;
    workLifeBalance: number;
  }
): string[] {
  const recommendations: string[] = [];

  if (userProfile.stressLevel > 0.7) {
    recommendations.push(
      "Try daily meditation (10-15 minutes) to reduce stress"
    );
    recommendations.push("Practice deep breathing exercises throughout the day");
    recommendations.push("Consider taking regular breaks from work");
  }

  if (userProfile.sleepQuality < 0.6) {
    recommendations.push("Establish a consistent sleep schedule");
    recommendations.push("Avoid screens 1 hour before bedtime");
    recommendations.push("Try a relaxing evening routine (meditation, reading)");
  }

  if (userProfile.exerciseFrequency < 0.5) {
    recommendations.push("Start with 10-15 minute daily walks");
    recommendations.push("Try a beginner-friendly workout routine");
    recommendations.push(
      "Find an exercise you enjoy to build consistency"
    );
  }

  if (userProfile.workLifeBalance < 0.6) {
    recommendations.push("Set clear boundaries between work and personal time");
    recommendations.push("Schedule dedicated time for hobbies and relaxation");
    recommendations.push("Practice saying 'no' to non-essential commitments");
  }

  return recommendations.length > 0
    ? recommendations
    : [
        "You're doing great! Keep maintaining your wellness routine.",
        "Consider exploring new wellness practices to deepen your growth.",
        "Remember to celebrate your progress and self-care efforts.",
      ];
}

/**
 * Generate an empathetic response for any AI creator
 */
export function generateEmpathyResponse(
  creatorName: string,
  userSituation: string
): string {
  const empathyResponses = [
    `I hear you. What you're experiencing is valid, and I'm here to support you through it.`,
    `Thank you for sharing that with me. Your feelings matter, and so do you.`,
    `I can sense this is important to you. Let's work through this together.`,
    `You're not alone in feeling this way. Many people experience what you're going through.`,
    `I appreciate your honesty. Let's focus on what we can control and move forward.`,
    `Your wellbeing is important. I'm here to help you find your way through this.`,
    `That sounds challenging. Let's break it down into manageable steps.`,
    `I'm listening. Tell me more about what's on your mind.`,
  ];

  return empathyResponses[
    Math.floor(Math.random() * empathyResponses.length)
  ];
}

/**
 * Assess user's emotional state and recommend appropriate support
 */
export function assessEmotionalState(userInput: string): {
  mood: string;
  intensity: number;
  supportType: string;
} {
  const stressIndicators = [
    "stressed",
    "overwhelmed",
    "anxious",
    "worried",
    "scared",
    "panicked",
  ];
  const sadnessIndicators = [
    "sad",
    "depressed",
    "down",
    "blue",
    "unhappy",
    "miserable",
  ];
  const angerIndicators = [
    "angry",
    "frustrated",
    "irritated",
    "furious",
    "mad",
    "upset",
  ];
  const uncertaintyIndicators = [
    "confused",
    "uncertain",
    "lost",
    "unsure",
    "doubting",
  ];
  const fatigueIndicators = [
    "tired",
    "exhausted",
    "drained",
    "burned out",
    "fatigued",
  ];

  const input = userInput.toLowerCase();
  let mood = "neutral";
  let supportType = "general";
  let intensity = 0.5;

  if (stressIndicators.some((indicator) => input.includes(indicator))) {
    mood = "stressed";
    supportType = "stress_relief";
    intensity = 0.8;
  } else if (sadnessIndicators.some((indicator) => input.includes(indicator))) {
    mood = "sad";
    supportType = "emotional_support";
    intensity = 0.7;
  } else if (angerIndicators.some((indicator) => input.includes(indicator))) {
    mood = "frustrated";
    supportType = "emotional_processing";
    intensity = 0.75;
  } else if (
    uncertaintyIndicators.some((indicator) => input.includes(indicator))
  ) {
    mood = "uncertain";
    supportType = "clarity_guidance";
    intensity = 0.6;
  } else if (fatigueIndicators.some((indicator) => input.includes(indicator))) {
    mood = "tired";
    supportType = "energy_boost";
    intensity = 0.65;
  }

  return { mood, intensity, supportType };
}
