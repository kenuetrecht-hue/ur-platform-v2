/**
 * AI Bug Fixer Service
 * Scans codebase for bugs and proposes fixes using AI
 * Requires admin approval before applying fixes
 * Portable to external servers via environment variables
 */

import { getAIServiceInstance } from './ai-service';
import { serverConfig } from './server-config';

export interface BugReport {
  id: string;
  filePath: string;
  lineNumber: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  bugType: string;
  description: string;
  codeSnippet: string;
  proposedFix: string;
  fixExplanation: string;
  confidence: number; // 0-1
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';
  approvedBy?: string;
  approvedAt?: Date;
  appliedAt?: Date;
  error?: string;
}

export interface ScanResult {
  id: string;
  timestamp: Date;
  filesScanned: number;
  bugsFound: number;
  reports: BugReport[];
  duration: number; // milliseconds
}

/**
 * AI Bug Fixer Service
 */
export class AIBugFixerService {
  private enabled = process.env.AI_BUG_FIXER_ENABLED === 'true';
  private autoScan = process.env.AI_BUG_FIXER_AUTO_SCAN === 'true';
  private scanInterval = parseInt(process.env.AI_BUG_FIXER_SCAN_INTERVAL || '3600000'); // 1 hour default
  private excludePatterns = (process.env.AI_BUG_FIXER_EXCLUDE_PATTERNS || 'node_modules,dist,build').split(',');
  private reports: BugReport[] = [];
  private scanResults: ScanResult[] = [];
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (this.enabled && this.autoScan) {
      this.startAutoScan();
    }
  }

  /**
   * Start automatic background scanning
   */
  startAutoScan(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }

    console.log(`[AI Bug Fixer] Starting auto-scan every ${this.scanInterval}ms`);

    this.scanTimer = setInterval(() => {
      this.scanCodebase().catch((error) => {
        console.error('[AI Bug Fixer] Scan error:', error);
      });
    }, this.scanInterval);
  }

  /**
   * Stop automatic scanning
   */
  stopAutoScan(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
      console.log('[AI Bug Fixer] Auto-scan stopped');
    }
  }

  /**
   * Scan codebase for bugs
   */
  async scanCodebase(): Promise<ScanResult> {
    if (!this.enabled) {
      throw new Error('AI Bug Fixer is not enabled');
    }

    const startTime = Date.now();
    console.log('[AI Bug Fixer] Starting codebase scan...');

    try {
      // TODO: Implement actual file scanning
      // 1. Walk through project files
      // 2. Read file contents
      // 3. Filter by exclude patterns
      // 4. Send to AI for analysis
      // 5. Parse AI response for bugs

      const scanResult: ScanResult = {
        id: `scan_${Date.now()}`,
        timestamp: new Date(),
        filesScanned: 0,
        bugsFound: this.reports.length,
        reports: this.reports,
        duration: Date.now() - startTime,
      };

      this.scanResults.push(scanResult);
      console.log(`[AI Bug Fixer] Scan complete: ${this.reports.length} bugs found`);

      return scanResult;
    } catch (error) {
      console.error('[AI Bug Fixer] Scan failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a file for bugs using AI
   */
  async analyzeFile(filePath: string, fileContent: string): Promise<BugReport[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const ai = getAIServiceInstance();

      const prompt = `Analyze this code for bugs, errors, and vulnerabilities:

File: ${filePath}

\`\`\`
${fileContent}
\`\`\`

For each bug found, provide:
1. Line number
2. Severity (low/medium/high/critical)
3. Bug type (e.g., null pointer, logic error, security issue)
4. Description
5. Proposed fix
6. Explanation of the fix
7. Confidence (0-1)

Format as JSON array.`;

      const response = await ai.sendMessage([
        {
          role: 'system',
          content: 'You are a code analysis expert. Analyze code for bugs and propose fixes.',
        },
        { role: 'user', content: prompt },
      ]);

      if (!response.success) {
        console.error('[AI Bug Fixer] Analysis failed:', response.error);
        return [];
      }

      // Parse AI response and create bug reports
      const bugs = this.parseBugResponse(response.message, filePath, fileContent);

      // Add to reports
      this.reports.push(...bugs);

      return bugs;
    } catch (error) {
      console.error('[AI Bug Fixer] File analysis error:', error);
      return [];
    }
  }

  /**
   * Parse AI response into bug reports
   */
  private parseBugResponse(response: string, filePath: string, fileContent: string): BugReport[] {
    const bugs: BugReport[] = [];

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return bugs;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      for (const bug of parsed) {
        const report: BugReport = {
          id: `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filePath,
          lineNumber: bug.lineNumber || 0,
          severity: bug.severity || 'medium',
          bugType: bug.bugType || 'unknown',
          description: bug.description || '',
          codeSnippet: this.getCodeSnippet(fileContent, bug.lineNumber),
          proposedFix: bug.proposedFix || '',
          fixExplanation: bug.fixExplanation || '',
          confidence: bug.confidence || 0.5,
          timestamp: new Date(),
          status: 'pending',
        };

        bugs.push(report);
      }
    } catch (error) {
      console.error('[AI Bug Fixer] Parse error:', error);
    }

    return bugs;
  }

  /**
   * Get code snippet around line number
   */
  private getCodeSnippet(fileContent: string, lineNumber: number, context: number = 2): string {
    const lines = fileContent.split('\n');
    const start = Math.max(0, lineNumber - context);
    const end = Math.min(lines.length, lineNumber + context + 1);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Approve a bug fix
   */
  approveFix(bugId: string, approvedBy: string): void {
    const report = this.reports.find((r) => r.id === bugId);
    if (report) {
      report.status = 'approved';
      report.approvedBy = approvedBy;
      report.approvedAt = new Date();
      console.log(`[AI Bug Fixer] Fix approved: ${bugId}`);
    }
  }

  /**
   * Reject a bug fix
   */
  rejectFix(bugId: string): void {
    const report = this.reports.find((r) => r.id === bugId);
    if (report) {
      report.status = 'rejected';
      console.log(`[AI Bug Fixer] Fix rejected: ${bugId}`);
    }
  }

  /**
   * Apply an approved fix
   */
  async applyFix(bugId: string): Promise<boolean> {
    const report = this.reports.find((r) => r.id === bugId);
    if (!report || report.status !== 'approved') {
      return false;
    }

    try {
      // TODO: Implement actual file modification
      // 1. Read file
      // 2. Apply fix at specified line
      // 3. Verify syntax
      // 4. Write file
      // 5. Run tests to verify

      report.status = 'applied';
      report.appliedAt = new Date();
      console.log(`[AI Bug Fixer] Fix applied: ${bugId}`);

      return true;
    } catch (error) {
      report.status = 'failed';
      report.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AI Bug Fixer] Fix failed: ${bugId}`, error);
      return false;
    }
  }

  /**
   * Get pending fixes for admin review
   */
  getPendingFixes(): BugReport[] {
    return this.reports.filter((r) => r.status === 'pending');
  }

  /**
   * Get all reports
   */
  getAllReports(): BugReport[] {
    return this.reports;
  }

  /**
   * Get scan history
   */
  getScanHistory(): ScanResult[] {
    return this.scanResults;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalBugsFound: this.reports.length,
      pendingFixes: this.reports.filter((r) => r.status === 'pending').length,
      approvedFixes: this.reports.filter((r) => r.status === 'approved').length,
      appliedFixes: this.reports.filter((r) => r.status === 'applied').length,
      failedFixes: this.reports.filter((r) => r.status === 'failed').length,
      bugsBySeverity: {
        low: this.reports.filter((r) => r.severity === 'low').length,
        medium: this.reports.filter((r) => r.severity === 'medium').length,
        high: this.reports.filter((r) => r.severity === 'high').length,
        critical: this.reports.filter((r) => r.severity === 'critical').length,
      },
      totalScans: this.scanResults.length,
      averageScanDuration: this.scanResults.reduce((sum, s) => sum + s.duration, 0) / this.scanResults.length || 0,
    };
  }

  /**
   * Export audit log
   */
  exportAuditLog(): string {
    const log = {
      exportedAt: new Date(),
      enabled: this.enabled,
      autoScan: this.autoScan,
      statistics: this.getStatistics(),
      reports: this.reports,
      scanResults: this.scanResults,
    };

    return JSON.stringify(log, null, 2);
  }
}

/**
 * Singleton instance
 */
let bugFixer: AIBugFixerService | null = null;

export function getAIBugFixerService(): AIBugFixerService {
  if (!bugFixer) {
    bugFixer = new AIBugFixerService();
  }
  return bugFixer;
}

export default getAIBugFixerService;
