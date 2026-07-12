# UR - Mobile App Design Plan

**App Name:** UR  
**Tagline:** Your world, connected  
**Platform:** iOS & Android (React Native / Expo)  
**Orientation:** Portrait (9:16), one-handed usage  
**Design Standard:** Apple Human Interface Guidelines (HIG)  

---

## Brand Identity

**Color Palette:**

| Token | Light | Dark | Usage |
|---|---|---|---|
| Primary | #6366F1 (Indigo) | #818CF8 | Brand accent, primary CTAs, "UR" logo |
| Secondary | #8B5CF6 (Purple) | #A78BFA | Secondary actions, gradients |
| Background | #FFFFFF | #0F0F14 | Screen backgrounds |
| Surface | #F8FAFC | #1A1A24 | Cards, sheets |
| Foreground | #0F172A | #F1F5F9 | Primary text |
| Muted | #64748B | #94A3B8 | Secondary text |
| Border | #E2E8F0 | #2A2A3A | Dividers, borders |
| Success | #10B981 | #34D399 | Earnings, verified, success |
| Warning | #F59E0B | #FBBF24 | Alerts, contests |
| Error | #EF4444 | #F87171 | Errors, blocks |
| Gold (Tier) | #FFD700 | #FFD700 | Loyalty Gold tier |
| Platinum (Tier) | #E5E4E2 | #E5E4E2 | Loyalty Platinum tier |

**Typography:** System font (San Francisco on iOS, Roboto on Android)
- Display: 32-40px bold (welcome screens)
- Title: 24-28px semibold (screen titles)
- Heading: 18-20px semibold (sections)
- Body: 16px regular (content)
- Caption: 13-14px regular (metadata)

**Visual Language:**
- Rounded corners (16px cards, 12px buttons, 8px inputs)
- Generous whitespace (16-24px padding)
- Soft shadows on light mode, subtle borders on dark mode
- Gradient accents (indigo → purple) for CTAs and brand moments

---

## Screen List (Complete)

### Authentication & Onboarding
1. **Welcome Screen** - Brand intro with "Your world, connected"
2. **Sign Up Screen** - Email + password creation
3. **Login Screen** - Existing user login
4. **Age Verification Screen** - 18+ ID upload + selfie (UI for IDology integration)
5. **Profile Setup Screen** - Photo, bio, interests selection
6. **Account Type Screen** - "I'm a User" vs "I'm a Creator"
7. **Onboarding Tutorial** - 4-screen swipe tutorial
8. **Welcome Bonus Screen** - 7-day free trial activation

### Main App (Tab Navigation)
9. **Home Tab** - Featured creators, recommendations, trending
10. **Discover Tab** - Search creators, browse categories, trending
11. **Messages Tab** - Conversation list, unread badges
12. **Wallet Tab** - Balance, transactions, earnings, tier badge
13. **Profile Tab** - User profile, settings, account

### Creator Pages
14. **Creator Profile View** - Bio, tier badge, content preview, follow/message/tip buttons
15. **Creator Content Feed** - Posts, announcements, scheduled content
16. **Join Paid Chat Screen** - Pricing, description, join button
17. **Tip Creator Screen** - Amount selection, custom amount

### Messaging
18. **Chat List Screen** - All conversations
19. **One-on-One Chat Screen** - Message thread with creator
20. **Private Paid Chat Room** - Group chat with creator and members
21. **Message Composer** - Text input, attachment, send

### Engagement Features
22. **Contests List** - Active contests (hidden until June 1)
23. **Contest Detail Screen** - Rules, prize, entry form
24. **Giveaways List** - Active giveaways (hidden until July 1)
25. **Giveaway Detail Screen** - Prize info, enter button
26. **Loyalty Rewards Screen** - Points balance, tier, rewards catalog
27. **Referral Screen** - Share link, track referrals, earnings

### Creator Tools (Hidden until creator account)
28. **Creator Dashboard** - Earnings, members, engagement metrics
29. **Set Pricing Screen** - Chat pricing, message pricing, tier setup
30. **Create Contest Screen** - Contest builder
31. **Create Giveaway Screen** - Giveaway builder
32. **Content Scheduler** - Calendar, schedule posts
33. **Analytics Detail Screen** - Charts, trends, exports
34. **Member Management** - Member list, moderation

