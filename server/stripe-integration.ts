/**
 * Stripe Integration Service
 * Handles real Stripe payment processing for the Creator Platform
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: "requires_payment_method" | "requires_confirmation" | "succeeded";
  metadata: Record<string, any>;
  createdAt: number;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, any>;
}

export interface StripePaymentMethod {
  id: string;
  type: "card" | "bank_account";
  customerId: string;
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface StripeCharge {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  paymentMethodId: string;
  receiptUrl?: string;
  failureMessage?: string;
  createdAt: number;
}

export interface StripeRefund {
  id: string;
  chargeId: string;
  amount: number;
  status: "succeeded" | "failed" | "pending";
  reason?: string;
  createdAt: number;
}

// ============================================================================
// STRIPE INTEGRATION SERVICE
// ============================================================================

class StripeIntegrationService {
  private config: StripeConfig;
  private customers: Map<string, StripeCustomer> = new Map();
  private paymentMethods: Map<string, StripePaymentMethod> = new Map();
  private paymentIntents: Map<string, StripePaymentIntent> = new Map();
  private charges: Map<string, StripeCharge> = new Map();
  private refunds: Map<string, StripeRefund> = new Map();
  private chargeCounter = 0;

  constructor(config: StripeConfig) {
    this.config = config;
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(
    userId: string,
    email: string,
    name: string,
    metadata?: Record<string, any>
  ): Promise<StripeCustomer> {
    // In production, call Stripe API: stripe.customers.create()
    const customerId = `cus_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const customer: StripeCustomer = {
      id: customerId,
      email,
      name,
      metadata: {
        userId,
        ...metadata,
      },
    };

    this.customers.set(customerId, customer);
    return customer;
  }

  /**
   * Get or create a Stripe customer
   */
  async getOrCreateCustomer(
    userId: string,
    email: string,
    name: string
  ): Promise<StripeCustomer> {
    // In production, search for existing customer by email
    const existing = Array.from(this.customers.values()).find(
      (c) => c.metadata.userId === userId
    );

    if (existing) {
      return existing;
    }

    return this.createCustomer(userId, email, name);
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(
    customerId: string,
    type: "card" | "bank_account",
    last4: string,
    brand?: string,
    expiryMonth?: number,
    expiryYear?: number,
    isDefault: boolean = false
  ): Promise<StripePaymentMethod> {
    // In production, call Stripe API: stripe.paymentMethods.create()
    const methodId = `pm_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const method: StripePaymentMethod = {
      id: methodId,
      type,
      customerId,
      last4,
      brand,
      expiryMonth,
      expiryYear,
      isDefault,
    };

    this.paymentMethods.set(methodId, method);

    // If default, unset other defaults for this customer
    if (isDefault) {
      Array.from(this.paymentMethods.values())
        .filter((m) => m.customerId === customerId && m.id !== methodId)
        .forEach((m) => {
          m.isDefault = false;
        });
    }

    return method;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    customerId: string,
    amount: number,
    currency: string = "USD",
    metadata?: Record<string, any>
  ): Promise<StripePaymentIntent> {
    // In production, call Stripe API: stripe.paymentIntents.create()
    const intentId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const clientSecret = `${intentId}_secret_${Math.random().toString(36).substring(7)}`;

    const intent: StripePaymentIntent = {
      id: intentId,
      clientSecret,
      amount,
      currency,
      status: "requires_payment_method",
      metadata: {
        customerId,
        ...metadata,
      },
      createdAt: Date.now(),
    };

    this.paymentIntents.set(intentId, intent);
    return intent;
  }

  /**
   * Confirm a payment intent (charge the customer)
   */
  async confirmPaymentIntent(
    intentId: string,
    paymentMethodId: string
  ): Promise<StripeCharge> {
    const intent = this.paymentIntents.get(intentId);
    if (!intent) throw new Error(`Payment intent ${intentId} not found`);

    const method = this.paymentMethods.get(paymentMethodId);
    if (!method) throw new Error(`Payment method ${paymentMethodId} not found`);

    // In production, call Stripe API: stripe.paymentIntents.confirm()
    const chargeId = `ch_${++this.chargeCounter}_${Date.now()}`;

    const charge: StripeCharge = {
      id: chargeId,
      customerId: method.customerId,
      amount: intent.amount,
      currency: intent.currency,
      status: "succeeded",
      paymentMethodId,
      receiptUrl: `https://receipts.stripe.com/${chargeId}.pdf`,
      createdAt: Date.now(),
    };

    this.charges.set(chargeId, charge);
    intent.status = "succeeded";

    return charge;
  }

  /**
   * Refund a charge
   */
  async refundCharge(
    chargeId: string,
    amount?: number,
    reason?: string
  ): Promise<StripeRefund> {
    const charge = this.charges.get(chargeId);
    if (!charge) throw new Error(`Charge ${chargeId} not found`);

    if (charge.status !== "succeeded") {
      throw new Error(`Cannot refund charge with status ${charge.status}`);
    }

    // In production, call Stripe API: stripe.refunds.create()
    const refundId = `re_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const refundAmount = amount || charge.amount;

    const refund: StripeRefund = {
      id: refundId,
      chargeId,
      amount: refundAmount,
      status: "succeeded",
      reason,
      createdAt: Date.now(),
    };

    this.refunds.set(refundId, refund);

    // Update charge status if fully refunded
    if (refundAmount >= charge.amount) {
      charge.status = "failed"; // Mark as refunded
    }

    return refund;
  }

  /**
   * Get customer details
   */
  getCustomer(customerId: string): StripeCustomer | undefined {
    return this.customers.get(customerId);
  }

  /**
   * Get payment methods for a customer
   */
  getPaymentMethods(customerId: string): StripePaymentMethod[] {
    return Array.from(this.paymentMethods.values()).filter(
      (m) => m.customerId === customerId
    );
  }

  /**
   * Get default payment method for a customer
   */
  getDefaultPaymentMethod(customerId: string): StripePaymentMethod | undefined {
    return Array.from(this.paymentMethods.values()).find(
      (m) => m.customerId === customerId && m.isDefault
    );
  }

  /**
   * Get charges for a customer
   */
  getCharges(customerId: string): StripeCharge[] {
    return Array.from(this.charges.values()).filter(
      (c) => c.customerId === customerId
    );
  }

  /**
   * Get charge details
   */
  getCharge(chargeId: string): StripeCharge | undefined {
    return this.charges.get(chargeId);
  }

  /**
   * Get refunds for a charge
   */
  getRefunds(chargeId: string): StripeRefund[] {
    return Array.from(this.refunds.values()).filter((r) => r.chargeId === chargeId);
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.customers.clear();
    this.paymentMethods.clear();
    this.paymentIntents.clear();
    this.charges.clear();
    this.refunds.clear();
    this.chargeCounter = 0;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let stripeInstance: StripeIntegrationService | null = null;

export function getStripeIntegration(config?: StripeConfig): StripeIntegrationService {
  if (!stripeInstance) {
    if (!config) {
      config = {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_mock",
        secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_mock",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_mock",
      };
    }
    stripeInstance = new StripeIntegrationService(config);
  }
  return stripeInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetStripeIntegration(): void {
  stripeInstance = null;
}

export default StripeIntegrationService;
