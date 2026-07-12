/**
 * Affiliate Categories and Promotion Templates
 * Pre-built templates for AI creators to promote affiliate links
 */

export interface AffiliateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
  aiSpecialties: string[];
  avgCommission: number;
  topProducts: number;
}

export interface PromotionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'recommendation' | 'comparison' | 'tutorial' | 'review' | 'deal';
  template: string;
  placeholders: string[];
  aiSpecialties: string[];
  estimatedEngagement: number; // 0-100
}

export interface PromotionMessage {
  id: string;
  aiCreatorId: string;
  templateId: string;
  productName: string;
  affiliateUrl: string;
  message: string;
  category: string;
  createdAt: Date;
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
}

export class AffiliateTemplatesService {
  private categories: Map<string, AffiliateCategory> = new Map();
  private templates: Map<string, PromotionTemplate> = new Map();
  private messages: Map<string, PromotionMessage[]> = new Map();

  constructor() {
    this.initializeCategories();
    this.initializeTemplates();
  }

  /**
   * Initialize default categories
   */
  private initializeCategories(): void {
    const categories: AffiliateCategory[] = [
      {
        id: 'health-fitness',
        name: 'Health & Fitness',
        description: 'Fitness equipment, supplements, and wellness products',
        icon: '💪',
        keywords: ['fitness', 'health', 'workout', 'wellness', 'exercise'],
        aiSpecialties: ['wellness'],
        avgCommission: 8,
        topProducts: 45,
      },
      {
        id: 'music-audio',
        name: 'Music & Audio',
        description: 'Instruments, headphones, speakers, and music production software',
        icon: '🎵',
        keywords: ['music', 'audio', 'instruments', 'headphones', 'speakers'],
        aiSpecialties: ['music'],
        avgCommission: 12,
        topProducts: 38,
      },
      {
        id: 'video-production',
        name: 'Video Production',
        description: 'Cameras, lighting, tripods, and video editing software',
        icon: '🎬',
        keywords: ['video', 'camera', 'lighting', 'editing', 'production'],
        aiSpecialties: ['video'],
        avgCommission: 10,
        topProducts: 52,
      },
      {
        id: 'writing-tools',
        name: 'Writing & Productivity',
        description: 'Writing software, courses, and productivity tools',
        icon: '✍️',
        keywords: ['writing', 'productivity', 'software', 'courses', 'tools'],
        aiSpecialties: ['content'],
        avgCommission: 15,
        topProducts: 28,
      },
      {
        id: 'education',
        name: 'Education & Courses',
        description: 'Online courses, certifications, and learning platforms',
        icon: '📚',
        keywords: ['education', 'courses', 'learning', 'certification', 'training'],
        aiSpecialties: ['wellness', 'music', 'video', 'content'],
        avgCommission: 20,
        topProducts: 35,
      },
      {
        id: 'software',
        name: 'Software & Apps',
        description: 'Productivity software, design tools, and applications',
        icon: '💻',
        keywords: ['software', 'app', 'tool', 'application', 'digital'],
        aiSpecialties: ['video', 'content', 'music'],
        avgCommission: 18,
        topProducts: 42,
      },
    ];

    categories.forEach(cat => {
      this.categories.set(cat.id, cat);
    });
  }

  /**
   * Initialize default promotion templates
   */
  private initializeTemplates(): void {
    const templates: PromotionTemplate[] = [
      {
        id: 'recommendation',
        name: 'Product Recommendation',
        description: 'Simple product recommendation with benefits',
        category: 'general',
        type: 'recommendation',
        template: `I highly recommend {{PRODUCT_NAME}}! Here's why I love it:\n\n✨ {{BENEFIT_1}}\n✨ {{BENEFIT_2}}\n✨ {{BENEFIT_3}}\n\nPerfect for {{USE_CASE}}. Check it out: {{AFFILIATE_LINK}}\n\n*This response is AI-generated. I receive a commission if you purchase through this link.*`,
        placeholders: ['PRODUCT_NAME', 'BENEFIT_1', 'BENEFIT_2', 'BENEFIT_3', 'USE_CASE', 'AFFILIATE_LINK'],
        aiSpecialties: ['wellness', 'music', 'video', 'content'],
        estimatedEngagement: 65,
      },
      {
        id: 'comparison',
        name: 'Product Comparison',
        description: 'Compare products to help users choose',
        category: 'general',
        type: 'comparison',
        template: `Comparing {{PRODUCT_A}} vs {{PRODUCT_B}}:\n\n{{PRODUCT_A}}:\n✓ {{FEATURE_A1}}\n✓ {{FEATURE_A2}}\n\n{{PRODUCT_B}}:\n✓ {{FEATURE_B1}}\n✓ {{FEATURE_B2}}\n\nBest for {{USE_CASE}}: {{PRODUCT_A}}\nLink: {{AFFILIATE_LINK}}\n\n*This response is AI-generated. I receive a commission if you purchase through this link.*`,
        placeholders: ['PRODUCT_A', 'PRODUCT_B', 'FEATURE_A1', 'FEATURE_A2', 'FEATURE_B1', 'FEATURE_B2', 'USE_CASE', 'AFFILIATE_LINK'],
        aiSpecialties: ['wellness', 'music', 'video', 'content'],
        estimatedEngagement: 78,
      },
      {
        id: 'tutorial',
        name: 'Tutorial with Product',
        description: 'Tutorial featuring a product recommendation',
        category: 'general',
        type: 'tutorial',
        template: `Here's how to {{TASK}} using {{PRODUCT_NAME}}:\n\n1. {{STEP_1}}\n2. {{STEP_2}}\n3. {{STEP_3}}\n\nResult: {{OUTCOME}}\n\nGet {{PRODUCT_NAME}} here: {{AFFILIATE_LINK}}\n\n*This response is AI-generated. I receive a commission if you purchase through this link.*`,
        placeholders: ['TASK', 'PRODUCT_NAME', 'STEP_1', 'STEP_2', 'STEP_3', 'OUTCOME', 'AFFILIATE_LINK'],
        aiSpecialties: ['video', 'music', 'content'],
        estimatedEngagement: 82,
      },
      {
        id: 'review',
        name: 'Product Review',
        description: 'Detailed product review and rating',
        category: 'general',
        type: 'review',
        template: `{{PRODUCT_NAME}} Review - {{RATING}}/5 Stars\n\nPros:\n✓ {{PRO_1}}\n✓ {{PRO_2}}\n\nCons:\n✗ {{CON_1}}\n\nOverall: {{SUMMARY}}\n\nBuy here: {{AFFILIATE_LINK}}\n\n*This response is AI-generated. I receive a commission if you purchase through this link.*`,
        placeholders: ['PRODUCT_NAME', 'RATING', 'PRO_1', 'PRO_2', 'CON_1', 'SUMMARY', 'AFFILIATE_LINK'],
        aiSpecialties: ['wellness', 'music', 'video', 'content'],
        estimatedEngagement: 75,
      },
      {
        id: 'deal',
        name: 'Limited Time Deal',
        description: 'Promote limited-time offers and deals',
        category: 'general',
        type: 'deal',
        template: `🔥 LIMITED TIME DEAL 🔥\n\n{{PRODUCT_NAME}}\n\nNow: {{DISCOUNT}}% OFF\nPrice: {{PRICE}}\nExpires: {{EXPIRY}}\n\nDon't miss out! Get it here: {{AFFILIATE_LINK}}\n\n*This response is AI-generated. I receive a commission if you purchase through this link.*`,
        placeholders: ['PRODUCT_NAME', 'DISCOUNT', 'PRICE', 'EXPIRY', 'AFFILIATE_LINK'],
        aiSpecialties: ['wellness', 'music', 'video', 'content'],
        estimatedEngagement: 88,
      },
    ];

    templates.forEach(tmpl => {
      this.templates.set(tmpl.id, tmpl);
    });
  }

