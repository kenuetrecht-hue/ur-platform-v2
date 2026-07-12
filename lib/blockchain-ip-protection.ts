/**
 * Blockchain IP Protection Service
 * 
 * Provides decentralized content protection, ownership verification, and rights management
 * using blockchain technology for creator content and digital assets.
 */

export interface IPAsset {
  assetId: string;
  creatorId: string;
  contentType: 'video' | 'audio' | 'image' | 'document' | 'design' | 'code' | 'other';
  title: string;
  description: string;
  contentHash: string; // SHA-256 hash of content
  contentUri: string; // IPFS or storage URI
  metadata: {
    fileSize: number;
    mimeType: string;
    duration?: number; // for video/audio
    dimensions?: { width: number; height: number }; // for images
    tags: string[];
    keywords: string[];
  };
  ownership: {
    creator: string;
    coOwners?: Array<{ address: string; percentage: number }>;
  };
  rights: {
    commercialUse: boolean;
    modification: boolean;
    distribution: boolean;
    attribution: boolean;
    expirationDate?: Date;
  };
  blockchainRecord: {
    chainId: string;
    transactionHash: string;
    blockNumber: number;
    timestamp: Date;
    contractAddress: string;
  };
  registrationDate: Date;
  updatedAt: Date;
  status: 'registered' | 'verified' | 'disputed' | 'expired';
}

export interface IPCertificate {
  certificateId: string;
  assetId: string;
  issuer: string;
  issuedDate: Date;
  expirationDate?: Date;
  certificateHash: string;
  verificationCode: string;
  metadata: {
    registrationNumber: string;
    jurisdiction: string;
    certificationLevel: 'basic' | 'standard' | 'premium' | 'enterprise';
  };
  isValid: boolean;
}

export interface UsageRights {
  rightsId: string;
  assetId: string;
  licensee: string;
  licenseType: 'exclusive' | 'non_exclusive' | 'limited' | 'educational' | 'commercial';
  grantedDate: Date;
  expirationDate?: Date;
  usageTerms: {
    maxUses?: number;
    currentUses: number;
    allowedTerritories?: string[];
    allowedPlatforms?: string[];
    restrictions: string[];
  };
  royaltyTerms?: {
    percentage: number;
    minimumPayment?: number;
    paymentFrequency: 'monthly' | 'quarterly' | 'annually' | 'per_use';
  };
  status: 'active' | 'suspended' | 'revoked' | 'expired';
}

