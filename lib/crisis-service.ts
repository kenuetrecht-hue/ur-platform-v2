/**
 * Crisis Detection & Response Service
 * Monitors messages for self-harm, suicide, and violence language
 * Provides immediate crisis resources and notifies admins
 */

export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CrisisDetectionResult {
  detected: boolean;
  severity: CrisisSeverity;
  keywords: string[];
  category: 'self_harm' | 'suicide' | 'violence' | 'none';
  message: string;
  timestamp: Date;
  userId: string;
}

export interface CrisisResource {
  name: string;
  description: string;
  phone?: string;
  website?: string;
  textCode?: string;
  available24_7: boolean;
  country?: string;
}

/**
 * Crisis Detection Service
 */
export class CrisisDetectionService {
  // Self-harm keywords
  private selfHarmKeywords = [
    'hurt myself',
    'cut myself',
    'self harm',
    'self-harm',
    'slash wrist',
    'burn myself',
    'punch myself',
    'hit myself',
    'harm myself',
  ];

  // Suicide keywords
  private suicideKeywords = [
    'kill myself',
    'suicide',
    'suicidal',
    'end it all',
    'end my life',
    'take my life',
    'hang myself',
    'overdose',
    'jump off',
    'no point living',
    'better off dead',
    'want to die',
    'should die',
    'kill myself',
    'end it',
  ];

  // Violence keywords
  private violenceKeywords = [
    'hurt someone',
    'kill someone',
    'stab',
    'shoot',
    'punch',
    'beat up',
    'attack',
    'violence',
    'violent',
    'harm others',
    'hurt people',
    'going to hurt',
    'planning to hurt',
  ];

  /**
   * Detect crisis language in text
   */
  detectCrisis(text: string, userId: string): CrisisDetectionResult {
    const lowerText = text.toLowerCase();

    // Check for suicide language (highest priority)
    for (const keyword of this.suicideKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          detected: true,
          severity: 'critical',
          keywords: [keyword],
          category: 'suicide',
          message: text,
          timestamp: new Date(),
          userId,
        };
      }
    }

    // Check for self-harm language
    for (const keyword of this.selfHarmKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          detected: true,
          severity: 'high',
          keywords: [keyword],
          category: 'self_harm',
          message: text,
          timestamp: new Date(),
          userId,
        };
      }
    }

    // Check for violence language
    for (const keyword of this.violenceKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          detected: true,
          severity: 'high',
          keywords: [keyword],
          category: 'violence',
          message: text,
          timestamp: new Date(),
          userId,
        };
      }
    }

    // No crisis detected
    return {
      detected: false,
      severity: 'low',
      keywords: [],
      category: 'none',
      message: text,
      timestamp: new Date(),
      userId,
    };
  }

  /**
   * Get crisis resources based on severity and category
   */
  getCrisisResources(severity: CrisisSeverity, category: string): CrisisResource[] {
    const resources: CrisisResource[] = [];

    // Always include universal resources
    resources.push(
      {
        name: 'National Suicide Prevention Lifeline',
        description: 'Free, confidential support 24/7',
        phone: '988',
        website: 'https://suicidepreventionlifeline.org',
        available24_7: true,
        country: 'US',
      },
      {
        name: 'Crisis Text Line',
        description: 'Text HOME to connect with a crisis counselor',
        textCode: 'HOME to 741741',
        website: 'https://www.crisistextline.org',
        available24_7: true,
        country: 'US',
      },
      {
        name: 'Emergency Services',
        description: 'Call 911 for immediate emergency help',
        phone: '911',
        available24_7: true,
        country: 'US',
      }
    );

    // Add category-specific resources
    if (category === 'self_harm' || category === 'suicide') {
      resources.push(
        {
          name: 'International Association for Suicide Prevention',
          description: 'Global crisis center directory',
          website: 'https://www.iasp.info/resources/Crisis_Centres/',
          available24_7: false,
        },
        {
          name: 'SAMHSA National Helpline',
          description: 'Mental health and substance abuse support',
          phone: '1-800-662-4357',
          website: 'https://www.samhsa.gov/find-help/national-helpline',
          available24_7: true,
          country: 'US',
        }
      );
    }

    if (category === 'violence') {
      resources.push(
        {
          name: 'National Domestic Violence Hotline',
          description: 'Support for domestic violence victims',
          phone: '1-800-799-7233',
          website: 'https://www.thehotline.org',
          available24_7: true,
          country: 'US',
        },
        {
          name: 'Crisis Intervention Team',
          description: 'De-escalation and crisis intervention',
          phone: '911',
          available24_7: true,
          country: 'US',
        }
      );
    }

    return resources;
  }

  /**
   * Format crisis alert for admin dashboard
   */
  formatCrisisAlert(result: CrisisDetectionResult): string {
    return `
🚨 CRISIS ALERT
Severity: ${result.severity.toUpperCase()}
Category: ${result.category}
User ID: ${result.userId}
Time: ${result.timestamp.toISOString()}
Keywords Detected: ${result.keywords.join(', ')}
Message: "${result.message}"

IMMEDIATE ACTION REQUIRED: Contact user and provide crisis resources.
    `.trim();
  }

  /**
   * Add custom keywords (for admins to configure)
   */
  addCustomKeyword(keyword: string, category: 'self_harm' | 'suicide' | 'violence'): void {
    switch (category) {
      case 'self_harm':
        this.selfHarmKeywords.push(keyword.toLowerCase());
        break;
      case 'suicide':
        this.suicideKeywords.push(keyword.toLowerCase());
        break;
      case 'violence':
        this.violenceKeywords.push(keyword.toLowerCase());
        break;
    }
  }

  /**
   * Remove custom keywords
   */
  removeCustomKeyword(keyword: string, category: 'self_harm' | 'suicide' | 'violence'): void {
    const lowerKeyword = keyword.toLowerCase();
    switch (category) {
      case 'self_harm':
        this.selfHarmKeywords = this.selfHarmKeywords.filter((k) => k !== lowerKeyword);
        break;
      case 'suicide':
        this.suicideKeywords = this.suicideKeywords.filter((k) => k !== lowerKeyword);
        break;
      case 'violence':
        this.violenceKeywords = this.violenceKeywords.filter((k) => k !== lowerKeyword);
        break;
    }
  }
}

/**
 * Singleton instance
 */
let crisisService: CrisisDetectionService | null = null;

export function getCrisisService(): CrisisDetectionService {
  if (!crisisService) {
    crisisService = new CrisisDetectionService();
  }
  return crisisService;
}

export default getCrisisService;
