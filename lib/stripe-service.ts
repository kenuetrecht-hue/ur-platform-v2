/**
 * Stripe Payment Service
 * Handles all payment processing for UR (wallet top-ups, sticker purchases, tips)
 * Abstracts Stripe API calls and provides clean interface for payment operations
 */

import { serverConfig, getStripeConfig } from './server-config';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
  amount?: number;
  currency?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'wallet_topup' | 'sticker_purchase' | 'tip' | 'creator_payout';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentIntentId?: string;
  metadata?: {
    creatorId?: string;
    stickerPackId?: string;
    quantity?: number;
    description?: string;
  };
  createdAt: Date;
  completedAt?: Date;
}

class StripeService {
  private secretKey: string;
  private publishableKey: string;
  private isLiveMode: boolean;

  constructor() {
    const config = getStripeConfig();
    this.secretKey = config.secretKey;
    this.publishableKey = config.publishableKey;
    this.isLiveMode = config.isLiveMode;
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return serverConfig.stripe.isConfigured();
  }

  /**
   * Create a payment intent for wallet top-up
   * @param userId - User ID making the payment
   * @param amount - Amount in cents (e.g., 1000 = $10.00)
   * @param description - Payment description
   * @returns PaymentResult with client secret for frontend
   */
  async createWalletTopupIntent(
    userId: string,
    amount: number,
    description: string = 'Wallet Top-up'
  ): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variables.',
      };
    }

    try {
      // In production, this would call the Stripe API
      // For now, we return a mock response that demonstrates the structure
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        paymentIntentId,
        clientSecret,
        amount,
        currency: 'usd',
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Create a payment intent for sticker purchase
   * @param userId - User ID making the purchase
   * @param stickerPackId - ID of sticker pack being purchased
   * @param amount - Amount in cents
   * @param quantity - Number of stickers
   * @returns PaymentResult with client secret
   */
  async createStickerPurchaseIntent(
    userId: string,
    stickerPackId: string,
    amount: number,
    quantity: number
  ): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Stripe is not configured.',
      };
    }

    try {
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        paymentIntentId,
        clientSecret,
        amount,
        currency: 'usd',
      };
    } catch (error) {
      console.error('Error creating sticker purchase intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Create a payment intent for tipping a creator
   * @param userId - User ID making the tip
   * @param creatorId - Creator ID receiving the tip
   * @param amount - Amount in cents
   * @returns PaymentResult with client secret
   */
  async createTipIntent(
    userId: string,
    creatorId: string,
    amount: number
  ): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Stripe is not configured.',
      };
    }

    try {
      const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        paymentIntentId,
        clientSecret,
        amount,
        currency: 'usd',
      };
    } catch (error) {
      console.error('Error creating tip intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Retrieve payment intent status
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Payment intent details
   */
  async getPaymentIntentStatus(paymentIntentId: string): Promise<PaymentIntent | null> {
    if (!this.isConfigured()) {
      console.error('Stripe is not configured');
      return null;
    }

    try {
      // In production, this would call Stripe API to retrieve the payment intent
      // For now, return mock data
      return {
        id: paymentIntentId,
        clientSecret: `${paymentIntentId}_secret_xxx`,
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
      };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return null;
    }
  }

  /**
   * Process a refund for a payment
   * @param paymentIntentId - Stripe payment intent ID to refund
   * @param reason - Reason for refund (e.g., 'requested_by_customer', 'duplicate', 'fraudulent')
   * @returns Success status and refund ID
   */
  async processRefund(
    paymentIntentId: string,
    reason: 'requested_by_customer' | 'duplicate' | 'fraudulent' = 'requested_by_customer'
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Stripe is not configured.',
      };
    }

    try {
      // In production, this would call Stripe API to create a refund
      const refundId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        refundId,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  /**
   * Calculate creator payout from transaction amount
   * @param amount - Total transaction amount in cents
   * @returns Creator payout in cents (85% of amount)
   */
  calculateCreatorPayout(amount: number): number {
    const creatorPercentage = serverConfig.app.creatorPayoutPercentage;
    return Math.floor(amount * creatorPercentage);
  }

  /**
   * Calculate platform fee from transaction amount
   * @param amount - Total transaction amount in cents
   * @returns Platform fee in cents (15% of amount)
   */
  calculatePlatformFee(amount: number): number {
    const platformPercentage = serverConfig.app.platformFeePercentage;
    return Math.floor(amount * platformPercentage);
  }

  /**
   * Get Stripe configuration (for frontend integration)
   */
  getPublicConfig() {
    return {
      publishableKey: this.publishableKey,
      isLiveMode: this.isLiveMode,
      isConfigured: this.isConfigured(),
    };
  }
}

// Export singleton instance
export const stripeService = new StripeService();

export default stripeService;
