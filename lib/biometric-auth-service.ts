/**
 * Biometric Authentication Service
 * Secure admin access using facial recognition and fingerprint authentication
 * Only Kenneth Uetrecht (Admin ID: kenneth-001) can access admin panel
 */

export interface BiometricProfile {
  userId: string;
  userName: string;
  email: string;
  role: "admin" | "user";
  facialRecognitionEnabled: boolean;
  fingerprintEnabled: boolean;
  facialData?: {
    faceId: string;
    encodings: number[];
    capturedDate: string;
    confidence: number;
  };
  fingerprintData?: {
    fingerprintId: string;
    template: string;
    capturedDate: string;
    fingerType: "thumb" | "index" | "middle" | "ring" | "pinky";
  };
  backupCodes: string[];
  lastAuthenticationDate?: string;
  authenticationAttempts: number;
  lockoutUntil?: string;
}

export interface AuthenticationResult {
  success: boolean;
  userId?: string;
  userName?: string;
  authMethod: "facial" | "fingerprint" | "backup_code";
  confidence?: number;
  message: string;
  timestamp: string;
}

export interface BiometricScanResult {
  type: "facial" | "fingerprint";
  detected: boolean;
  confidence: number;
  matchPercentage: number;
  rawData?: {
    imageData?: string;
    templateData?: string;
  };
}

/**
 * Biometric Authentication Service
 */
export class BiometricAuthService {
  private adminProfile: BiometricProfile = {
    userId: "kenneth-001",
    userName: "Kenneth Uetrecht",
    email: "kenneth@ur.app",
    role: "admin",
    facialRecognitionEnabled: true,
    fingerprintEnabled: true,
    facialData: {
      faceId: "face-kenneth-001",
      encodings: this.generateFaceEncodings(),
      capturedDate: "2026-01-01T00:00:00Z",
      confidence: 0.98,
    },
    fingerprintData: {
      fingerprintId: "fp-kenneth-001",
      template: this.generateFingerprintTemplate(),
      capturedDate: "2026-01-01T00:00:00Z",
      fingerType: "thumb",
    },
    backupCodes: this.generateBackupCodes(),
    authenticationAttempts: 0,
  };

  private authenticationLog: AuthenticationResult[] = [];
  private maxAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the biometric service
   */
  private initializeService(): void {
    console.log("🔐 Biometric Authentication Service Initialized");
    console.log("✓ Admin Profile: Kenneth Uetrecht");
    console.log("✓ Facial Recognition: Enabled");
    console.log("✓ Fingerprint Authentication: Enabled");
    console.log("✓ Backup Codes: Generated");
  }

  /**
   * Generate face encodings (simulated)
   */
  private generateFaceEncodings(): number[] {
    // In production, this would be actual face embeddings from a model like FaceNet
    const encodings: number[] = [];
    for (let i = 0; i < 128; i++) {
      encodings.push(Math.random() * 2 - 1);
    }
    return encodings;
  }

  /**
   * Generate fingerprint template (simulated)
   */
  private generateFingerprintTemplate(): string {
    // In production, this would be actual fingerprint minutiae data
    const randomData = Math.random().toString(36).substring(2, 15);
    return btoa(randomData); // Use btoa for base64 encoding in browser
  }

  /**
   * Generate backup codes for emergency access
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Authenticate using facial recognition
   */
  async authenticateWithFacial(faceImageData: string): Promise<AuthenticationResult> {
    const result: AuthenticationResult = {
      success: false,
      authMethod: "facial",
      message: "Facial authentication failed",
      timestamp: new Date().toISOString(),
    };

    // Check if admin is locked out
    if (this.isLockedOut()) {
      result.message = "Account temporarily locked due to too many failed attempts";
      return result;
    }

    try {
      // Simulate facial recognition processing
      const scanResult = await this.processFacialScan(faceImageData);

      if (scanResult.detected && scanResult.matchPercentage > 0.95) {
        // Successful authentication
        result.success = true;
        result.userId = this.adminProfile.userId;
        result.userName = this.adminProfile.userName;
        result.confidence = scanResult.matchPercentage;
        result.message = `Welcome, ${this.adminProfile.userName}! Facial recognition successful.`;

        // Reset authentication attempts
        this.adminProfile.authenticationAttempts = 0;
        this.adminProfile.lastAuthenticationDate = new Date().toISOString();

        this.logAuthentication(result);
        return result;
      } else {
        // Failed authentication
        this.adminProfile.authenticationAttempts++;
        result.message = `Facial recognition failed. Attempt ${this.adminProfile.authenticationAttempts}/${this.maxAttempts}`;

        if (this.adminProfile.authenticationAttempts >= this.maxAttempts) {
          this.lockAccount();
          result.message = "Account locked due to too many failed attempts. Try again in 15 minutes.";
        }

        this.logAuthentication(result);
        return result;
      }
    } catch (error) {
      result.message = "Facial recognition error: " + (error as Error).message;
      this.logAuthentication(result);
      return result;
    }
  }

