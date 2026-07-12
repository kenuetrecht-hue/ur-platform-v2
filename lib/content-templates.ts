/**
 * Content Templates Service
 * Pre-built templates for multi-format content creation
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type ContentFormat = "video" | "audio" | "text" | "image" | "3d" | "social";
export type TemplateCategory =
  | "marketing"
  | "education"
  | "entertainment"
  | "tutorial"
  | "news"
  | "podcast"
  | "social-media"
  | "presentation"
  | "product"
  | "other";

export interface TemplateComponent {
  id: string;
  type: string;
  properties: Record<string, any>;
  duration?: number;
  order?: number;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description?: string;
  format: ContentFormat;
  category: TemplateCategory;
  thumbnail?: string;
  components: TemplateComponent[];
  duration?: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  isPublic: boolean;
  creatorId?: string;
  createdAt: number;
  usageCount: number;
  rating: number;
  reviews: number;
  price?: number;
}

export interface TemplateInstance {
  id: string;
  templateId: string;
  creatorId: string;
  name: string;
  format: ContentFormat;
  components: TemplateComponent[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// CONTENT TEMPLATES SERVICE
// ============================================================================

class ContentTemplatesService {
  private templates: Map<string, ContentTemplate> = new Map();
  private instances: Map<string, TemplateInstance> = new Map();
  private templatesByFormat: Map<ContentFormat, Set<string>> = new Map();
  private templatesByCategory: Map<TemplateCategory, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Video Templates
    this.createTemplate({
      name: "YouTube Intro",
      format: "video",
      category: "social-media",
      difficulty: "beginner",
      description: "Professional YouTube video intro template",
      components: [
        { id: "intro", type: "intro", properties: { duration: 3, style: "fade" } },
        { id: "title", type: "title", properties: { position: "center", fontSize: 48 } },
        { id: "content", type: "video", properties: { duration: 300 } },
        { id: "outro", type: "outro", properties: { duration: 3, style: "fade" } },
      ],
      duration: 306,
      tags: ["youtube", "intro", "professional"],
      isPublic: true,
    });

    this.createTemplate({
      name: "Tutorial Video",
      format: "video",
      category: "tutorial",
      difficulty: "intermediate",
      description: "Step-by-step tutorial video template",
      components: [
        { id: "title", type: "title", properties: { duration: 2 } },
        { id: "intro", type: "intro", properties: { duration: 3 } },
        { id: "steps", type: "steps", properties: { stepCount: 5 } },
        { id: "conclusion", type: "conclusion", properties: { duration: 2 } },
        { id: "outro", type: "outro", properties: { duration: 3 } },
      ],
      tags: ["tutorial", "educational"],
      isPublic: true,
    });

    // Audio Templates
    this.createTemplate({
      name: "Podcast Episode",
      format: "audio",
      category: "podcast",
      difficulty: "beginner",
      description: "Standard podcast episode template",
      components: [
        { id: "intro", type: "intro", properties: { duration: 30 } },
        { id: "content", type: "audio", properties: { duration: 3600 } },
        { id: "outro", type: "outro", properties: { duration: 30 } },
      ],
      tags: ["podcast", "audio"],
      isPublic: true,
    });

    this.createTemplate({
      name: "Music Track",
      format: "audio",
      category: "entertainment",
      difficulty: "advanced",
      description: "Music production template",
      components: [
        { id: "intro", type: "intro", properties: { duration: 8 } },
        { id: "verse1", type: "audio", properties: { duration: 32 } },
        { id: "chorus", type: "audio", properties: { duration: 16 } },
        { id: "verse2", type: "audio", properties: { duration: 32 } },
        { id: "chorus2", type: "audio", properties: { duration: 16 } },
        { id: "bridge", type: "audio", properties: { duration: 16 } },
        { id: "final_chorus", type: "audio", properties: { duration: 16 } },
        { id: "outro", type: "outro", properties: { duration: 8 } },
      ],
      tags: ["music", "audio"],
      isPublic: true,
    });

    // Text Templates
    this.createTemplate({
      name: "Blog Post",
      format: "text",
      category: "education",
      difficulty: "beginner",
      description: "Blog post structure template",
      components: [
        { id: "title", type: "title", properties: { level: 1 } },
        { id: "intro", type: "paragraph", properties: { minWords: 100 } },
        { id: "sections", type: "sections", properties: { count: 3 } },
        { id: "conclusion", type: "paragraph", properties: { minWords: 100 } },
        { id: "cta", type: "call-to-action", properties: {} },
      ],
      tags: ["blog", "writing"],
      isPublic: true,
    });

    this.createTemplate({
      name: "Social Media Post",
      format: "text",
      category: "social-media",
      difficulty: "beginner",
      description: "Social media caption template",
      components: [
        { id: "hook", type: "paragraph", properties: { maxWords: 20 } },
        { id: "body", type: "paragraph", properties: { maxWords: 100 } },
        { id: "cta", type: "call-to-action", properties: {} },
        { id: "hashtags", type: "hashtags", properties: { count: 5 } },
      ],
      tags: ["social", "marketing"],
      isPublic: true,
    });

    // Image Templates
    this.createTemplate({
      name: "Social Media Graphic",
      format: "image",
      category: "social-media",
      difficulty: "beginner",
      description: "Social media graphic template",
      components: [
        { id: "background", type: "background", properties: { width: 1080, height: 1080 } },
        { id: "title", type: "text", properties: { fontSize: 72, position: "top" } },
        { id: "image", type: "image", properties: { position: "center" } },
        { id: "cta", type: "text", properties: { fontSize: 36, position: "bottom" } },
      ],
      tags: ["social", "graphic"],
      isPublic: true,
    });

    this.createTemplate({
      name: "Infographic",
      format: "image",
      category: "education",
      difficulty: "intermediate",
      description: "Infographic template",
      components: [
        { id: "title", type: "title", properties: { fontSize: 60 } },
        { id: "sections", type: "sections", properties: { count: 4 } },
        { id: "icons", type: "icons", properties: { count: 4 } },
        { id: "footer", type: "footer", properties: {} },
      ],
      tags: ["infographic", "data"],
      isPublic: true,
    });
  }

  /**
   * Create template
   */
  createTemplate(data: Omit<ContentTemplate, "id" | "createdAt" | "usageCount" | "rating" | "reviews">): ContentTemplate {
    const templateId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const template: ContentTemplate = {
      id: templateId,
      ...data,
      createdAt: Date.now(),
      usageCount: 0,
      rating: 0,
      reviews: 0,
    };

    this.templates.set(templateId, template);

    // Track by format
    if (!this.templatesByFormat.has(data.format)) {
      this.templatesByFormat.set(data.format, new Set());
    }
    this.templatesByFormat.get(data.format)!.add(templateId);

    // Track by category
    if (!this.templatesByCategory.has(data.category)) {
      this.templatesByCategory.set(data.category, new Set());
    }
    this.templatesByCategory.get(data.category)!.add(templateId);

    return template;
  }

  /**
   * Get template
   */
  getTemplate(templateId: string): ContentTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get templates by format
   */
  getTemplatesByFormat(format: ContentFormat): ContentTemplate[] {
    const templateIds = this.templatesByFormat.get(format);
    if (!templateIds) return [];

    return Array.from(templateIds)
      .map((id) => this.templates.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): ContentTemplate[] {
    const templateIds = this.templatesByCategory.get(category);
    if (!templateIds) return [];

    return Array.from(templateIds)
      .map((id) => this.templates.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating);
  }

  /**
   * Search templates
   */
  searchTemplates(searchTerm: string, format?: ContentFormat, category?: TemplateCategory): ContentTemplate[] {
    let results = Array.from(this.templates.values()).filter((t) => t.isPublic);

    if (format) {
      results = results.filter((t) => t.format === format);
    }

    if (category) {
      results = results.filter((t) => t.category === category);
    }

    const term = searchTerm.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.tags.some((tag) => tag.toLowerCase().includes(term))
    );

    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Create instance from template
   */
  createInstance(templateId: string, creatorId: string, name: string): TemplateInstance | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const instance: TemplateInstance = {
      id: instanceId,
      templateId,
      creatorId,
      name,
      format: template.format,
      components: JSON.parse(JSON.stringify(template.components)), // Deep copy
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.instances.set(instanceId, instance);

    // Increment template usage
    template.usageCount++;

    return instance;
  }

  /**
   * Get instance
   */
  getInstance(instanceId: string): TemplateInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Update instance
   */
  updateInstance(instanceId: string, updates: Partial<Omit<TemplateInstance, "id" | "templateId" | "creatorId" | "createdAt">>): TemplateInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (!instance) return undefined;

    const updated = {
      ...instance,
      ...updates,
      updatedAt: Date.now(),
    };

    this.instances.set(instanceId, updated);
    return updated;
  }

  /**
   * Rate template
   */
  rateTemplate(templateId: string, rating: number): ContentTemplate | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    // Update rating (simple average)
    const totalRating = template.rating * template.reviews + rating;
    template.reviews++;
    template.rating = totalRating / template.reviews;

    return template;
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): ContentTemplate[] {
    return Array.from(this.templates.values())
      .filter((t) => t.isPublic)
      .sort((a, b) => {
        const scoreA = a.usageCount * 0.7 + a.rating * 0.3;
        const scoreB = b.usageCount * 0.7 + b.rating * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get recommended templates
   */
  getRecommendedTemplates(format: ContentFormat, difficulty?: "beginner" | "intermediate" | "advanced"): ContentTemplate[] {
    let templates = this.getTemplatesByFormat(format);

    if (difficulty) {
      templates = templates.filter((t) => t.difficulty === difficulty);
    }

    return templates.slice(0, 5);
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.templates.clear();
    this.instances.clear();
    this.templatesByFormat.clear();
    this.templatesByCategory.clear();
    this.initializeDefaultTemplates();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let templatesInstance: ContentTemplatesService | null = null;

export function getContentTemplates(): ContentTemplatesService {
  if (!templatesInstance) {
    templatesInstance = new ContentTemplatesService();
  }
  return templatesInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetContentTemplates(): void {
  if (templatesInstance) {
    templatesInstance.reset();
  }
  templatesInstance = null;
}

export default ContentTemplatesService;
