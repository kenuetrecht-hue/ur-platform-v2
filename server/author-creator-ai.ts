import { z } from "zod";

/**
 * Author & Creator AI
 * Helps people write books, poems, songs, and export them as PDFs and other formats
 * Full-featured content creation with publishing capabilities
 */

// Content Types
export const ContentTypeSchema = z.enum([
  "book",
  "poem",
  "song",
  "short_story",
  "article",
  "script",
  "blog_post",
  "newsletter",
  "ebook",
]);

export type ContentType = z.infer<typeof ContentTypeSchema>;

// Writing Styles
export const WritingStyleSchema = z.enum([
  "literary",
  "commercial",
  "academic",
  "journalistic",
  "poetic",
  "narrative",
  "descriptive",
  "persuasive",
  "technical",
  "conversational",
]);

export type WritingStyle = z.infer<typeof WritingStyleSchema>;

// Export Formats
export const ExportFormatSchema = z.enum([
  "pdf",
  "epub",
  "mobi",
  "docx",
  "txt",
  "html",
  "markdown",
  "latex",
  "odt",
  "rtf",
]);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// Publishing Platforms
export const PublishingPlatformSchema = z.enum([
  "amazon_kdp",
  "smashwords",
  "draft2digital",
  "ingramspark",
  "createspace",
  "bookbaby",
  "self_publishing_hub",
  "wattpad",
  "medium",
  "substack",
  "ebay",
  "etsy",
]);

export type PublishingPlatform = z.infer<typeof PublishingPlatformSchema>;

// Content Project
export const ContentProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: ContentTypeSchema,
  style: WritingStyleSchema,
  genre: z.string(),
  description: z.string(),
  targetAudience: z.string(),
  wordCount: z.number(),
  chapters: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(["draft", "in_progress", "completed", "published"]),
});

export type ContentProject = z.infer<typeof ContentProjectSchema>;

// Writing Session
export const WritingSessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  content: z.string(),
  wordCount: z.number(),
  duration: z.number(), // in minutes
  timestamp: z.date(),
  aiSuggestions: z.array(z.string()),
  userFeedback: z.string().optional(),
});

export type WritingSession = z.infer<typeof WritingSessionSchema>;

// Publishing Configuration
export const PublishingConfigSchema = z.object({
  platform: PublishingPlatformSchema,
  title: z.string(),
  author: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  category: z.string(),
  price: z.number().optional(),
  royaltyRate: z.number().optional(),
  coverImageUrl: z.string().optional(),
  isbn: z.string().optional(),
});

export type PublishingConfig = z.infer<typeof PublishingConfigSchema>;

// Export Configuration
export const ExportConfigSchema = z.object({
  format: ExportFormatSchema,
  includeTableOfContents: z.boolean(),
  includeCover: z.boolean(),
  includeMetadata: z.boolean(),
  pageSize: z.enum(["letter", "a4", "custom"]).optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  lineSpacing: z.number().optional(),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

// AI Suggestions
export const AISuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(["grammar", "style", "clarity", "flow", "tone", "structure"]),
  original: z.string(),
  suggestion: z.string(),
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
  accepted: z.boolean().optional(),
});

export type AISuggestion = z.infer<typeof AISuggestionSchema>;

// Writing Statistics
export const WritingStatsSchema = z.object({
  totalWords: z.number(),
  totalCharacters: z.number(),
  totalSessions: z.number(),
  averageSessionLength: z.number(),
  readingTime: z.number(), // in minutes
  sentenceCount: z.number(),
  paragraphCount: z.number(),
  averageSentenceLength: z.number(),
  fleschKincaidGrade: z.number(),
  uniqueWords: z.number(),
  vocabulary: z.number(),
});

export type WritingStats = z.infer<typeof WritingStatsSchema>;

/**
 * Author & Creator AI Class
 * Provides comprehensive writing and publishing assistance
 */
export class AuthorCreatorAI {
  private projects: Map<string, ContentProject> = new Map();
  private sessions: Map<string, WritingSession[]> = new Map();
  private suggestions: Map<string, AISuggestion[]> = new Map();

