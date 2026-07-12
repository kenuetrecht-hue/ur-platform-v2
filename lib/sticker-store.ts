/**
 * Sticker Store Service
 * Handles sticker purchases, inventory, and loyalty point redemption
 */

import { stripeService } from './stripe-service';
import { walletPaymentService } from './wallet-payment';

export interface StickerPack {
  id: string;
  name: string;
  price: number; // in cents
  stickers: number;
  loyaltyPoints: number;
  description: string;
  icon?: string;
  popular?: boolean;
}

export interface UserStickers {
  userId: string;
  totalStickers: number;
  packs: Array<{
    packId: string;
    quantity: number;
    purchasedAt: Date;
  }>;
  lastStarterPackDate?: Date;
}

export interface StickerPurchase {
  id: string;
  userId: string;
  packId: string;
  paymentMethod: 'wallet' | 'loyalty_points' | 'stripe';
  amount: number; // in cents or loyalty points
  stickersReceived: number;
  loyaltyPointsEarned: number;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Sticker Store Service
 */
class StickerStoreService {
  private stickerPacks: StickerPack[] = [
    {
      id: 'pack_1',
      name: 'Starter Pack',
      price: 100, // $1.00
      stickers: 2,
      loyaltyPoints: 10,
      description: 'Basic stickers to get started. Every purchase helps build UR!',
      popular: false,
    },
    {
      id: 'pack_5',
      name: 'Essentials',
      price: 500, // $5.00
      stickers: 15,
      loyaltyPoints: 15,
      description: 'Better quality stickers. Your support builds UR stronger!',
      popular: false,
    },
    {
      id: 'pack_10',
      name: 'Popular Pack',
      price: 1000, // $10.00
      stickers: 30,
      loyaltyPoints: 30,
      description: 'High-quality stickers loved by our community. 100% proceeds go to UR!',
      popular: true,
    },
    {
      id: 'pack_15',
      name: 'Premium Pack',
      price: 1500, // $15.00
      stickers: 45,
      loyaltyPoints: 45,
      description: 'Premium quality stickers with exclusive designs. Help us grow!',
      popular: false,
    },
    {
      id: 'pack_20',
      name: 'Mega Pack',
      price: 2000, // $20.00
      stickers: 60,
      loyaltyPoints: 60,
      description: 'Top-notch stickers with premium artwork. Thank you for supporting UR!',
      popular: false,
    },
    {
      id: 'pack_25',
      name: 'Ultimate Pack',
      price: 2500, // $25.00
      stickers: 100,
      loyaltyPoints: 100,
      description: 'Ultra-premium exclusive sticker collection. All proceeds fuel UR development!',
      popular: false,
    },
  ];

  private userStickers: Map<string, UserStickers> = new Map();
  private purchases: StickerPurchase[] = [];
  private starterPackDistributionDay = 1; // 1st of month