  /**
   * Authenticate using fingerprint
   */
  async authenticateWithFingerprint(fingerprintData: string): Promise<AuthenticationResult> {
    const result: AuthenticationResult = {
      success: false,
      authMethod: "fingerprint",
      message: "Fingerprint authentication failed",
      timestamp: new Date().toISOString(),
    };

    // Check if admin is locked out
    if (this.isLockedOut()) {
      result.message = "Account temporarily locked due to too many failed attempts";
      return result;
    }

    try {
      // Simulate fingerprint recognition processing
      const scanResult = await this.processFingerprintScan(fingerprintData);

      if (scanResult.detected && scanResult.matchPercentage > 0.98) {
        // Successful authentication
        result.success = true;
        result.userId = this.adminProfile.userId;
        result.userName = this.adminProfile.userName;
        result.confidence = scanResult.matchPercentage;
        result.message = `Welcome, ${this.adminProfile.userName}! Fingerprint recognized.`;

        // Reset authentication attempts
        this.adminProfile.authenticationAttempts = 0;
        this.adminProfile.lastAuthenticationDate = new Date().toISOString();

        this.logAuthentication(result);
        return result;
      } else {
        // Failed authentication
        this.adminProfile.authenticationAttempts++;
        result.message = `Fingerprint not recognized. Attempt ${this.adminProfile.authenticationAttempts}/${this.maxAttempts}`;

        if (this.adminProfile.authenticationAttempts >= this.maxAttempts) {
          this.lockAccount();
          result.message = "Account locked due to too many failed attempts. Try again in 15 minutes.";
        }

        this.logAuthentication(result);
        return result;
      }
    } catch (error) {
      result.message = "Fingerprint authentication error: " + (error as Error).message;
      this.logAuthentication(result);
      return result;
    }
  }

  /**
   * Authenticate using backup code
   */
  authenticateWithBackupCode(code: string): AuthenticationResult {
    const result: AuthenticationResult = {
      success: false,
      authMethod: "backup_code",
      message: "Backup code invalid or already used",
      timestamp: new Date().toISOString(),
    };

    // Check if admin is locked out
    if (this.isLockedOut()) {
      result.message = "Account temporarily locked due to too many failed attempts";
      return result;
    }

    const codeIndex = this.adminProfile.backupCodes.indexOf(code.toUpperCase());

    if (codeIndex !== -1) {
      // Valid backup code found
      result.success = true;
      result.userId = this.adminProfile.userId;
      result.userName = this.adminProfile.userName;
      result.message = `Welcome, ${this.adminProfile.userName}! Backup code accepted.`;

      // Remove used code
      this.adminProfile.backupCodes.splice(codeIndex, 1);

      // Reset authentication attempts
      this.adminProfile.authenticationAttempts = 0;
      this.adminProfile.lastAuthenticationDate = new Date().toISOString();

      this.logAuthentication(result);
      return result;
    } else {
      // Invalid backup code
      this.adminProfile.authenticationAttempts++;
      result.message = `Invalid backup code. Attempt ${this.adminProfile.authenticationAttempts}/${this.maxAttempts}`;

      if (this.adminProfile.authenticationAttempts >= this.maxAttempts) {
        this.lockAccount();
        result.message = "Account locked due to too many failed attempts. Try again in 15 minutes.";
      }

      this.logAuthentication(result);
      return result;
    }
  }

  /**
   * Process facial scan (simulated)
   */
  private async processFacialScan(faceImageData: string): Promise<BiometricScanResult> {
    return new Promise((resolve) => {
      // Simulate processing delay
      setTimeout(() => {
        // In production, this would use actual face recognition ML model
        // For now, we simulate a successful match if data is provided
        const isValid = faceImageData && faceImageData.length > 0;

        resolve({
          type: "facial",
          detected: isValid,
          confidence: isValid ? 0.98 : 0.2,
          matchPercentage: isValid ? 0.98 : 0.2,
          rawData: {
            imageData: faceImageData,
          },
        });
      }, 2000); // Simulate 2-second processing time
    });
  }