  /**
   * Get all categories
   */
  getAllCategories(): AffiliateCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get category by ID
   */
  getCategory(categoryId: string): AffiliateCategory | undefined {
    return this.categories.get(categoryId);
  }

  /**
   * Get categories for AI specialty
   */
  getCategoriesForSpecialty(specialty: string): AffiliateCategory[] {
    return Array.from(this.categories.values()).filter(cat =>
      cat.aiSpecialties.includes(specialty)
    );
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PromotionTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): PromotionTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get templates for AI specialty
   */
  getTemplatesForSpecialty(specialty: string): PromotionTemplate[] {
    return Array.from(this.templates.values()).filter(tmpl =>
      tmpl.aiSpecialties.includes(specialty)
    );
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: string): PromotionTemplate[] {
    return Array.from(this.templates.values()).filter(tmpl => tmpl.type === type);
  }

  /**
   * Create promotion message from template
   */
  createPromotionMessage(
    aiCreatorId: string,
    templateId: string,
    data: {
      productName: string;
      affiliateUrl: string;
      category: string;
      placeholders: Record<string, string>;
      scheduledFor?: Date;
    }
  ): PromotionMessage {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    let message = template.template;
    Object.entries(data.placeholders).forEach(([key, value]) => {
      message = message.replace(`{{${key}}}`, value);
    });

    const promotionMessage: PromotionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      aiCreatorId,
      templateId,
      productName: data.productName,
      affiliateUrl: data.affiliateUrl,
      message,
      category: data.category,
      createdAt: new Date(),
      scheduledFor: data.scheduledFor,
      status: data.scheduledFor ? 'scheduled' : 'draft',
    };

    if (!this.messages.has(aiCreatorId)) {
      this.messages.set(aiCreatorId, []);
    }
    this.messages.get(aiCreatorId)!.push(promotionMessage);

    return promotionMessage;
  }

  /**
   * Get promotion messages for AI creator
   */
  getPromotionMessages(aiCreatorId: string, status?: string): PromotionMessage[] {
    const messages = this.messages.get(aiCreatorId) || [];
    if (status) {
      return messages.filter(m => m.status === status);
    }
    return messages;
  }

  /**
   * Publish promotion message
   */
  publishPromotionMessage(messageId: string): void {
    for (const messages of this.messages.values()) {
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        msg.status = 'published';
      }
    }
  }

  /**
   * Get recommended templates for AI specialty
   */
  getRecommendedTemplates(specialty: string): PromotionTemplate[] {
    return this.getTemplatesForSpecialty(specialty)
      .sort((a, b) => b.estimatedEngagement - a.estimatedEngagement);
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    totalCategories: number;
    totalTemplates: number;
    totalMessages: number;
    publishedMessages: number;
    draftMessages: number;
  } {
    let totalMessages = 0;
    let publishedMessages = 0;
    let draftMessages = 0;

    for (const messages of this.messages.values()) {
      totalMessages += messages.length;
      publishedMessages += messages.filter(m => m.status === 'published').length;
      draftMessages += messages.filter(m => m.status === 'draft').length;
    }

    return {
      totalCategories: this.categories.size,
      totalTemplates: this.templates.size,
      totalMessages,
      publishedMessages,
      draftMessages,
    };
  }
}

// Export singleton instance
export const affiliateTemplatesService = new AffiliateTemplatesService();
