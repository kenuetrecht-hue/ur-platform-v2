/**
 * Manual pay records for custom creator work.
 * Payouts are sent by hand — not an automatic hold or a money-transmitter product.
 */

import { z } from "zod";

export type ManualPayStatus =
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
  paymentPercentage: number;
  status: MilestoneStatus;
  completionProof?: string;
  completedAt?: Date;
}

export interface ManualPayTransaction {
  paymentId: string;
  creatorId: string;
  customerId: string;
  totalAmountUSD: number;
  currency: "USD" | "POINTS";
  description: string;
  milestones: Milestone[];
  status: ManualPayStatus;
  createdAt: Date;
  updatedAt: Date;
  disputeReason?: string;
  arbitrationNotes?: string;
}

export function createManualPayTransaction(
  creatorId: string,
  customerId: string,
  totalAmountUSD: number,
  description: string,
  milestones: Omit<Milestone, "milestoneId" | "status" | "completedAt">[],
): ManualPayTransaction {
  const totalPercentage = milestones.reduce((sum, m) => sum + m.paymentPercentage, 0);
  if (totalPercentage !== 100) {
    throw new Error(`Milestone percentages must sum to 100, got ${totalPercentage}`);
  }

  return {
    paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

export function acceptManualPayTransaction(
  record: ManualPayTransaction,
  _acceptedBy: "creator" | "customer",
): ManualPayTransaction {
  if (record.status !== "pending_acceptance") {
    throw new Error(`Cannot accept this manual pay in ${record.status} status`);
  }

  return {
    ...record,
    status: "active",
    updatedAt: new Date(),
  };
}

export function completeMilestone(
  record: ManualPayTransaction,
  milestoneId: string,
  completionProof: string,
): ManualPayTransaction {
  const updatedMilestones = record.milestones.map((m) =>
    m.milestoneId === milestoneId
      ? {
          ...m,
          status: "completed" as MilestoneStatus,
          completionProof,
          completedAt: new Date(),
        }
      : m,
  );

  const allCompleted = updatedMilestones.every((m) => m.status === "completed");

  return {
    ...record,
    milestones: updatedMilestones,
    status: allCompleted ? "completed" : "milestone_completed",
    updatedAt: new Date(),
  };
}

export function raiseDispute(record: ManualPayTransaction, reason: string): ManualPayTransaction {
  if (record.status === "completed" || record.status === "resolved") {
    throw new Error(`Cannot dispute a ${record.status} transaction`);
  }

  return {
    ...record,
    status: "dispute_raised",
    disputeReason: reason,
    updatedAt: new Date(),
  };
}

export function resolveDispute(
  record: ManualPayTransaction,
  resolution: "creator_wins" | "customer_wins" | "split_50_50",
  arbitrationNotes: string,
): ManualPayTransaction {
  if (record.status !== "dispute_raised") {
    throw new Error(`Cannot resolve dispute for ${record.status} transaction`);
  }

  return {
    ...record,
    status: "resolved",
    arbitrationNotes: `${resolution}: ${arbitrationNotes}`,
    updatedAt: new Date(),
  };
}

export function calculateManualPay(record: ManualPayTransaction): {
  creatorPayout: number;
  customerRefund: number;
  completionPercentage: number;
} {
  const completedMilestones = record.milestones.filter((m) => m.status === "completed");
  const totalCompleted = completedMilestones.reduce((sum, m) => sum + m.paymentPercentage, 0);

  const creatorPayout = (record.totalAmountUSD * totalCompleted) / 100;
  const customerRefund = record.totalAmountUSD - creatorPayout;

  return {
    creatorPayout: Number(creatorPayout.toFixed(2)),
    customerRefund: Number(customerRefund.toFixed(2)),
    completionPercentage: totalCompleted,
  };
}

export const MilestoneSchema = z.object({
  milestoneId: z.string(),
  description: z.string(),
  dueDate: z.date(),
  paymentPercentage: z.number().min(0).max(100),
  status: z.enum(["pending", "in_progress", "completed", "disputed"]),
  completionProof: z.string().optional(),
  completedAt: z.date().optional(),
});

export const ManualPayTransactionSchema = z.object({
  paymentId: z.string(),
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
});

export const ManualPay = {
  createManualPayTransaction,
  acceptManualPayTransaction,
  completeMilestone,
  raiseDispute,
  resolveDispute,
  calculateManualPay,
};
