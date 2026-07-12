/**
 * Creator Marketplace Service
 * Enables creators to sell templates, presets, and finished content
 */

export interface MarketplaceItem {
  itemId: string;
  creatorId: string;
  title: string;
  description: string;
  category: 'template' | 'preset' | 'content' | 'effect' | 'music';
  price: number; // in loyalty points
  preview: string; // URL to preview image
  downloads: number;
  rating: number; // 0-5
  reviews: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  sales: number;
  earnings: number;
}

export interface MarketplaceReview {
  reviewId: string;
  itemId: string;
  buyerId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
}

export interface MarketplacePurchase {
  purchaseId: string;
  itemId: string;
  buyerId: string;
  creatorId: string;
  price: number;
  purchasedAt: Date;
  downloadUrl: string;
}

export class CreatorMarketplace {
  private items: Map<string, MarketplaceItem> = new Map();
  private reviews: Map<string, MarketplaceReview[]> = new Map();
  private purchases: Map<string, MarketplacePurchase[]> = new Map();
  private creatorItems: Map<string, string[]> = new Map(); // creatorId -> itemIds
  private userPurchases: Map<string, string[]> = new Map(); // userId -> purchaseIds

  /**
   * List item on marketplace
   */
  listItem(
    creatorId: string,
    title: string,
    description: string,
    category: 'template' | 'preset' | 'content' | 'effect' | 'music',
    price: number,
    preview: string,
    tags: string[] = []
  ): MarketplaceItem {
    const itemId = `item-${Date.now()}-${Math.random()}`;
    const item: MarketplaceItem = {
      itemId,
      creatorId,
      title,
      description,
      category,
      price,
      preview,
      downloads: 0,
      rating: 0,
      reviews: 0,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      sales: 0,
      earnings: 0,
    };

    this.items.set(itemId, item);

    if (!this.creatorItems.has(creatorId)) {
      this.creatorItems.set(creatorId, []);
    }
    this.creatorItems.get(creatorId)!.push(itemId);

    this.reviews.set(itemId, []);

    return item;
  }

  /**
   * Purchase item
   */
  purchaseItem(itemId: string, buyerId: string): MarketplacePurchase {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);
    if (!item.isActive) throw new Error('Item is not available');

    const purchaseId = `purchase-${Date.now()}-${Math.random()}`;
    const purchase: MarketplacePurchase = {
      purchaseId,
      itemId,
      buyerId,
      creatorId: item.creatorId,
      price: item.price,
      purchasedAt: new Date(),
      downloadUrl: `https://marketplace.urplatform.com/download/${purchaseId}`,
    };

    // Update item stats
    item.sales += 1;
    item.earnings += item.price;
    item.downloads += 1;
    item.updatedAt = new Date();

    // Store purchase
    if (!this.purchases.has(itemId)) {
      this.purchases.set(itemId, []);
    }
    this.purchases.get(itemId)!.push(purchase);

    if (!this.userPurchases.has(buyerId)) {
      this.userPurchases.set(buyerId, []);
    }
    this.userPurchases.get(buyerId)!.push(purchaseId);

