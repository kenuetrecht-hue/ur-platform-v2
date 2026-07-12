# UR Creator Platform — Environment Variables Setup Guide

This guide explains how to configure environment variables for UR, making it easy to migrate to your own server in August.

## Why Environment Variables?

Environment variables allow you to:
- **Keep secrets safe** — API keys and passwords never appear in code
- **Switch providers easily** — Change from Manus to OpenAI/Anthropic with one variable
- **Scale quickly** — Move to your own server in August with minimal configuration
- **Comply with regulations** — Meet Indiana data privacy requirements

## Required Environment Variables

### 1. Stripe Payment Processing

**Purpose:** Handle payments for stickers, tips, and premium content.

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**How to get these:**
1. Create a Stripe account at https://dashboard.stripe.com
2. Go to **Developers → API Keys**
3. Copy your **Secret Key** and **Publishable Key**
4. Add them to your `.env.local` file

**Why it's abstracted:**
- No hardcoded Stripe account IDs in code
- Swap Stripe accounts by changing one variable
- Works for test mode (development) and live mode (production)

---

### 2. AI Brain Integration

**Purpose:** Power the 5 AI bots (Wellness Coach, Fitness Trainer, etc.).

```bash
AI_API_URL=https://api.manus.im/v1
AI_API_KEY=your_manus_api_key_here
```

**How to get these:**
- **For Manus (development):** Use your Manus account credentials
- **For OpenAI (later):** Get API key from https://platform.openai.com/api-keys
- **For Anthropic (later):** Get API key from https://console.anthropic.com

**Why it's abstracted:**
- Switch AI providers without changing code
- Manus → OpenAI → Anthropic in August with just 2 variable changes
- Each provider has different API formats (handled by service wrapper)

**Example: Switching to OpenAI in August**
```bash
# Just change these two lines:
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=sk_your_openai_key_here
# No code changes needed!
```

---

### 3. Affiliate Tracking IDs

**Purpose:** Track affiliate commissions from Walmart, Amazon, and other partners.

```bash
WALMART_TRACKING_ID=your_walmart_tracking_id_here
AMAZON_ASSOCIATE_TAG=your_amazon_associate_tag_here
```

**How to get these:**
- **Walmart:** https://affiliates.walmart.com
- **Amazon Associates:** https://associates.amazon.com
- **Other partners:** See your affiliate program dashboard

**Why it's abstracted:**
- Central database table stores all affiliate IDs
- AI bots pull tracking IDs dynamically (not hardcoded)
- Add new affiliate partners without code changes
- Update tracking IDs without redeploying

---

### 4. Database Configuration

**Purpose:** Store all user data, creators, messages, transactions, etc.

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/ur_creator_platform
```

**How to set this up:**
1. Create a PostgreSQL database (local or cloud)
2. Replace `user`, `password`, and `localhost` with your details
3. Add to `.env.local`

---

### 5. Authentication

**Purpose:** Secure user sessions and OAuth logins.

```bash
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
```

**How to generate:**
```bash
# Generate a secure random key
openssl rand -base64 32
```

---

### 6. Email Configuration

**Purpose:** Send RMS lead forwarding emails and notifications.

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ken.uetrecht.ur@gmail.com
SMTP_PASSWORD=your_app_password_here
```

**How to set this up:**
1. Use your UR Gmail account (ken.uetrecht.ur@gmail.com)
2. Generate an **App Password** (not your regular password)
3. Add credentials to `.env.local`

---

## Development Setup (.env.local)

Create a `.env.local` file in your project root with test/development credentials:

```bash
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# AI (Manus for development)
AI_API_URL=https://api.manus.im/v1
AI_API_KEY=your_manus_key

# Affiliate IDs (test values)
WALMART_TRACKING_ID=test_walmart_id
AMAZON_ASSOCIATE_TAG=test_amazon_tag

# Database
DATABASE_URL=postgresql://localhost/ur_dev

# JWT
JWT_SECRET=your_dev_secret_key_here

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ken.uetrecht.ur@gmail.com
SMTP_PASSWORD=your_app_password
```

**Important:** Never commit `.env.local` to Git. It's already in `.gitignore`.

---

## Production Setup (August Server Migration)

When you move to your own server in August:

1. **Set up new database** — Create PostgreSQL on your server
2. **Get production API keys** — Stripe live keys, OpenAI API key, etc.
3. **Create `.env` file on server** with production values:

```bash
# Production Stripe (live mode)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Production AI (OpenAI or Anthropic)
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=sk_your_openai_key

# Production database
DATABASE_URL=postgresql://prod_user:prod_password@your_server:5432/ur_prod

# Production JWT (new secret)
JWT_SECRET=your_prod_secret_key_here_min_32_chars
```

4. **Deploy code** — Upload your code to the server
5. **Run migrations** — Set up database tables
6. **Start app** — App automatically reads from `.env` on server

**Total time: ~15 minutes!**

---

## Testing Environment Variables

To verify your environment variables are loaded correctly:

```bash
# Check if variables are accessible
npm run check-env

# Run tests with environment variables
npm run test

# Start dev server with env vars
npm run dev
```

---

## Security Best Practices

1. **Never hardcode secrets** — Always use environment variables
2. **Never commit `.env.local`** — It's in `.gitignore` for a reason
3. **Rotate API keys regularly** — Update Stripe, OpenAI, etc. keys every 90 days
4. **Use strong JWT secrets** — Minimum 32 characters, random
5. **Limit API key permissions** — Give each key only the permissions it needs
6. **Monitor API usage** — Check Stripe and OpenAI dashboards for unusual activity

