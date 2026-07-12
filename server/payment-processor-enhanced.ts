/**
 * Enhanced Payment Processor
 * Handles Stripe, PayPal, and wallet payments for AI specialist bookings
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: "requires_payment_method" | "requires_confirmation" | "succeeded";
  provider: "stripe" | "paypal" | "wallet";
  metadata: Record<string, any>;
  createdAt: number;
  expiresAt: number;
}

export interface StripePaymentConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface PayPalPaymentConfig {
  clientId: string;
  clientSecret: string;
  mode: "sandbox" | "live";
}

export interface WalletPaymentConfig {
  minBalance: number;
  maxTransactionAmount: number;
  dailyLimit: number;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: "stripe_card" | "paypal" | "wallet";
  provider: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: number;
}

export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  userId: string;
  aiSpecialistId: string;
  sessionId: string;
  amount: number;
  currency: string;
  paymentMethod: "stripe_card" | "paypal" | "wallet";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  provider: "stripe" | "paypal" | "wallet";
  providerTransactionId?: string;
  receipt?: {
    url: string;
    number: string;
  };
  refundedAmount?: number;
  refundedAt?: number;
  failureReason?: string;
  createdAt: number;
  completedAt?: number;
}

export interface BookingPayment {
  id: string;
  userId: string;
  aiSpecialistId: string;
  sessionId: string;
  durationMinutes: number;
  pricePerMinute: number;
  totalAmount: number;
  discount?: number;
  tax?: number;
  finalAmount: number;
  paymentTransaction: PaymentTransaction;
  invoice?: {
    number: string;
    url: string;
    generatedAt: number;
  };
}

// Validation schemas
const PaymentIntentSchema = z.object({
  amount: z.number().min(0.5),
  currency: z.string().length(3),
  provider: z.enum(["stripe", "paypal", "wallet"]),
  metadata: z.record(z.string(), z.any()).optional(),
});

const PaymentMethodSchema = z.object({
  type: z.enum(["stripe_card", "paypal", "wallet"]),
  provider: z.string(),
  last4: z.string().length(4).optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2024).optional(),
});

// ============================================================================
// PAYMENT PROCESSOR SERVICE
// ============================================================================

class EnhancedPaymentProcessor {
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private transactions: Map<string, PaymentTransaction> = new Map();
  private bookingPayments: Map<string, BookingPayment> = new Map();
  private userWalletBalances: Map<string, number> = new Map();
  private transactionCounter = 0;

  constructor(
    private stripeConfig?: StripePaymentConfig,
    private paypalConfig?: PayPalPaymentConfig,
    private walletConfig?: WalletPaymentConfig
  ) {
    if (!this.walletConfig) {
      this.walletConfig = {
        minBalance: 0,
        maxTransactionAmount: 1000,
        dailyLimit: 5000,
      };
    }
    // Initialize demo wallet balances
    this.userWalletBalances.set("user_1", 100);
    this.userWalletBalances.set("user_2", 50);
    this.userWalletBalances.set("user_3", 200);
  }

  /**
   * Create a payment intent for booking
   */
  createPaymentIntent(
    userId: string,
    aiSpecialistId: string,
    sessionId: string,
    amount: number,
    paymentMethod: "stripe_card" | "paypal" | "wallet"
  ): PaymentIntent {
    PaymentIntentSchema.parse({
      amount,
      currency: "USD",
      provider: this.getProviderFromPaymentMethod(paymentMethod),
    });

    const intentId = `pi_${++this.transactionCounter}_${Date.now()}`;
    const clientSecret = `${intentId}_secret_${Math.random()
      .toString(36)
      .substring(7)}`;

    const intent: PaymentIntent = {
      id: intentId,
      clientSecret,
      amount,
      currency: "USD",
      status: "requires_payment_method",
      provider: this.getProviderFromPaymentMethod(paymentMethod),
      metadata: {
        userId,
        aiSpecialistId,
        sessionId,
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    this.paymentIntents.set(intentId, intent);
    return intent;
  }

  /**
   * Confirm payment and process transaction
   */
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentTransaction> {
    const intent = this.paymentIntents.get(paymentIntentId);
    if (!intent) throw new Error(`Payment intent ${paymentIntentId} not found`);

    const method = this.paymentMethods.get(paymentMethodId);
    if (!method) throw new Error(`Payment method ${paymentMethodId} not found`);

    const transactionId = `txn_${++this.transactionCounter}_${Date.now()}`;

    // Process payment based on provider
    let status: PaymentTransaction["status"] = "pending";
    let providerTransactionId: string | undefined;

    if (intent.provider === "stripe") {
      // In production, call Stripe API
      status = "completed";
      providerTransactionId = `ch_${Math.random().toString(36).substring(7)}`;
    } else if (intent.provider === "paypal") {
      // In production, call PayPal API
      status = "completed";
      providerTransactionId = `PAYID-${Math.random()
        .toString(36)
        .substring(7)}`;
    } else if (intent.provider === "wallet") {
      // Process wallet payment
      const userId = intent.metadata.userId;
      const balance = this.userWalletBalances.get(userId) || 0;

      if (balance < intent.amount) {
        status = "failed";
      } else {
        this.userWalletBalances.set(userId, balance - intent.amount);
        status = "completed";
        providerTransactionId = `wallet_${Date.now()}`;
      }
    }

    const transaction: PaymentTransaction = {
      id: transactionId,
      paymentIntentId,
      userId: intent.metadata.userId,
      aiSpecialistId: intent.metadata.aiSpecialistId,
      sessionId: intent.metadata.sessionId,
      amount: intent.amount,
      currency: intent.currency,
      paymentMethod: method.type,
      status,
      provider: intent.provider,
      providerTransactionId,
      receipt:
        status === "completed"
          ? {
              url: `https://receipts.example.com/${transactionId}.pdf`,
              number: `RCP-${Date.now()}`,
            }
          : undefined,
      createdAt: Date.now(),
      completedAt: status === "completed" ? Date.now() : undefined,
      failureReason:
        status === "failed" ? "Insufficient wallet balance" : undefined,
    };

    this.transactions.set(transactionId, transaction);
    intent.status = "succeeded";

    return transaction;
  }

  /**
   * Process booking payment (full flow)
   */
  async processBookingPayment(
    userId: string,
    aiSpecialistId: string,
    sessionId: string,
    durationMinutes: number,
    pricePerMinute: number,
    paymentMethod: "stripe_card" | "paypal" | "wallet",
    discount?: number
  ): Promise<BookingPayment> {
    const totalAmount = durationMinutes * pricePerMinute;
    const discountAmount = discount || 0;
    const tax = (totalAmount - discountAmount) * 0.08; // 8% tax
    const finalAmount = totalAmount - discountAmount + tax;

    // Create payment intent
    const intent = this.createPaymentIntent(
      userId,
      aiSpecialistId,
      sessionId,
      finalAmount,
      paymentMethod
    );

    // Get or create payment method
    let paymentMethodId = this.findPaymentMethodByType(userId, paymentMethod);
    if (!paymentMethodId) {
      paymentMethodId = this.createPaymentMethod(userId, paymentMethod);
    }

    // Confirm payment
    const transaction = await this.confirmPayment(intent.id, paymentMethodId);

    // Create booking payment record
    const bookingPaymentId = `bp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const bookingPayment: BookingPayment = {
      id: bookingPaymentId,
      userId,
      aiSpecialistId,
      sessionId,
      durationMinutes,
      pricePerMinute,
      totalAmount,
      discount: discountAmount,
      tax,
      finalAmount,
      paymentTransaction: transaction,
      invoice:
        transaction.status === "completed"
          ? {
              number: `INV-${Date.now()}`,
              url: `https://invoices.example.com/inv_${bookingPaymentId}.pdf`,
              generatedAt: Date.now(),
            }
          : undefined,
    };

    this.bookingPayments.set(bookingPaymentId, bookingPayment);
    return bookingPayment;
  }

  /**
   * Create a payment method
   */
  createPaymentMethod(
    userId: string,
    type: "stripe_card" | "paypal" | "wallet"
  ): string {
    const methodId = `pm_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const method: PaymentMethod = {
      id: methodId,
      userId,
      type,
      provider: type === "stripe_card" ? "stripe" : type === "paypal" ? "paypal" : "wallet",
      last4: type === "stripe_card" ? "4242" : undefined,
      expiryMonth: type === "stripe_card" ? 12 : undefined,
      expiryYear: type === "stripe_card" ? 2025 : undefined,
      isDefault: true,
      createdAt: Date.now(),
    };

    this.paymentMethods.set(methodId, method);
    return methodId;
  }

  /**
   * Get user's wallet balance
   */
  getWalletBalance(userId: string): number {
    return this.userWalletBalances.get(userId) || 0;
  }

  /**
   * Add funds to wallet
   */
  addWalletFunds(userId: string, amount: number): number {
    const currentBalance = this.getWalletBalance(userId);
    const newBalance = currentBalance + amount;
    this.userWalletBalances.set(userId, newBalance);
    return newBalance;
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.paymentIntents.clear();
    this.paymentMethods.clear();
    this.transactions.clear();
    this.bookingPayments.clear();
    this.userWalletBalances.clear();
    this.transactionCounter = 0;
    // Restore demo wallet balances
    this.userWalletBalances.set("user_1", 100);
    this.userWalletBalances.set("user_2", 50);
    this.userWalletBalances.set("user_3", 200);
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(transactionId: string): Promise<PaymentTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) throw new Error(`Transaction ${transactionId} not found`);

    if (transaction.status === "refunded") {
      throw new Error("Transaction already refunded");
    }

    // In production, call payment provider API
    transaction.status = "refunded";
    transaction.refundedAmount = transaction.amount;
    transaction.refundedAt = Date.now();

    // Refund to wallet if applicable
    if (transaction.provider === "wallet") {
      this.addWalletFunds(transaction.userId, transaction.amount);
    }

    return transaction;
  }

  /**
   * Get transaction details
   */
  getTransaction(transactionId: string): PaymentTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions for a user
   */
  getUserTransactions(userId: string): PaymentTransaction[] {
    return Array.from(this.transactions.values()).filter(
      (t) => t.userId === userId
    );
  }

  /**
   * Get booking payment details
   */
  getBookingPayment(bookingPaymentId: string): BookingPayment | undefined {
    return this.bookingPayments.get(bookingPaymentId);
  }

  /**
   * Get all booking payments for a user
   */
  getUserBookingPayments(userId: string): BookingPayment[] {
    return Array.from(this.bookingPayments.values()).filter(
      (bp) => bp.userId === userId
    );
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private getProviderFromPaymentMethod(
    paymentMethod: "stripe_card" | "paypal" | "wallet"
  ): "stripe" | "paypal" | "wallet" {
    if (paymentMethod === "stripe_card") return "stripe";
    if (paymentMethod === "paypal") return "paypal";
    return "wallet";
  }

  private findPaymentMethodByType(
    userId: string,
    type: "stripe_card" | "paypal" | "wallet"
  ): string | undefined {
    const methods = Array.from(this.paymentMethods.values());
    const method = methods.find((m) => m.userId === userId && m.type === type);
    return method?.id;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let paymentProcessorInstance: EnhancedPaymentProcessor | null = null;

export function getEnhancedPaymentProcessor(): EnhancedPaymentProcessor {
  if (!paymentProcessorInstance) {
    paymentProcessorInstance = new EnhancedPaymentProcessor();
  }
  return paymentProcessorInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPaymentProcessor(): void {
  paymentProcessorInstance = null;
}

export default EnhancedPaymentProcessor;
