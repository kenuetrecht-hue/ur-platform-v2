/**
 * Wallet Payment Integration
 * Handles wallet top-up payments through Stripe
 * Manages payment intents, confirmations, and wallet balance updates
 */

import { stripeService, PaymentResult } from './stripe-service';
import { serverConfig } from './server-config';

export interface WalletTopupRequest {
  userId: string;
  amount: number; // in cents (e.g., 1000 = $10.00)
  paymentMethodId?: string; // Stripe payment method ID
  description?: string;
}

export interface WalletTopupResponse {
  success: boolean;
  transactionId?: string;
  paymentIntentId?: string;
  clientSecret?: string;
  amount?: number;
  newBalance?: number;
  error?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'topup' | 'purchase' | 'tip' | 'payout' | 'refund';
  amount: number; // in cents
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Wallet Payment Service
 * Manages wallet top-ups and payment processing
 */
class WalletPaymentService {
  private walletBalances: Map<string, number> = new Map();
  private transactions: WalletTransaction[] = [];

  constructor() {
    // Initialize with default balances for demo users
    this.walletBalances.set('user_1', 5000); // $50.00
    this.walletBalances.set('user_2', 2500); // $25.00
    this.walletBalances.set('user_3', 0); // $0.00
  }

  /**
   * Get current wallet balance for a user
   * @param userId - User ID
   * @returns Balance in cents
   */
  getBalance(userId: string): number {
    return this.walletBalances.get(userId) || 0;
  }

  /**
   * Create a wallet top-up payment intent
   * @param request - Top-up request details
   * @returns Payment response with client secret for frontend
   */
  async createTopupIntent(request: WalletTopupRequest): Promise<WalletTopupResponse> {
    // Validate amount
    if (request.amount < 100) {
      // Minimum $1.00
      return {
        success: false,
        error: 'Minimum top-up amount is $1.00',
      };
    }

    if (request.amount > 100000) {
      // Maximum $1000.00
      return {
        success: false,
        error: 'Maximum top-up amount is $1000.00',
      };
    }

    try {
      // Create payment intent with Stripe
      const paymentResult = await stripeService.createWalletTopupIntent(
        request.userId,
        request.amount,
        request.description || 'Wallet Top-up'
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error,
        };
      }

      // Create pending transaction record
      const transaction: WalletTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.userId,
        type: 'topup',
        amount: request.amount,
        balanceBefore: this.getBalance(request.userId),
        balanceAfter: this.getBalance(request.userId), // Will update on completion
        description: request.description || 'Wallet Top-up',
        paymentIntentId: paymentResult.paymentIntentId,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          paymentMethod: request.paymentMethodId,
        },
      };

      this.transactions.push(transaction);

