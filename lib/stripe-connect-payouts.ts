/**
 * Stripe Connect Payouts Service
 * Handles daily payouts to creators via Stripe Connect
 */

export interface StripeConnectAccount {
  creatorId: string;
  stripeConnectId: string;
  bankAccountId: string;
  accountStatus: "active" | "pending" | "restricted" | "inactive";
  verificationStatus: "verified" | "pending" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeTransfer {
  id: string;
  creatorId: string;
  amount: number; // in cents
  currency: string;
  destination: string; // Stripe Connect ID
  description: string;
  status: "pending" | "in_transit" | "paid" | "failed";
  createdAt: Date;
  arrivedAt?: Date;
  failureReason?: string;
}

export interface PayoutBatch {
  id: string;
  batchDate: Date;
  totalAmount: number;
  totalCreators: number;
  transfers: StripeTransfer[];
  status: "pending" | "processing" | "completed" | "partial_failed" | "failed";
  processedAt?: Date;
}

/**
 * Stripe Connect Payouts Service
 */
export class StripeConnectPayoutsService {
  private accounts: Map<string, StripeConnectAccount> = new Map();
  private transfers: Map<string, StripeTransfer> = new Map();
  private batches: PayoutBatch[] = [];
  private stripeApiKey: string;

  constructor(stripeApiKey?: string) {
    this.stripeApiKey = stripeApiKey || process.env.STRIPE_SECRET_KEY || "";
  }

  /**
   * Register creator with Stripe Connect
   */
  registerCreatorAccount(
    creatorId: string,
    stripeConnectId: string,
    bankAccountId: string
  ): StripeConnectAccount {
    const account: StripeConnectAccount = {
      creatorId,
      stripeConnectId,
      bankAccountId,
      accountStatus: "pending",
      verificationStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accounts.set(creatorId, account);
    return account;
  }

  /**
   * Verify Stripe Connect account
   */
  verifyAccount(creatorId: string): StripeConnectAccount | null {
    const account = this.accounts.get(creatorId);
    if (account) {
      account.verificationStatus = "verified";
      account.accountStatus = "active";
      account.updatedAt = new Date();
    }
    return account || null;
  }

  /**
   * Get creator's Stripe account
   */
  getAccount(creatorId: string): StripeConnectAccount | null {
    return this.accounts.get(creatorId) || null;
  }

  /**
   * Create transfer to creator
   */
  async createTransfer(
    creatorId: string,
    amount: number, // in dollars
    description: string = "Daily creator payout"
  ): Promise<StripeTransfer | null> {
    const account = this.accounts.get(creatorId);
    if (!account || account.accountStatus !== "active") {
      return null;
    }

    const transfer: StripeTransfer = {
      id: `tr_${Date.now()}`,
      creatorId,
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      destination: account.stripeConnectId,
      description,
      status: "pending",
      createdAt: new Date(),
    };

    this.transfers.set(transfer.id, transfer);

    // In production, call actual Stripe API:
    // const stripe = require('stripe')(this.stripeApiKey);
    // const stripeTransfer = await stripe.transfers.create({
    //   amount: transfer.amount,
    //   currency: transfer.currency,
    //   destination: transfer.destination,
    //   description: transfer.description,
    // });
    // transfer.id = stripeTransfer.id;

    // Simulate successful transfer
    transfer.status = "in_transit";
    setTimeout(() => {
      transfer.status = "paid";
      transfer.arrivedAt = new Date();
    }, 1000);

    return transfer;
  }

  /**
   * Create batch payout for multiple creators
   */
  async createPayoutBatch(
    payouts: Array<{ creatorId: string; amount: number }>
  ): Promise<PayoutBatch> {
    const batch: PayoutBatch = {
      id: `batch_${Date.now()}`,
      batchDate: new Date(),
      totalAmount: 0,
      totalCreators: 0,
      transfers: [],
      status: "pending",
    };

    for (const payout of payouts) {
      const transfer = await this.createTransfer(
        payout.creatorId,
        payout.amount,
        `Daily payout - ${new Date().toDateString()}`
      );

      if (transfer) {
        batch.transfers.push(transfer);
        batch.totalAmount += payout.amount;
        batch.totalCreators += 1;
      }
    }

    batch.status = batch.transfers.length > 0 ? "processing" : "failed";
    this.batches.push(batch);

    return batch;
  }

  /**
   * Get transfer status
   */
  getTransferStatus(transferId: string): StripeTransfer | null {
    return this.transfers.get(transferId) || null;
  }

  /**
   * Get creator's transfer history
   */
  getCreatorTransfers(creatorId: string): StripeTransfer[] {
    return Array.from(this.transfers.values()).filter(
      (t) => t.creatorId === creatorId
    );
  }

  /**
   * Get payout batch
   */
  getPayoutBatch(batchId: string): PayoutBatch | null {
    return this.batches.find((b) => b.id === batchId) || null;
  }

  /**
   * Get all payout batches
   */
  getAllPayoutBatches(): PayoutBatch[] {
    return this.batches;
  }

  /**
   * Get payout statistics
   */
  getPayoutStats(): {
    totalTransfers: number;
    totalAmount: number;
    successfulTransfers: number;
    failedTransfers: number;
    pendingTransfers: number;
    averageTransferAmount: number;
  } {
    const transfers = Array.from(this.transfers.values());
    const totalTransfers = transfers.length;
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount / 100, 0);
    const successfulTransfers = transfers.filter(
      (t) => t.status === "paid"
    ).length;
    const failedTransfers = transfers.filter(
      (t) => t.status === "failed"
    ).length;
    const pendingTransfers = transfers.filter(
      (t) => t.status === "pending" || t.status === "in_transit"
    ).length;
    const averageTransferAmount =
      totalTransfers > 0 ? totalAmount / totalTransfers : 0;

    return {
      totalTransfers,
      totalAmount,
      successfulTransfers,
      failedTransfers,
      pendingTransfers,
      averageTransferAmount,
    };
  }

  /**
   * Retry failed transfer
   */
  async retryTransfer(transferId: string): Promise<StripeTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== "failed") {
      return null;
    }

    transfer.status = "pending";
    transfer.failureReason = undefined;

    // Retry the transfer
    const account = this.accounts.get(transfer.creatorId);
    if (account && account.accountStatus === "active") {
      transfer.status = "in_transit";
      return transfer;
    }

    transfer.status = "failed";
    transfer.failureReason = "Account not active";
    return transfer;
  }

  /**
   * Get account verification status
   */
  getVerificationStatus(creatorId: string): string {
    const account = this.accounts.get(creatorId);
    return account?.verificationStatus || "not_registered";
  }

  /**
   * List all creator accounts
   */
  getAllAccounts(): StripeConnectAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.accounts.clear();
    this.transfers.clear();
    this.batches = [];
  }
}

// Export singleton instance
export const stripeConnectPayouts = new StripeConnectPayoutsService();
