/**
 * Creator Onboarding Tutorial Service
 * Manages guided walkthrough for new content creators
 */

export type OnboardingStep =
  | 'welcome'
  | 'profile_setup'
  | 'content_upload'
  | 'pricing'
  | 'monetization'
  | 'first_earnings'
  | 'completion';

export interface OnboardingProgress {
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isCompleted: boolean;
  startedAt: number;
  completedAt?: number;
  stepProgress: Record<OnboardingStep, number>;
}

export interface OnboardingStepData {
  id: OnboardingStep;
  title: string;
  description: string;
  content: string;
  actionItems: string[];
  tips: string[];
  videoUrl?: string;
  estimatedTime: number;
  nextStep: OnboardingStep | null;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  category: string;
  pricingTier: 'free' | 'starter' | 'pro' | 'enterprise';
  hourlyRate: number;
  monthlyRate: number;
  yearlyRate: number;
  acceptedTerms: boolean;
  completedOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingSession {
  id: string;
  userId: string;
  steps: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    completed: boolean;
    data?: Record<string, any>;
  }>;
  currentStep: number;
  progress: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CreatorOnboarding {
  private sessions: Map<string, OnboardingSession> = new Map();
  private profiles: Map<string, CreatorProfile> = new Map();
  private userProgress: Map<string, OnboardingProgress> = new Map();

  private tutorialSteps: Record<OnboardingStep, OnboardingStepData> = {
    welcome: {
      id: 'welcome',
      title: 'Welcome to UR Creator Platform',
      description: 'Get started on your journey to becoming a successful content creator',
      content:
        'Welcome! This tutorial will guide you through setting up your creator account, uploading your first content, and starting to earn.',
      actionItems: [
        'Read the welcome message',
        'Understand the creator benefits',
        'Review platform features',
      ],
      tips: [
        'Take your time - you can pause and resume anytime',
        'Follow each step carefully for best results',
        'Check out the help center for additional resources',
      ],
      estimatedTime: 5,
      nextStep: 'profile_setup',
    },
    profile_setup: {
      id: 'profile_setup',
      title: 'Set Up Your Creator Profile',
      description: 'Create a compelling profile that attracts your audience',
      content:
        'Your profile is your first impression. Add a professional photo, write an engaging bio, and choose your content categories.',
      actionItems: [
        'Upload profile picture',
        'Write creator bio (100-200 characters)',
        'Select content categories',
        'Add social media links',
        'Set profile visibility',
      ],
      tips: [
        'Use a clear, professional photo',
        'Be authentic in your bio',
        'Choose categories that match your content',
        'Link your existing social accounts for cross-promotion',
      ],
      estimatedTime: 10,
      nextStep: 'content_upload',
    },
    content_upload: {
      id: 'content_upload',
      title: 'Upload Your First Content',
      description: 'Share your first piece of content with the community',
      content:
        'Upload your first video, audio, image, or text content. Make sure it represents your best work and follows our community guidelines.',
      actionItems: [
        'Choose content type (video/audio/image/text)',
        'Upload your file',
        'Add title and description',
        'Add relevant tags',
        'Set content visibility',
        'Preview before publishing',
      ],
      tips: [
        'Quality over quantity - start with your best content',
        'Write compelling titles and descriptions',
        'Use relevant tags for discoverability',
        'Test video/audio quality before uploading',
      ],
      estimatedTime: 15,
      nextStep: 'pricing',
    },
    pricing: {
      id: 'pricing',
      title: 'Set Your Pricing',
      description: 'Decide how to monetize your content',
      content:
        'Choose between free content, subscription tiers, or pay-per-view. You can change pricing anytime.',
      actionItems: [
        'Review pricing options',
        'Choose pricing model',
        'Set subscription tiers (if applicable)',
        'Set per-minute/hour/day rates',
        'Review earnings breakdown',
      ],
      tips: [
        'Research similar creators pricing',
        'Start competitive - you can increase later',
        'Offer free content to build audience',
        'Use tiered pricing for different audience segments',
      ],
      estimatedTime: 10,
      nextStep: 'monetization',
    },
    monetization: {
      id: 'monetization',
      title: 'Enable Monetization Features',
      description: 'Activate all ways to earn on UR',
      content:
        'Enable subscriptions, tips, affiliate links, and other revenue streams. You keep 85% of earnings!',
      actionItems: [
        'Enable subscriptions',
        'Enable tips/donations',
        'Set up affiliate links',
        'Enable AI recommendations',
        'Configure payout method',
        'Review payment schedule',
      ],
      tips: [
        'You earn 85% - we take 15%',
        'Payouts daily at 11:59 PM UTC',
        'Multiple payment methods available',
        'Affiliate links boost earnings 20-30%',
      ],
      estimatedTime: 10,
      nextStep: 'first_earnings',
    },
    first_earnings: {
      id: 'first_earnings',
      title: 'Track Your First Earnings',
      description: 'Monitor your revenue and audience growth',
      content:
        'Check your dashboard to see real-time earnings, follower growth, and content performance.',
      actionItems: [
        'Visit earnings dashboard',
        'Review analytics',
        'Check follower growth',
        'View content performance',
        'Set earning goals',
      ],
      tips: [
        'Analytics update every hour',
        'Consistency drives growth',
        'Engage with your audience',
        'Post regularly for better reach',
      ],
      estimatedTime: 5,
      nextStep: 'completion',
    },
    completion: {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'Start creating and earning',
      content:
        'Congratulations! You\'ve completed the onboarding. Now start creating amazing content and building your audience.',
      actionItems: [
        'Create your next piece of content',
        'Promote on social media',
        'Engage with your audience',
        'Check analytics daily',
      ],
      tips: [
        'Join our creator community',
        'Attend live webinars',
        'Use AI tools to boost productivity',
        'Network with other creators',
      ],
      estimatedTime: 0,
      nextStep: null,
    },
  };

  /**
   * Start onboarding for a new creator
   */
  startOnboarding(userId: string): OnboardingSession {
    const steps = [
      {
        id: 'profile',
        name: 'Profile Setup',
        description: 'Create your creator profile with name and bio',
        required: true,
        completed: false,
      },
      {
        id: 'category',
        name: 'Choose Category',
        description: 'Select your content creation category',
        required: true,
        completed: false,
      },
      {
        id: 'pricing',
        name: 'Set Pricing',
        description: 'Configure your pricing structure',
        required: true,
        completed: false,
      },
      {
        id: 'images',
        name: 'Upload Images',
        description: 'Add profile and cover images',
        required: false,
        completed: false,
      },
      {
        id: 'terms',
        name: 'Accept Terms',
        description: 'Review and accept terms of service',
        required: true,
        completed: false,
      },
    ];

    const session: OnboardingSession = {
      id: `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      steps,
      currentStep: 0,
      progress: 0,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);

    // Also initialize tutorial progress
    const tutorialProgress: OnboardingProgress = {
      userId,
      currentStep: 'welcome',
      completedSteps: [],
      isCompleted: false,
      startedAt: Date.now(),
      stepProgress: {
        welcome: 0,
        profile_setup: 0,
        content_upload: 0,
        pricing: 0,
        monetization: 0,
        first_earnings: 0,
        completion: 0,
      },
    };

    this.userProgress.set(userId, tutorialProgress);

    return session;
  }

  /**
   * Get current onboarding session
   */
  getSession(sessionId: string): OnboardingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Complete a step in onboarding
   */
  completeStep(
    sessionId: string,
    stepId: string,
    data: Record<string, any>
  ): OnboardingSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const step = session.steps.find((s) => s.id === stepId);
    if (!step) return null;

    step.completed = true;
    step.data = data;
    session.updatedAt = new Date();

    const completedSteps = session.steps.filter((s) => s.completed).length;
    session.progress = Math.round((completedSteps / session.steps.length) * 100);

    const allRequiredCompleted = session.steps.every((s) => !s.required || s.completed);
    if (allRequiredCompleted && completedSteps === session.steps.length) {
      session.completed = true;
    }

    return session;
  }

  /**
   * Create creator profile from onboarding data
   */
  createProfile(sessionId: string, userId: string): CreatorProfile | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.completed) return null;

    const profileStep = session.steps.find((s) => s.id === 'profile');
    const categoryStep = session.steps.find((s) => s.id === 'category');
    const pricingStep = session.steps.find((s) => s.id === 'pricing');
    const termsStep = session.steps.find((s) => s.id === 'terms');

    const profile: CreatorProfile = {
      id: `creator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      displayName: profileStep?.data?.displayName || '',
      bio: profileStep?.data?.bio || '',
      profileImage: profileStep?.data?.profileImage || '',
      coverImage: session.steps.find((s) => s.id === 'images')?.data?.coverImage || '',
      category: categoryStep?.data?.category || '',
      pricingTier: pricingStep?.data?.tier || 'starter',
      hourlyRate: pricingStep?.data?.hourlyRate || 0,
      monthlyRate: pricingStep?.data?.monthlyRate || 0,
      yearlyRate: pricingStep?.data?.yearlyRate || 0,
      acceptedTerms: termsStep?.completed || false,
      completedOnboarding: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Get creator profile
   */
  getProfile(profileId: string): CreatorProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Get all profiles for a user
   */
  getUserProfiles(userId: string): CreatorProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.userId === userId);
  }

  /**
   * Update pricing for a creator
   */
  updatePricing(
    profileId: string,
    hourlyRate: number,
    monthlyRate: number,
    yearlyRate: number
  ): CreatorProfile | null {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    profile.hourlyRate = hourlyRate;
    profile.monthlyRate = monthlyRate;
    profile.yearlyRate = yearlyRate;
    profile.updatedAt = new Date();

    return profile;
  }

  /**
   * Get onboarding progress
   */
  getProgress(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.progress || 0;
  }

  /**
   * Get tutorial step data
   */
  getTutorialStep(step: OnboardingStep): OnboardingStepData {
    return this.tutorialSteps[step];
  }

  /**
   * Get user tutorial progress
   */
  getUserTutorialProgress(userId: string): OnboardingProgress | null {
    return this.userProgress.get(userId) || null;
  }

  /**
   * Complete tutorial step
   */
  completeTutorialStep(userId: string): OnboardingProgress | null {
    const progress = this.userProgress.get(userId);
    if (!progress) return null;

    if (!progress.completedSteps.includes(progress.currentStep)) {
      progress.completedSteps.push(progress.currentStep);
      progress.stepProgress[progress.currentStep] = 100;
    }

    const nextStep = this.tutorialSteps[progress.currentStep].nextStep;
    if (nextStep) {
      progress.currentStep = nextStep;
    } else {
      progress.isCompleted = true;
      progress.completedAt = Date.now();
    }

    return progress;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): OnboardingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): CreatorProfile[] {
    return Array.from(this.profiles.values());
  }
}