  /**
   * Process fingerprint scan (simulated)
   */
  private async processFingerprintScan(fingerprintData: string): Promise<BiometricScanResult> {
    return new Promise((resolve) => {
      // Simulate processing delay
      setTimeout(() => {
        // In production, this would use actual fingerprint matching algorithm
        // For now, we simulate a successful match if data is provided
        const isValid = fingerprintData && fingerprintData.length > 0;

        resolve({
          type: "fingerprint",
          detected: isValid,
          confidence: isValid ? 0.99 : 0.1,
          matchPercentage: isValid ? 0.99 : 0.1,
          rawData: {
            templateData: fingerprintData,
          },
        });
      }, 1500); // Simulate 1.5-second processing time
    });
  }

  /**
   * Check if account is locked out
   */
  private isLockedOut(): boolean {
    if (!this.adminProfile.lockoutUntil) {
      return false;
    }

    const lockoutTime = new Date(this.adminProfile.lockoutUntil).getTime();
    const currentTime = new Date().getTime();

    if (currentTime > lockoutTime) {
      // Lockout period has expired
      this.adminProfile.lockoutUntil = undefined;
      this.adminProfile.authenticationAttempts = 0;
      return false;
    }

    return true;
  }

  /**
   * Lock account after too many failed attempts
   */
  private lockAccount(): void {
    const lockoutTime = new Date(Date.now() + this.lockoutDuration);
    this.adminProfile.lockoutUntil = lockoutTime.toISOString();
  }

  /**
   * Log authentication attempt
   */
  private logAuthentication(result: AuthenticationResult): void {
    this.authenticationLog.push(result);
  }

  /**
   * Get authentication logs
   */
  getAuthenticationLogs(limit: number = 50): AuthenticationResult[] {
    return this.authenticationLog.slice(-limit).reverse();
  }

  /**
   * Get admin profile
   */
  getAdminProfile(): BiometricProfile {
    return { ...this.adminProfile };
  }

  /**
   * Update facial recognition data
   */
  updateFacialData(faceImageData: string): boolean {
    try {
      this.adminProfile.facialData = {
        faceId: `face-kenneth-${Date.now()}`,
        encodings: this.generateFaceEncodings(),
        capturedDate: new Date().toISOString(),
        confidence: 0.98,
      };
      return true;
    } catch (error) {
      console.error("Error updating facial data:", error);
      return false;
    }
  }

  /**
   * Update fingerprint data
   */
  updateFingerprintData(fingerprintData: string, fingerType: string): boolean {
    try {
      this.adminProfile.fingerprintData = {
        fingerprintId: `fp-kenneth-${Date.now()}`,
        template: this.generateFingerprintTemplate(),
        capturedDate: new Date().toISOString(),
        fingerType: (fingerType as any) || "thumb",
      };
      return true;
    } catch (error) {
      console.error("Error updating fingerprint data:", error);
      return false;
    }
  }

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes(): string[] {
    this.adminProfile.backupCodes = this.generateBackupCodes();
    return [...this.adminProfile.backupCodes];
  }

  /**
   * Get remaining backup codes count
   */
  getRemainingBackupCodes(): number {
    return this.adminProfile.backupCodes.length;
  }

  /**
   * Get lockout status
   */
  getLockoutStatus(): {
    isLocked: boolean;
    remainingTime?: number;
    attempts: number;
    maxAttempts: number;
  } {
    const isLocked = this.isLockedOut();
    let remainingTime: number | undefined;

    if (isLocked && this.adminProfile.lockoutUntil) {
      const lockoutTime = new Date(this.adminProfile.lockoutUntil).getTime();
      const currentTime = new Date().getTime();
      remainingTime = Math.max(0, lockoutTime - currentTime);
    }

    return {
      isLocked,
      remainingTime,
      attempts: this.adminProfile.authenticationAttempts,
      maxAttempts: this.maxAttempts,
    };
  }

  /**
   * Reset security (emergency admin only)
   */
  resetSecurity(): void {
    this.adminProfile.authenticationAttempts = 0;
    this.adminProfile.lockoutUntil = undefined;
    this.authenticationLog = [];
  }

  /**
   * Verify admin access
   */
  isAdminAuthenticated(userId: string): boolean {
    return userId === "kenneth-001";
  }
}

// Export singleton instance
export const biometricAuthService = new BiometricAuthService();
