# Payment System Documentation

## Overview

The UR platform payment system handles three types of currency:
1. **Stamps** (paid virtual currency)
2. **Loyalty Points** (free earned currency)
3. **Stripe** (credit card payments)

## Payment Configuration

All pricing is configurable in `/server/config/payment-config.ts`. You can update prices anytime without code changes.

### Current Configuration

**Stamps:**
- Bundle: 10 stamps for $4.99
- First purchase bonus: 5 free stamps
- Stamp value: $0.50 per stamp
- Chat cost: 2 stamps per conversation

**Loyalty Points:**
- Chat cost: 1 loyalty point per conversation (TBD - update in config)
- Double value when no stamps available
- Earning rules: TBD

**Memberships:**
- Day: $4.99 (Stripe)
- Week: $19.99 (TBD - update in config)
- Month: $49.99 (TBD - update in config)
- Year: $999.00 (TBD - update in config)

## Database Schema

### Tables

1. **stamp_balances** — User stamp balance and statistics
2. **loyalty_point_balances** — User loyalty point balance
3. **stamp_transactions** — All stamp transactions (purchases, usage, bonuses)
4. **loyalty_point_transactions** — All loyalty point transactions
5. **stamp_purchases** — Stripe payment records for stamp purchases
6. **memberships** — User memberships with expiration dates
7. **payment_methods** — Saved payment methods (Stripe)
8. **payment_configuration** — Admin settings for all prices

## Payment Routing Logic

### For Individual AI Chats

1. If user has loyalty points → Use loyalty points (free)
2. If user has NO loyalty points but has stamps → Use 2 stamps per chat
3. If user has neither → Prompt to buy stamps or earn loyalty points

### For Memberships

- Price >= $4.99 → Use Stripe (credit card)
- Price < $4.99 → Must use stamps

### For Stamp Purchases

- All stamp purchases → Use Stripe (credit card)

## tRPC Endpoints

### Stamp Operations

```typescript
// Get user's stamp balance
trpc.payments.getStampBalance.query()

// Purchase stamps with Stripe
trpc.payments.purchaseStamps.mutation({ bundleId: string })

// Use stamps for chat
trpc.payments.useStampsForChat.mutation({ chatId: string, aiCreatorId: string })

// Get stamp transaction history
trpc.payments.getStampTransactions.query({ limit: number, offset: number })
```

### Loyalty Points Operations

```typescript
// Get user's loyalty point balance
trpc.payments.getLoyaltyPointBalance.query()

// Use loyalty points for chat
trpc.payments.useLoyaltyPointsForChat.mutation({ chatId: string, aiCreatorId: string })

// Get loyalty point transaction history
trpc.payments.getLoyaltyPointTransactions.query({ limit: number, offset: number })

// Earn loyalty points (admin)
trpc.payments.earnLoyaltyPoints.mutation({ userId: string, amount: number, reason: string })
```

### Membership Operations

```typescript
// Get user's active memberships
trpc.payments.getActiveMemberships.query()

// Purchase membership
trpc.payments.purchaseMembership.mutation({ 
  creatorId: string, 
  type: "day" | "week" | "month" | "year" 
})

// Cancel membership
trpc.payments.cancelMembership.mutation({ membershipId: string })

// Check if user has active membership
trpc.payments.hasActiveMembership.query({ creatorId: string })
```

### Admin Configuration

```typescript
// Get current payment configuration
trpc.payments.admin.getConfiguration.query()

// Update payment configuration
trpc.payments.admin.updateConfiguration.mutation({ 
  stampBundlePriceInCents: number,
  dayMembershipPriceInCents: number,
  // ... other fields
})
```

## Stripe Integration

### Webhook Events

The system handles these Stripe webhook events:

- `payment_intent.succeeded` — Stamp purchase completed
- `payment_intent.payment_failed` — Stamp purchase failed
- `charge.refunded` — Refund processed
- `customer.subscription.updated` — Membership renewal
- `customer.subscription.deleted` — Membership cancelled

### Stripe Setup

1. Create Stripe account
2. Set environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Configure webhook endpoint in Stripe dashboard

## User Experience Flow

### New User

1. Sign up
2. Receive 5 bonus stamps
3. Browse AI creators
4. Try free chat with loyalty points (if available)
5. Or purchase stamps to chat
6. Or buy membership for unlimited access

### Existing User

1. Login
2. View stamp balance and loyalty points
3. Choose AI creator
4. System automatically routes to best payment method
5. Chat begins after payment processed

## Admin Panel

### Update Pricing

1. Go to Admin Settings → Payment Configuration
2. Update prices for stamps, loyalty points, memberships
3. Changes take effect immediately
4. All users see new prices on next page load

### View Transactions

1. Go to Admin Dashboard → Payment Transactions
2. Filter by user, date, type
3. View detailed transaction history
4. Process refunds if needed

### Manage Memberships

1. Go to Admin Dashboard → Memberships
2. View all active memberships
3. Cancel memberships if needed
4. View membership statistics

## Security Considerations

1. **PCI Compliance** — All payment data handled by Stripe (no card data stored)
2. **Rate Limiting** — Prevent abuse of stamp purchases
3. **Fraud Detection** — Stripe handles fraud detection
4. **Audit Trail** — All transactions logged for compliance
5. **Encryption** — All sensitive data encrypted at rest

## Testing

### Test Stripe Cards

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

### Test Flows

1. Purchase stamps with test card
2. Use stamps for chat
3. Purchase membership with test card
4. Cancel membership and verify refund
5. Test loyalty points usage

## Troubleshooting

### Stamp Purchase Failed

1. Check Stripe API keys are correct
2. Verify webhook endpoint is configured
3. Check user's payment method is valid
4. Review Stripe dashboard for error details

### Loyalty Points Not Appearing

1. Verify earning rules are configured
2. Check transaction history for earning events
3. Ensure loyalty point balance is updated

### Membership Not Active

1. Verify membership start/end dates
2. Check payment was processed successfully
3. Ensure user's membership hasn't expired
4. Verify creator ID is correct

## Future Enhancements

- [ ] Subscription auto-renewal for memberships
- [ ] Promotional codes and discounts
- [ ] Gift cards
- [ ] Referral bonuses
- [ ] Tiered pricing for bulk purchases
- [ ] Payment plan options
- [ ] Cryptocurrency payments
- [ ] Apple Pay / Google Pay integration