  /**
   * Create a new writing project
   */
  createProject(input: {
    title: string;
    type: ContentType;
    style: WritingStyle;
    genre: string;
    description: string;
    targetAudience: string;
  }): ContentProject {
    const project: ContentProject = {
      id: `proj_${Date.now()}`,
      title: input.title,
      type: input.type,
      style: input.style,
      genre: input.genre,
      description: input.description,
      targetAudience: input.targetAudience,
      wordCount: 0,
      chapters: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "draft",
    };

    this.projects.set(project.id, project);
    this.sessions.set(project.id, []);
    this.suggestions.set(project.id, []);

    return project;
  }

  /**
   * Get project details
   */
  getProject(projectId: string): ContentProject | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Save writing session
   */
  saveSession(projectId: string, content: string, duration: number): WritingSession {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found");

    const wordCount = content.split(/\s+/).length;
    const session: WritingSession = {
      id: `sess_${Date.now()}`,
      projectId,
      content,
      wordCount,
      duration,
      timestamp: new Date(),
      aiSuggestions: [],
    };

    const sessions = this.sessions.get(projectId) || [];
    sessions.push(session);
    this.sessions.set(projectId, sessions);

    // Update project stats
    project.wordCount += wordCount;
    project.updatedAt = new Date();

    return session;
  }

  /**
   * Generate AI suggestions for content
   */
  generateSuggestions(projectId: string, content: string): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    // Grammar suggestions (simplified)
    if (content.includes("  ")) {
      suggestions.push({
        id: `sugg_${Date.now()}_1`,
        type: "grammar",
        original: "double space",
        suggestion: "single space",
        explanation: "Remove extra spaces between words",
        confidence: 0.95,
      });
    }

    // Style suggestions
    if (content.length > 500) {
      const sentences = content.split(/[.!?]+/).length;
      const avgLength = content.length / sentences;
      if (avgLength > 30) {
        suggestions.push({
          id: `sugg_${Date.now()}_2`,
          type: "style",
          original: "long sentences",
          suggestion: "break into shorter sentences",
          explanation: "Shorter sentences improve readability",
          confidence: 0.85,
        });
      }
    }

    // Flow suggestions
    if (content.includes("However") || content.includes("Therefore")) {
      suggestions.push({
        id: `sugg_${Date.now()}_3`,
        type: "flow",
        original: "transition words",
        suggestion: "add more varied transitions",
        explanation: "Use diverse transition words for better flow",
        confidence: 0.75,
      });
    }

    const projectSuggestions = this.suggestions.get(projectId) || [];
    projectSuggestions.push(...suggestions);
    this.suggestions.set(projectId, projectSuggestions);

