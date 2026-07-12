/**
 * ============================================================================
 * EMAIL VERIFICATION & PROMOTION SERVICE
 * ============================================================================
 * Handles email verification and automatic 30-day promotion email delivery
 * ============================================================================
 */

import { z } from "zod";

export interface EmailVerificationRecord {
  id: string;
  userId: string;
  email: string;
  verificationCode: string;
  verifiedAt: number | null;
  createdAt: number;
  expiresAt: number;
  promotionEmailSentAt: number | null;
}

export interface PromotionEmailPayload {
  userId: string;
  email: string;
  userName: string;
  tier: "tier_1" | "tier_2" | "tier_3";
  discountCode: string;
  discountPercentage: number;
  validUntilDays: number;
  promotionTitle: string;
  promotionDescription: string;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export function generateVerificationEmailHTML(verificationCode: string, userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code-box { background: white; border: 2px solid #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; font-family: monospace; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to UR! 🎉</h1>
            <p>Verify your email to get started</p>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Thank you for signing up for UR! To complete your registration, please verify your email address using the code below:</p>
            <div class="code-box">
              <div class="code">${verificationCode}</div>
            </div>
            <p>This code will expire in 24 hours.</p>
            <p>If you didn't sign up for UR, please ignore this email.</p>
            <div class="footer">
              <p>© 2026 UR LLC. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generatePromotionEmailHTML(payload: PromotionEmailPayload): string {
  const tierBenefits: Record<string, string> = {
    tier_1: "50% OFF 6 months + 2 lifetime drawing entries",
    tier_2: "60% OFF 90 days",
    tier_3: "50% OFF 30 days",
  };

  const tierColor: Record<string, string> = {
    tier_1: "#FFD700",
    tier_2: "#C0C0C0",
    tier_3: "#CD7F32",
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .promo-box { background: white; border-left: 5px solid ${tierColor[payload.tier]}; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .discount { font-size: 28px; font-weight: bold; color: ${tierColor[payload.tier]}; }
          .code-box { background: #f0f0f0; border: 2px dashed #667eea; padding: 15px; text-align: center; border-radius: 6px; margin: 15px 0; }
          .code { font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #667eea; font-family: monospace; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .countdown { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎁 Your 30-Day Launch Promotion!</h1>
            <p>Exclusive offer just for you</p>
          </div>
          <div class="content">
            <p>Hi ${payload.userName},</p>
            <p>Welcome to UR! As a new member, you've been assigned to <strong>${payload.tier === "tier_1" ? "Tier 1 (Genesis)" : payload.tier === "tier_2" ? "Tier 2" : "Tier 3"}</strong> of our exclusive launch program.</p>
            
            <div class="promo-box">
              <p><strong>${payload.promotionTitle}</strong></p>
              <div class="discount">${payload.discountPercentage}% OFF</div>
              <p>${tierBenefits[payload.tier]}</p>
            </div>

            <p><strong>${payload.promotionDescription}</strong></p>

            <p><strong>Your Discount Code:</strong></p>
            <div class="code-box">
              <div class="code">${payload.discountCode}</div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">Click to copy or use at checkout</p>

            <div class="countdown">
              <strong>⏰ Offer expires in ${payload.validUntilDays} days</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Don't miss out on this exclusive launch opportunity!</p>
            </div>

            <p><a href="https://urplatform.com/redeem?code=${payload.discountCode}" class="button">Claim Your Discount</a></p>

            <p>Questions? Reply to this email or visit our help center.</p>

            <div class="footer">
              <p>© 2026 UR LLC. All rights reserved.</p>
              <p>You're receiving this email because you signed up for UR.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================

export class EmailService {
  private verificationRecords: Map<string, EmailVerificationRecord> = new Map();
  private promotionEmailsSent: Map<string, number> = new Map();

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a discount code for promotion
   */
  private generateDiscountCode(tier: "tier_1" | "tier_2" | "tier_3"): string {
    const tierPrefix = tier === "tier_1" ? "GENESIS" : tier === "tier_2" ? "SILVER" : "BRONZE";
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${tierPrefix}${randomSuffix}`;
  }

  /**
   * Create email verification record
   */
  async createVerificationEmail(userId: string, email: string, userName: string): Promise<{
    success: boolean;
    verificationCode?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const verificationCode = this.generateVerificationCode();
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const record: EmailVerificationRecord = {
      id: `verify_${userId}_${now}`,
      userId,
      email,
      verificationCode,
      verifiedAt: null,
      createdAt: now,
      expiresAt,
      promotionEmailSentAt: null,
    };

    this.verificationRecords.set(record.id, record);

    // In production, send via SendGrid/Mailgun
    console.log(`[EMAIL] Verification email sent to ${email}`);
    console.log(`[EMAIL] Code: ${verificationCode}`);

    return {
      success: true,
      verificationCode,
      expiresIn: 24 * 60 * 60,
    };
  }

  /**
   * Verify email with code
   */
  async verifyEmail(userId: string, email: string, code: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const records = Array.from(this.verificationRecords.values());
    const record = records.find((r) => r.userId === userId && r.email === email);

    if (!record) {
      return { success: false, error: "Verification record not found" };
    }

    if (record.verificationCode !== code) {
      return { success: false, error: "Invalid verification code" };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, error: "Verification code expired" };
    }

    record.verifiedAt = Date.now();
    return { success: true };
  }

  /**
   * Send 30-day promotion email after verification
   */
  async sendPromotionEmail(payload: PromotionEmailPayload): Promise<{
    success: boolean;
    discountCode?: string;
    error?: string;
  }> {
    // Check if already sent
    if (this.promotionEmailsSent.has(payload.userId)) {
      return { success: false, error: "Promotion email already sent to this user" };
    }

    const discountCode = this.generateDiscountCode(payload.tier);

    // In production, send via SendGrid/Mailgun
    console.log(`[EMAIL] Promotion email sent to ${payload.email}`);
    console.log(`[EMAIL] Discount Code: ${discountCode}`);
    console.log(`[EMAIL] Tier: ${payload.tier}`);

    this.promotionEmailsSent.set(payload.userId, Date.now());

    return {
      success: true,
      discountCode,
    };
  }

  /**
   * Get verification record
   */
  getVerificationRecord(userId: string): EmailVerificationRecord | null {
    const records = Array.from(this.verificationRecords.values());
    return records.find((r) => r.userId === userId) || null;
  }

  /**
   * Check if promotion email was sent
   */
  wasPromotionEmailSent(userId: string): boolean {
    return this.promotionEmailsSent.has(userId);
  }

  /**
   * Get all verification records (admin)
   */
  getAllVerificationRecords(): EmailVerificationRecord[] {
    return Array.from(this.verificationRecords.values());
  }

  /**
   * Get unverified emails
   */
  getUnverifiedEmails(): EmailVerificationRecord[] {
    return Array.from(this.verificationRecords.values()).filter((r) => r.verifiedAt === null);
  }

  /**
   * Get pending promotion emails
   */
  getPendingPromotionEmails(): string[] {
    const verified = Array.from(this.verificationRecords.values()).filter((r) => r.verifiedAt !== null);
    return verified.filter((r) => !this.promotionEmailsSent.has(r.userId)).map((r) => r.userId);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const emailService = new EmailService();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const CreateVerificationEmailSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  userName: z.string(),
});

export const VerifyEmailSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  code: z.string().length(6),
});

export const SendPromotionEmailSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  userName: z.string(),
  tier: z.enum(["tier_1", "tier_2", "tier_3"]),
  promotionTitle: z.string(),
  promotionDescription: z.string(),
  validUntilDays: z.number().min(1).max(365),
});
