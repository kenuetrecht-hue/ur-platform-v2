/**
 * Walmart / Amazon affiliate compliance — AI-assisted listings require owner approval.
 */

import { TRPCError } from "@trpc/server";
import type { ProductSource, ProductStatus, StoreProduct } from "./commerce-catalog-service";

export type AffiliateApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

const approvalByProductId = new Map<string, AffiliateApprovalStatus>();

export function affiliateSupplierRequiresApproval(supplier?: string): boolean {
  if (!supplier) return false;
  const s = supplier.toLowerCase();
  return s.includes("amazon") || s.includes("walmart");
}

export function initialProductStatus(params: {
  sourceType: ProductSource;
  supplier?: string;
  aiAssisted?: boolean;
}): ProductStatus {
  if (params.sourceType === "affiliate" || affiliateSupplierRequiresApproval(params.supplier)) {
    return "paused";
  }
  if (params.aiAssisted) {
    return "paused";
  }
  return "active";
}

export function setAffiliateApproval(params: {
  productId: string;
  status: AffiliateApprovalStatus;
}): AffiliateApprovalStatus {
  approvalByProductId.set(params.productId, params.status);
  return params.status;
}

export function getAffiliateApproval(productId: string): AffiliateApprovalStatus {
  return approvalByProductId.get(productId) ?? "not_required";
}

export function assertProductVisibleToPublic(product: StoreProduct): boolean {
  if (product.status !== "active") return false;
  const approval = getAffiliateApproval(product.id);
  if (approval === "pending" || approval === "rejected") return false;
  return true;
}

export function approveAffiliateProduct(params: {
  productId: string;
  approved: boolean;
  isPlatformOwner: boolean;
}): { approval: AffiliateApprovalStatus; productStatus: ProductStatus } {
  if (!params.isPlatformOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the platform owner may approve affiliate/AI-assisted product listings.",
    });
  }
  const approval: AffiliateApprovalStatus = params.approved ? "approved" : "rejected";
  setAffiliateApproval({ productId: params.productId, status: approval });
  return {
    approval,
    productStatus: params.approved ? "active" : "archived",
  };
}

export const AFFILIATE_AI_COMPLIANCE_RULES = [
  "All AI-generated affiliate copy must be reviewed by the platform owner before going live.",
  "Never use Amazon/Walmart product data to train AI models.",
  "Disclose the affiliate relationship (FTC) and AI assistance on every listing.",
  "Product claims must match the actual item — no fabricated reviews or endorsements.",
  "Amazon Associates: no paid or incentivized reviews; do not cloak or wrap links to hide the destination; follow Amazon brand guidelines for trademarks in ads.",
  "Walmart Affiliates: honest claims only; disclose AI-enhanced product imagery when applicable.",
  "Only official amazon.com / walmart.com product URLs — tracking tags come from AMAZON_ASSOCIATE_TAG and WALMART_TRACKING_ID after each program approves the LLC.",
] as const;
