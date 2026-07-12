/**
 * Search & Indexing System
 * Full-text search for discovering creators and content
 * Optimized for millions of documents
 */

export interface SearchDocument {
  id: string;
  type: 'creator' | 'project' | 'content';
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  matches: string[];
}

export class SearchIndex {
  private documents: Map<string, SearchDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map(); // word -> documentIds
  private typeIndex: Map<string, Set<string>> = new Map(); // type -> documentIds
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> documentIds

  /**
   * Index a document
   */
  indexDocument(doc: SearchDocument): void {
    this.documents.set(doc.id, doc);

    // Add to type index
    if (!this.typeIndex.has(doc.type)) {
      this.typeIndex.set(doc.type, new Set());
    }
    this.typeIndex.get(doc.type)!.add(doc.id);

    // Add to tag index
    for (const tag of doc.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(doc.id);
    }

    // Add to inverted index
    const words = this.tokenize(doc.title + ' ' + doc.description);
    for (const word of words) {
      if (!this.invertedIndex.has(word)) {
        this.invertedIndex.set(word, new Set());
      }
      this.invertedIndex.get(word)!.add(doc.id);
    }
  }

  /**
   * Remove document from index
   */
  removeDocument(docId: string): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    this.documents.delete(docId);

    // Remove from type index
    this.typeIndex.get(doc.type)?.delete(docId);

    // Remove from tag index
    for (const tag of doc.tags) {
      this.tagIndex.get(tag)?.delete(docId);
    }

    // Remove from inverted index
    const words = this.tokenize(doc.title + ' ' + doc.description);
    for (const word of words) {
      this.invertedIndex.get(word)?.delete(docId);
    }

    return true;
  }

  /**
   * Search documents
   */
  search(query: string, type?: string, limit: number = 20): SearchResult[] {
    const words = this.tokenize(query);
    const candidates = new Map<string, { score: number; matches: string[] }>();

    // Find documents matching query words
    for (const word of words) {
      const docIds = this.invertedIndex.get(word) || new Set();

      for (const docId of docIds) {
        if (!candidates.has(docId)) {
          candidates.set(docId, { score: 0, matches: [] });
        }

        const candidate = candidates.get(docId)!;
        candidate.score += 1;
        if (!candidate.matches.includes(word)) {
          candidate.matches.push(word);
        }
      }
    }

    // Filter by type if specified
    let results: Array<[string, { score: number; matches: string[] }]> = Array.from(candidates.entries());

    if (type) {
      const typeDocIds = this.typeIndex.get(type) || new Set();
      results = results.filter(([docId]) => typeDocIds.has(docId));
    }

    // Sort by score and convert to SearchResult
    return results
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([docId, { score, matches }]) => ({
        document: this.documents.get(docId)!,
        score,
        matches,
      }));
  }

  /**
   * Search by tag
   */
  searchByTag(tag: string, limit: number = 20): SearchDocument[] {
    const docIds = this.tagIndex.get(tag) || new Set();
    return Array.from(docIds)
      .slice(0, limit)
      .map(docId => this.documents.get(docId)!)
      .filter(doc => doc !== undefined);
  }

  /**
   * Search by type
   */
  searchByType(type: string, limit: number = 20): SearchDocument[] {
    const docIds = this.typeIndex.get(type) || new Set();
    return Array.from(docIds)
      .slice(0, limit)
      .map(docId => this.documents.get(docId)!)
      .filter(doc => doc !== undefined);
  }

  /**
   * Tokenize text for indexing
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalDocuments: this.documents.size,
      totalWords: this.invertedIndex.size,
      totalTags: this.tagIndex.size,
      documentsByType: Object.fromEntries(
        Array.from(this.typeIndex.entries()).map(([type, ids]) => [type, ids.size])
      ),
    };
  }

  /**
   * Clear index
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.typeIndex.clear();
    this.tagIndex.clear();
  }
}

/**
 * Autocomplete Engine
 * Fast suggestions for search queries
 */
export class AutocompleteEngine {
  private trie: TrieNode = new TrieNode();
  private suggestions: Map<string, string[]> = new Map();

  /**
   * Add suggestion
   */
  addSuggestion(text: string): void {
    let node = this.trie;

    for (const char of text.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
      node.count++;
    }

    node.isEnd = true;
  }

  /**
   * Get suggestions
   */
  getSuggestions(prefix: string, limit: number = 10): string[] {
    let node = this.trie;
    const lowerPrefix = prefix.toLowerCase();

    for (const char of lowerPrefix) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }

    return this.collectSuggestions(node, lowerPrefix, limit);
  }

  /**
   * Collect suggestions from trie node
   */
  private collectSuggestions(node: TrieNode, prefix: string, limit: number): string[] {
    const suggestions: string[] = [];
    const stack: Array<[TrieNode, string]> = [[node, prefix]];

    while (stack.length > 0 && suggestions.length < limit) {
      const [currentNode, currentPrefix] = stack.pop()!;

      if (currentNode.isEnd) {
        suggestions.push(currentPrefix);
      }

      for (const [char, childNode] of currentNode.children.entries()) {
        stack.push([childNode, currentPrefix + char]);
      }
    }

    return suggestions;
  }

  /**
   * Clear autocomplete
   */
  clear(): void {
    this.trie = new TrieNode();
  }
}

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
  count: number = 0;
}
