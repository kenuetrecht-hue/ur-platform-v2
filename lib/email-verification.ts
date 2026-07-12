/**
 * Email Verification Service
 * Handles email verification for new creator accounts
 */

export interface VerificationToken {
  token: string;
  email: string;
  creatorId: string;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
}

export class EmailVerificationService {
  private tokens: Map<string, VerificationToken> = new Map();
  private verifiedEmails: Set<string> = new Set();
  private tokenExpiry: number = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate verification token for email
   */
  generateVerificationToken(email: string, creatorId: string): VerificationToken {
    const token = this.generateRandomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.tokenExpiry);

    const verificationToken: VerificationToken = {
      token,
      email,
      creatorId,
      createdAt: now,
      expiresAt,
      verified: false,
    };

    this.tokens.set(token, verificationToken);
    return verificationToken;
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): boolean {
    const verification = this.tokens.get(token);
    
    if (!verification) {
      return false;
    }

    if (verification.verified) {
      return true; // Already verified
    }

    if (new Date() > verification.expiresAt) {
      return false; // Token expired
    }

    verification.verified = true;
    this.verifiedEmails.add(verification.email);
    return true;
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(email: string): boolean {
    return this.verifiedEmails.has(email);
  }

  /**
   * Get verification token
   */
  getVerificationToken(token: string): VerificationToken | undefined {
    return this.tokens.get(token);
  }

  /**
   * Resend verification email (generate new token)
   */
  resendVerificationToken(email: string, creatorId: string): VerificationToken {
    // Invalidate old tokens for this email
    for (const [key, token] of this.tokens.entries()) {
      if (token.email === email && !token.verified) {
        this.tokens.delete(key);
      }
    }

    return this.generateVerificationToken(email, creatorId);
  }

  /**
   * Get verification status for creator
   */
  getVerificationStatus(creatorId: string): {
    verified: boolean;
    email?: string;
    expiresAt?: Date;
  } {
    for (const token of this.tokens.values()) {
      if (token.creatorId === creatorId) {
        return {
          verified: token.verified,
          email: token.email,
          expiresAt: token.verified ? undefined : token.expiresAt,
        };
      }
    }

    return { verified: false };
  }

  /**
   * Generate random token
   */
  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [key, token] of this.tokens.entries()) {
      if (now > token.expiresAt && !token.verified) {
        this.tokens.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get token count (for testing)
   */
  getTokenCount(): number {
    return this.tokens.size;
  }

  /**
   * Get verified email count (for testing)
   */
  getVerifiedEmailCount(): number {
    return this.verifiedEmails.size;
  }
}