    return suggestions;
  }

  /**
   * Calculate writing statistics
   */
  calculateStats(content: string): WritingStats {
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const characters = content.length;
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;

    // Flesch-Kincaid Grade Level (simplified)
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = 1.5; // Simplified
    const flesch = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

    return {
      totalWords: words.length,
      totalCharacters: characters,
      totalSessions: 1,
      averageSessionLength: words.length,
      readingTime: Math.ceil(words.length / 200), // Average reading speed
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      averageSentenceLength: avgSentenceLength,
      fleschKincaidGrade: Math.max(0, flesch),
      uniqueWords,
      vocabulary: uniqueWords,
    };
  }

  /**
   * Export content to different formats
   */
  async exportContent(
    projectId: string,
    content: string,
    config: ExportConfig
  ): Promise<{ format: string; url: string; filename: string }> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found");

    const filename = `${project.title.replace(/\s+/g, "_")}.${config.format}`;

    // Simulate export processing
    const exportData = {
      format: config.format,
      url: `s3://exports/${projectId}/${filename}`,
      filename,
    };

    return exportData;
  }

  /**
   * Prepare for publishing
   */
  prepareForPublishing(
    projectId: string,
    config: any
  ): {
    platform: string;
    status: string;
    requirements: string[];
    checklist: boolean[];
  } {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found");

    const requirements = [
      "Title and author name",
      "Book description (100-300 words)",
      "Cover image (1600x2400px minimum)",
      "Content formatted and proofread",
      "ISBN (optional but recommended)",
      "Keywords and categories",
      "Pricing and royalty settings",
    ];

    const checklist = [
      !!config.title,
      !!config.author,
      !!config.description,
      !!config.coverImageUrl,
      !!config.keywords && config.keywords.length > 0,
      !!config.category,
      config.price !== undefined,
    ];

    return {
      platform: config.platform,
      status: checklist.every((c) => c) ? "ready" : "incomplete",
      requirements,
      checklist,
    };
  }

  /**
   * Get publishing platforms
   */
  getPublishingPlatforms(): Array<{
    name: string;
    platform: PublishingPlatform;
    description: string;
    features: string[];
  }> {
    return [
      {
        name: "Amazon KDP",
        platform: "amazon_kdp",
        description: "Publish ebooks and print books on Amazon",
        features: ["Global reach", "High royalty rates", "Print on demand"],
      },
      {
        name: "Smashwords",
        platform: "smashwords",
        description: "Distribute to multiple ebook retailers",
        features: ["Wide distribution", "Flexible pricing", "Royalty tracking"],
      },
      {
        name: "Draft2Digital",
        platform: "draft2digital",
        description: "Easy ebook publishing and distribution",
        features: ["Simple interface", "Multiple formats", "Retailer distribution"],
      },
      {
        name: "Wattpad",
        platform: "wattpad",
        description: "Share stories with millions of readers",
        features: ["Large community", "Free platform", "Reader engagement"],
      },
      {
        name: "Medium",
        platform: "medium",
        description: "Publish articles and essays",
        features: ["Built-in audience", "Monetization options", "Easy publishing"],
      },
      {
        name: "eBay",
        platform: "ebay",
        description: "Sell digital products on eBay",
        features: ["Large marketplace", "Easy setup", "Payment processing"],
      },
      {
        name: "Etsy",
        platform: "etsy",
        description: "Sell digital downloads on Etsy",
        features: ["Creative community", "Built-in audience", "Easy selling"],
      },
    ];
  }

  /**
   * Get writing templates
   */
  getWritingTemplates(): Array<{
    type: ContentType;
    name: string;
    structure: string[];
    tips: string[];
  }> {
    return [
      {
        type: "book",
        name: "Novel Template",
        structure: [
          "Introduction",
          "Chapter 1-5",
          "Rising Action",
          "Climax",
          "Resolution",
          "Epilogue",
        ],
        tips: [
          "Develop characters deeply",
          "Create compelling plot",
          "Show don't tell",
          "Edit multiple times",
        ],
      },
      {
        type: "poem",
        name: "Poetry Template",
        structure: ["Title", "Stanzas", "Rhyme scheme", "Meter"],
        tips: [
          "Use vivid imagery",
          "Play with words",
          "Read aloud",
          "Refine rhythm",
        ],
      },
      {
        type: "song",
        name: "Song Template",
        structure: ["Verse 1", "Chorus", "Verse 2", "Bridge", "Chorus", "Outro"],
        tips: [
          "Catchy melody",
          "Memorable lyrics",
          "Emotional connection",
          "Consistent rhythm",
        ],
      },
      {
        type: "short_story",
        name: "Short Story Template",
        structure: [
          "Hook",
          "Setup",
          "Conflict",
          "Climax",
          "Resolution",
        ],
        tips: [
          "Start strong",
          "Tight pacing",
          "Clear conflict",
          "Satisfying ending",
        ],
      },
    ];
  }

  /**
   * Get all projects
   */
  getAllProjects(): ContentProject[] {
    return Array.from(this.projects.values());
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): {
    project: ContentProject;
    sessions: number;
    totalWords: number;
    suggestions: number;
  } {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found");

    const sessions = this.sessions.get(projectId) || [];
    const suggestions = this.suggestions.get(projectId) || [];

    return {
      project,
      sessions: sessions.length,
      totalWords: project.wordCount,
      suggestions: suggestions.length,
    };
  }
}