    return purchase;
  }

  /**
   * Add review to item
   */
  addReview(itemId: string, buyerId: string, rating: number, comment: string): MarketplaceReview {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const reviewId = `review-${Date.now()}-${Math.random()}`;
    const review: MarketplaceReview = {
      reviewId,
      itemId,
      buyerId,
      rating,
      comment,
      createdAt: new Date(),
    };

    const itemReviews = this.reviews.get(itemId) || [];
    itemReviews.push(review);
    this.reviews.set(itemId, itemReviews);

    // Update item rating
    const totalRating = itemReviews.reduce((sum, r) => sum + r.rating, 0);
    item.rating = totalRating / itemReviews.length;
    item.reviews = itemReviews.length;
    item.updatedAt = new Date();

    return review;
  }

  /**
   * Get item details
   */
  getItem(itemId: string): MarketplaceItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Search marketplace
   */
  search(
    query: string,
    category?: string,
    sortBy: 'newest' | 'popular' | 'rating' | 'price' = 'newest'
  ): MarketplaceItem[] {
    let results = Array.from(this.items.values()).filter((item) => item.isActive);

    // Filter by query
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (category) {
      results = results.filter((item) => item.category === category);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'newest':
      default:
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return results;
  }

  /**
   * Get creator's items
   */
  getCreatorItems(creatorId: string): MarketplaceItem[] {
    const itemIds = this.creatorItems.get(creatorId) || [];
    return itemIds
      .map((id) => this.items.get(id))
      .filter((item) => item !== undefined) as MarketplaceItem[];
  }

  /**
   * Get user's purchases
   */
  getUserPurchases(userId: string): MarketplacePurchase[] {
    const purchaseIds = this.userPurchases.get(userId) || [];
    const allPurchases = Array.from(this.purchases.values()).flat();
    return allPurchases.filter((p) => purchaseIds.includes(p.purchaseId));
  }

  /**
   * Get item reviews
   */
  getItemReviews(itemId: string): MarketplaceReview[] {
    return this.reviews.get(itemId) || [];
  }

  /**
   * Get creator earnings
   */
  getCreatorEarnings(creatorId: string): { totalEarnings: number; totalSales: number; items: number } {
    const items = this.getCreatorItems(creatorId);
    const totalEarnings = items.reduce((sum, item) => sum + item.earnings, 0);
    const totalSales = items.reduce((sum, item) => sum + item.sales, 0);

    return {
      totalEarnings,
      totalSales,
      items: items.length,
    };
  }

  /**
   * Update item
   */
  updateItem(itemId: string, updates: Partial<MarketplaceItem>): MarketplaceItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);

    if (updates.title) item.title = updates.title;
    if (updates.description) item.description = updates.description;
    if (updates.price !== undefined) item.price = updates.price;
    if (updates.preview) item.preview = updates.preview;
    if (updates.tags) item.tags = updates.tags;
    if (updates.isActive !== undefined) item.isActive = updates.isActive;

    item.updatedAt = new Date();

    return item;
  }

  /**
   * Delete item
   */
  deleteItem(itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    const creatorItems = this.creatorItems.get(item.creatorId);
    if (creatorItems) {
      const index = creatorItems.indexOf(itemId);
      if (index > -1) creatorItems.splice(index, 1);
    }

    this.items.delete(itemId);
    this.reviews.delete(itemId);
    this.purchases.delete(itemId);

    return true;
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats() {
    const items = Array.from(this.items.values());
    const activeItems = items.filter((i) => i.isActive);
    const totalEarnings = items.reduce((sum, i) => sum + i.earnings, 0);
    const totalSales = items.reduce((sum, i) => sum + i.sales, 0);
    const totalDownloads = items.reduce((sum, i) => sum + i.downloads, 0);

    return {
      totalItems: items.length,
      activeItems: activeItems.length,
      totalEarnings,
      totalSales,
      totalDownloads,
      averageRating: items.length > 0 ? items.reduce((sum, i) => sum + i.rating, 0) / items.length : 0,
      categories: {
        templates: items.filter((i) => i.category === 'template').length,
        presets: items.filter((i) => i.category === 'preset').length,
        content: items.filter((i) => i.category === 'content').length,
        effects: items.filter((i) => i.category === 'effect').length,
        music: items.filter((i) => i.category === 'music').length,
      },
    };
  }

  /**
   * Get trending items
   */
  getTrendingItems(limit: number = 10): MarketplaceItem[] {
    return Array.from(this.items.values())
      .filter((i) => i.isActive)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Get featured items
   */
  getFeaturedItems(limit: number = 10): MarketplaceItem[] {
    return Array.from(this.items.values())
      .filter((i) => i.isActive)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
}
