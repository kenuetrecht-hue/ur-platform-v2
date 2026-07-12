/**
 * Social Media Caption Templates
 * Platform-specific templates with 2026 FTC compliance
 */

export interface CaptionTemplate {
  id: string;
  platform: 'tiktok' | 'instagram' | 'twitter';
  name: string;
  template: string;
  maxLength: number;
  variables: string[];
  includesAd: boolean;
  adDisclosure: string;
}

export interface GeneratedCaption {
  platform: 'tiktok' | 'instagram' | 'twitter';
  caption: string;
  length: number;
  isCompliant: boolean;
  warnings: string[];
}

class SocialMediaTemplateService {
  private templates: Map<string, CaptionTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize platform-specific templates
   */
  private initializeTemplates() {
    // TikTok Templates (150 char max)
    const tiktokTemplates: CaptionTemplate[] = [
      {
        id: 'tiktok_wellness_1',
        platform: 'tiktok',
        name: 'Wellness Tip',
        template: '{{topic}} 💡 #FYP #Creator #Wellness',
        maxLength: 150,
        variables: ['topic'],
        includesAd: false,
        adDisclosure: '#Ad #Affiliate',
      },
      {
        id: 'tiktok_product_1',
        platform: 'tiktok',
        name: 'Product Recommendation',
        template: '#Ad #Affiliate - Check this out! {{product}} 🛍️ #FYP #Creator',
        maxLength: 150,
        variables: ['product'],
        includesAd: true,
        adDisclosure: '#Ad #Affiliate',
      },
      {
        id: 'tiktok_educational_1',
        platform: 'tiktok',
        name: 'Educational',
        template: 'Learn: {{topic}} 📚 #FYP #Creator #Education',
        maxLength: 150,
        variables: ['topic'],
        includesAd: false,
        adDisclosure: '',
      },
    ];

    // Instagram Templates (2200 char max)
    const instagramTemplates: CaptionTemplate[] = [
      {
        id: 'instagram_wellness_1',
        platform: 'instagram',
        name: 'Wellness Post',
        template:
          '{{topic}}\n\n✨ What do you think?\n\n#Creator #Community #Wellness #MentalHealth #SelfCare',
        maxLength: 2200,
        variables: ['topic'],
        includesAd: false,
        adDisclosure: '',
      },
      {
        id: 'instagram_product_1',
        platform: 'instagram',
        name: 'Product Feature',
        template:
          '#Ad #Affiliate - Loving {{product}}!\n\n✨ {{description}}\n\n🔗 Link in bio\n\n#Creator #Recommendations',
        maxLength: 2200,
        variables: ['product', 'description'],
        includesAd: true,
        adDisclosure: '#Ad #Affiliate',
      },
      {
        id: 'instagram_carousel_1',
        platform: 'instagram',
        name: 'Carousel Post',
        template:
          '{{topic}}\n\nSwipe to learn more ➡️\n\n{{details}}\n\n#Creator #Community #Learning',
        maxLength: 2200,
        variables: ['topic', 'details'],
        includesAd: false,
        adDisclosure: '',
      },
    ];

    // Twitter/X Templates (280 char max)
    const twitterTemplates: CaptionTemplate[] = [
      {
        id: 'twitter_wellness_1',
        platform: 'twitter',
        name: 'Wellness Tip',
        template: '💡 {{topic}} #Creator #Wellness',
        maxLength: 280,
        variables: ['topic'],
        includesAd: false,
        adDisclosure: '',
      },
      {
        id: 'twitter_product_1',
        platform: 'twitter',
        name: 'Product Rec',
        template: '#Ad #Affiliate - {{product}} is amazing 🔗 {{link}}',
        maxLength: 280,
        variables: ['product', 'link'],
        includesAd: true,
        adDisclosure: '#Ad #Affiliate',
      },
      {
        id: 'twitter_thread_1',
        platform: 'twitter',
        name: 'Thread Start',
        template: '🧵 {{topic}}\n\nHere\'s what you need to know:',
        maxLength: 280,
        variables: ['topic'],
        includesAd: false,
        adDisclosure: '',
      },
    ];

    // Register all templates
    [...tiktokTemplates, ...instagramTemplates, ...twitterTemplates].forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get templates by platform
   */
  getByPlatform(platform: 'tiktok' | 'instagram' | 'twitter'): CaptionTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.platform === platform);
  }

  /**
   * Generate caption from template
   */
  generateCaption(
    templateId: string,
    variables: Record<string, string>,
    includeAd: boolean = false
  ): GeneratedCaption | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let caption = template.template;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      caption = caption.replace(`{{${key}}}`, value);
    });

    // Add ad disclosure if needed
    if (includeAd && template.includesAd) {
      caption = `${template.adDisclosure}\n\n${caption}`;
    }

    // Check compliance
    const isCompliant = this.checkCompliance(caption, template.platform, includeAd);
    const warnings = this.getWarnings(caption, template.platform, includeAd);

    return {
      platform: template.platform,
      caption,
      length: caption.length,
      isCompliant,
      warnings,
    };
  }

  /**
   * Check FTC compliance for caption
   */
  private checkCompliance(
    caption: string,
    platform: 'tiktok' | 'instagram' | 'twitter',
    hasAffiliateLink: boolean
  ): boolean {
    const maxLengths = {
      tiktok: 150,
      instagram: 2200,
      twitter: 280,
    };

    // Check length
    if (caption.length > maxLengths[platform]) {
      return false;
    }

    // Check ad disclosure if has affiliate link
    if (hasAffiliateLink) {
      const hasAdDisclosure = caption.includes('#Ad') || caption.includes('#Affiliate');
      if (!hasAdDisclosure) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get compliance warnings
   */
  private getWarnings(
    caption: string,
    platform: 'tiktok' | 'instagram' | 'twitter',
    hasAffiliateLink: boolean
  ): string[] {
    const warnings: string[] = [];

    const maxLengths = {
      tiktok: 150,
      instagram: 2200,
      twitter: 280,
    };

    // Check length
    if (caption.length > maxLengths[platform]) {
      warnings.push(`Caption exceeds ${platform} limit of ${maxLengths[platform]} characters`);
    }

    // Check ad disclosure
    if (hasAffiliateLink) {
      if (!caption.includes('#Ad') && !caption.includes('#Affiliate')) {
        warnings.push('Missing #Ad or #Affiliate disclosure for affiliate link');
      }
    }

    // Check for missing variables
    if (caption.includes('{{')) {
      warnings.push('Caption contains unreplaced variables');
    }

    return warnings;
  }

  /**
   * Create custom template
   */
  createCustomTemplate(
    platform: 'tiktok' | 'instagram' | 'twitter',
    name: string,
    template: string,
    variables: string[] = []
  ): CaptionTemplate {
    const maxLengths = {
      tiktok: 150,
      instagram: 2200,
      twitter: 280,
    };

    const customTemplate: CaptionTemplate = {
      id: `custom_${Date.now()}`,
      platform,
      name,
      template,
      maxLength: maxLengths[platform],
      variables,
      includesAd: template.includes('#Ad') || template.includes('#Affiliate'),
      adDisclosure: template.includes('#Ad') ? '#Ad' : template.includes('#Affiliate') ? '#Affiliate' : '',
    };

    this.templates.set(customTemplate.id, customTemplate);
    return customTemplate;
  }

  /**
   * Get all custom templates
   */
  getCustomTemplates(): CaptionTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.id.startsWith('custom_'));
  }

  /**
   * Generate captions for all platforms
   */
  generateMultiPlatformCaptions(
    topic: string,
    includeAd: boolean = false
  ): Record<'tiktok' | 'instagram' | 'twitter', GeneratedCaption> {
    const tiktokTemplate = this.templates.get('tiktok_wellness_1');
    const instagramTemplate = this.templates.get('instagram_wellness_1');
    const twitterTemplate = this.templates.get('twitter_wellness_1');

    return {
      tiktok: this.generateCaption('tiktok_wellness_1', { topic }, includeAd) || {
        platform: 'tiktok',
        caption: topic,
        length: topic.length,
        isCompliant: true,
        warnings: [],
      },
      instagram: this.generateCaption('instagram_wellness_1', { topic }, includeAd) || {
        platform: 'instagram',
        caption: topic,
        length: topic.length,
        isCompliant: true,
        warnings: [],
      },
      twitter: this.generateCaption('twitter_wellness_1', { topic }, includeAd) || {
        platform: 'twitter',
        caption: topic,
        length: topic.length,
        isCompliant: true,
        warnings: [],
      },
    };
  }
}

export const socialMediaTemplateService = new SocialMediaTemplateService();