  constructor() {
    // Initialize with demo user stickers
    this.userStickers.set('user_1', {
      userId: 'user_1',
      totalStickers: 50,
      packs: [
        {
          packId: 'pack_10',
          quantity: 2,
          purchasedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
      ],
      lastStarterPackDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    });
  }

  /**
   * Get all available sticker packs
   */
  getStickerPacks(): StickerPack[] {
    return this.stickerPacks;
  }

  /**
   * Get a specific sticker pack
   */
  getStickerPack(packId: string): StickerPack | undefined {
    return this.stickerPacks.find((p) => p.id === packId);
  }

  /**
   * Get user's sticker inventory
   */
  getUserStickers(userId: string): UserStickers {
    return (
      this.userStickers.get(userId) || {
        userId,
        totalStickers: 0,
        packs: [],
      }
    );
  }

  /**
   * Create sticker purchase with Stripe
   */
  async createStripePurchase(
    userId: string,
    packId: string
  ): Promise<{ success: boolean; purchaseId?: string; clientSecret?: string; error?: string }> {
    const pack = this.getStickerPack(packId);
    if (!pack) {
      return {
        success: false,
        error: 'Sticker pack not found',
      };
    }

    try {
      // Create payment intent with Stripe
      const paymentResult = await stripeService.createStickerPurchaseIntent(
        userId,
        packId,
        pack.price,
        pack.stickers
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error,
        };
      }

      // Create purchase record
      const purchase: StickerPurchase = {
        id: `stkpurch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId,
        paymentMethod: 'stripe',
        amount: pack.price,
        stickersReceived: pack.stickers,
        loyaltyPointsEarned: pack.loyaltyPoints,
        transactionId: paymentResult.paymentIntentId,
        status: 'pending',
        createdAt: new Date(),
      };

      this.purchases.push(purchase);

      return {
        success: true,
        purchaseId: purchase.id,
        clientSecret: paymentResult.clientSecret,
      };
    } catch (error) {
      console.error('Error creating Stripe purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create purchase',
      };
    }
  }

  /**
   * Create sticker purchase with wallet balance
   */
  async createWalletPurchase(
    userId: string,
    packId: string
  ): Promise<{ success: boolean; purchaseId?: string; newBalance?: number; error?: string }> {
    const pack = this.getStickerPack(packId);
    if (!pack) {
      return {
        success: false,
        error: 'Sticker pack not found',
      };
    }

    try {
      // Deduct from wallet
      const deductResult = await walletPaymentService.deductFromWallet(
        userId,
        pack.price,
        'purchase',
        `Sticker Pack: ${pack.name}`
      );

      if (!deductResult.success) {
        return {
          success: false,
          error: deductResult.error,
        };
      }

      // Create purchase record
      const purchase: StickerPurchase = {
        id: `stkpurch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId,
        paymentMethod: 'wallet',
        amount: pack.price,
        stickersReceived: pack.stickers,
        loyaltyPointsEarned: pack.loyaltyPoints,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      this.purchases.push(purchase);

      // Add stickers to user inventory
      this.addStickersToUser(userId, pack.stickers, packId);

      return {
        success: true,
        purchaseId: purchase.id,
        newBalance: deductResult.newBalance,
      };
    } catch (error) {
      console.error('Error creating wallet purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete purchase',
      };
    }
  }

  /**
   * Create sticker purchase with loyalty points
   */
  async createLoyaltyPointsPurchase(
    userId: string,
    packId: string,
    userLoyaltyPoints: number
  ): Promise<{ success: boolean; purchaseId?: string; remainingPoints?: number; error?: string }> {
    const pack = this.getStickerPack(packId);
    if (!pack) {
      return {
        success: false,
        error: 'Sticker pack not found',
      };
    }

    // Calculate loyalty points cost (1 point = 1 cent equivalent)
    const pointsCost = pack.price;

    if (userLoyaltyPoints < pointsCost) {
      return {
        success: false,
        error: `Insufficient loyalty points. You need ${pointsCost} points but have ${userLoyaltyPoints}`,
      };
    }

    try {
      // Create purchase record
      const purchase: StickerPurchase = {
        id: `stkpurch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId,
        paymentMethod: 'loyalty_points',
        amount: pointsCost,
        stickersReceived: pack.stickers,
        loyaltyPointsEarned: 0, // No points earned when paying with points
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      this.purchases.push(purchase);

      // Add stickers to user inventory
      this.addStickersToUser(userId, pack.stickers, packId);

      const remainingPoints = userLoyaltyPoints - pointsCost;

      return {
        success: true,
        purchaseId: purchase.id,
        remainingPoints,
      };
    } catch (error) {
      console.error('Error creating loyalty points purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete purchase',
      };
    }
  }

  /**
   * Confirm Stripe sticker purchase
   */
  async confirmStripePurchase(
    purchaseId: string,
    paymentIntentId: string
  ): Promise<{ success: boolean; stickersReceived?: number; error?: string }> {
    try {
      const purchase = this.purchases.find((p) => p.id === purchaseId);
      if (!purchase) {
        return {
          success: false,
          error: 'Purchase not found',
        };
      }

      // Check payment intent status
      const paymentIntent = await stripeService.getPaymentIntentStatus(paymentIntentId);
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        purchase.status = 'failed';
        return {
          success: false,
          error: 'Payment failed',
        };
      }

      // Add stickers to user inventory
      this.addStickersToUser(purchase.userId, purchase.stickersReceived, purchase.packId);

      // Update purchase status
      purchase.status = 'completed';
      purchase.completedAt = new Date();

      return {
        success: true,
        stickersReceived: purchase.stickersReceived,
      };
    } catch (error) {
      console.error('Error confirming Stripe purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm purchase',
      };
    }
  }

  /**
   * Add stickers to user inventory
   */
  private addStickersToUser(userId: string, stickersCount: number, packId: string): void {
    let userStickers = this.userStickers.get(userId);
    if (!userStickers) {
      userStickers = {
        userId,
        totalStickers: 0,
        packs: [],
      };
      this.userStickers.set(userId, userStickers);
    }

    userStickers.totalStickers += stickersCount;

    // Add or update pack
    const existingPack = userStickers.packs.find((p) => p.packId === packId);
    if (existingPack) {
      existingPack.quantity += 1;
    } else {
      userStickers.packs.push({
        packId,
        quantity: 1,
        purchasedAt: new Date(),
      });
    }
  }

  /**
   * Get monthly starter pack (free 20 stickers on 1st of month)
   */
  async getMonthlyStarterPack(userId: string): Promise<{ success: boolean; stickersReceived?: number; error?: string }> {
    const userStickers = this.getUserStickers(userId);
    const today = new Date();
    const isFirstDay = today.getDate() === this.starterPackDistributionDay;

    if (!isFirstDay) {
      return {
        success: false,
        error: `Starter pack is only available on the 1st of each month. Next pack available: ${new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleDateString()}`,
      };
    }

    if (userStickers.lastStarterPackDate) {
      const lastPackDate = new Date(userStickers.lastStarterPackDate);
      const lastMonth = lastPackDate.getMonth();
      const currentMonth = today.getMonth();

      if (lastMonth === currentMonth && lastPackDate.getFullYear() === today.getFullYear()) {
        return {
          success: false,
          error: 'You already claimed this month\'s starter pack',
        };
      }
    }

    try {
      const starterPackStickers = 20;
      this.addStickersToUser(userId, starterPackStickers, 'starter_pack');

      userStickers.lastStarterPackDate = new Date();

      return {
        success: true,
        stickersReceived: starterPackStickers,
      };
    } catch (error) {
      console.error('Error getting starter pack:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get starter pack',
      };
    }
  }

  /**
   * Use stickers (deduct from inventory)
   */
  useStickers(userId: string, count: number): { success: boolean; remainingStickers?: number; error?: string } {
    const userStickers = this.getUserStickers(userId);

    if (userStickers.totalStickers < count) {
      return {
        success: false,
        error: `Insufficient stickers. You have ${userStickers.totalStickers} but need ${count}`,
      };
    }

    userStickers.totalStickers -= count;

    return {
      success: true,
      remainingStickers: userStickers.totalStickers,
    };
  }

  /**
   * Get purchase history for a user
   */
  getPurchaseHistory(userId: string, limit: number = 50): StickerPurchase[] {
    return this.purchases
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get sticker store statistics
   */
  getStatistics() {
    const completedPurchases = this.purchases.filter((p) => p.status === 'completed');
    const totalRevenue = completedPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalStickersDistributed = completedPurchases.reduce((sum, p) => sum + p.stickersReceived, 0);

    return {
      totalPurchases: this.purchases.length,
      completedPurchases: completedPurchases.length,
      totalRevenue,
      totalStickersDistributed,
      averagePurchaseValue: completedPurchases.length > 0 ? totalRevenue / completedPurchases.length : 0,
      topPack: this.getTopPack(),
    };
  }

  /**
   * Get the most popular sticker pack
   */
  private getTopPack(): { packId: string; purchases: number } | null {
    const packPurchases: Record<string, number> = {};

    this.purchases
      .filter((p) => p.status === 'completed')
      .forEach((p) => {
        packPurchases[p.packId] = (packPurchases[p.packId] || 0) + 1;
      });

    if (Object.keys(packPurchases).length === 0) {
      return null;
    }

    const topPackId = Object.entries(packPurchases).sort((a, b) => b[1] - a[1])[0][0];
    return {
      packId: topPackId,
      purchases: packPurchases[topPackId],
    };
  }
}

// Export singleton instance
export const stickerStoreService = new StickerStoreService();

export default stickerStoreService;