export interface IPDispute {
  disputeId: string;
  assetId: string;
  claimant: string;
  defendant: string;
  claimType: 'ownership' | 'infringement' | 'plagiarism' | 'unauthorized_use' | 'rights_violation';
  description: string;
  evidence: Array<{
    type: 'document' | 'link' | 'media' | 'testimony';
    url: string;
    description: string;
  }>;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution?: {
    verdict: 'claimant_wins' | 'defendant_wins' | 'settlement';
    details: string;
    compensationAmount?: number;
    resolutionDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentFingerprint {
  fingerprintId: string;
  assetId: string;
  fingerprint: string; // Perceptual hash
  algorithm: 'sha256' | 'blake2' | 'perceptual_hash';
  createdAt: Date;
  matchedAssets: Array<{
    assetId: string;
    similarity: number; // 0-100
    creatorId: string;
  }>;
}

export interface OwnershipProof {
  proofId: string;
  assetId: string;
  creatorId: string;
  proofType: 'registration' | 'blockchain' | 'timestamp' | 'notarization';
  timestamp: Date;
  blockchainData?: {
    transactionHash: string;
    blockNumber: number;
    chainId: string;
  };
  metadata: Record<string, any>;
}

export class BlockchainIPProtectionService {
  private assets: Map<string, IPAsset> = new Map();
  private certificates: Map<string, IPCertificate> = new Map();
  private usageRights: Map<string, UsageRights[]> = new Map();
  private disputes: Map<string, IPDispute> = new Map();
  private fingerprints: Map<string, ContentFingerprint> = new Map();
  private ownershipProofs: Map<string, OwnershipProof[]> = new Map();
  private registrationLog: Array<{ assetId: string; timestamp: Date; action: string }> = [];

  /**
   * Register IP asset on blockchain
   */
  registerIPAsset(
    creatorId: string,
    contentType: IPAsset['contentType'],
    title: string,
    description: string,
    contentHash: string,
    contentUri: string,
    metadata: IPAsset['metadata'],
    rights: IPAsset['rights']
  ): IPAsset {
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate blockchain registration
    const blockchainRecord = {
      chainId: 'ethereum_mainnet',
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 20000000),
      timestamp: new Date(),
      contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    };

    const asset: IPAsset = {
      assetId,
      creatorId,
      contentType,
      title,
      description,
      contentHash,
      contentUri,
      metadata,
      ownership: {
        creator: creatorId,
      },
      rights,
      blockchainRecord,
      registrationDate: new Date(),
      updatedAt: new Date(),
      status: 'registered',
    };

    this.assets.set(assetId, asset);
    this.registrationLog.push({
      assetId,
      timestamp: new Date(),
      action: 'registered',
    });

    // Create ownership proof
    this.createOwnershipProof(assetId, creatorId, 'blockchain', blockchainRecord);

    // Generate content fingerprint
    this.generateContentFingerprint(assetId, contentHash);

    return asset;
  }

  /**
   * Verify asset ownership
   */
  verifyOwnership(assetId: string, claimantId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    return asset.ownership.creator === claimantId ||
      (asset.ownership.coOwners?.some(co => co.address === claimantId) || false);
  }

  /**
   * Issue IP certificate
   */
  issueCertificate(assetId: string, issuer: string, certificationLevel: string = 'standard'): IPCertificate {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const certificateId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const verificationCode = Math.random().toString(36).substr(2, 12).toUpperCase();
    const certificateHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const certificate: IPCertificate = {
      certificateId,
      assetId,
      issuer,
      issuedDate: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      certificateHash,
      verificationCode,
      metadata: {
        registrationNumber: `REG-${Date.now()}`,
        jurisdiction: 'global',
        certificationLevel: certificationLevel as any,
      },
      isValid: true,
    };

    this.certificates.set(certificateId, certificate);
    asset.status = 'verified';
    asset.updatedAt = new Date();

    this.registrationLog.push({
      assetId,
      timestamp: new Date(),
      action: 'certificate_issued',
    });

    return certificate;
  }

  /**
   * Grant usage rights
   */
  grantUsageRights(
    assetId: string,
    licensee: string,
    licenseType: UsageRights['licenseType'],
    expirationDate?: Date,
    royaltyTerms?: UsageRights['royaltyTerms']
  ): UsageRights {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const rightsId = `rights_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rights: UsageRights = {
      rightsId,
      assetId,
      licensee,
      licenseType,
      grantedDate: new Date(),
      expirationDate,
      usageTerms: {
        currentUses: 0,
        restrictions: [],
      },
      royaltyTerms,
      status: 'active',
    };

    if (!this.usageRights.has(assetId)) {
      this.usageRights.set(assetId, []);
    }
    this.usageRights.get(assetId)!.push(rights);

    this.registrationLog.push({
      assetId,
      timestamp: new Date(),
      action: `usage_rights_granted_${licenseType}`,
    });

    return rights;
  }

  /**
   * Track usage of licensed content
   */
  trackUsage(assetId: string, licensee: string): boolean {
    const rights = this.usageRights.get(assetId);
    if (!rights) return false;

    const license = rights.find(r => r.licensee === licensee && r.status === 'active');
    if (!license) return false;

    if (license.usageTerms.maxUses && license.usageTerms.currentUses >= license.usageTerms.maxUses) {
      license.status = 'suspended';
      return false;
    }

    license.usageTerms.currentUses++;
    return true;
  }

  /**
   * File IP dispute
   */
  fileDispute(
    assetId: string,
    claimant: string,
    claimType: IPDispute['claimType'],
    description: string,
    evidence: IPDispute['evidence']
  ): IPDispute {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dispute: IPDispute = {
      disputeId,
      assetId,
      claimant,
      defendant: asset.ownership.creator,
      claimType,
      description,
      evidence,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.disputes.set(disputeId, dispute);
    asset.status = 'disputed';
    asset.updatedAt = new Date();

    this.registrationLog.push({
      assetId,
      timestamp: new Date(),
      action: `dispute_filed_${claimType}`,
    });

    return dispute;
  }

  /**
   * Resolve dispute
   */
  resolveDispute(
    disputeId: string,
    verdict: 'claimant_wins' | 'defendant_wins' | 'settlement',
    details: string,
    compensationAmount?: number
  ): IPDispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;

    dispute.status = 'resolved';
    dispute.resolution = {
      verdict,
      details,
      compensationAmount,
      resolutionDate: new Date(),
    };
    dispute.updatedAt = new Date();

    const asset = this.assets.get(dispute.assetId);
    if (asset) {
      asset.status = verdict === 'defendant_wins' ? 'verified' : 'disputed';
      asset.updatedAt = new Date();
    }

    this.registrationLog.push({
      assetId: dispute.assetId,
      timestamp: new Date(),
      action: `dispute_resolved_${verdict}`,
    });

    return dispute;
  }

  /**
   * Generate content fingerprint for plagiarism detection
   */
  private generateContentFingerprint(assetId: string, contentHash: string): ContentFingerprint {
    const fingerprintId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fingerprint: ContentFingerprint = {
      fingerprintId,
      assetId,
      fingerprint: contentHash,
      algorithm: 'sha256',
      createdAt: new Date(),
      matchedAssets: [],
    };

    this.fingerprints.set(fingerprintId, fingerprint);

    // Check for similar content
    this.checkForSimilarContent(assetId, contentHash);

    return fingerprint;
  }

  /**
   * Check for similar/duplicate content
   */
  private checkForSimilarContent(assetId: string, contentHash: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    // Simulate plagiarism detection by checking fingerprints
    for (const [, fingerprint] of this.fingerprints) {
      if (fingerprint.assetId !== assetId) {
        // Calculate similarity (simplified)
        const similarity = this.calculateSimilarity(contentHash, fingerprint.fingerprint);
        if (similarity > 80) {
          const matchedAsset = this.assets.get(fingerprint.assetId);
          if (matchedAsset) {
            fingerprint.matchedAssets.push({
              assetId: fingerprint.assetId,
              similarity,
              creatorId: matchedAsset.creatorId,
            });
          }
        }
      }
    }
  }

  /**
   * Calculate similarity between two hashes (simplified)
   */
  private calculateSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 100;
    
    // Simplified similarity calculation
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    return Math.round((matches / minLength) * 100);
  }

  /**
   * Create ownership proof
   */
  private createOwnershipProof(
    assetId: string,
    creatorId: string,
    proofType: OwnershipProof['proofType'],
    blockchainData?: any
  ): OwnershipProof {
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const proof: OwnershipProof = {
      proofId,
      assetId,
      creatorId,
      proofType,
      timestamp: new Date(),
      blockchainData,
      metadata: {
        verified: true,
        verificationDate: new Date(),
      },
    };

    if (!this.ownershipProofs.has(assetId)) {
      this.ownershipProofs.set(assetId, []);
    }
    this.ownershipProofs.get(assetId)!.push(proof);

    return proof;
  }

  /**
   * Get asset details
   */
  getAsset(assetId: string): IPAsset | null {
    return this.assets.get(assetId) || null;
  }

  /**
   * Get all assets for creator
   */
  getCreatorAssets(creatorId: string): IPAsset[] {
    return Array.from(this.assets.values()).filter(a => a.ownership.creator === creatorId);
  }

  /**
   * Get certificate
   */
  getCertificate(certificateId: string): IPCertificate | null {
    return this.certificates.get(certificateId) || null;
  }

  /**
   * Get usage rights for asset
   */
  getUsageRights(assetId: string): UsageRights[] {
    return this.usageRights.get(assetId) || [];
  }

  /**
   * Get dispute details
   */
  getDispute(disputeId: string): IPDispute | null {
    return this.disputes.get(disputeId) || null;
  }

  /**
   * Get all disputes for asset
   */
  getAssetDisputes(assetId: string): IPDispute[] {
    return Array.from(this.disputes.values()).filter(d => d.assetId === assetId);
  }

  /**
   * Get ownership proofs
   */
  getOwnershipProofs(assetId: string): OwnershipProof[] {
    return this.ownershipProofs.get(assetId) || [];
  }

  /**
   * Get registration history
   */
  getRegistrationHistory(assetId: string): Array<{ timestamp: Date; action: string }> {
    return this.registrationLog
      .filter(entry => entry.assetId === assetId)
      .map(entry => ({ timestamp: entry.timestamp, action: entry.action }));
  }

  /**
   * Verify certificate
   */
  verifyCertificate(certificateId: string, verificationCode: string): boolean {
    const certificate = this.certificates.get(certificateId);
    if (!certificate) return false;

    return certificate.verificationCode === verificationCode && certificate.isValid;
  }

  /**
   * Check for plagiarism
   */
  checkForPlagiarism(assetId: string): Array<{ assetId: string; similarity: number; creatorId: string }> {
    for (const [, fingerprint] of this.fingerprints) {
      if (fingerprint.assetId === assetId) {
        return fingerprint.matchedAssets;
      }
    }
    return [];
  }

  /**
   * Get IP statistics
   */
  getIPStatistics(creatorId: string): Record<string, any> {
    const assets = this.getCreatorAssets(creatorId);
    const verifiedAssets = assets.filter(a => a.status === 'verified').length;
    const totalRights = assets.reduce((sum, a) => sum + (this.usageRights.get(a.assetId)?.length || 0), 0);
    const disputes = Array.from(this.disputes.values()).filter(d => d.defendant === creatorId);

    return {
      totalAssets: assets.length,
      verifiedAssets,
      registeredAssets: assets.length,
      totalUsageRights: totalRights,
      activeDisputes: disputes.filter(d => d.status === 'open').length,
      resolvedDisputes: disputes.filter(d => d.status === 'resolved').length,
      contentTypes: this.groupByContentType(assets),
    };
  }

  /**
   * Group assets by content type
   */
  private groupByContentType(assets: IPAsset[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const asset of assets) {
      grouped[asset.contentType] = (grouped[asset.contentType] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Transfer asset ownership
   */
  transferOwnership(assetId: string, newOwner: string, currentOwner: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset || asset.ownership.creator !== currentOwner) return false;

    asset.ownership.creator = newOwner;
    asset.updatedAt = new Date();

    this.registrationLog.push({
      assetId,
      timestamp: new Date(),
      action: `ownership_transferred_to_${newOwner}`,
    });

    return true;
  }

  /**
   * Revoke usage rights
   */
  revokeUsageRights(assetId: string, rightsId: string): boolean {
    const rights = this.usageRights.get(assetId);
    if (!rights) return false;

    const index = rights.findIndex(r => r.rightsId === rightsId);
    if (index === -1) return false;

    rights[index].status = 'revoked';
    rights[index].expirationDate = new Date();

    this.registrationLog.push({
      assetId,
      timestamp: new Date(),
      action: `usage_rights_revoked_${rightsId}`,
    });

    return true;
  }
}
