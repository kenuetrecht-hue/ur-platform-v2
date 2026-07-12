/**
 * Booking & Subscription System Service
 * Manages creator bookings, subscriptions, and payments
 */

export interface Subscription {
  id: string;
  userId: string;
  creatorId: string;
  tier: 'free' | 'silver' | 'gold' | 'platinum';
  monthlyPrice: number;
  startDate: Date;
  renewalDate: Date;
  status: 'active' | 'paused' | 'cancelled';
  autoRenew: boolean;
  benefits: string[];
}

export interface Booking {
  id: string;
  userId: string;
  creatorId: string;
  sessionType: 'consultation' | 'coaching' | 'custom';
  duration: number; // minutes
  scheduledTime: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  notes: string;
  meetingLink?: string;
}

export interface Payment {
  id: string;
  userId: string;
  creatorId: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'booking' | 'tip';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'credit_card' | 'paypal' | 'stripe' | 'crypto';
  transactionId: string;
  createdAt: Date;
  refundedAt?: Date;
}

export interface SubscriptionTier {
  name: 'free' | 'silver' | 'gold' | 'platinum';
  monthlyPrice: number;
  benefits: string[];
  maxBookingsPerMonth: number;
  priority: number;
}

class BookingSubscriptionService {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private bookings: Map<string, Booking[]> = new Map();
  private payments: Map<string, Payment[]> = new Map();
  private subscriptionId = 0;
  private bookingId = 0;
  private paymentId = 0;

  private subscriptionTiers: Map<string, SubscriptionTier> = new Map([
    ['free', { name: 'free', monthlyPrice: 0, benefits: ['Basic access'], maxBookingsPerMonth: 0, priority: 1 }],
    ['silver', { name: 'silver', monthlyPrice: 9.99, benefits: ['Priority support', '1 booking/month', 'Exclusive content'], maxBookingsPerMonth: 1, priority: 2 }],
    ['gold', { name: 'gold', monthlyPrice: 24.99, benefits: ['Priority support', '4 bookings/month', 'Exclusive content', 'Early access'], maxBookingsPerMonth: 4, priority: 3 }],
    ['platinum', { name: 'platinum', monthlyPrice: 99.99, benefits: ['24/7 support', 'Unlimited bookings', 'Exclusive content', 'Early access', 'Custom sessions'], maxBookingsPerMonth: 999, priority: 4 }],
  ]);