---

## Troubleshooting

**"API key not found" error:**
- Check that `.env.local` exists in project root
- Verify variable names match exactly (case-sensitive)
- Restart dev server after changing `.env.local`

**"Database connection failed" error:**
- Verify `DATABASE_URL` is correct
- Check that PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

**"Stripe payment failed" error:**
- Verify you're using test keys for development
- Check Stripe dashboard for error details
- Ensure `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` match

---

## Next Steps

1. **Create `.env.local`** with development values
2. **Get Stripe test keys** from https://dashboard.stripe.com
3. **Test payment flow** to verify Stripe integration works
4. **Document your production values** (for August migration)
5. **Set up automated backups** for `.env` on production server

---

## August Migration Checklist

When you're ready to move to your own server:

- [ ] Create new PostgreSQL database on your server
- [ ] Get production Stripe live keys
- [ ] Get production AI API key (OpenAI or Anthropic)
- [ ] Generate new JWT secret for production
- [ ] Create `.env` file on server with production values
- [ ] Upload code to server
- [ ] Run database migrations: `npm run db:push`
- [ ] Start app: `npm start`
- [ ] Test all critical flows (signup, payment, AI chat)
- [ ] Monitor logs for errors
- [ ] Set up automated backups

**You've got this! 🚀**


---

## Sticker Store Configuration

The sticker store is fully integrated with Stripe and uses environment variables for all configuration. All code is self-contained and ready to migrate to your own server.

### Sticker Store Files (Portable)

All sticker store code is located in these files and can be copied directly to your server:

**Services:**
- `lib/sticker-store.ts` — Sticker pack management, inventory, purchases
- `lib/stripe-service.ts` — Stripe payment integration (already documented above)
- `lib/wallet-payment.ts` — Wallet balance management

**UI Components:**
- `app/sticker-store.tsx` — Main sticker store screen
- `app/(tabs)/stickers.tsx` — Stickers tab entry point

**Navigation Integration:**
- `app/(tabs)/_layout.tsx` — Stickers tab added to tab bar
- `components/ui/icon-symbol.tsx` — Gift icon mapping for stickers tab

### Sticker Store Features

1. **6 Tiered Sticker Packs** ($1–$25)
   - Basic → Better → High-quality → Premium → Top-notch → Ultra-premium
   - Each tier has progressively better sticker quality
   - Descriptions clearly state "100% of proceeds go to UR"

2. **Multiple Payment Methods**
   - Wallet balance (from top-ups)
   - Stripe credit card
   - Loyalty points (earned from purchases)

3. **Monthly Starter Pack**
   - 20 free stickers on the 1st of each month
   - Encourages user retention

4. **Inventory Tracking**
   - User sticker balance
   - Purchase history
   - Statistics (total revenue, popular packs, etc.)

### Environment Variables (Already Configured)

The sticker store uses these environment variables (see Stripe section above):

```bash
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**No additional configuration needed!** The sticker store automatically uses the same Stripe keys as the rest of the app.

### Database Schema (If Using Backend)

If you're using the backend server, the sticker store data is stored in these tables:

```sql
-- User sticker inventory
CREATE TABLE user_stickers (
  user_id TEXT PRIMARY KEY,
  total_stickers INTEGER DEFAULT 0,
  last_starter_pack_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sticker pack purchases
CREATE TABLE sticker_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  payment_method TEXT NOT NULL, -- 'wallet', 'stripe', 'loyalty_points'
  amount INTEGER NOT NULL, -- in cents or points
  stickers_received INTEGER NOT NULL,
  loyalty_points_earned INTEGER NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User sticker packs owned
CREATE TABLE user_sticker_packs (
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchased_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Migration to Your Server (August)

When you move to your own server:

1. **Copy sticker store files** to your server
2. **Set Stripe environment variables** on your server (see Stripe section)
3. **Create database tables** (if using backend) using the schema above
4. **No code changes needed!** Everything is already abstracted

### Testing Sticker Store Locally

```bash
# 1. Ensure environment variables are set in .env.local
# 2. Start dev server
npm run dev

# 3. Navigate to Stickers tab in the app
# 4. Test purchasing with different payment methods
# 5. Verify wallet balance updates correctly
# 6. Check monthly starter pack claim
```

### Sticker Store Statistics & Admin

Access sticker store statistics:

```typescript
import { stickerStoreService } from '@/lib/sticker-store';

// Get store statistics
const stats = stickerStoreService.getStatistics();
console.log(stats);
// Output: {
//   totalPurchases: 42,
//   completedPurchases: 40,
//   totalRevenue: 15000, // in cents
//   totalStickersDistributed: 1200,
//   averagePurchaseValue: 375,
//   topPack: { packId: 'pack_10', purchases: 15 }
// }

// Get user purchase history
const history = stickerStoreService.getPurchaseHistory('user_123', 50);
```

### Troubleshooting Sticker Store

**"Purchase failed" error:**
- Verify Stripe keys are correct in `.env.local`
- Check wallet balance is sufficient
- Ensure payment method is selected in modal

**"Starter pack already claimed" error:**
- User already claimed this month's pack
- They can claim again on the 1st of next month

**Sticker count not updating:**
- Refresh the app or navigate away and back
- Check that purchase completed successfully in Stripe dashboard

---
