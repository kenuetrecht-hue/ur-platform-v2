/**
 * AI Copyright Monitor Service
 * Real-time scanning for potential copyright issues in uploads
 */

export interface ContentAnalysis {
  contentId: string;
  creatorId: string;
  contentType: 'video' | 'audio' | 'image';
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  confidence: number;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  adminNotes?: string;
}

export interface CopyrightViolation {
  id: string;
  creatorId: string;
  contentId: string;
  violationType: 'music' | 'video' | 'image' | 'other';
  detectionMethod: 'ai_scan' | 'dmca_notice' | 'manual_report';
  timestamp: Date;
  resolved: boolean;
  resolutionDate?: Date;
  notes?: string;
}

class CopyrightMonitorService {
  private violations: Map<string, CopyrightViolation> = new Map();
  private contentAnalysis: Map<string, ContentAnalysis> = new Map();
  private whitelistedContent: Set<string> = new Set();

  /**
   * Scan content for copyright issues
   */
  async scanContent(
    contentId: string,
    creatorId: string,
    contentType: 'video' | 'audio' | 'image',
    metadata: {
      title?: string;
      description?: string;
      duration?: number;
      fileSize?: number;
    }
  ): Promise<ContentAnalysis> {
    // Check whitelist first
    if (this.whitelistedContent.has(contentId)) {
      return {
        contentId,
        creatorId,
        contentType,
        riskLevel: 'low',
        flags: [],
        confidence: 0,
        timestamp: new Date(),
        status: 'approved',
      };
    }

    // Simulate AI scanning
    const analysis = await this.performAIScan(contentId, creatorId, contentType, metadata);

    // Store analysis
    this.contentAnalysis.set(contentId, analysis);

    // If high risk, create violation record
    if (analysis.riskLevel === 'high') {
      const violation: CopyrightViolation = {
        id: `violation_${Date.now()}`,
        creatorId,
        contentId,
        violationType: this.inferViolationType(analysis.flags),
        detectionMethod: 'ai_scan',
        timestamp: new Date(),
        resolved: false,
        notes: `AI detected: ${analysis.flags.join(', ')}`,
      };

      this.violations.set(violation.id, violation);

      // Send alert
      await this.sendAdminAlert(violation, analysis);
    }

    return analysis;
  }

  /**
   * Perform AI content analysis
   */
  private async performAIScan(
    contentId: string,
    creatorId: string,
    contentType: 'video' | 'audio' | 'image',
    metadata: any
  ): Promise<ContentAnalysis> {
    const flags: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let confidence = 0;

    // Simulate AI detection logic
    if (contentType === 'audio') {
      // Check for copyrighted music patterns
      if (metadata.duration && metadata.duration > 180) {
        flags.push('Long audio duration - possible copyrighted music');
        riskLevel = 'medium';
        confidence = 0.65;
      }
    }

    if (contentType === 'video') {
      // Check for video patterns
      if (metadata.title?.toLowerCase().includes('remix')) {
        flags.push('Title suggests derivative work');
        riskLevel = 'medium';
        confidence = 0.5;
      }
      if (metadata.description?.toLowerCase().includes('full movie')) {
        flags.push('Description suggests full copyrighted content');
        riskLevel = 'high';
        confidence = 0.9;
      }
    }

    // Simulate metadata analysis
    if (metadata.title?.length === 0) {
      flags.push('Missing title - suspicious');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      contentId,
      creatorId,
      contentType,
      riskLevel,
      flags,
      confidence,
      timestamp: new Date(),
      status: riskLevel === 'high' ? 'pending' : 'approved',
    };
  }

  /**
   * Infer violation type from flags
   */
  private inferViolationType(
    flags: string[]
  ): 'music' | 'video' | 'image' | 'other' {
    const flagText = flags.join(' ').toLowerCase();

    if (flagText.includes('music')) return 'music';
    if (flagText.includes('video') || flagText.includes('movie')) return 'video';
    if (flagText.includes('image')) return 'image';

    return 'other';
  }

