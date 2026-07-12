/**
 * Server Configuration Module
 * Reads all configuration from environment variables
 * Makes it easy to swap providers (Stripe, AI, Affiliate) without code changes
 */

export const serverConfig = {
  // ============================================
  // STRIPE PAYMENT CONFIGURATION
  // ============================================
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    isConfigured: () => {
      return (
        !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      );
    },
  },

  // ============================================
  // AI BRAIN CONFIGURATION
  // ============================================
  ai: {
    apiUrl: process.env.AI_API_URL || 'https://api.manus.im/v1',
    apiKey: process.env.AI_API_KEY || '',
    provider: process.env.AI_PROVIDER || 'manus', // 'manus', 'openai', 'anthropic'
    isConfigured: () => {
      return !!process.env.AI_API_URL && !!process.env.AI_API_KEY;
    },
  },

  // ============================================
  // AFFILIATE CONFIGURATION
  // ============================================
  affiliate: {
    walmart: {
      trackingId: process.env.WALMART_TRACKING_ID || '',
      isConfigured: () => !!process.env.WALMART_TRACKING_ID,
    },
    amazon: {
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || '',
      isConfigured: () => !!process.env.AMAZON_ASSOCIATE_TAG,
    },
    // Add more affiliate partners as needed
    getTrackingUrl: (partner: string, productUrl: string) => {
      switch (partner.toLowerCase()) {
        case 'walmart':
          return `${productUrl}?affid=${process.env.WALMART_TRACKING_ID}`;
        case 'amazon':
          return `${productUrl}?tag=${process.env.AMAZON_ASSOCIATE_TAG}`;
        default:
          return productUrl;
      }
    },
  },

  // ============================================
  // DATABASE CONFIGURATION
  // ============================================
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/ur_dev',
    isConfigured: () => !!process.env.DATABASE_URL,
  },

  // ============================================
  // AUTHENTICATION CONFIGURATION
  // ============================================
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    isConfigured: () => !!process.env.JWT_SECRET,
  },

  // ============================================
  // EMAIL CONFIGURATION
  // ============================================
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    isConfigured: () => {
      return !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;
    },
  },

  // ============================================
  // ENVIRONMENT
  // ============================================
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  // ============================================
  // APP CONFIGURATION
  // ============================================
  app: {
    name: process.env.APP_NAME || 'UR',
    version: process.env.APP_VERSION || '1.0.0',
    creatorPayoutPercentage: parseFloat(process.env.CREATOR_PAYOUT_PERCENTAGE || '0.85'),
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '0.15'),
  },

  // ============================================
  // VALIDATION
  // ============================================
  validate: () => {
    const errors: string[] = [];

    // Check critical configurations
    if (!serverConfig.stripe.isConfigured()) {
      errors.push('Stripe configuration missing: STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    }

    if (!serverConfig.ai.isConfigured()) {
      errors.push('AI configuration missing: AI_API_URL or AI_API_KEY');
    }

    if (!serverConfig.database.isConfigured()) {
      errors.push('Database configuration missing: DATABASE_URL');
    }

    if (!serverConfig.auth.isConfigured()) {
      errors.push('Auth configuration missing: JWT_SECRET');
    }

    if (errors.length > 0) {
      console.error('Configuration errors:');
      errors.forEach((err) => console.error(`  - ${err}`));
      return false;
    }

    return true;
  },
};

/**
 * AI Service Factory
 * Returns the appropriate AI service based on configuration
 */
export function getAIService() {
  const provider = serverConfig.ai.provider;

  switch (provider) {
    case 'openai':
      return {
        name: 'OpenAI',
        endpoint: serverConfig.ai.apiUrl,
        apiKey: serverConfig.ai.apiKey,
        model: 'gpt-4',
      };

    case 'anthropic':
      return {
        name: 'Anthropic',
        endpoint: serverConfig.ai.apiUrl,
        apiKey: serverConfig.ai.apiKey,
        model: 'claude-3-sonnet',
      };

    case 'manus':
    default:
      return {
        name: 'Manus',
        endpoint: serverConfig.ai.apiUrl,
        apiKey: serverConfig.ai.apiKey,
        model: 'manus-ai',
      };
  }
}

/**
 * Stripe Service Factory
 * Returns Stripe configuration for payment processing
 */
export function getStripeConfig() {
  return {
    secretKey: serverConfig.stripe.secretKey,
    publishableKey: serverConfig.stripe.publishableKey,
    isLiveMode: serverConfig.stripe.secretKey?.startsWith('sk_live_') || false,
  };
}

/**
 * Affiliate Service Factory
 * Returns affiliate configuration for tracking
 */
export function getAffiliateConfig() {
  return {
    walmart: {
      trackingId: serverConfig.affiliate.walmart.trackingId,
      isEnabled: serverConfig.affiliate.walmart.isConfigured(),
    },
    amazon: {
      associateTag: serverConfig.affiliate.amazon.associateTag,
      isEnabled: serverConfig.affiliate.amazon.isConfigured(),
    },
    getTrackingUrl: serverConfig.affiliate.getTrackingUrl,
  };
}

export default serverConfig;
