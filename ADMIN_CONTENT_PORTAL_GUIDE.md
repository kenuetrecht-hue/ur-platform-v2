# Admin Content Portal Guide

## Overview

The Admin Content Portal is a voice-to-post system that allows you to create, generate, and publish content across multiple platforms (TikTok, Instagram, X/Twitter) with automatic affiliate link insertion and FTC-compliant ad disclosures.

---

## Getting Started

### Accessing the Admin Portal

1. Open the UR app on your device
2. Navigate to the **Admin Content Portal** screen
3. You'll see the voice recording interface

---

## Voice-to-Post Workflow

### Step 1: Record Your Voice Note

1. **Tap the microphone button** to start recording
2. Speak naturally about your topic (e.g., "I want to post a tip about handling anxiety at work")
3. The timer shows how long you've been recording
4. **Tap the stop button** when finished

### Step 2: Enter Topic (Optional)

If you prefer typing instead of voice:

1. Enter your topic in the **Topic** field
2. Or combine voice + text for more detailed content

### Step 3: Select Category

Choose the content category that best matches your post:

- **Wellness Tips** — Health and wellness advice
- **Fitness Advice** — Exercise and fitness content
- **Mental Health** — Mental health resources
- **Product Recommendations** — Affiliate product suggestions
- **Educational Content** — Learning and tutorials
- **Entertainment** — Fun and engaging content
- **Community Updates** — News and announcements

### Step 4: Choose Platforms

Select which platforms to cross-post to:

- **🎬 TikTok** — 150 character limit, trending format
- **📸 Instagram** — 2200 character limit, detailed captions
- **𝕏 X/Twitter** — 280 character limit, concise messaging

### Step 5: Generate Content

1. **Tap "✨ Generate Content"**
2. The AI will:
   - Parse your voice/text input
   - Generate platform-specific captions
   - Insert relevant affiliate links
   - Add FTC-compliant #Ad disclosures
   - Create a preview for your review

### Step 6: Review Preview

The preview modal shows:

- **Main Post** — Your primary content
- **Platform Captions** — Customized for each platform
- **Affiliate Links** — Links that will be included
- **Ad Disclosure** — FTC compliance notice

### Step 7: Publish

1. **Tap "✅ Publish Content"** to post immediately
2. Or **tap "Cancel"** to go back and edit

---

## Affiliate Link Integration

### How Affiliate Links Work

When you select a category, the system automatically matches relevant affiliate partners:

| Category | Partners | Commission |
|----------|----------|-----------|
| Wellness Tips | Walmart | 4% |
| Fitness Advice | Amazon | 5% |
| Product Recommendations | Amazon, Walmart | 3-5% |
| Educational Content | Amazon Books | 5% |

### FTC Compliance

**Important:** All posts with affiliate links include automatic disclosures:

- **#Ad** — Indicates sponsored content
- **#Affiliate** — Indicates affiliate link
- Disclosure appears at the **beginning** of the post

Example:
```
#Ad #Affiliate - I earn a commission from qualifying purchases

Here's my tip about anxiety management...

🔗 Recommended:
1. https://amazon.com/...?tag=ur_creator
2. https://walmart.com/...?affiliateId=ur_creator
```

### Tracking Your Commissions

Your affiliate earnings are tracked automatically:

1. Go to **Admin Dashboard** → **Affiliate Stats**
2. View:
   - Total clicks on your links
   - Total commissions earned
   - Top performing products
   - Commission breakdown by partner

---

## Social Media Templates

### Template System

Each platform has pre-built templates optimized for engagement:

#### TikTok Templates (150 chars max)

| Template | Format |
|----------|--------|
| Wellness Tip | `{{topic}} 💡 #FYP #Creator #Wellness` |
| Product Rec | `#Ad #Affiliate - {{product}} 🛍️ #FYP` |
| Educational | `Learn: {{topic}} 📚 #FYP #Creator` |

#### Instagram Templates (2200 chars max)

| Template | Format |
|----------|--------|
| Wellness Post | `{{topic}}\n\n✨ What do you think?\n\n#Creator #Community` |
| Product Feature | `#Ad #Affiliate - {{product}}\n\n🔗 Link in bio` |
| Carousel | `{{topic}}\n\nSwipe ➡️\n\n{{details}}` |

#### X/Twitter Templates (280 chars max)

