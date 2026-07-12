import { describe, it, expect, beforeEach } from "vitest";
import { BiometricAuthService } from "../lib/biometric-auth-service";

describe("Biometric Authentication Service", () => {
  let authService: BiometricAuthService;

  beforeEach(() => {
    authService = new BiometricAuthService();
  });

  describe("Facial Recognition Authentication", () => {
    const testTimeout = 15000; // 15 seconds for async tests
    it("should successfully authenticate with valid facial data", async () => {
      const result = await authService.authenticateWithFacial("valid_face_data");
      expect(result.success).toBe(true);
      expect(result.userId).toBe("kenneth-001");
      expect(result.userName).toBe("Kenneth Uetrecht");
      expect(result.authMethod).toBe("facial");
    });

    it("should fail authentication with invalid facial data", async () => {
      const result = await authService.authenticateWithFacial("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });

    it("should increment authentication attempts on failure", async () => {
      const initialStatus = authService.getLockoutStatus();
      await authService.authenticateWithFacial("");
      const updatedStatus = authService.getLockoutStatus();
      expect(updatedStatus.attempts).toBe(initialStatus.attempts + 1);
    });

    it("should lock account after max failed attempts", async () => {
      for (let i = 0; i < 5; i++) {
        await authService.authenticateWithFacial("");
      }
      const status = authService.getLockoutStatus();
      expect(status.isLocked).toBe(true);
    }, { timeout: testTimeout });

    it("should reset attempts on successful authentication", async () => {
      await authService.authenticateWithFacial("");
      let status = authService.getLockoutStatus();
      expect(status.attempts).toBe(1);

      const result = await authService.authenticateWithFacial("valid_face_data");
      expect(result.success).toBe(true);

      status = authService.getLockoutStatus();
      expect(status.attempts).toBe(0);
    });
  });

  describe("Fingerprint Authentication", () => {
    it("should successfully authenticate with valid fingerprint data", async () => {
      const result = await authService.authenticateWithFingerprint("valid_fingerprint_data");
      expect(result.success).toBe(true);
      expect(result.userId).toBe("kenneth-001");
      expect(result.authMethod).toBe("fingerprint");
    });

    it("should fail authentication with invalid fingerprint data", async () => {
      const result = await authService.authenticateWithFingerprint("");
      expect(result.success).toBe(false);
    });

    it("should have higher confidence threshold than facial recognition", async () => {
      const facialResult = await authService.authenticateWithFacial("valid_face_data");
      const fingerprintResult = await authService.authenticateWithFingerprint("valid_fingerprint_data");

      expect(facialResult.success).toBe(true);
      expect(fingerprintResult.success).toBe(true);
      expect((fingerprintResult.confidence || 0) >= (facialResult.confidence || 0)).toBe(true);
    });
  });

  describe("Backup Code Authentication", () => {
    it("should successfully authenticate with valid backup code", () => {
      const profile = authService.getAdminProfile();
      const validCode = profile.backupCodes[0];

      const result = authService.authenticateWithBackupCode(validCode);
      expect(result.success).toBe(true);
      expect(result.authMethod).toBe("backup_code");
    });

    it("should fail authentication with invalid backup code", () => {
      const result = authService.authenticateWithBackupCode("INVALID_CODE");
      expect(result.success).toBe(false);
    });

    it("should remove used backup code", () => {
      const profile1 = authService.getAdminProfile();
      const initialCount = profile1.backupCodes.length;
      const validCode = profile1.backupCodes[0];

      authService.authenticateWithBackupCode(validCode);

      const profile2 = authService.getAdminProfile();
      expect(profile2.backupCodes.length).toBe(initialCount - 1);
      expect(profile2.backupCodes).not.toContain(validCode);
    });

    it("should not allow reuse of backup codes", () => {
      const profile = authService.getAdminProfile();
      const validCode = profile.backupCodes[0];

      const result1 = authService.authenticateWithBackupCode(validCode);
      expect(result1.success).toBe(true);

      const result2 = authService.authenticateWithBackupCode(validCode);
      expect(result2.success).toBe(false);
    });

    it("should be case-insensitive", () => {
      const profile = authService.getAdminProfile();
      const validCode = profile.backupCodes[0];

      const result = authService.authenticateWithBackupCode(validCode.toLowerCase());
      expect(result.success).toBe(true);
    });
  });

  describe("Account Lockout", () => {
    const testTimeout = 15000; // 15 seconds for async tests
    it("should lock account after 5 failed attempts", async () => {
      for (let i = 0; i < 5; i++) {
        await authService.authenticateWithFacial("");
      }

      const status = authService.getLockoutStatus();
      expect(status.isLocked).toBe(true);
      expect(status.remainingTime).toBeGreaterThan(0);
    }, { timeout: testTimeout });

    it("should prevent authentication when locked", async () => {
      for (let i = 0; i < 5; i++) {
        await authService.authenticateWithFacial("");
      }

      const result = await authService.authenticateWithFacial("valid_face_data");
      expect(result.success).toBe(false);
      expect(result.message).toContain("locked");
    }, { timeout: testTimeout });

    it("should track remaining lockout time", async () => {
      for (let i = 0; i < 5; i++) {
        await authService.authenticateWithFacial("");
      }

      const status = authService.getLockoutStatus();
      expect(status.isLocked).toBe(true);
      expect(status.remainingTime).toBeDefined();
      expect(status.remainingTime).toBeGreaterThan(0);
      expect(status.remainingTime).toBeLessThanOrEqual(15 * 60 * 1000);
    }, { timeout: testTimeout });
  });

  describe("Admin Profile Management", () => {
    it("should return admin profile for Kenneth Uetrecht", () => {
      const profile = authService.getAdminProfile();
      expect(profile.userId).toBe("kenneth-001");
      expect(profile.userName).toBe("Kenneth Uetrecht");
      expect(profile.role).toBe("admin");
    });

    it("should have facial recognition enabled", () => {
      const profile = authService.getAdminProfile();
      expect(profile.facialRecognitionEnabled).toBe(true);
      expect(profile.facialData).toBeDefined();
    });

    it("should have fingerprint authentication enabled", () => {
      const profile = authService.getAdminProfile();
      expect(profile.fingerprintEnabled).toBe(true);
      expect(profile.fingerprintData).toBeDefined();
    });

    it("should have backup codes generated", () => {
      const profile = authService.getAdminProfile();
      expect(profile.backupCodes.length).toBeGreaterThan(0);
    });
  });

  describe("Biometric Data Updates", () => {
    it("should update facial recognition data", () => {
      const profile1 = authService.getAdminProfile();
      const originalFaceId = profile1.facialData?.faceId;

      const success = authService.updateFacialData("new_face_data");
      expect(success).toBe(true);

      const profile2 = authService.getAdminProfile();
      expect(profile2.facialData?.faceId).not.toBe(originalFaceId);
    });

    it("should update fingerprint data", () => {
      const profile1 = authService.getAdminProfile();
      const originalFingerprintId = profile1.fingerprintData?.fingerprintId;

      const success = authService.updateFingerprintData("new_fingerprint_data", "index");
      expect(success).toBe(true);

      const profile2 = authService.getAdminProfile();
      expect(profile2.fingerprintData?.fingerprintId).not.toBe(originalFingerprintId);
      expect(profile2.fingerprintData?.fingerType).toBe("index");
    });

    it("should regenerate backup codes", () => {
      const profile1 = authService.getAdminProfile();
      const originalCodes = [...profile1.backupCodes];

      const newCodes = authService.regenerateBackupCodes();
      expect(newCodes.length).toBeGreaterThan(0);

      const profile2 = authService.getAdminProfile();
      expect(profile2.backupCodes).not.toEqual(originalCodes);
    });
  });

  describe("Authentication Logging", () => {
    it("should log authentication attempts", async () => {
      const logs1 = authService.getAuthenticationLogs();
      const initialCount = logs1.length;

      await authService.authenticateWithFacial("valid_face_data");

      const logs2 = authService.getAuthenticationLogs();
      expect(logs2.length).toBe(initialCount + 1);
    });

    it("should include authentication method in logs", async () => {
      await authService.authenticateWithFacial("valid_face_data");
      const logs = authService.getAuthenticationLogs(1);
      expect(logs[0].authMethod).toBe("facial");
    });

    it("should track success/failure in logs", async () => {
      await authService.authenticateWithFacial("valid_face_data");
      await authService.authenticateWithFacial("");

      const logs = authService.getAuthenticationLogs(2);
      expect(logs[1].success).toBe(true);
      expect(logs[0].success).toBe(false);
    });
  });

  describe("Admin Access Verification", () => {
    it("should verify Kenneth Uetrecht as admin", () => {
      const isAdmin = authService.isAdminAuthenticated("kenneth-001");
      expect(isAdmin).toBe(true);
    });

    it("should deny other users as admin", () => {
      const isAdmin = authService.isAdminAuthenticated("other-user-123");
      expect(isAdmin).toBe(false);
    });
  });

  describe("Security Features", () => {
    it("should have high confidence threshold for facial recognition", async () => {
      const result = await authService.authenticateWithFacial("valid_face_data");
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    it("should have very high confidence threshold for fingerprint", async () => {
      const result = await authService.authenticateWithFingerprint("valid_fingerprint_data");
      expect(result.confidence).toBeGreaterThan(0.98);
    });

    it("should track last authentication date", async () => {
      const profile1 = authService.getAdminProfile();
      const initialDate = profile1.lastAuthenticationDate;

      await authService.authenticateWithFacial("valid_face_data");

      const profile2 = authService.getAdminProfile();
      expect(profile2.lastAuthenticationDate).not.toBe(initialDate);
    });
  });

  describe("Backup Code Management", () => {
    it("should track remaining backup codes", () => {
      const profile = authService.getAdminProfile();
      const initialCount = profile.backupCodes.length;
      const remaining = authService.getRemainingBackupCodes();
      expect(remaining).toBe(initialCount);
    });

    it("should decrement backup code count after use", () => {
      const remaining1 = authService.getRemainingBackupCodes();
      const profile = authService.getAdminProfile();
      const validCode = profile.backupCodes[0];

      authService.authenticateWithBackupCode(validCode);

      const remaining2 = authService.getRemainingBackupCodes();
      expect(remaining2).toBe(remaining1 - 1);
    });
  });
});
