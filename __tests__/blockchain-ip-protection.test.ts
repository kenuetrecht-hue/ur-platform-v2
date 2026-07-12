import { describe, it, expect, beforeEach } from 'vitest';
import { BlockchainIPProtectionService } from '../lib/blockchain-ip-protection';

describe('Blockchain IP Protection Service', () => {
  let service: BlockchainIPProtectionService;
  const creatorId = 'creator_123';
  const contentHash = 'sha256_hash_example_content';

  beforeEach(() => {
    service = new BlockchainIPProtectionService();
  });

  describe('Asset Registration', () => {
    it('should register IP asset on blockchain', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'My Amazing Video',
        'A creative video content',
        contentHash,
        'ipfs://QmExample123',
        {
          fileSize: 1024000,
          mimeType: 'video/mp4',
          duration: 300,
          tags: ['creative', 'tutorial'],
          keywords: ['video', 'content'],
        },
        {
          commercialUse: true,
          modification: false,
          distribution: true,
          attribution: true,
        }
      );

      expect(asset).toBeDefined();
      expect(asset.assetId).toBeDefined();
      expect(asset.creatorId).toBe(creatorId);
      expect(asset.title).toBe('My Amazing Video');
      expect(asset.contentType).toBe('video');
      expect(asset.status).toBe('registered');
      expect(asset.blockchainRecord).toBeDefined();
      expect(asset.blockchainRecord.transactionHash).toBeDefined();
    });

    it('should register multiple assets with different content types', () => {
      const videoAsset = service.registerIPAsset(
        creatorId,
        'video',
        'Video Content',
        'Description',
        'hash1',
        'uri1',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const audioAsset = service.registerIPAsset(
        creatorId,
        'audio',
        'Audio Content',
        'Description',
        'hash2',
        'uri2',
        { fileSize: 500, mimeType: 'audio/mp3', duration: 180, tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const imageAsset = service.registerIPAsset(
        creatorId,
        'image',
        'Image Content',
        'Description',
        'hash3',
        'uri3',
        { fileSize: 2000, mimeType: 'image/png', dimensions: { width: 1920, height: 1080 }, tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const creatorAssets = service.getCreatorAssets(creatorId);
      expect(creatorAssets).toHaveLength(3);
      expect(creatorAssets.some(a => a.contentType === 'video')).toBe(true);
      expect(creatorAssets.some(a => a.contentType === 'audio')).toBe(true);
      expect(creatorAssets.some(a => a.contentType === 'image')).toBe(true);
    });
  });

  describe('Ownership Verification', () => {
    it('should verify creator ownership', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const isOwner = service.verifyOwnership(asset.assetId, creatorId);
      expect(isOwner).toBe(true);

      const isNotOwner = service.verifyOwnership(asset.assetId, 'other_creator');
      expect(isNotOwner).toBe(false);
    });
  });

  describe('Certificate Issuance', () => {
    it('should issue IP certificate', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const certificate = service.issueCertificate(asset.assetId, 'issuer_123', 'premium');

      expect(certificate).toBeDefined();
      expect(certificate.certificateId).toBeDefined();
      expect(certificate.assetId).toBe(asset.assetId);
      expect(certificate.verificationCode).toBeDefined();
      expect(certificate.isValid).toBe(true);
      expect(certificate.metadata.certificationLevel).toBe('premium');

      const retrievedCert = service.getCertificate(certificate.certificateId);
      expect(retrievedCert?.certificateId).toBe(certificate.certificateId);
    });

    it('should update asset status to verified after certificate issuance', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      expect(asset.status).toBe('registered');

      service.issueCertificate(asset.assetId, 'issuer_123');

      const updatedAsset = service.getAsset(asset.assetId);
      expect(updatedAsset?.status).toBe('verified');
    });

    it('should verify certificate with correct verification code', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const certificate = service.issueCertificate(asset.assetId, 'issuer_123');

      const isValid = service.verifyCertificate(certificate.certificateId, certificate.verificationCode);
      expect(isValid).toBe(true);

      const isInvalid = service.verifyCertificate(certificate.certificateId, 'wrong_code');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Usage Rights Management', () => {
    let assetId: string;

    beforeEach(() => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );
      assetId = asset.assetId;
    });

    it('should grant usage rights', () => {
      const rights = service.grantUsageRights(
        assetId,
        'licensee_123',
        'exclusive',
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        { percentage: 10, paymentFrequency: 'monthly' }
      );

      expect(rights).toBeDefined();
      expect(rights.rightsId).toBeDefined();
      expect(rights.licensee).toBe('licensee_123');
      expect(rights.licenseType).toBe('exclusive');
      expect(rights.status).toBe('active');
      expect(rights.royaltyTerms?.percentage).toBe(10);
    });

    it('should track usage of licensed content', () => {
      service.grantUsageRights(assetId, 'licensee_123', 'non_exclusive', undefined, undefined);

      const tracked1 = service.trackUsage(assetId, 'licensee_123');
      expect(tracked1).toBe(true);

      const tracked2 = service.trackUsage(assetId, 'licensee_123');
      expect(tracked2).toBe(true);

      const rights = service.getUsageRights(assetId);
      expect(rights[0].usageTerms.currentUses).toBe(2);
    });

    it('should revoke usage rights', () => {
      const rights = service.grantUsageRights(
        assetId,
        'licensee_123',
        'non_exclusive',
        undefined,
        undefined
      );

      const revoked = service.revokeUsageRights(assetId, rights.rightsId);
      expect(revoked).toBe(true);

      const updatedRights = service.getUsageRights(assetId);
      expect(updatedRights[0].status).toBe('revoked');
    });

    it('should get usage rights for asset', () => {
      service.grantUsageRights(assetId, 'licensee_1', 'exclusive', undefined, undefined);
      service.grantUsageRights(assetId, 'licensee_2', 'non_exclusive', undefined, undefined);
      service.grantUsageRights(assetId, 'licensee_3', 'limited', undefined, undefined);

      const rights = service.getUsageRights(assetId);
      expect(rights).toHaveLength(3);
      expect(rights.some(r => r.licensee === 'licensee_1')).toBe(true);
      expect(rights.some(r => r.licensee === 'licensee_2')).toBe(true);
      expect(rights.some(r => r.licensee === 'licensee_3')).toBe(true);
    });
  });

  describe('Dispute Management', () => {
    let assetId: string;

    beforeEach(() => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );
      assetId = asset.assetId;
    });

    it('should file IP dispute', () => {
      const dispute = service.fileDispute(
        assetId,
        'claimant_123',
        'plagiarism',
        'This content is plagiarized',
        [
          {
            type: 'link',
            url: 'https://example.com/original',
            description: 'Original content',
          },
        ]
      );

      expect(dispute).toBeDefined();
      expect(dispute.disputeId).toBeDefined();
      expect(dispute.assetId).toBe(assetId);
      expect(dispute.claimant).toBe('claimant_123');
      expect(dispute.defendant).toBe(creatorId);
      expect(dispute.claimType).toBe('plagiarism');
      expect(dispute.status).toBe('open');
    });

    it('should update asset status to disputed', () => {
      const asset = service.getAsset(assetId);
      expect(asset?.status).toBe('registered');

      service.fileDispute(assetId, 'claimant_123', 'plagiarism', 'Description', []);

      const updatedAsset = service.getAsset(assetId);
      expect(updatedAsset?.status).toBe('disputed');
    });

    it('should resolve dispute', () => {
      const dispute = service.fileDispute(
        assetId,
        'claimant_123',
        'plagiarism',
        'Description',
        []
      );

      const resolved = service.resolveDispute(
        dispute.disputeId,
        'defendant_wins',
        'Claim dismissed',
        0
      );

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolution?.verdict).toBe('defendant_wins');
      expect(resolved?.resolution?.details).toBe('Claim dismissed');
    });

    it('should get disputes for asset', () => {
      service.fileDispute(assetId, 'claimant_1', 'plagiarism', 'Description', []);
      service.fileDispute(assetId, 'claimant_2', 'infringement', 'Description', []);

      const disputes = service.getAssetDisputes(assetId);
      expect(disputes).toHaveLength(2);
      expect(disputes.some(d => d.claimType === 'plagiarism')).toBe(true);
      expect(disputes.some(d => d.claimType === 'infringement')).toBe(true);
    });
  });

  describe('Plagiarism Detection', () => {
    it('should check for plagiarism', () => {
      const asset1 = service.registerIPAsset(
        creatorId,
        'video',
        'Original Video',
        'Description',
        'hash_original',
        'uri1',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const asset2 = service.registerIPAsset(
        'other_creator',
        'video',
        'Similar Video',
        'Description',
        'hash_similar',
        'uri2',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const plagiarismResults = service.checkForPlagiarism(asset1.assetId);
      expect(plagiarismResults).toBeDefined();
      expect(Array.isArray(plagiarismResults)).toBe(true);
    });
  });

  describe('Ownership Transfer', () => {
    it('should transfer asset ownership', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const transferred = service.transferOwnership(asset.assetId, 'new_owner', creatorId);
      expect(transferred).toBe(true);

      const updatedAsset = service.getAsset(asset.assetId);
      expect(updatedAsset?.ownership.creator).toBe('new_owner');
    });

    it('should not transfer ownership with wrong current owner', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const transferred = service.transferOwnership(asset.assetId, 'new_owner', 'wrong_owner');
      expect(transferred).toBe(false);

      const unchangedAsset = service.getAsset(asset.assetId);
      expect(unchangedAsset?.ownership.creator).toBe(creatorId);
    });
  });

  describe('IP Statistics', () => {
    it('should get IP statistics for creator', () => {
      service.registerIPAsset(
        creatorId,
        'video',
        'Video 1',
        'Description',
        'hash1',
        'uri1',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      service.registerIPAsset(
        creatorId,
        'audio',
        'Audio 1',
        'Description',
        'hash2',
        'uri2',
        { fileSize: 500, mimeType: 'audio/mp3', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      const stats = service.getIPStatistics(creatorId);

      expect(stats).toBeDefined();
      expect(stats.totalAssets).toBe(2);
      expect(stats.registeredAssets).toBe(2);
      expect(stats.contentTypes).toBeDefined();
      expect(stats.contentTypes.video).toBe(1);
      expect(stats.contentTypes.audio).toBe(1);
    });
  });

  describe('Registration History', () => {
    it('should track registration history', () => {
      const asset = service.registerIPAsset(
        creatorId,
        'video',
        'Test Video',
        'Description',
        contentHash,
        'uri',
        { fileSize: 1000, mimeType: 'video/mp4', tags: [], keywords: [] },
        { commercialUse: true, modification: false, distribution: true, attribution: true }
      );

      service.issueCertificate(asset.assetId, 'issuer_123');
      service.grantUsageRights(asset.assetId, 'licensee_123', 'exclusive', undefined, undefined);

      const history = service.getRegistrationHistory(asset.assetId);

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(h => h.action === 'registered')).toBe(true);
      expect(history.some(h => h.action === 'certificate_issued')).toBe(true);
      expect(history.some(h => h.action.includes('usage_rights_granted'))).toBe(true);
    });
  });
});