| Template | Format |
|----------|--------|
| Wellness Tip | `💡 {{topic}} #Creator #Wellness` |
| Product Rec | `#Ad #Affiliate - {{product}} 🔗` |
| Thread Start | `🧵 {{topic}}\n\nHere's what you need to know:` |

### Customizing Templates

1. Go to **Admin Dashboard** → **Templates**
2. **Create Custom Template**:
   - Choose platform
   - Enter template name
   - Write template with `{{variables}}`
   - Save for future use

Example custom template:
```
My favorite {{product}} for {{use_case}} 💚
{{description}}
#Creator #Recommendation
```

---

## Zapier & Buffer Integration

### Setting Up Cross-Platform Posting

#### Step 1: Connect Buffer Account

1. Go to **Admin Dashboard** → **Integrations**
2. **Connect Buffer**:
   - Visit buffer.com and get your API token
   - Paste token in settings
   - Authorize UR to post to your profiles

#### Step 2: Connect Zapier (Optional)

For advanced automation:

1. Create Zapier account at zapier.com
2. Create new Zap with trigger: **Webhooks by Zapier**
3. Copy webhook URL
4. Paste in UR settings: **Admin Dashboard** → **Zapier Webhook**
5. Set up actions:
   - Post to TikTok
   - Post to Instagram
   - Post to X/Twitter
   - Log to spreadsheet

#### Step 3: Test Integration

1. Create a test post in Admin Portal
2. Select all platforms
3. Publish
4. Verify posts appear on all platforms within 5 minutes

### Scheduling Posts

1. In the preview modal, **tap "Schedule"**
2. Choose date and time
3. Posts will automatically publish at scheduled time
4. Check **Posting Status** to see results

---

## Compliance & Best Practices

### FTC Guidelines (2026)

✅ **DO:**
- Include #Ad or #Affiliate in every sponsored post
- Place disclosure at the **beginning** of post
- Be honest about affiliate relationships
- Disclose commission rates if asked

❌ **DON'T:**
- Hide affiliate links in shortened URLs
- Bury disclosure at the end of post
- Recommend products you don't believe in
- Mislead about product benefits

### Content Guidelines

1. **Be Authentic** — Only recommend products you genuinely use
2. **Be Clear** — Explain why you recommend something
3. **Be Compliant** — Always include #Ad/#Affiliate disclosures
4. **Be Helpful** — Focus on solving user problems

### Audit Trail

All posts are logged with:

- Content created
- Platforms posted to
- Affiliate links used
- Disclosures included
- Timestamp
- Status (pending/published/failed)

View audit log: **Admin Dashboard** → **Audit Log**

---

## Troubleshooting

### Voice Recording Issues

| Problem | Solution |
|---------|----------|
| Microphone not working | Check app permissions in Settings |
| Audio too quiet | Speak closer to microphone |
| Recording stops suddenly | Check device storage space |

### Posting Failures

| Problem | Solution |
|---------|----------|
| Post not appearing on platform | Check Buffer/Zapier connection |
| Affiliate links not included | Verify category is selected |
| #Ad disclosure missing | Regenerate content with affiliate links |

### Affiliate Link Issues

| Problem | Solution |
|---------|----------|
| Links not tracking | Ensure tracking IDs are configured |
| No commission showing | Wait 24-48 hours for tracking |
| Wrong product URL | Edit affiliate links in Admin Dashboard |

---

## Environment Variables

For server deployment, configure these variables:

```bash
# Buffer Integration
BUFFER_ACCESS_TOKEN=your_buffer_token
BUFFER_TIKTOK_PROFILE_ID=your_tiktok_profile
BUFFER_INSTAGRAM_PROFILE_ID=your_instagram_profile
BUFFER_TWITTER_PROFILE_ID=your_twitter_profile

# Zapier Integration
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/...

# Affiliate Tracking
WALMART_TRACKING_ID=your_walmart_id
AMAZON_ASSOCIATE_TAG=your_amazon_tag

# AI Content Generation
AI_API_URL=https://api.manus.im/v1
AI_API_KEY=your_api_key
```

---

## Support

For issues or questions:

1. Check the **Troubleshooting** section above
2. Review **Compliance & Best Practices**
3. Contact support at help.manus.im

---

## Next Steps

1. ✅ Record your first voice note
2. ✅ Generate content for one platform
3. ✅ Review the preview
4. ✅ Publish and monitor engagement
5. ✅ Check affiliate earnings after 24 hours