  /**
   * Create subscription
   */
  createSubscription(userId: string, creatorId: string, tier: 'free' | 'silver' | 'gold' | 'platinum'): Subscription {
    const tierInfo = this.subscriptionTiers.get(tier)!;
    const subscription: Subscription = {
      id: `sub-${++this.subscriptionId}`,
      userId,
      creatorId,
      tier,
      monthlyPrice: tierInfo.monthlyPrice,
      startDate: new Date(),
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      autoRenew: true,
      benefits: tierInfo.benefits,
    };

    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, []);
    }

    this.subscriptions.get(userId)!.push(subscription);

    // Create payment record
    if (tierInfo.monthlyPrice > 0) {
      this.createPayment(userId, creatorId, tierInfo.monthlyPrice, 'subscription');
    }

    return subscription;
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string, userId: string): boolean {
    const subscriptions = this.subscriptions.get(userId);
    if (!subscriptions) return false;

    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return false;

    subscription.status = 'cancelled';
    return true;
  }

  /**
   * Upgrade subscription tier
   */
  upgradeSubscription(subscriptionId: string, userId: string, newTier: 'free' | 'silver' | 'gold' | 'platinum'): boolean {
    const subscriptions = this.subscriptions.get(userId);
    if (!subscriptions) return false;

    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return false;

    const tierInfo = this.subscriptionTiers.get(newTier)!;
    const oldPrice = subscription.monthlyPrice;
    const priceDifference = tierInfo.monthlyPrice - oldPrice;

    subscription.tier = newTier;
    subscription.monthlyPrice = tierInfo.monthlyPrice;
    subscription.benefits = tierInfo.benefits;

    // Create payment for price difference
    if (priceDifference > 0) {
      this.createPayment(userId, subscription.creatorId, priceDifference, 'subscription');
    }

    return true;
  }

  /**
   * Get user subscriptions
   */
  getSubscriptions(userId: string): Subscription[] {
    return this.subscriptions.get(userId) || [];
  }

  /**
   * Get active subscriptions for user
   */
  getActiveSubscriptions(userId: string): Subscription[] {
    return this.getSubscriptions(userId).filter(s => s.status === 'active');
  }

  /**
   * Book a session
   */
  bookSession(userId: string, creatorId: string, sessionType: 'consultation' | 'coaching' | 'custom', duration: number, scheduledTime: Date, price: number, notes: string = ''): Booking | null {
    // Check if user has subscription or sufficient tier
    const subscription = this.getSubscriptions(userId).find(s => s.creatorId === creatorId && s.status === 'active');
    if (!subscription) {
      return null; // User must have active subscription
    }

    const tierInfo = this.subscriptionTiers.get(subscription.tier)!;
    const bookingsThisMonth = this.getBookingsForMonth(userId, creatorId, new Date());
    
    if (bookingsThisMonth.length >= tierInfo.maxBookingsPerMonth && tierInfo.maxBookingsPerMonth > 0) {
      return null; // Exceeded booking limit
    }

    const booking: Booking = {
      id: `book-${++this.bookingId}`,
      userId,
      creatorId,
      sessionType,
      duration,
      scheduledTime,
      status: 'pending',
      price,
      notes,
    };

    if (!this.bookings.has(userId)) {
      this.bookings.set(userId, []);
    }

    this.bookings.get(userId)!.push(booking);

    // Create payment
    this.createPayment(userId, creatorId, price, 'booking');

    return booking;
  }

  /**
   * Confirm booking
   */
  confirmBooking(bookingId: string, userId: string, meetingLink?: string): boolean {
    const bookings = this.bookings.get(userId);
    if (!bookings) return false;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return false;

    booking.status = 'confirmed';
    if (meetingLink) {
      booking.meetingLink = meetingLink;
    }

    return true;
  }

  /**
   * Cancel booking
   */
  cancelBooking(bookingId: string, userId: string): boolean {
    const bookings = this.bookings.get(userId);
    if (!bookings) return false;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return false;

    booking.status = 'cancelled';

    // Process refund
    const payment = this.getPaymentForBooking(bookingId);
    if (payment) {
      this.refundPayment(payment.id);
    }

    return true;
  }

  /**
   * Get bookings for user
   */
  getBookings(userId: string): Booking[] {
    return this.bookings.get(userId) || [];
  }

  /**
   * Get bookings for month
   */
  private getBookingsForMonth(userId: string, creatorId: string, date: Date): Booking[] {
    const bookings = this.getBookings(userId);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return bookings.filter(b => 
      b.creatorId === creatorId && 
      b.scheduledTime >= monthStart && 
      b.scheduledTime <= monthEnd &&
      b.status !== 'cancelled'
    );
  }

  /**
   * Create payment
   */
  private createPayment(userId: string, creatorId: string, amount: number, type: 'subscription' | 'booking' | 'tip'): Payment {
    const payment: Payment = {
      id: `pay-${++this.paymentId}`,
      userId,
      creatorId,
      amount,
      currency: 'USD',
      type,
      status: 'completed',
      paymentMethod: 'stripe',
      transactionId: `txn-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    if (!this.payments.has(userId)) {
      this.payments.set(userId, []);
    }

    this.payments.get(userId)!.push(payment);
    return payment;
  }

  /**
   * Get payments for user
   */
  getPayments(userId: string): Payment[] {
    return this.payments.get(userId) || [];
  }

  /**
   * Refund payment
   */
  refundPayment(paymentId: string): boolean {
    for (const payments of this.payments.values()) {
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        return true;
      }
    }
    return false;
  }

  /**
   * Get payment for booking
   */
  private getPaymentForBooking(bookingId: string): Payment | undefined {
    for (const payments of this.payments.values()) {
      const payment = payments.find(p => p.type === 'booking' && p.transactionId.includes(bookingId));
      if (payment) return payment;
    }
    return undefined;
  }

  /**
   * Get creator earnings
   */
  getCreatorEarnings(creatorId: string): { total: number; byType: { subscriptions: number; bookings: number; tips: number } } {
    let total = 0;
    let subscriptions = 0;
    let bookings = 0;
    let tips = 0;

    for (const payments of this.payments.values()) {
      for (const payment of payments) {
        if (payment.creatorId === creatorId && payment.status === 'completed') {
          total += payment.amount;
          if (payment.type === 'subscription') subscriptions += payment.amount;
          else if (payment.type === 'booking') bookings += payment.amount;
          else if (payment.type === 'tip') tips += payment.amount;
        }
      }
    }

    return {
      total,
      byType: { subscriptions, bookings, tips },
    };
  }

  /**
   * Get subscription tier info
   */
  getSubscriptionTier(tier: 'free' | 'silver' | 'gold' | 'platinum'): SubscriptionTier {
    return this.subscriptionTiers.get(tier)!;
  }

  /**
   * Get all subscription tiers
   */
  getAllSubscriptionTiers(): SubscriptionTier[] {
    return Array.from(this.subscriptionTiers.values());
  }
}

export const bookingSubscriptionService = new BookingSubscriptionService();
