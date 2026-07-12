/**
 * Unified Asset Library Service
 * Centralized management of all media assets across formats
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type AssetType = "video" | "audio" | "image" | "text" | "3d" | "document" | "template";
export type AssetStatus = "draft" | "processing" | "ready" | "archived" | "deleted";

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  fileSize?: number;
  resolution?: string;
  fps?: number;
  sampleRate?: number;
  channels?: number;
  colorSpace?: string;
  codec?: string;
  [key: string]: any;
}

export interface Asset {
  id: string;
  creatorId: string;
  name: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;
  fileUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  metadata: AssetMetadata;
  tags: string[];
  categories: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  isPublic: boolean;
  isFavorite: boolean;
  duration?: number;
  fileSize?: number;
}

export interface AssetCollection {
  id: string;
  creatorId: string;
  name: string;
  description?: string;
  assets: Asset[];
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
}

export interface AssetSearchParams {
  creatorId: string;
  type?: AssetType;
  status?: AssetStatus;
  tags?: string[];
  categories?: string[];
  searchTerm?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// UNIFIED ASSET LIBRARY SERVICE
// ============================================================================

class UnifiedAssetLibrary {
  private assets: Map<string, Asset> = new Map();
  private collections: Map<string, AssetCollection> = new Map();
  private assetsByCreator: Map<string, Set<string>> = new Map();
  private assetsByType: Map<AssetType, Set<string>> = new Map();

  /**
   * Upload asset
   */
  uploadAsset(
    creatorId: string,
    name: string,
    type: AssetType,
    fileUrl: string,
    metadata?: AssetMetadata,
    tags?: string[],
    categories?: string[]
  ): Asset {
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const asset: Asset = {
      id: assetId,
      creatorId,
      name,
      description: undefined,
      type,
      status: "processing",
      fileUrl,
      metadata: metadata || {},
      tags: tags || [],
      categories: categories || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      isPublic: false,
      isFavorite: false,
    };

    this.assets.set(assetId, asset);

    // Track by creator
    if (!this.assetsByCreator.has(creatorId)) {
      this.assetsByCreator.set(creatorId, new Set());
    }
    this.assetsByCreator.get(creatorId)!.add(assetId);

    // Track by type
    if (!this.assetsByType.has(type)) {
      this.assetsByType.set(type, new Set());
    }
    this.assetsByType.get(type)!.add(assetId);

    return asset;
  }

  /**
   * Get asset
   */
  getAsset(assetId: string): Asset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Update asset metadata
   */
  updateAsset(
    assetId: string,
    updates: Partial<Omit<Asset, "id" | "creatorId" | "createdAt">>
  ): Asset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    const updated = {
      ...asset,
      ...updates,
      updatedAt: Date.now(),
    };

    this.assets.set(assetId, updated);
    return updated;
  }

  /**
   * Mark asset as ready
   */
  markAssetReady(assetId: string, thumbnailUrl?: string, previewUrl?: string): Asset | undefined {
    return this.updateAsset(assetId, {
      status: "ready",
      thumbnailUrl,
      previewUrl,
    });
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(assetId: string): Asset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    return this.updateAsset(assetId, {
      isFavorite: !asset.isFavorite,
    });
  }

  /**
   * Toggle public
   */
  togglePublic(assetId: string): Asset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    return this.updateAsset(assetId, {
      isPublic: !asset.isPublic,
    });
  }

  /**
   * Add tags to asset
   */
  addTags(assetId: string, tags: string[]): Asset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    const newTags = Array.from(new Set([...asset.tags, ...tags]));
    return this.updateAsset(assetId, { tags: newTags });
  }

  /**
   * Remove tags from asset
   */
  removeTags(assetId: string, tags: string[]): Asset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    const newTags = asset.tags.filter((t) => !tags.includes(t));
    return this.updateAsset(assetId, { tags: newTags });
  }

  /**
   * Search assets
   */
  searchAssets(params: AssetSearchParams): Asset[] {
    let results = Array.from(this.assets.values()).filter((a) => a.creatorId === params.creatorId);

    if (params.type) {
      results = results.filter((a) => a.type === params.type);
    }

    if (params.status) {
      results = results.filter((a) => a.status === params.status);
    }

    if (params.tags && params.tags.length > 0) {
      results = results.filter((a) => params.tags!.some((t) => a.tags.includes(t)));
    }

    if (params.categories && params.categories.length > 0) {
      results = results.filter((a) => params.categories!.some((c) => a.categories.includes(c)));
    }

    if (params.searchTerm) {
      const term = params.searchTerm.toLowerCase();
      results = results.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.description?.toLowerCase().includes(term) ||
          a.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    if (params.isPublic !== undefined) {
      results = results.filter((a) => a.isPublic === params.isPublic);
    }

    // Sort by most recent first
    results.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get creator assets
   */
  getCreatorAssets(creatorId: string, type?: AssetType): Asset[] {
    const assetIds = this.assetsByCreator.get(creatorId);
    if (!assetIds) return [];

    let assets = Array.from(assetIds).map((id) => this.assets.get(id)!).filter(Boolean);

    if (type) {
      assets = assets.filter((a) => a.type === type);
    }

    return assets.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get assets by type
   */
  getAssetsByType(type: AssetType): Asset[] {
    const assetIds = this.assetsByType.get(type);
    if (!assetIds) return [];

    return Array.from(assetIds)
      .map((id) => this.assets.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Increment usage count
   */
  incrementUsageCount(assetId: string): Asset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    return this.updateAsset(assetId, {
      usageCount: asset.usageCount + 1,
    });
  }

  /**
   * Create collection
   */
  createCollection(
    creatorId: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): AssetCollection {
    const collectionId = `col_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const collection: AssetCollection = {
      id: collectionId,
      creatorId,
      name,
      description,
      assets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic,
    };

    this.collections.set(collectionId, collection);
    return collection;
  }

  /**
   * Add asset to collection
   */
  addToCollection(collectionId: string, assetId: string): AssetCollection | undefined {
    const collection = this.collections.get(collectionId);
    const asset = this.assets.get(assetId);

    if (!collection || !asset) return undefined;

    if (!collection.assets.find((a) => a.id === assetId)) {
      collection.assets.push(asset);
      collection.updatedAt = Date.now();
    }

    return collection;
  }

  /**
   * Remove asset from collection
   */
  removeFromCollection(collectionId: string, assetId: string): AssetCollection | undefined {
    const collection = this.collections.get(collectionId);
    if (!collection) return undefined;

    collection.assets = collection.assets.filter((a) => a.id !== assetId);
    collection.updatedAt = Date.now();

    return collection;
  }

  /**
   * Get collection
   */
  getCollection(collectionId: string): AssetCollection | undefined {
    return this.collections.get(collectionId);
  }

  /**
   * Delete asset
   */
  deleteAsset(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    // Remove from creator tracking
    this.assetsByCreator.get(asset.creatorId)?.delete(assetId);

    // Remove from type tracking
    this.assetsByType.get(asset.type)?.delete(assetId);

    // Remove from collections
    Array.from(this.collections.values()).forEach((col) => {
      col.assets = col.assets.filter((a) => a.id !== assetId);
    });

    return this.assets.delete(assetId);
  }

  /**
   * Get asset statistics
   */
  getAssetStats(creatorId: string): {
    totalAssets: number;
    byType: Record<AssetType, number>;
    totalSize: number;
    favoriteCount: number;
  } {
    const assets = this.getCreatorAssets(creatorId);

    const stats = {
      totalAssets: assets.length,
      byType: {} as Record<AssetType, number>,
      totalSize: 0,
      favoriteCount: 0,
    };

    assets.forEach((asset) => {
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;
      stats.totalSize += asset.fileSize || 0;
      if (asset.isFavorite) stats.favoriteCount++;
    });

    return stats;
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.assets.clear();
    this.collections.clear();
    this.assetsByCreator.clear();
    this.assetsByType.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let assetLibraryInstance: UnifiedAssetLibrary | null = null;

export function getAssetLibrary(): UnifiedAssetLibrary {
  if (!assetLibraryInstance) {
    assetLibraryInstance = new UnifiedAssetLibrary();
  }
  return assetLibraryInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAssetLibrary(): void {
  if (assetLibraryInstance) {
    assetLibraryInstance.reset();
  }
  assetLibraryInstance = null;
}

export default UnifiedAssetLibrary;
