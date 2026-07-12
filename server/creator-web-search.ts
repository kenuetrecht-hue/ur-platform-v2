/**
 * Creator Web Search Integration
 * Web search capabilities for Tier 2 Helper AI to assist content creators
 * Provides research, fact-checking, and source discovery
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  source: z.string(),
  domain: z.string(),
  date: z.date().optional(),
  relevance: z.number().min(0).max(100),
  credibility: z.number().min(0).max(100),
  type: z.enum(["news", "article", "academic", "blog", "video", "other"] as const),
});

const SearchQuerySchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  helperAIId: z.string(),
  query: z.string(),
  category: z.string(),
  timestamp: z.date(),
  results: z.array(SearchResultSchema),
  resultCount: z.number(),
});

const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  credibilityScore: z.number().min(0).max(100),
  category: z.enum([
    "news",
    "academic",
    "government",
    "industry",
    "blog",
    "social",
    "other",
  ] as const),
  isVerified: z.boolean(),
  lastChecked: z.date(),
});

const FactCheckSchema = z.object({
  id: z.string(),
  claim: z.string(),
  status: z.enum(["verified", "partially_verified", "unverified", "false"] as const),
  sources: z.array(SourceSchema),
  explanation: z.string(),
  confidence: z.number().min(0).max(100),
  timestamp: z.date(),
});

const ResearchCollectionSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  title: z.string(),
  topic: z.string(),
  searches: z.array(SearchQuerySchema),
  sources: z.array(SourceSchema),
  factChecks: z.array(FactCheckSchema),
  notes: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const CitationSchema = z.object({
  id: z.string(),
  source: SourceSchema,
  text: z.string(),
  citationStyle: z.enum(["APA", "MLA", "Chicago", "Harvard"] as const),
  formattedCitation: z.string(),
});

const SearchHistorySchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  searches: z.array(SearchQuerySchema),
  totalSearches: z.number(),
  lastSearch: z.date(),
  favoriteTopics: z.array(z.string()),
});

// ============================================================================
// TYPES
// ============================================================================

type SearchResult = z.infer<typeof SearchResultSchema>;
type SearchQuery = z.infer<typeof SearchQuerySchema>;
type Source = z.infer<typeof SourceSchema>;
type FactCheck = z.infer<typeof FactCheckSchema>;
type ResearchCollection = z.infer<typeof ResearchCollectionSchema>;
type Citation = z.infer<typeof CitationSchema>;
type SearchHistory = z.infer<typeof SearchHistorySchema>;

// ============================================================================
// CREATOR WEB SEARCH SYSTEM
// ============================================================================

export class CreatorWebSearch {
  private searchQueries: Map<string, SearchQuery> = new Map();
  private researchCollections: Map<string, ResearchCollection> = new Map();
  private sources: Map<string, Source> = new Map();
  private factChecks: Map<string, FactCheck> = new Map();
  private searchHistory: Map<string, SearchHistory> = new Map();
  private citations: Map<string, Citation> = new Map();

  constructor() {
    this.initializeTrustedSources();
  }

  /**
   * Initialize trusted sources database
   */
  private initializeTrustedSources(): void {
    const trustedSources: Source[] = [
      {
        id: "src-1",
        name: "Reuters",
        domain: "reuters.com",
        credibilityScore: 95,
        category: "news",
        isVerified: true,
        lastChecked: new Date(),
      },
      {
        id: "src-2",
        name: "Associated Press",
        domain: "apnews.com",
        credibilityScore: 95,
        category: "news",
        isVerified: true,
        lastChecked: new Date(),
      },
      {
        id: "src-3",
        name: "BBC",
        domain: "bbc.com",
        credibilityScore: 93,
        category: "news",
        isVerified: true,
        lastChecked: new Date(),
      },
      {
        id: "src-4",
        name: "Nature",
        domain: "nature.com",
        credibilityScore: 98,
        category: "academic",
        isVerified: true,
        lastChecked: new Date(),
      },
      {
        id: "src-5",
        name: "Science Direct",
        domain: "sciencedirect.com",
        credibilityScore: 96,
        category: "academic",
        isVerified: true,
        lastChecked: new Date(),
      },
      {
        id: "src-6",
        name: "Government.gov",
        domain: "gov",
        credibilityScore: 98,
        category: "government",
        isVerified: true,
        lastChecked: new Date(),
      },
    ];

    trustedSources.forEach((s) => this.sources.set(s.id, s));
  }

  /**
   * Perform web search
   */
  performSearch(
    creatorId: string,
    helperAIId: string,
    query: string,
    category: string
  ): SearchQuery {
    // Simulate search results
    const mockResults: SearchResult[] = this.generateMockResults(query, category);

    const searchQuery: SearchQuery = {
      id: `search-${Date.now()}`,
      creatorId,
      helperAIId,
      query,
      category,
      timestamp: new Date(),
      results: mockResults,
      resultCount: mockResults.length,
    };

    this.searchQueries.set(searchQuery.id, searchQuery);

    // Update search history
    this.updateSearchHistory(creatorId, searchQuery);

    return searchQuery;
  }

  /**
   * Generate mock search results
   */
  private generateMockResults(query: string, category: string): SearchResult[] {
    const results: SearchResult[] = [
      {
        id: "result-1",
        title: `${query} - Latest Information`,
        url: `https://example.com/${query.replace(/\s+/g, "-")}`,
        snippet: `Learn about ${query}. This comprehensive guide covers everything you need to know.`,
        source: "Example News",
        domain: "example.com",
        date: new Date(),
        relevance: 95,
        credibility: 90,
        type: "article",
      },
      {
        id: "result-2",
        title: `Understanding ${query}`,
        url: `https://research.example.com/${query.replace(/\s+/g, "-")}`,
        snippet: `Academic research on ${query}. Peer-reviewed study with detailed analysis.`,
        source: "Research Institute",
        domain: "research.example.com",
        date: new Date(),
        relevance: 88,
        credibility: 95,
        type: "academic",
      },
      {
        id: "result-3",
        title: `${query} Guide for Beginners`,
        url: `https://blog.example.com/${query.replace(/\s+/g, "-")}`,
        snippet: `A beginner's guide to ${query}. Step-by-step instructions and tips.`,
        source: "Example Blog",
        domain: "blog.example.com",
        date: new Date(),
        relevance: 82,
        credibility: 75,
        type: "blog",
      },
    ];

    return results;
  }

  /**
   * Update search history
   */
  private updateSearchHistory(
    creatorId: string,
    searchQuery: SearchQuery
  ): void {
    let history = this.searchHistory.get(creatorId);

    if (!history) {
      history = {
        id: `history-${creatorId}`,
        creatorId,
        searches: [],
        totalSearches: 0,
        lastSearch: new Date(),
        favoriteTopics: [],
      };
      this.searchHistory.set(creatorId, history);
    }

    history.searches.push(searchQuery);
    history.totalSearches++;
    history.lastSearch = new Date();

    // Track favorite topics
    if (!history.favoriteTopics.includes(searchQuery.category)) {
      history.favoriteTopics.push(searchQuery.category);
    }
  }

  /**
   * Fact-check a claim
   */
  factCheckClaim(claim: string): FactCheck {
    const sources = Array.from(this.sources.values()).slice(0, 3);
    const status: FactCheck["status"] = this.determineFactCheckStatus(claim);
    const confidence = Math.floor(Math.random() * 40) + 60; // 60-100

    const factCheck: FactCheck = {
      id: `factcheck-${Date.now()}`,
      claim,
      status,
      sources,
      explanation: this.generateFactCheckExplanation(claim, status),
      confidence,
      timestamp: new Date(),
    };

    this.factChecks.set(factCheck.id, factCheck);
    return factCheck;
  }

  /**
   * Determine fact check status
   */
  private determineFactCheckStatus(
    claim: string
  ): FactCheck["status"] {
    // Simplified logic
    const lowerClaim = claim.toLowerCase();
    if (
      lowerClaim.includes("false") ||
      lowerClaim.includes("incorrect") ||
      lowerClaim.includes("wrong")
    ) {
      return "false";
    }
    if (lowerClaim.includes("partially")) {
      return "partially_verified";
    }
    if (lowerClaim.includes("verified") || lowerClaim.includes("true")) {
      return "verified";
    }
    return "unverified";
  }

  /**
   * Generate fact check explanation
   */
  private generateFactCheckExplanation(
    claim: string,
    status: FactCheck["status"]
  ): string {
    const explanations: Record<FactCheck["status"], string> = {
      verified: `The claim "${claim}" has been verified by multiple reliable sources.`,
      partially_verified: `The claim "${claim}" is partially accurate. Some aspects are verified while others need clarification.`,
      unverified: `The claim "${claim}" could not be verified with current available sources.`,
      false: `The claim "${claim}" has been determined to be false based on reliable sources.`,
    };

    return explanations[status];
  }

  /**
   * Create research collection
   */
  createResearchCollection(
    creatorId: string,
    title: string,
    topic: string
  ): ResearchCollection {
    const collection: ResearchCollection = {
      id: `collection-${Date.now()}`,
      creatorId,
      title,
      topic,
      searches: [],
      sources: [],
      factChecks: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.researchCollections.set(collection.id, collection);
    return collection;
  }

  /**
   * Add search to collection
   */
  addSearchToCollection(
    collectionId: string,
    searchQuery: SearchQuery
  ): ResearchCollection | null {
    const collection = this.researchCollections.get(collectionId);
    if (!collection) return null;

    collection.searches.push(searchQuery);
    collection.updatedAt = new Date();

    return collection;
  }

  /**
   * Add note to collection
   */
  addNoteToCollection(
    collectionId: string,
    note: string
  ): ResearchCollection | null {
    const collection = this.researchCollections.get(collectionId);
    if (!collection) return null;

    collection.notes.push(note);
    collection.updatedAt = new Date();

    return collection;
  }

  /**
   * Generate citation
   */
  generateCitation(
    source: Source,
    text: string,
    style: Citation["citationStyle"]
  ): Citation {
    const formattedCitation = this.formatCitation(source, style);

    const citation: Citation = {
      id: `citation-${Date.now()}`,
      source,
      text,
      citationStyle: style,
      formattedCitation,
    };

    this.citations.set(citation.id, citation);
    return citation;
  }

  /**
   * Format citation
   */
  private formatCitation(source: Source, style: Citation["citationStyle"]): string {
    const styleMap: Record<Citation["citationStyle"], string> = {
      APA: `${source.name}. (${new Date().getFullYear()}). Retrieved from ${source.domain}`,
      MLA: `"${source.name}." ${source.domain}, ${new Date().getFullYear()}.`,
      Chicago: `${source.name}. Accessed ${new Date().toLocaleDateString()}. ${source.domain}.`,
      Harvard: `${source.name}, ${new Date().getFullYear()}. Available at: ${source.domain}`,
    };

    return styleMap[style];
  }

  /**
   * Get search query
   */
  getSearchQuery(queryId: string): SearchQuery | null {
    return this.searchQueries.get(queryId) || null;
  }

  /**
   * Get research collection
   */
  getResearchCollection(collectionId: string): ResearchCollection | null {
    return this.researchCollections.get(collectionId) || null;
  }

  /**
   * Get creator search history
   */
  getSearchHistory(creatorId: string): SearchHistory | null {
    return this.searchHistory.get(creatorId) || null;
  }

  /**
   * Get fact check
   */
  getFactCheck(factCheckId: string): FactCheck | null {
    return this.factChecks.get(factCheckId) || null;
  }

  /**
   * Get trusted sources
   */
  getTrustedSources(): Source[] {
    return Array.from(this.sources.values()).filter((s) => s.isVerified);
  }

  /**
   * Get all sources
   */
  getAllSources(): Source[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get creator's research collections
   */
  getCreatorCollections(creatorId: string): ResearchCollection[] {
    return Array.from(this.researchCollections.values()).filter(
      (c) => c.creatorId === creatorId
    );
  }

  /**
   * Get statistics
   */
  getStatistics(creatorId: string) {
    const history = this.getSearchHistory(creatorId);
    const collections = this.getCreatorCollections(creatorId);

    return {
      creatorId,
      totalSearches: history?.totalSearches || 0,
      collectionsCreated: collections.length,
      favoriteTopics: history?.favoriteTopics || [],
      lastSearch: history?.lastSearch || null,
      totalCollectionSearches: collections.reduce(
        (sum, c) => sum + c.searches.length,
        0
      ),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SearchResultSchema,
  SearchQuerySchema,
  SourceSchema,
  FactCheckSchema,
  ResearchCollectionSchema,
  CitationSchema,
  SearchHistorySchema,
};

export type {
  SearchResult,
  SearchQuery,
  Source,
  FactCheck,
  ResearchCollection,
  Citation,
  SearchHistory,
};
