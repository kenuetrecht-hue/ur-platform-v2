/**
 * Zapier & Buffer Integration Service
 * Handles cross-platform content posting and scheduling
 */

export interface BufferPost {
  id: string;
  text: string;
  media?: {
    url: string;
    type: 'image' | 'video';
  }[];
  scheduledAt?: Date;
  platforms: ('tiktok' | 'instagram' | 'twitter')[];
}

export interface ZapierWebhook {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface PostingResult {
  success: boolean;
  postId?: string;
  platforms: Record<string, { success: boolean; error?: string }>;
  scheduledAt?: Date;
}

class ZapierBufferIntegrationService {
  private bufferApiUrl = 'https://api.bufferapp.com/1';
  private bufferAccessToken = process.env.BUFFER_ACCESS_TOKEN || '';
  private zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL || '';

  /**
   * Initialize Buffer API token
   */
  setBufferAccessToken(token: string): void {
    this.bufferAccessToken = token;
  }

  /**
   * Initialize Zapier webhook URL
   */
  setZapierWebhookUrl(url: string): void {
    this.zapierWebhookUrl = url;
  }

  /**
   * Post content to Buffer for cross-platform publishing
   */
  async postToBuffer(post: BufferPost): Promise<PostingResult> {
    if (!this.bufferAccessToken) {
      return {
        success: false,
        platforms: {
          tiktok: { success: false, error: 'Buffer token not configured' },
          instagram: { success: false, error: 'Buffer token not configured' },
          twitter: { success: false, error: 'Buffer token not configured' },
        },
      };
    }

    const result: PostingResult = {
      success: true,
      platforms: {},
      scheduledAt: post.scheduledAt,
    };

    try {
      // Map UR platforms to Buffer profile IDs
      const profileMap: Record<string, string> = {
        tiktok: process.env.BUFFER_TIKTOK_PROFILE_ID || '',
        instagram: process.env.BUFFER_INSTAGRAM_PROFILE_ID || '',
        twitter: process.env.BUFFER_TWITTER_PROFILE_ID || '',
      };

      for (const platform of post.platforms) {
        const profileId = profileMap[platform];
        if (!profileId) {
          result.platforms[platform] = {
            success: false,
            error: `${platform} profile not configured in Buffer`,
          };
          continue;
        }

        try {
          const response = await this.sendBufferRequest('POST', `/profiles/${profileId}/updates`, {
            text: post.text,
            media: post.media,
            scheduled_at: post.scheduledAt ? Math.floor(post.scheduledAt.getTime() / 1000) : undefined,
          });

          result.platforms[platform] = { success: true };
          result.postId = response.id;
        } catch (error) {
          result.platforms[platform] = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        platforms: {
          tiktok: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
          instagram: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
          twitter: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        },
      };
    }
  }

  /**
   * Schedule content for later posting
   */
  async schedulePost(
    post: BufferPost,
    scheduledAt: Date
  ): Promise<PostingResult> {
    post.scheduledAt = scheduledAt;
    return this.postToBuffer(post);
  }

  /**
   * Send webhook to Zapier for custom workflows
   */
  async triggerZapierWorkflow(
    event: string,
    data: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.zapierWebhookUrl) {
      return {
        success: false,
        error: 'Zapier webhook URL not configured',
      };
    }

    try {
      const webhook: ZapierWebhook = {
        event,
        data,
        timestamp: new Date(),
      };

      const response = await fetch(this.zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Zapier webhook failed: ${response.statusText}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Trigger content posting workflow
   */
  async triggerPostingWorkflow(
    content: string,
    platforms: ('tiktok' | 'instagram' | 'twitter')[],
    affiliateLinks?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    return this.triggerZapierWorkflow('content_posted', {
      content,
      platforms,
      affiliateLinks: affiliateLinks || [],
      postedAt: new Date().toISOString(),
    });
  }

  /**
   * Trigger social media cross-posting
   */
  async triggerSocialMediaCrossPost(
    mainPost: string,
    tiktokCaption: string,
    instagramCaption: string,
    twitterCaption: string
  ): Promise<PostingResult> {
    const post: BufferPost = {
      id: `post_${Date.now()}`,
      text: mainPost,
      platforms: ['tiktok', 'instagram', 'twitter'],
    };

    // Post to Buffer
    const bufferResult = await this.postToBuffer(post);

    // Trigger Zapier workflow for additional processing
    await this.triggerZapierWorkflow('social_media_cross_post', {
      mainPost,
      tiktokCaption,
      instagramCaption,
      twitterCaption,
      bufferResult,
    });

    return bufferResult;
  }

  /**
   * Get posting status from Buffer
   */
  async getPostStatus(postId: string): Promise<{
    id: string;
    status: 'scheduled' | 'sent' | 'failed';
    platforms: Record<string, { status: string; error?: string }>;
  }> {
    try {
      const response = await this.sendBufferRequest('GET', `/updates/${postId}`);

      return {
        id: postId,
        status: response.status,
        platforms: response.platforms || {},
      };
    } catch (error) {
      return {
        id: postId,
        status: 'failed',
        platforms: {
          tiktok: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' },
          instagram: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' },
          twitter: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' },
        },
      };
    }
  }

  /**
   * Send request to Buffer API
   */
  private async sendBufferRequest(
    method: string,
    endpoint: string,
    data?: Record<string, any>
  ): Promise<any> {
    const url = `${this.bufferApiUrl}${endpoint}`;
    const params = new URLSearchParams({
      access_token: this.bufferAccessToken,
    });

    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${url}?${params}`, options);

    if (!response.ok) {
      throw new Error(`Buffer API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get Buffer profile information
   */
  async getBufferProfiles(): Promise<
    Array<{
      id: string;
      service: string;
      displayName: string;
    }>
  > {
    try {
      const response = await this.sendBufferRequest('GET', '/profiles');
      return response.profiles || [];
    } catch (error) {
      console.error('Failed to get Buffer profiles:', error);
      return [];
    }
  }

  /**
   * Create Zapier trigger documentation
   */
  getZapierSetupGuide(): string {
    return `
# Zapier Setup Guide for UR Content Portal

## Step 1: Create Zapier Account
1. Go to zapier.com and sign up
2. Create a new Zap

## Step 2: Set Trigger
- Choose "Webhooks by Zapier" as trigger
- Copy the webhook URL
- Add to environment: ZAPIER_WEBHOOK_URL=<webhook_url>

## Step 3: Add Actions
- Action 1: Post to Buffer (via Buffer API)
- Action 2: Post to TikTok (via TikTok API)
- Action 3: Post to Instagram (via Instagram API)
- Action 4: Post to X/Twitter (via Twitter API)

## Step 4: Test
- Trigger a test post from the Admin Content Portal
- Verify posts appear on all platforms

## Webhook Payload Format
\`\`\`json
{
  "event": "content_posted",
  "data": {
    "content": "Your post content",
    "platforms": ["tiktok", "instagram", "twitter"],
    "affiliateLinks": ["https://..."],
    "postedAt": "2026-05-17T21:00:00Z"
  },
  "timestamp": "2026-05-17T21:00:00Z"
}
\`\`\`
    `;
  }
}

export const zapierBufferIntegrationService = new ZapierBufferIntegrationService();
