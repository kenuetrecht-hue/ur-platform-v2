/**
 * ID Verification Service
 * Integrates with Jumio or IDology for automated ID verification
 */

export interface IDVerificationRequest {
  userId: string;
  documentType: 'passport' | 'driver_license' | 'national_id';
  documentImage: string; // Base64 encoded
  selfieImage: string; // Base64 encoded
}

export interface IDVerificationResult {
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'error';
  verificationId: string;
  documentData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    expirationDate: string;
    documentNumber: string;
    issuingCountry: string;
  };
  livenessScore?: number; // 0-100
  faceMatchScore?: number; // 0-100
  confidence?: number; // 0-100
  message?: string;
  timestamp: Date;
}

class IDVerificationService {
  private verifications: Map<string, IDVerificationResult> = new Map();
  private apiProvider: 'jumio' | 'idology' = 'jumio';

  /**
   * Initialize ID verification service with API provider
   */
  constructor(provider: 'jumio' | 'idology' = 'jumio') {
    this.apiProvider = provider;
  }

  /**
   * Submit ID for verification via Jumio
   */
  async verifyIDWithJumio(request: IDVerificationRequest): Promise<IDVerificationResult> {
    try {
      const jumioApiKey = process.env.JUMIO_API_KEY;
      const jumioApiSecret = process.env.JUMIO_API_SECRET;

      if (!jumioApiKey || !jumioApiSecret) {
        throw new Error('Jumio credentials not configured');
      }

      // Create Jumio authentication header
      const auth = Buffer.from(`${jumioApiKey}:${jumioApiSecret}`).toString('base64');

      // Submit ID scan to Jumio
      const response = await fetch('https://api.jumio.com/api/v4/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userReference: request.userId,
          clientIp: '0.0.0.0',
          successUrl: `${process.env.APP_URL}/verification/success`,
          errorUrl: `${process.env.APP_URL}/verification/error`,
          documentType: this.mapDocumentType(request.documentType),
        }),
      });

      if (!response.ok) {
        throw new Error(`Jumio API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Store verification request
      const result: IDVerificationResult = {
        userId: request.userId,
        status: 'pending',
        verificationId: data.reference,
        timestamp: new Date(),
      };

      this.verifications.set(request.userId, result);
      return result;
    } catch (error) {
      console.error('Jumio verification error:', error);
      const errorResult: IDVerificationResult = {
        userId: request.userId,
        status: 'error',
        verificationId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
      this.verifications.set(request.userId, errorResult);
      return errorResult;
    }
  }

  /**
   * Submit ID for verification via IDology
   */
  async verifyIDWithIDology(request: IDVerificationRequest): Promise<IDVerificationResult> {
    try {
      const idologyApiKey = process.env.IDOLOGY_API_KEY;

      if (!idologyApiKey) {
        throw new Error('IDology credentials not configured');
      }

      // Submit to IDology API
      const response = await fetch('https://api.idology.com/api/v1/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idologyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: request.userId,
          documentImage: request.documentImage,
          selfieImage: request.selfieImage,
          documentType: request.documentType,
        }),
      });

      if (!response.ok) {
        throw new Error(`IDology API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse IDology response
      const result: IDVerificationResult = {
        userId: request.userId,
        status: data.status === 'PASS' ? 'approved' : data.status === 'FAIL' ? 'rejected' : 'pending',
        verificationId: data.transactionId,
        documentData: {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          dateOfBirth: data.dateOfBirth || '',
          expirationDate: data.expirationDate || '',
          documentNumber: data.documentNumber || '',
          issuingCountry: data.issuingCountry || '',
        },
        livenessScore: data.livenessScore,
        faceMatchScore: data.faceMatchScore,
        confidence: data.confidence,
        timestamp: new Date(),
      };

      this.verifications.set(request.userId, result);
      return result;
    } catch (error) {
      console.error('IDology verification error:', error);
      const errorResult: IDVerificationResult = {
        userId: request.userId,
        status: 'error',
        verificationId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
      this.verifications.set(request.userId, errorResult);
      return errorResult;
    }
  }

  /**
   * Submit ID for verification using configured provider
   */
  async verifyID(request: IDVerificationRequest): Promise<IDVerificationResult> {
    if (this.apiProvider === 'jumio') {
      return this.verifyIDWithJumio(request);
    } else {
      return this.verifyIDWithIDology(request);
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: string): Promise<IDVerificationResult | null> {
    const verification = this.verifications.get(userId);
    if (!verification) return null;

    // If pending, poll for updates
    if (verification.status === 'pending') {
      const updated = await this.pollVerificationStatus(userId, verification.verificationId);
      if (updated) {
        this.verifications.set(userId, updated);
        return updated;
      }
    }

    return verification;
  }

  /**
   * Poll verification status from API
   */
  private async pollVerificationStatus(userId: string, verificationId: string): Promise<IDVerificationResult | null> {
    try {
      if (this.apiProvider === 'jumio') {
        const jumioApiKey = process.env.JUMIO_API_KEY;
        const jumioApiSecret = process.env.JUMIO_API_SECRET;

        if (!jumioApiKey || !jumioApiSecret) return null;

        const auth = Buffer.from(`${jumioApiKey}:${jumioApiSecret}`).toString('base64');

        const response = await fetch(`https://api.jumio.com/api/v4/result/${verificationId}`, {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        });

        if (!response.ok) return null;

        const data = await response.json();

        return {
          userId,
          status: data.result === 'APPROVED' ? 'approved' : data.result === 'DENIED' ? 'rejected' : 'pending',
          verificationId,
          documentData: {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            dateOfBirth: data.dateOfBirth || '',
            expirationDate: data.expirationDate || '',
            documentNumber: data.documentNumber || '',
            issuingCountry: data.issuingCountry || '',
          },
          confidence: data.confidence,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      console.error('Polling verification status error:', error);
    }

    return null;
  }

  /**
   * Map document type to API format
   */
  private mapDocumentType(type: 'passport' | 'driver_license' | 'national_id'): string {
    const mapping: Record<string, string> = {
      passport: 'PASSPORT',
      driver_license: 'DRIVER_LICENSE',
      national_id: 'NATIONAL_ID',
    };
    return mapping[type] || 'PASSPORT';
  }

  /**
   * Get all verifications for admin
   */
  getAllVerifications(): IDVerificationResult[] {
    return Array.from(this.verifications.values());
  }

  /**
   * Clear verification (for testing)
   */
  clearVerification(userId: string): void {
    this.verifications.delete(userId);
  }
}

export const idVerificationService = new IDVerificationService(
  (process.env.ID_VERIFICATION_PROVIDER as 'jumio' | 'idology') || 'jumio'
);
