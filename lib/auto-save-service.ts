/**
 * Auto-Save Service for Content Creators
 * Automatically saves content drafts and provides version history
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface DraftVersion {
  id: string;
  creatorId: string;
  contentId: string;
  contentType: "video" | "audio" | "text" | "image" | "3d";
  content: Record<string, any>;
  savedAt: number;
  autoSaved: boolean;
  description?: string;
}

export interface ContentDraft {
  id: string;
  creatorId: string;
  title: string;
  contentType: "video" | "audio" | "text" | "image" | "3d";
  content: Record<string, any>;
  versions: DraftVersion[];
  lastSavedAt: number;
  lastAutoSaveAt?: number;
  isDirty: boolean;
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
}

export interface SaveResult {
  success: boolean;
  draftId: string;
  versionId: string;
  savedAt: number;
  message?: string;
}

// ============================================================================
// AUTO-SAVE SERVICE
// ============================================================================

class AutoSaveService {
  private drafts: Map<string, ContentDraft> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private readonly MAX_VERSIONS = 50;

  /**
   * Create or get a draft
   */
  createDraft(
    creatorId: string,
    title: string,
    contentType: "video" | "audio" | "text" | "image" | "3d",
    initialContent?: Record<string, any>
  ): ContentDraft {
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const initialVersion: DraftVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      creatorId,
      contentId: draftId,
      contentType,
      content: initialContent || {},
      savedAt: Date.now(),
      autoSaved: false,
      description: "Initial version",
    };

    const draft: ContentDraft = {
      id: draftId,
      creatorId,
      title,
      contentType,
      content: initialContent || {},
      versions: [initialVersion],
      lastSavedAt: Date.now(),
      isDirty: false,
      autoSaveEnabled: true,
      autoSaveIntervalMs: this.DEFAULT_AUTO_SAVE_INTERVAL,
    };

    this.drafts.set(draftId, draft);
    this.startAutoSave(draftId);

    return draft;
  }

  /**
   * Update draft content
   */
  updateDraftContent(draftId: string, content: Record<string, any>): void {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    draft.content = content;
    draft.isDirty = true;
  }

  /**
   * Manually save draft
   */
  saveDraft(draftId: string, description?: string): SaveResult {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    const version: DraftVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      creatorId: draft.creatorId,
      contentId: draftId,
      contentType: draft.contentType,
      content: { ...draft.content },
      savedAt: Date.now(),
      autoSaved: false,
      description,
    };

    draft.versions.push(version);
    draft.lastSavedAt = Date.now();
    draft.isDirty = false;

    // Keep only last MAX_VERSIONS
    if (draft.versions.length > this.MAX_VERSIONS) {
      draft.versions = draft.versions.slice(-this.MAX_VERSIONS);
    }

    return {
      success: true,
      draftId,
      versionId: version.id,
      savedAt: version.savedAt,
      message: `Draft saved successfully at ${new Date(version.savedAt).toLocaleTimeString()}`,
    };
  }

  /**
   * Auto-save draft (internal)
   */
  private autoSaveDraft(draftId: string): SaveResult {
    const draft = this.drafts.get(draftId);
    if (!draft || !draft.isDirty) {
      return {
        success: false,
        draftId,
        versionId: "",
        savedAt: Date.now(),
        message: "No changes to auto-save",
      };
    }

    const version: DraftVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      creatorId: draft.creatorId,
      contentId: draftId,
      contentType: draft.contentType,
      content: { ...draft.content },
      savedAt: Date.now(),
      autoSaved: true,
    };

    draft.versions.push(version);
    draft.lastAutoSaveAt = Date.now();
    draft.isDirty = false;

    // Keep only last MAX_VERSIONS
    if (draft.versions.length > this.MAX_VERSIONS) {
      draft.versions = draft.versions.slice(-this.MAX_VERSIONS);
    }

    return {
      success: true,
      draftId,
      versionId: version.id,
      savedAt: version.savedAt,
      message: `Auto-saved at ${new Date(version.savedAt).toLocaleTimeString()}`,
    };
  }

  /**
   * Start auto-save timer for draft
   */
  private startAutoSave(draftId: string): void {
    const draft = this.drafts.get(draftId);
    if (!draft) return;

    // Clear existing timer if any
    const existingTimer = this.autoSaveTimers.get(draftId);
    if (existingTimer) clearInterval(existingTimer);

    // Set up new auto-save timer
    if (draft.autoSaveEnabled) {
      const timer = setInterval(() => {
        this.autoSaveDraft(draftId);
      }, draft.autoSaveIntervalMs) as unknown as NodeJS.Timeout;

      this.autoSaveTimers.set(draftId, timer);
    }
  }

  /**
   * Stop auto-save for draft
   */
  stopAutoSave(draftId: string): void {
    const timer = this.autoSaveTimers.get(draftId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(draftId);
    }
  }

  /**
   * Enable/disable auto-save
   */
  setAutoSaveEnabled(draftId: string, enabled: boolean): void {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    draft.autoSaveEnabled = enabled;

    if (enabled) {
      this.startAutoSave(draftId);
    } else {
      this.stopAutoSave(draftId);
    }
  }

  /**
   * Set auto-save interval
   */
  setAutoSaveInterval(draftId: string, intervalMs: number): void {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    draft.autoSaveIntervalMs = intervalMs;

    // Restart timer with new interval
    if (draft.autoSaveEnabled) {
      this.stopAutoSave(draftId);
      this.startAutoSave(draftId);
    }
  }

  /**
   * Get draft
   */
  getDraft(draftId: string): ContentDraft | undefined {
    return this.drafts.get(draftId);
  }

  /**
   * Get all drafts for creator
   */
  getCreatorDrafts(creatorId: string): ContentDraft[] {
    return Array.from(this.drafts.values()).filter((d) => d.creatorId === creatorId);
  }

  /**
   * Get draft versions
   */
  getDraftVersions(draftId: string): DraftVersion[] {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    return draft.versions;
  }

  /**
   * Get specific version
   */
  getVersion(draftId: string, versionId: string): DraftVersion | undefined {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    return draft.versions.find((v) => v.id === versionId);
  }

  /**
   * Restore to version
   */
  restoreToVersion(draftId: string, versionId: string): SaveResult {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found`);

    const version = draft.versions.find((v) => v.id === versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);

    // Create new version from restored content
    const restoredVersion: DraftVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      creatorId: draft.creatorId,
      contentId: draftId,
      contentType: draft.contentType,
      content: { ...version.content },
      savedAt: Date.now(),
      autoSaved: false,
      description: `Restored from version ${versionId}`,
    };

    draft.content = { ...version.content };
    draft.versions.push(restoredVersion);
    draft.lastSavedAt = Date.now();
    draft.isDirty = false;

    return {
      success: true,
      draftId,
      versionId: restoredVersion.id,
      savedAt: restoredVersion.savedAt,
      message: `Restored to version from ${new Date(version.savedAt).toLocaleTimeString()}`,
    };
  }

  /**
   * Delete draft
   */
  deleteDraft(draftId: string): boolean {
    this.stopAutoSave(draftId);
    return this.drafts.delete(draftId);
  }

  /**
   * Get draft status
   */
  getDraftStatus(draftId: string): { isDirty: boolean; lastSavedAt: number; lastAutoSaveAt?: number } | null {
    const draft = this.drafts.get(draftId);
    if (!draft) return null;

    return {
      isDirty: draft.isDirty,
      lastSavedAt: draft.lastSavedAt,
      lastAutoSaveAt: draft.lastAutoSaveAt,
    };
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    // Clear all timers
    Array.from(this.autoSaveTimers.values()).forEach((timer) => clearInterval(timer));
    this.autoSaveTimers.clear();

    // Clear all drafts
    this.drafts.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let autoSaveInstance: AutoSaveService | null = null;

export function getAutoSaveService(): AutoSaveService {
  if (!autoSaveInstance) {
    autoSaveInstance = new AutoSaveService();
  }
  return autoSaveInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAutoSaveService(): void {
  if (autoSaveInstance) {
    autoSaveInstance.reset();
  }
  autoSaveInstance = null;
}

export default AutoSaveService;