  /**
   * Send admin alert for flagged content
   */
  private async sendAdminAlert(
    violation: CopyrightViolation,
    analysis: ContentAnalysis
  ): Promise<void> {
    console.log(`[COPYRIGHT ALERT] High-risk content detected:`, {
      contentId: violation.contentId,
      creatorId: violation.creatorId,
      riskLevel: analysis.riskLevel,
      flags: analysis.flags,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString(),
    });

    // In production, send push notification to admin
    // await sendPushNotification(adminId, {
    //   title: 'Copyright Alert',
    //   body: `High-risk content from creator ${violation.creatorId}`,
    //   data: { contentId: violation.contentId }
    // });
  }

  /**
   * Get content analysis
   */
  getAnalysis(contentId: string): ContentAnalysis | undefined {
    return this.contentAnalysis.get(contentId);
  }

  /**
   * Approve flagged content
   */
  approveContent(contentId: string, adminNotes?: string): boolean {
    const analysis = this.contentAnalysis.get(contentId);
    if (!analysis) return false;

    analysis.status = 'approved';
    analysis.adminNotes = adminNotes;

    // Whitelist for future uploads
    this.whitelistContent(contentId);

    return true;
  }

  /**
   * Reject flagged content
   */
  rejectContent(contentId: string, adminNotes?: string): boolean {
    const analysis = this.contentAnalysis.get(contentId);
    if (!analysis) return false;

    analysis.status = 'rejected';
    analysis.adminNotes = adminNotes;

    return true;
  }

  /**
   * Whitelist content for future uploads
   */
  whitelistContent(contentId: string): void {
    this.whitelistedContent.add(contentId);
  }

  /**
   * Remove content (DMCA takedown)
   */
  removeContent(contentId: string, reason: string): boolean {
    const analysis = this.contentAnalysis.get(contentId);
    if (!analysis) return false;

    analysis.status = 'removed';
    analysis.adminNotes = `Removed: ${reason}`;

    return true;
  }

  /**
   * Get creator violation history
   */
  getCreatorViolations(creatorId: string): CopyrightViolation[] {
    return Array.from(this.violations.values()).filter((v) => v.creatorId === creatorId);
  }

  /**
   * Check if creator is repeat offender
   */
  isRepeatOffender(creatorId: string, threshold: number = 3): boolean {
    const violations = this.getCreatorViolations(creatorId);
    const unresolved = violations.filter((v) => !v.resolved);
    return unresolved.length >= threshold;
  }

  /**
   * Get all pending content for admin review
   */
  getPendingContent(): ContentAnalysis[] {
    return Array.from(this.contentAnalysis.values()).filter((a) => a.status === 'pending');
  }

  /**
   * Get violation statistics
   */
  getStatistics(): {
    totalAnalyzed: number;
    highRiskContent: number;
    totalViolations: number;
    unresolvedViolations: number;
    repeatOffenders: number;
  } {
    const allAnalysis = Array.from(this.contentAnalysis.values());
    const highRisk = allAnalysis.filter((a) => a.riskLevel === 'high');
    const allViolations = Array.from(this.violations.values());
    const unresolved = allViolations.filter((v) => !v.resolved);

    // Count repeat offenders
    const creatorViolationCounts = new Map<string, number>();
    allViolations.forEach((v) => {
      creatorViolationCounts.set(v.creatorId, (creatorViolationCounts.get(v.creatorId) || 0) + 1);
    });
    const repeatOffenders = Array.from(creatorViolationCounts.values()).filter((count) => count >= 3)
      .length;

    return {
      totalAnalyzed: allAnalysis.length,
      highRiskContent: highRisk.length,
      totalViolations: allViolations.length,
      unresolvedViolations: unresolved.length,
      repeatOffenders,
    };
  }

  /**
   * Resolve violation
   */
  resolveViolation(violationId: string, notes?: string): boolean {
    const violation = this.violations.get(violationId);
    if (!violation) return false;

    violation.resolved = true;
    violation.resolutionDate = new Date();
    if (notes) violation.notes = notes;

    return true;
  }
}

export const copyrightMonitorService = new CopyrightMonitorService();