### Admin (Owner Only - Kenneth)
35. **Admin Dashboard** - Total revenue, users, creators, transactions
36. **Financial Reports Screen** - Monthly income/expense reports
37. **Social Security Report Screen** - Generate compliance reports
38. **Affiliate Tracking Screen** - Real Merchant Services leads, commissions
39. **User Moderation Screen** - Reports, blocks, bans
40. **Platform Settings** - Fees, pricing tiers, feature toggles

### Settings & Support
41. **Settings Screen** - Account, notifications, privacy
42. **Help Center** - FAQ, articles, contact support
43. **Terms of Service Screen** - Legal docs
44. **Privacy Policy Screen** - Legal docs
45. **Block/Report User Screen** - Moderation actions
46. **Notification Settings** - Push notification preferences

---

## Primary Content & Functionality by Screen

### Welcome Screen
**Content:** UR logo, tagline "Your world, connected", gradient background
**Actions:** "Get Started" button (primary), "I already have an account" link

### Home Tab
**Content:**
- Top: User's loyalty tier badge + points balance
- Featured Creators carousel (horizontal scroll)
- "Recommended for You" section (vertical list of creator cards)
- "Trending This Week" section
- "New Creators" section
- Bottom CTA: "Become a Creator" banner

**Creator Card Design:**
- Profile photo (60x60 circular)
- Name + tier badge (Bronze/Silver/Gold/Platinum)
- Member count + monthly price
- "Follow" or "Following" button
- Tap → Creator Profile

### Discover Tab
**Content:**
- Search bar at top
- Category chips: Fitness, Music, Coaching, Art, Gaming, Business, Lifestyle
- Trending creators grid (2 columns)
- "Top Earners This Month" section

### Messages Tab
**Content:**
- Conversation list (latest message preview)
- Unread badge counts
- Search messages bar
- Filter: All, Unread, Paid Chats

### Wallet Tab
**Content:**
- Top: Total balance with earnings breakdown
- Tier badge with progress bar to next tier
- Quick actions: Add Funds, Withdraw, View Transactions
- Recent transactions list
- Loyalty Points section
- Referral earnings widget

### Profile Tab
**Content:**
- Profile photo + name + bio
- Account stats (following, points, tier)
- Quick links: Settings, Help, Privacy
- "Become a Creator" button (if user)
- "Creator Dashboard" button (if creator)
- Logout

### Creator Profile View
**Content:**
- Hero: Profile photo + name + tier badge + verified checkmark
- Stats row: Members, Posts, Joined date
- Bio + social links
- Action buttons: Follow, Message, Tip
- "Join Paid Chat - $X/month" CTA (if available)
- Content preview grid
- About section

---

## Key User Flows

### Flow 1: New User Signs Up & Joins Creator
1. Welcome → Sign Up → Verify Email
2. Age Verification (upload ID + selfie)
3. Profile Setup (photo + bio + interests)
4. Onboarding Tutorial (4 screens)
5. Home Screen → Browse creators
6. Tap Creator → Creator Profile
7. Tap "Follow" → Now following
8. Tap "Join Paid Chat - $5/month"
9. Add Payment Method (Stripe UI)
10. Confirm payment → Enter chat room
11. Earn loyalty points automatically

### Flow 2: User Tips a Creator
1. Creator Profile → Tap "Tip"
2. Select amount: $1, $5, $10, $20, $50, $100, or Custom
3. Add message (optional)
4. Confirm payment
5. Success → +10 loyalty points
6. Creator gets notification

### Flow 3: User Refers a Friend
1. Profile → Refer Friends
2. See unique referral link
3. Tap "Share" → System share sheet
4. Friend opens link → Sign Up flow
5. Friend completes verification → User gets 100 points + $1 credit
6. Tracked in Referral Dashboard

### Flow 4: Creator Sets Up Account
1. Profile → "Become a Creator"
2. Account Type → "I'm a Creator"
3. Creator Profile Setup (extended bio, social links, categories)
4. Set Pricing (chat price, message price)
5. Add Payout Method (bank account via Stripe Connect)
6. Creator Dashboard appears in tab bar
7. Share creator link to grow

