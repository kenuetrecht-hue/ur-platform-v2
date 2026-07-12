/**
 * Content Creation Tools
 * Advanced writing and content creation utilities for Tier 2 Helper AI
 * Supports multiple content types with specialized tools
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const ContentTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  structure: z.array(z.string()),
  placeholders: z.array(z.string()),
  exampleContent: z.string(),
});

const ToneOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  examples: z.array(z.string()),
});

const StyleGuideSchema = z.object({
  id: z.string(),
  name: z.string(),
  rules: z.array(
    z.object({
      rule: z.string(),
      example: z.string(),
      explanation: z.string(),
    })
  ),
  vocabulary: z.array(z.string()),
  avoidWords: z.array(z.string()),
});

const ContentAnalysisSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  wordCount: z.number(),
  sentenceCount: z.number(),
  averageSentenceLength: z.number(),
  readabilityScore: z.number().min(0).max(100),
  readabilityLevel: z.enum([
    "elementary",
    "middle_school",
    "high_school",
    "college",
    "graduate",
  ] as const),
  keywordDensity: z.record(z.string(), z.number()),
  tone: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"] as const),
  suggestions: z.array(z.string()),
});

const WritingPromptSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"] as const),
  prompt: z.string(),
  tips: z.array(z.string()),
  exampleResponse: z.string().optional(),
});

const CollaborationNoteSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  creatorId: z.string(),
  helperAIId: z.string(),
  noteType: z.enum([
    "suggestion",
    "question",
    "feedback",
    "revision",
    "approval",
  ] as const),
  content: z.string(),
  timestamp: z.date(),
  resolved: z.boolean().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

type ContentTemplate = z.infer<typeof ContentTemplateSchema>;
type ToneOption = z.infer<typeof ToneOptionSchema>;
type StyleGuide = z.infer<typeof StyleGuideSchema>;
type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>;
type WritingPrompt = z.infer<typeof WritingPromptSchema>;
type CollaborationNote = z.infer<typeof CollaborationNoteSchema>;

// ============================================================================
// CONTENT CREATION TOOLS
// ============================================================================

export class ContentCreationTools {
  private templates: Map<string, ContentTemplate> = new Map();
  private toneOptions: Map<string, ToneOption> = new Map();
  private styleGuides: Map<string, StyleGuide> = new Map();
  private contentAnalyses: Map<string, ContentAnalysis> = new Map();
  private writingPrompts: Map<string, WritingPrompt> = new Map();
  private collaborationNotes: Map<string, CollaborationNote> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializeTones();
    this.initializeStyleGuides();
    this.initializePrompts();
  }

  /**
   * Initialize content templates
   */
  private initializeTemplates(): void {
    const templates: ContentTemplate[] = [
      {
        id: "tmpl-1",
        name: "Blog Post Structure",
        description: "Standard blog post with introduction, body, and conclusion",
        category: "blog",
        structure: [
          "Catchy headline",
          "Introduction with hook",
          "Problem statement",
          "Solution/Main content",
          "Benefits",
          "Call to action",
          "Conclusion",
        ],
        placeholders: ["[TOPIC]", "[PROBLEM]", "[SOLUTION]", "[BENEFIT]"],
        exampleContent:
          "# How to [TOPIC]\n\nDid you know that [HOOK]? In this post, we'll explore [TOPIC]...",
      },
      {
        id: "tmpl-2",
        name: "Product Description",
        description: "Compelling product description template",
        category: "product",
        structure: [
          "Product name",
          "One-line description",
          "Key features",
          "Benefits",
          "Use cases",
          "Specifications",
          "Call to action",
        ],
        placeholders: ["[PRODUCT]", "[FEATURES]", "[BENEFITS]"],
        exampleContent: "## [PRODUCT]\n\n[PRODUCT] is a [DESCRIPTION]...",
      },
      {
        id: "tmpl-3",
        name: "Email Newsletter",
        description: "Professional email newsletter template",
        category: "email",
        structure: [
          "Subject line",
          "Greeting",
          "Main story",
          "Secondary stories",
          "Resources",
          "Call to action",
          "Sign-off",
        ],
        placeholders: ["[SUBJECT]", "[MAIN_STORY]", "[CTA]"],
        exampleContent:
          "Subject: [SUBJECT]\n\nHi [NAME],\n\n[MAIN_STORY]\n\nBest regards",
      },
      {
        id: "tmpl-4",
        name: "Social Media Post",
        description: "Engaging social media post template",
        category: "social",
        structure: [
          "Hook",
          "Value proposition",
          "Engagement question",
          "Call to action",
          "Hashtags",
        ],
        placeholders: ["[HOOK]", "[VALUE]", "[QUESTION]"],
        exampleContent: "[HOOK]\n\n[VALUE]\n\n[QUESTION]\n\n#[HASHTAGS]",
      },
      {
        id: "tmpl-5",
        name: "Book Chapter",
        description: "Structured book chapter template",
        category: "book",
        structure: [
          "Chapter title",
          "Introduction",
          "Key concepts",
          "Examples",
          "Deep dive",
          "Chapter summary",
          "Discussion questions",
        ],
        placeholders: ["[CHAPTER_TITLE]", "[CONCEPTS]", "[EXAMPLES]"],
        exampleContent: "# [CHAPTER_TITLE]\n\n## Introduction\n\n[INTRO_TEXT]",
      },
    ];

    templates.forEach((t) => this.templates.set(t.id, t));
  }

  /**
   * Initialize tone options
   */
  private initializeTones(): void {
    const tones: ToneOption[] = [
      {
        id: "tone-1",
        name: "Professional",
        description: "Formal, business-appropriate tone",
        keywords: ["professional", "formal", "authoritative", "credible"],
        examples: [
          "We are pleased to inform you...",
          "This comprehensive analysis demonstrates...",
        ],
      },
      {
        id: "tone-2",
        name: "Conversational",
        description: "Friendly, approachable tone",
        keywords: ["friendly", "approachable", "casual", "relatable"],
        examples: [
          "Hey there! Let's dive into...",
          "Here's the thing about...",
        ],
      },
      {
        id: "tone-3",
        name: "Inspirational",
        description: "Motivating, uplifting tone",
        keywords: ["inspiring", "motivating", "empowering", "uplifting"],
        examples: [
          "You have the power to...",
          "Imagine what you could achieve...",
        ],
      },
      {
        id: "tone-4",
        name: "Educational",
        description: "Informative, teaching tone",
        keywords: ["educational", "informative", "explanatory", "clear"],
        examples: [
          "Let's explore how this works...",
          "Understanding this concept is important...",
        ],
      },
      {
        id: "tone-5",
        name: "Humorous",
        description: "Witty, entertaining tone",
        keywords: ["humorous", "witty", "entertaining", "playful"],
        examples: [
          "If you've ever wondered why...",
          "Spoiler alert: it's not what you think...",
        ],
      },
    ];

    tones.forEach((t) => this.toneOptions.set(t.id, t));
  }

  /**
   * Initialize style guides
   */
  private initializeStyleGuides(): void {
    const guides: StyleGuide[] = [
      {
        id: "style-1",
        name: "AP Style",
        rules: [
          {
            rule: "Use active voice",
            example: "The team completed the project",
            explanation: "Active voice is more engaging and clear",
          },
          {
            rule: "Avoid jargon",
            example: "Use simple language instead of technical terms",
            explanation: "Improves readability and accessibility",
          },
        ],
        vocabulary: ["completed", "achieved", "delivered", "created"],
        avoidWords: ["very", "really", "quite", "somewhat"],
      },
      {
        id: "style-2",
        name: "Chicago Manual of Style",
        rules: [
          {
            rule: "Use Oxford comma",
            example: "Red, white, and blue",
            explanation: "Improves clarity in lists",
          },
        ],
        vocabulary: ["furthermore", "moreover", "consequently"],
        avoidWords: ["basically", "literally", "honestly"],
      },
    ];

    guides.forEach((g) => this.styleGuides.set(g.id, g));
  }

  /**
   * Initialize writing prompts
   */
  private initializePrompts(): void {
    const prompts: WritingPrompt[] = [
      {
        id: "prompt-1",
        title: "Personal Story",
        description: "Write a personal story that illustrates a lesson",
        category: "creative",
        difficulty: "beginner",
        prompt:
          "Think of a time when you learned something important. Write about what happened, how you felt, and what you learned.",
        tips: [
          "Use vivid details",
          "Show emotions through actions",
          "Include dialogue if appropriate",
        ],
      },
      {
        id: "prompt-2",
        title: "How-To Guide",
        description: "Create a step-by-step guide for a process",
        category: "instructional",
        difficulty: "intermediate",
        prompt:
          "Choose a skill or process you know well. Write a detailed guide that someone could follow to learn this skill.",
        tips: [
          "Number your steps clearly",
          "Include helpful tips",
          "Anticipate common questions",
        ],
      },
    ];

    prompts.forEach((p) => this.writingPrompts.set(p.id, p));
  }

  /**
   * Get content template
   */
  getTemplate(templateId: string): ContentTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates for category
   */
  getTemplatesByCategory(category: string): ContentTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category
    );
  }

  /**
   * Get tone option
   */
  getTone(toneId: string): ToneOption | null {
    return this.toneOptions.get(toneId) || null;
  }

  /**
   * Get all tones
   */
  getAllTones(): ToneOption[] {
    return Array.from(this.toneOptions.values());
  }

  /**
   * Get style guide
   */
  getStyleGuide(guideId: string): StyleGuide | null {
    return this.styleGuides.get(guideId) || null;
  }

  /**
   * Analyze content
   */
  analyzeContent(
    contentId: string,
    text: string,
    tone: string
  ): ContentAnalysis {
    const wordCount = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const averageSentenceLength =
      sentenceCount > 0 ? wordCount / sentenceCount : 0;

    // Calculate readability score (simplified Flesch-Kincaid)
    const readabilityScore = Math.max(
      0,
      Math.min(100, 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * 0.5)
    );

    // Determine readability level
    let readabilityLevel: ContentAnalysis["readabilityLevel"] = "college";
    if (readabilityScore > 90) readabilityLevel = "elementary";
    else if (readabilityScore > 80) readabilityLevel = "middle_school";
    else if (readabilityScore > 70) readabilityLevel = "high_school";
    else if (readabilityScore > 60) readabilityLevel = "college";
    else readabilityLevel = "graduate";

    // Extract keywords
    const words = text.toLowerCase().split(/\s+/);
    const keywordDensity: Record<string, number> = {};
    words.forEach((word) => {
      if (word.length > 4) {
        keywordDensity[word] = (keywordDensity[word] || 0) + 1;
      }
    });

    // Generate suggestions
    const suggestions: string[] = [];
    if (averageSentenceLength > 20)
      suggestions.push("Consider breaking up long sentences");
    if (wordCount < 300) suggestions.push("Content is quite short");
    if (wordCount > 5000) suggestions.push("Consider breaking into sections");

    const analysis: ContentAnalysis = {
      id: `analysis-${Date.now()}`,
      contentId,
      wordCount,
      sentenceCount,
      averageSentenceLength,
      readabilityScore: Math.round(readabilityScore),
      readabilityLevel,
      keywordDensity,
      tone,
      sentiment: this.analyzeSentiment(text),
      suggestions,
    };

    this.contentAnalyses.set(analysis.id, analysis);
    return analysis;
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(
    text: string
  ): ContentAnalysis["sentiment"] {
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "horrible",
      "poor",
      "disappointing",
    ];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((w) =>
      lowerText.includes(w)
    ).length;
    const negativeCount = negativeWords.filter((w) =>
      lowerText.includes(w)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  /**
   * Get writing prompt
   */
  getWritingPrompt(promptId: string): WritingPrompt | null {
    return this.writingPrompts.get(promptId) || null;
  }

  /**
   * Get prompts by difficulty
   */
  getPromptsByDifficulty(
    difficulty: WritingPrompt["difficulty"]
  ): WritingPrompt[] {
    return Array.from(this.writingPrompts.values()).filter(
      (p) => p.difficulty === difficulty
    );
  }

  /**
   * Add collaboration note
   */
  addCollaborationNote(
    contentId: string,
    creatorId: string,
    helperAIId: string,
    noteType: CollaborationNote["noteType"],
    content: string
  ): CollaborationNote {
    const note: CollaborationNote = {
      id: `note-${Date.now()}`,
      contentId,
      creatorId,
      helperAIId,
      noteType,
      content,
      timestamp: new Date(),
    };

    this.collaborationNotes.set(note.id, note);
    return note;
  }

  /**
   * Get collaboration notes for content
   */
  getCollaborationNotes(contentId: string): CollaborationNote[] {
    return Array.from(this.collaborationNotes.values()).filter(
      (n) => n.contentId === contentId
    );
  }

  /**
   * Resolve collaboration note
   */
  resolveNote(noteId: string): CollaborationNote | null {
    const note = this.collaborationNotes.get(noteId);
    if (note) {
      note.resolved = true;
    }
    return note || null;
  }

  /**
   * Get content analysis
   */
  getContentAnalysis(analysisId: string): ContentAnalysis | null {
    return this.contentAnalyses.get(analysisId) || null;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ContentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get all style guides
   */
  getAllStyleGuides(): StyleGuide[] {
    return Array.from(this.styleGuides.values());
  }

  /**
   * Get all writing prompts
   */
  getAllPrompts(): WritingPrompt[] {
    return Array.from(this.writingPrompts.values());
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ContentTemplateSchema,
  ToneOptionSchema,
  StyleGuideSchema,
  ContentAnalysisSchema,
  WritingPromptSchema,
  CollaborationNoteSchema,
};

export type {
  ContentTemplate,
  ToneOption,
  StyleGuide,
  ContentAnalysis,
  WritingPrompt,
  CollaborationNote,
};
