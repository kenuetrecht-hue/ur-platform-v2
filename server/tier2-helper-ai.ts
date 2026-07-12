/**
 * Tier 2 Helper AI System
 * Limited-capability AI assistants for human content creators
 * Features: Writing, editing, formatting, web search
 * No: Self-learning, 3D design, equipment integration, independent knowledge updates
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const HelperAITypeSchema = z.enum([
  "writing_assistant",
  "editor",
  "formatter",
  "researcher",
  "multi_tool",
] as const);

const ContentTypeSchema = z.enum([
  "article",
  "blog_post",
  "book_chapter",
  "poem",
  "script",
  "email",
  "social_media",
  "newsletter",
  "product_description",
  "other",
] as const);

const EditingTaskSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  type: z.enum([
    "grammar",
    "spelling",
    "punctuation",
    "clarity",
    "tone",
    "structure",
    "flow",
    "consistency",
  ] as const),
  originalText: z.string(),
  suggestedText: z.string(),
  explanation: z.string(),
  accepted: z.boolean().optional(),
});

const FormattingOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  format: z.enum([
    "markdown",
    "html",
    "plain_text",
    "rich_text",
    "latex",
    "pdf",
    "epub",
    "docx",
  ] as const),
  preview: z.string(),
});

const WritingAssistanceSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  contentType: ContentTypeSchema,
  title: z.string(),
  outline: z.array(z.string()).optional(),
  suggestions: z.array(z.string()),
  wordCount: z.number(),
  readabilityScore: z.number().min(0).max(100),
  estimatedReadTime: z.number(), // minutes
});

const HelperAIProfileSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  name: z.string(),
  type: HelperAITypeSchema,
  capabilities: z.array(z.string()),
  createdAt: z.date(),
  lastUsed: z.date(),
  usageCount: z.number(),
  contentCreated: z.number(),
  wordsProcessed: z.number(),
});

const WebSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  source: z.string(),
  date: z.date().optional(),
  relevance: z.number().min(0).max(100),
});

const ResearchProjectSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  topic: z.string(),
  query: z.string(),
  results: z.array(WebSearchResultSchema),
  notes: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// TYPES
// ============================================================================

type HelperAIType = z.infer<typeof HelperAITypeSchema>;
type ContentType = z.infer<typeof ContentTypeSchema>;
type EditingTask = z.infer<typeof EditingTaskSchema>;
type FormattingOption = z.infer<typeof FormattingOptionSchema>;
type WritingAssistance = z.infer<typeof WritingAssistanceSchema>;
type HelperAIProfile = z.infer<typeof HelperAIProfileSchema>;
type WebSearchResult = z.infer<typeof WebSearchResultSchema>;
type ResearchProject = z.infer<typeof ResearchProjectSchema>;

// ============================================================================
// TIER 2 HELPER AI SYSTEM
// ============================================================================

export class Tier2HelperAI {
  private profiles: Map<string, HelperAIProfile> = new Map();
  private writingAssistance: Map<string, WritingAssistance> = new Map();
  private editingTasks: Map<string, EditingTask> = new Map();
  private researchProjects: Map<string, ResearchProject> = new Map();

  /**
   * Create helper AI profile for creator
   */
  createHelperAI(
    creatorId: string,
    name: string,
    type: HelperAIType
  ): HelperAIProfile {
    const profile: HelperAIProfile = {
      id: `helper-${Date.now()}`,
      creatorId,
      name,
      type,
      capabilities: this.getCapabilitiesForType(type),
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      contentCreated: 0,
      wordsProcessed: 0,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Get capabilities for helper AI type
   */
  private getCapabilitiesForType(type: HelperAIType): string[] {
    const capabilityMap: Record<HelperAIType, string[]> = {
      writing_assistant: [
        "outline_generation",
        "writing_suggestions",
        "tone_adjustment",
        "structure_improvement",
        "web_search",
        "research_assistance",
      ],
      editor: [
        "grammar_checking",
        "spelling_correction",
        "punctuation_fixing",
        "clarity_improvement",
        "consistency_checking",
        "style_suggestions",
      ],
      formatter: [
        "markdown_formatting",
        "html_conversion",
        "pdf_generation",
        "epub_creation",
        "docx_export",
        "style_templates",
      ],
      researcher: [
        "web_search",
        "source_finding",
        "fact_checking",
        "citation_generation",
        "research_organization",
        "note_taking",
      ],
      multi_tool: [
        "writing_assistance",
        "editing",
        "formatting",
        "web_search",
        "research",
        "tone_adjustment",
        "structure_improvement",
      ],
    };

    return capabilityMap[type] || [];
  }

  /**
   * Generate writing assistance for content
   */
  generateWritingAssistance(
    creatorId: string,
    contentType: ContentType,
    title: string,
    topic: string
  ): WritingAssistance {
    const outline = this.generateOutline(topic, contentType);
    const suggestions = this.generateWritingSuggestions(topic, contentType);
    const wordCount = this.estimateWordCount(contentType);
    const readabilityScore = this.calculateReadabilityScore(suggestions);

    const assistance: WritingAssistance = {
      id: `assist-${Date.now()}`,
      creatorId,
      contentType,
      title,
      outline,
      suggestions,
      wordCount,
      readabilityScore,
      estimatedReadTime: Math.ceil(wordCount / 200), // Average reading speed
    };

    this.writingAssistance.set(assistance.id, assistance);

    // Update profile
    const profile = Array.from(this.profiles.values()).find(
      (p) => p.creatorId === creatorId
    );
    if (profile) {
      profile.contentCreated++;
      profile.wordsProcessed += wordCount;
      profile.lastUsed = new Date();
    }

    return assistance;
  }

  /**
   * Generate content outline
   */
  private generateOutline(topic: string, contentType: ContentType): string[] {
    const outlineMap: Record<ContentType, string[]> = {
      article: [
        "Introduction",
        "Background",
        "Main Points",
        "Analysis",
        "Conclusion",
      ],
      blog_post: [
        "Hook",
        "Problem Statement",
        "Solution",
        "Benefits",
        "Call to Action",
      ],
      book_chapter: [
        "Chapter Introduction",
        "Key Concepts",
        "Examples",
        "Deep Dive",
        "Chapter Summary",
      ],
      poem: ["Opening", "Development", "Climax", "Resolution", "Closing"],
      script: ["Scene Setup", "Dialogue", "Action", "Conflict", "Resolution"],
      email: ["Subject", "Greeting", "Body", "Call to Action", "Signature"],
      social_media: [
        "Hook",
        "Value Proposition",
        "Engagement",
        "Call to Action",
      ],
      newsletter: [
        "Header",
        "Main Story",
        "Supporting Stories",
        "Resources",
        "Sign-off",
      ],
      product_description: [
        "Product Name",
        "Key Features",
        "Benefits",
        "Use Cases",
        "Call to Action",
      ],
      other: ["Introduction", "Main Content", "Details", "Conclusion"],
    };

    return outlineMap[contentType] || [];
  }

  /**
   * Generate writing suggestions
   */
  private generateWritingSuggestions(
    topic: string,
    contentType: ContentType
  ): string[] {
    const suggestions = [
      "Start with a compelling hook to engage readers",
      "Use clear, concise language",
      "Include relevant examples and case studies",
      "Break content into short paragraphs",
      "Use subheadings for organization",
      "Include a clear call to action",
      "Proofread for grammar and spelling",
      "Verify facts with reliable sources",
    ];

    return suggestions;
  }

  /**
   * Estimate word count for content type
   */
  private estimateWordCount(contentType: ContentType): number {
    const wordCountMap: Record<ContentType, number> = {
      article: 1500,
      blog_post: 800,
      book_chapter: 3000,
      poem: 300,
      script: 2000,
      email: 200,
      social_media: 100,
      newsletter: 1000,
      product_description: 500,
      other: 1000,
    };

    return wordCountMap[contentType] || 1000;
  }

  /**
   * Calculate readability score
   */
  private calculateReadabilityScore(suggestions: string[]): number {
    // Simple scoring: more suggestions = lower score
    return Math.max(60, 100 - suggestions.length * 5);
  }

  /**
   * Perform editing task
   */
  performEditing(
    contentId: string,
    originalText: string,
    editType: EditingTask["type"]
  ): EditingTask {
    const suggestedText = this.suggestEdit(originalText, editType);
    const explanation = this.getEditExplanation(editType);

    const task: EditingTask = {
      id: `edit-${Date.now()}`,
      contentId,
      type: editType,
      originalText,
      suggestedText,
      explanation,
    };

    this.editingTasks.set(task.id, task);
    return task;
  }

  /**
   * Suggest edit based on type
   */
  private suggestEdit(text: string, editType: EditingTask["type"]): string {
    // Simplified editing suggestions
    const editMap: Record<EditingTask["type"], (text: string) => string> = {
      grammar: (t) => t.replace(/\b(is|are)\s+(very\s+)?/g, ""),
      spelling: (t) => t,
      punctuation: (t) => t.replace(/\s+([.,!?])/g, "$1"),
      clarity: (t) => t.replace(/\b(very|really|quite)\s+/g, ""),
      tone: (t) => t,
      structure: (t) => t,
      flow: (t) => t,
      consistency: (t) => t,
    };

    return editMap[editType](text);
  }

  /**
   * Get edit explanation
   */
  private getEditExplanation(editType: EditingTask["type"]): string {
    const explanationMap: Record<EditingTask["type"], string> = {
      grammar: "Corrected grammatical errors for proper sentence structure",
      spelling: "Fixed spelling mistakes",
      punctuation: "Adjusted punctuation for clarity",
      clarity: "Removed redundant words to improve clarity",
      tone: "Adjusted tone to match intended voice",
      structure: "Reorganized content for better flow",
      flow: "Improved transitions between sentences",
      consistency: "Made terminology and style consistent",
    };

    return explanationMap[editType];
  }

  /**
   * Get formatting options
   */
  getFormattingOptions(): FormattingOption[] {
    return [
      {
        id: "fmt-1",
        name: "Markdown",
        description: "Clean, readable markdown format",
        format: "markdown",
        preview: "# Heading\n\nParagraph text...",
      },
      {
        id: "fmt-2",
        name: "HTML",
        description: "Web-ready HTML format",
        format: "html",
        preview: "<h1>Heading</h1>\n<p>Paragraph text...</p>",
      },
      {
        id: "fmt-3",
        name: "PDF",
        description: "Professional PDF document",
        format: "pdf",
        preview: "[PDF Preview]",
      },
      {
        id: "fmt-4",
        name: "EPUB",
        description: "E-book format for readers",
        format: "epub",
        preview: "[EPUB Preview]",
      },
      {
        id: "fmt-5",
        name: "DOCX",
        description: "Microsoft Word document",
        format: "docx",
        preview: "[DOCX Preview]",
      },
    ];
  }

  /**
   * Create research project
   */
  createResearchProject(
    creatorId: string,
    topic: string,
    query: string
  ): ResearchProject {
    const project: ResearchProject = {
      id: `research-${Date.now()}`,
      creatorId,
      topic,
      query,
      results: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.researchProjects.set(project.id, project);
    return project;
  }

  /**
   * Add research results
   */
  addResearchResults(
    projectId: string,
    results: WebSearchResult[]
  ): ResearchProject | null {
    const project = this.researchProjects.get(projectId);
    if (!project) return null;

    project.results.push(...results);
    project.updatedAt = new Date();

    return project;
  }

  /**
   * Add research note
   */
  addResearchNote(projectId: string, note: string): ResearchProject | null {
    const project = this.researchProjects.get(projectId);
    if (!project) return null;

    project.notes.push(note);
    project.updatedAt = new Date();

    return project;
  }

  /**
   * Get helper AI profile
   */
  getProfile(profileId: string): HelperAIProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * Get creator's helper AIs
   */
  getCreatorHelpers(creatorId: string): HelperAIProfile[] {
    return Array.from(this.profiles.values()).filter(
      (p) => p.creatorId === creatorId
    );
  }

  /**
   * Get writing assistance
   */
  getWritingAssistance(assistanceId: string): WritingAssistance | null {
    return this.writingAssistance.get(assistanceId) || null;
  }

  /**
   * Get editing task
   */
  getEditingTask(taskId: string): EditingTask | null {
    return this.editingTasks.get(taskId) || null;
  }

  /**
   * Get research project
   */
  getResearchProject(projectId: string): ResearchProject | null {
    return this.researchProjects.get(projectId) || null;
  }

  /**
   * Get creator statistics
   */
  getCreatorStatistics(creatorId: string) {
    const helpers = this.getCreatorHelpers(creatorId);
    const totalContentCreated = helpers.reduce((sum, h) => sum + h.contentCreated, 0);
    const totalWordsProcessed = helpers.reduce((sum, h) => sum + h.wordsProcessed, 0);
    const totalUsage = helpers.reduce((sum, h) => sum + h.usageCount, 0);

    return {
      creatorId,
      helperCount: helpers.length,
      totalContentCreated,
      totalWordsProcessed,
      totalUsage,
      helpers: helpers.map((h) => ({
        id: h.id,
        name: h.name,
        type: h.type,
        contentCreated: h.contentCreated,
        wordsProcessed: h.wordsProcessed,
      })),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  HelperAITypeSchema,
  ContentTypeSchema,
  EditingTaskSchema,
  FormattingOptionSchema,
  WritingAssistanceSchema,
  HelperAIProfileSchema,
  WebSearchResultSchema,
  ResearchProjectSchema,
};

export type {
  HelperAIType,
  ContentType,
  EditingTask,
  FormattingOption,
  WritingAssistance,
  HelperAIProfile,
  WebSearchResult,
  ResearchProject,
};