### Flow 5: Creator Earns & Withdraws
1. Members join paid chats → Earnings accumulate
2. Creator Dashboard → See earnings ($425 available)
3. Tap "Withdraw"
4. Confirm bank account → Submit
5. Stripe processes payout (1-3 days)
6. 7-day automatic payout cycle

### Flow 6: Admin Reviews Social Security Report
1. Profile → Admin Dashboard (Kenneth only)
2. Tap "Financial Reports"
3. Select month (May 2026)
4. View: Revenue, Expenses, Net Income, Personal Income
5. Tap "Generate Social Security Report"
6. PDF generated with all required documentation
7. Download or share

### Flow 7: User Submits Real Merchant Services Lead
1. Home → See "Get Real Merchant Services" banner
2. Tap → Lead capture form
3. Enter Name + Email
4. Submit → Lead sent to company + tracked in admin
5. Confirmation screen
6. Admin sees lead in Affiliate Tracking dashboard
7. Commission accrues monthly

---

## Component Library

**Buttons:**
- Primary: Indigo gradient, white text, 12px radius, haptic feedback
- Secondary: Surface color, foreground text, border
- Tertiary: Text only, primary color
- Destructive: Error color background

**Cards:**
- Standard: Surface bg, 16px radius, 16px padding, subtle shadow
- Creator Card: Photo + name + tier + member count
- Stat Card: Big number + label + trend indicator
- Transaction Card: Icon + description + amount + date

**Lists:**
- Conversation list: Avatar + name + preview + time + unread badge
- Creator list: Card-based with follow CTA
- Transaction list: Icon + amount + date

**Inputs:**
- Text input: 8px radius, border, 16px padding
- Search: Rounded with magnifying glass icon
- Amount picker: Large numeric display

**Badges:**
- Tier badge: Bronze (brown), Silver (gray), Gold (#FFD700), Platinum (#E5E4E2)
- Verified: Blue checkmark
- Online: Green dot
- New message: Red dot with count

---

## Tab Bar Design

**5 Tabs:**
1. **Home** (house.fill icon) - Discover content
2. **Discover** (magnifyingglass icon) - Search & explore
3. **Messages** (bubble.left.fill icon) - Chats with badge
4. **Wallet** (creditcard.fill icon) - Money & loyalty
5. **Profile** (person.fill icon) - Account

**Tab Bar Style:**
- Height: 56px + safe area
- Background: Surface color with subtle top border
- Active: Primary color (indigo)
- Inactive: Muted color
- Haptic feedback on tap

---

## Phased Feature Activation

**Launch (May 15, 2026):**
- ✅ Authentication & onboarding
- ✅ Home, Discover, Messages, Wallet, Profile tabs
- ✅ Creator profiles & messaging
- ✅ Loyalty rewards program
- ✅ Creator dashboard
- ✅ Admin dashboard with Social Security reports
- ✅ Real Merchant Services lead capture
- ✅ Moderation & support
- ⬛ Contests UI built but hidden
- ⬛ Giveaways UI built but hidden
- ⬛ Crypto infrastructure built but hidden

**June 1, 2026:**
- 🟢 Activate contests
- 🟢 Activate creator support help center
- 🟢 Activate analytics dashboard
- 🟢 Activate creator tier badges

**July 1, 2026:**
- 🟢 Activate giveaways
- 🟢 Activate creator discovery algorithm
- 🟢 Activate verification badges

**August 1, 2026+:**
- 🟢 Content scheduling
- 🟢 Collaboration tools
- 🟢 Video hosting (October)
- 🟢 Crypto integration (May 2027)

---

## Accessibility & Best Practices

- Minimum tap target: 44x44pt
- Color contrast: WCAG AA compliant (4.5:1 minimum)
- Dynamic type support (respects user font size)
- VoiceOver labels on all interactive elements
- Haptic feedback for important actions
- Loading states for all async operations
- Empty states with helpful CTAs
- Error states with recovery options

---

## Mobile-First Considerations

- One-handed thumb reach: critical actions in bottom 1/3 of screen
- Pull-to-refresh on scrollable lists
- Swipe gestures for chat actions (delete, archive)
- Bottom sheets for actions (instead of modal pop-ups)
- System share sheets for sharing
- Native keyboard handling (returnKeyType for forms)
