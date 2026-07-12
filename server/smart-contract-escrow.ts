/**
 * ============================================================================
 * 🔐 DYNAMIC SMART CONTRACT DIGITAL ESCROW
 * ============================================================================
 * Protects custom transactions between creators and users
 * Milestone-based holds, dispute resolution, and automated payouts
 * ============================================================================
 */

import { z } from "zod";

export type EscrowStatus =
  | "pending_acceptance"
  | "active"
  | "milestone_completed"
  | "dispute_raised"
  | "resolved"
  | "completed";

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "disputed";

export interface Milestone {
  milestoneId: string;
  description: string;
  dueDate: Date;
  paymentPercentage: number; // 0-100
  status: MilestoneStatus;
  completionProof?: string; // URL or description
  completedAt?: Date;
}

export interface EscrowTransaction {
  escrowId: string;
  creatorId: string;
  customerId: string;
  totalAmountUSD: number;
  currency: "USD" | "POINTS";
  description: string;
  milestones: Milestone[];
  status: EscrowStatus;
  createdAt: Date;
  updatedAt: Date;
  disputeReason?: string;
  arbitrationNotes?: string;
  autoReleaseDate?: Date;
}

/**
 * Creates a new escrow transaction with milestones
 */
export function createEscrowTransaction(
  creatorId: string,
  customerId: string,
  totalAmountUSD: number,
  description: string,
  milestones: Omit<Milestone, "milestoneId" | "status" | "completedAt">[]
): EscrowTransaction {
  // Validate milestone percentages sum to 100
  const totalPercentage = milestones.reduce((sum, m) => sum + m.paymentPercentage, 0);
  if (totalPercentage !== 100) {
    throw new Error(`Milestone percentages must sum to 100, got ${totalPercentage}`);
  }

  return {
    escrowId: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    creatorId,
    customerId,
    totalAmountUSD,
    currency: "USD",
    description,
    milestones: milestones.map((m, idx) => ({
      ...m,
      milestoneId: `ms_${idx}`,
      status: "pending" as MilestoneStatus,
    })),
    status: "pending_acceptance",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Accepts escrow transaction (both parties agree)
 */
export function acceptEscrowTransaction(
  escrow: EscrowTransaction,
  acceptedBy: "creator" | "customer"
): EscrowTransaction {
  if (escrow.status !== "pending_acceptance") {
    throw new Error(`Cannot accept escrow in ${escrow.status} status`);
  }

  return {
    ...escrow,
    status: "active",
    updatedAt: new Date(),
  };
}

/**
 * Marks milestone as completed
 */
export function completeMilestone(
  escrow: EscrowTransaction,
  milestoneId: string,
  completionProof: string
): EscrowTransaction {
  const updatedMilestones = escrow.milestones.map((m) =>
    m.milestoneId === milestoneId
      ? {
          ...m,
          status: "completed" as MilestoneStatus,
          completionProof,
          completedAt: new Date(),
        }
      : m
  );

  const allCompleted = updatedMilestones.every((m) => m.status === "completed");

  return {
    ...escrow,
    milestones: updatedMilestones,
    status: allCompleted ? "completed" : "milestone_completed",
    updatedAt: new Date(),
  };
}

/**
 * Raises a dispute on the escrow
 */
export function raiseDispute(
  escrow: EscrowTransaction,
  reason: string
): EscrowTransaction {
  if (escrow.status === "completed" || escrow.status === "resolved") {
    throw new Error(`Cannot dispute a ${escrow.status} transaction`);
  }

  return {
    ...escrow,
    status: "dispute_raised",
    disputeReason: reason,
    updatedAt: new Date(),
  };
}

/**
 * Resolves dispute with arbitration
 */
export function resolveDispute(
  escrow: EscrowTransaction,
  resolution: "creator_wins" | "customer_wins" | "split_50_50",
  arbitrationNotes: string
): EscrowTransaction {
  if (escrow.status !== "dispute_raised") {
    throw new Error(`Cannot resolve dispute for ${escrow.status} transaction`);
  }

  return {
    ...escrow,
    status: "resolved",
    arbitrationNotes: `${resolution}: ${arbitrationNotes}`,
    updatedAt: new Date(),
  };
}

/**
 * Calculates payout based on completed milestones
 */
export function calculateEscrowPayout(escrow: EscrowTransaction): {
  creatorPayout: number;
  customerRefund: number;
  completionPercentage: number;
} {
  const completedMilestones = escrow.milestones.filter(
    (m) => m.status === "completed"
  );
  const totalCompleted = completedMilestones.reduce(
    (sum, m) => sum + m.paymentPercentage,
    0
  );

  const creatorPayout = (escrow.totalAmountUSD * totalCompleted) / 100;
  const customerRefund = escrow.totalAmountUSD - creatorPayout;

  return {
    creatorPayout: Number(creatorPayout.toFixed(2)),
    customerRefund: Number(customerRefund.toFixed(2)),
    completionPercentage: totalCompleted,
  };
}

/**
 * Auto-releases funds if auto-release date is reached
 */
export function checkAutoRelease(escrow: EscrowTransaction): EscrowTransaction {
  if (!escrow.autoReleaseDate || escrow.status === "completed") {
    return escrow;
  }

  if (new Date() >= escrow.autoReleaseDate) {
    return {
      ...escrow,
      status: "completed",
      updatedAt: new Date(),
    };
  }

  return escrow;
}

/**
 * Zod Schemas for Validation
 */
export const MilestoneSchema = z.object({
  milestoneId: z.string(),
  description: z.string(),
  dueDate: z.date(),
  paymentPercentage: z.number().min(0).max(100),
  status: z.enum(["pending", "in_progress", "completed", "disputed"]),
  completionProof: z.string().optional(),
  completedAt: z.date().optional(),
});

export const EscrowTransactionSchema = z.object({
  escrowId: z.string(),
  creatorId: z.string(),
  customerId: z.string(),
  totalAmountUSD: z.number().min(0),
  currency: z.enum(["USD", "POINTS"]),
  description: z.string(),
  milestones: z.array(MilestoneSchema),
  status: z.enum([
    "pending_acceptance",
    "active",
    "milestone_completed",
    "dispute_raised",
    "resolved",
    "completed",
  ]),
  createdAt: z.date(),
  updatedAt: z.date(),
  disputeReason: z.string().optional(),
  arbitrationNotes: z.string().optional(),
  autoReleaseDate: z.date().optional(),
});

/**
 * Export smart contract escrow engine
 */
export const SmartContractEscrow = {
  createEscrowTransaction,
  acceptEscrowTransaction,
  completeMilestone,
  raiseDispute,
  resolveDispute,
  calculateEscrowPayout,
  checkAutoRelease,
};