      return {
        success: true,
        transactionId: transaction.id,
        paymentIntentId: paymentResult.paymentIntentId,
        clientSecret: paymentResult.clientSecret,
        amount: request.amount,
        newBalance: this.getBalance(request.userId),
      };
    } catch (error) {
      console.error('Error creating top-up intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Confirm wallet top-up payment
   * @param transactionId - Transaction ID
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Updated wallet balance
   */
  async confirmTopup(transactionId: string, paymentIntentId: string): Promise<WalletTopupResponse> {
    try {
      // Find transaction
      const transaction = this.transactions.find((t) => t.id === transactionId);
      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      // Check payment intent status
      const paymentIntent = await stripeService.getPaymentIntentStatus(paymentIntentId);
      if (!paymentIntent) {
        return {
          success: false,
          error: 'Payment intent not found',
        };
      }

      if (paymentIntent.status !== 'succeeded') {
        transaction.status = 'failed';
        return {
          success: false,
          error: `Payment failed with status: ${paymentIntent.status}`,
        };
      }

      // Update wallet balance
      const currentBalance = this.getBalance(transaction.userId);
      const newBalance = currentBalance + transaction.amount;
      this.walletBalances.set(transaction.userId, newBalance);

      // Update transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.balanceAfter = newBalance;

      return {
        success: true,
        transactionId,
        amount: transaction.amount,
        newBalance,
      };
    } catch (error) {
      console.error('Error confirming top-up:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      };
    }
  }

  /**
   * Deduct amount from wallet (for purchases, tips, etc.)
   * @param userId - User ID
   * @param amount - Amount to deduct in cents
   * @param type - Transaction type
   * @param description - Transaction description
   * @returns Success status and new balance
   */
  async deductFromWallet(
    userId: string,
    amount: number,
    type: 'purchase' | 'tip' | 'payout',
    description: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const currentBalance = this.getBalance(userId);

    if (currentBalance < amount) {
      return {
        success: false,
        error: 'Insufficient wallet balance',
      };
    }

    try {
      const newBalance = currentBalance - amount;
      this.walletBalances.set(userId, newBalance);

      // Record transaction
      const transaction: WalletTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      this.transactions.push(transaction);

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('Error deducting from wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deduct from wallet',
      };
    }
  }

  /**
   * Add funds to wallet (for creator payouts, bonuses, etc.)
   * @param userId - User ID
   * @param amount - Amount to add in cents
   * @param type - Transaction type
   * @param description - Transaction description
   * @returns Success status and new balance
   */
  async addToWallet(
    userId: string,
    amount: number,
    type: 'payout' | 'refund',
    description: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const currentBalance = this.getBalance(userId);
      const newBalance = currentBalance + amount;
      this.walletBalances.set(userId, newBalance);

      // Record transaction
      const transaction: WalletTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      this.transactions.push(transaction);

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('Error adding to wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to wallet',
      };
    }
  }

  /**
   * Process refund for a transaction
   * @param transactionId - Original transaction ID
   * @param reason - Refund reason
   * @returns Success status and new balance
   */
  async refundTransaction(
    transactionId: string,
    reason: string
  ): Promise<{ success: boolean; newBalance?: number; refundId?: string; error?: string }> {
    try {
      const transaction = this.transactions.find((t) => t.id === transactionId);
      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      if (transaction.status === 'refunded') {
        return {
          success: false,
          error: 'Transaction already refunded',
        };
      }

      // Process refund with Stripe if payment intent exists
      if (transaction.paymentIntentId) {
        const refundResult = await stripeService.processRefund(
          transaction.paymentIntentId,
          'requested_by_customer'
        );

        if (!refundResult.success) {
          return {
            success: false,
            error: refundResult.error,
          };
        }
      }

      // Add refund amount back to wallet
      const currentBalance = this.getBalance(transaction.userId);
      const newBalance = currentBalance + transaction.amount;
      this.walletBalances.set(transaction.userId, newBalance);

      // Create refund transaction
      const refundTransaction: WalletTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: transaction.userId,
        type: 'refund',
        amount: transaction.amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Refund: ${reason}`,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {
          originalTransactionId: transactionId,
        },
      };

      this.transactions.push(refundTransaction);

      // Mark original transaction as refunded
      transaction.status = 'refunded';

      return {
        success: true,
        newBalance,
        refundId: refundTransaction.id,
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
   * Get transaction history for a user
   * @param userId - User ID
   * @param limit - Maximum number of transactions to return
   * @returns List of transactions
   */
  getTransactionHistory(userId: string, limit: number = 50): WalletTransaction[] {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get wallet statistics for a user
   * @param userId - User ID
   * @returns Wallet statistics
   */
  getWalletStats(userId: string) {
    const userTransactions = this.transactions.filter((t) => t.userId === userId);
    const topups = userTransactions.filter((t) => t.type === 'topup' && t.status === 'completed');
    const purchases = userTransactions.filter((t) => t.type === 'purchase' && t.status === 'completed');
    const tips = userTransactions.filter((t) => t.type === 'tip' && t.status === 'completed');
    const refunds = userTransactions.filter((t) => t.type === 'refund' && t.status === 'completed');

    return {
      currentBalance: this.getBalance(userId),
      totalTopups: topups.reduce((sum, t) => sum + t.amount, 0),
      totalPurchases: purchases.reduce((sum, t) => sum + t.amount, 0),
      totalTips: tips.reduce((sum, t) => sum + t.amount, 0),
      totalRefunds: refunds.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: userTransactions.length,
    };
  }
}

// Export singleton instance
export const walletPaymentService = new WalletPaymentService();

export default walletPaymentService;
