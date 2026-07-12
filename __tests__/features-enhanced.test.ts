import { describe, it, expect, beforeEach } from "vitest";
import { getEnhancedVoiceChatService } from "../server/voice-chat-enhanced";
import { getEnhancedPaymentProcessor } from "../server/payment-processor-enhanced";
import type EnhancedPaymentProcessor from "../server/payment-processor-enhanced";

// ============================================================================
// VOICE CHAT SERVICE TESTS
// ============================================================================

describe("Enhanced Voice Chat Service", () => {
  let voiceService: ReturnType<typeof getEnhancedVoiceChatService>;

  beforeEach(() => {
    voiceService = getEnhancedVoiceChatService();
  });

  describe("Session Management", () => {
    it("should create a voice chat session", () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe("user_1");
      expect(session.aiSpecialistId).toBe("ai-wellness-001");
      expect(session.duration).toBe(30);
      expect(session.status).toBe("active");
    });

    it("should retrieve session details", () => {
      const created = voiceService.createSession(
        "user_1",
        "ai-fitness-001",
        15
      );
      const retrieved = voiceService.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userId).toBe("user_1");
    });

    it("should get all sessions for a user", () => {
      voiceService.createSession("user_1", "ai-wellness-001", 30);
      voiceService.createSession("user_1", "ai-fitness-001", 15);
      voiceService.createSession("user_2", "ai-crypto-001", 60);

      const userSessions = voiceService.getUserSessions("user_1");

      expect(userSessions.length).toBeGreaterThanOrEqual(2);
      expect(userSessions.every((s) => s.userId === "user_1")).toBe(true);
    });

    it("should end a session and calculate metrics", () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      // Simulate some activity
      session.metrics.userSpeakingTime = 15;
      session.metrics.aiSpeakingTime = 12;

      const ended = voiceService.endSession(session.id);

      expect(ended.status).toBe("completed");
      expect(ended.endTime).toBeDefined();
      expect(ended.metrics.silenceTime).toBeDefined();
    });
  });

  describe("Audio Processing", () => {
    it("should add audio chunks to session", () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      voiceService.addAudioChunk(session.id, {
        timestamp: Date.now(),
        duration: 2.5,
        sampleRate: 16000,
        channels: 1,
        data: "base64encodedaudiodata",
        format: "opus",
      });

      const retrieved = voiceService.getSession(session.id);
      expect(retrieved?.audioChunks).toHaveLength(1);
      expect(retrieved?.metrics.totalAudioDuration).toBe(2.5);
    });

    it("should validate audio chunk format", () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      expect(() => {
        voiceService.addAudioChunk(session.id, {
          timestamp: Date.now(),
          duration: 2.5,
          sampleRate: 4000, // Invalid: too low
          channels: 1,
          data: "base64encodedaudiodata",
          format: "opus",
        });
      }).toThrow();
    });
  });

  describe("Transcription & AI Response", () => {
    it("should transcribe audio to text", async () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      voiceService.addAudioChunk(session.id, {
        timestamp: Date.now(),
        duration: 2.5,
        sampleRate: 16000,
        channels: 1,
        data: "base64encodedaudiodata",
        format: "opus",
      });

      const transcripts = await voiceService.transcribeAudio(session.id);

      expect(transcripts).toHaveLength(1);
      expect(transcripts[0].speaker).toBe("user");
      expect(transcripts[0].text).toBeDefined();
      expect(transcripts[0].confidence).toBeGreaterThan(0.8);
    });

    it("should generate AI response", async () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      const response = await voiceService.generateAIResponse(
        session.id,
        "How can I reduce stress?",
        "ai-wellness-001"
      );

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
      expect(typeof response).toBe("string");
    });

    it("should synthesize text to speech", async () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      const audio = await voiceService.synthesizeToSpeech(
        session.id,
        "Hello, how can I help you today?"
      );

      expect(audio.audioUrl).toBeDefined();
      expect(audio.duration).toBeGreaterThan(0);
      expect(audio.audioUrl).toContain("mp3");
    });
  });

  describe("Payment Processing", () => {
    it("should process payment for session", () => {
      const session = voiceService.createSession(
        "user_1",
        "ai-wellness-001",
        30
      );

      const payment = voiceService.processPayment(
        session.id,
        "user_1",
        "ai-wellness-001",
        29.99,
        "stripe"
      );

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(29.99);
      expect(payment.status).toBe("completed");
      expect(payment.paymentMethod).toBe("stripe");
    });

    it("should calculate session cost by tier", () => {
      const bronzeCost = voiceService.calculateSessionCost(30, "bronze");
      const goldCost = voiceService.calculateSessionCost(30, "gold");

      expect(bronzeCost).toBe(15); // 30 * 0.5
      expect(goldCost).toBe(60); // 30 * 2.0
      expect(goldCost).toBeGreaterThan(bronzeCost);
    });
  });
});

// ============================================================================
// PAYMENT PROCESSOR TESTS
// ============================================================================

describe("Enhanced Payment Processor", () => {
  let paymentProcessor: ReturnType<typeof getEnhancedPaymentProcessor>;

  beforeEach(() => {
    paymentProcessor = getEnhancedPaymentProcessor();
    paymentProcessor.reset();
  });

  describe("Payment Intent Creation", () => {
    it("should create a payment intent", () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-wellness-001",
        "session_123",
        29.99,
        "stripe_card"
      );

      expect(intent).toBeDefined();
      expect(intent.amount).toBe(29.99);
      expect(intent.currency).toBe("USD");
      expect(intent.status).toBe("requires_payment_method");
      expect(intent.provider).toBe("stripe");
    });

    it("should set payment intent expiry", () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-wellness-001",
        "session_123",
        29.99,
        "paypal"
      );

      const expiryTime = intent.expiresAt - intent.createdAt;
      expect(expiryTime).toBe(15 * 60 * 1000); // 15 minutes
    });
  });

  describe("Payment Methods", () => {
    it("should create a payment method", () => {
      const methodId = paymentProcessor.createPaymentMethod(
        "user_1",
        "stripe_card"
      );

      expect(methodId).toBeDefined();
      expect(methodId).toContain("pm_");
    });

    it("should support multiple payment methods", () => {
      const stripeId = paymentProcessor.createPaymentMethod(
        "user_1",
        "stripe_card"
      );
      const paypalId = paymentProcessor.createPaymentMethod(
        "user_1",
        "paypal"
      );
      const walletId = paymentProcessor.createPaymentMethod("user_1", "wallet");

      expect(stripeId).not.toBe(paypalId);
      expect(paypalId).not.toBe(walletId);
    });
  });

  describe("Payment Confirmation", () => {
    it("should confirm stripe payment", async () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-wellness-001",
        "session_123",
        29.99,
        "stripe_card"
      );

      const methodId = paymentProcessor.createPaymentMethod(
        "user_1",
        "stripe_card"
      );

      const transaction = await paymentProcessor.confirmPayment(
        intent.id,
        methodId
      );

      expect(transaction.status).toBe("completed");
      expect(transaction.provider).toBe("stripe");
      expect(transaction.receipt).toBeDefined();
    });

    it("should confirm paypal payment", async () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-fitness-001",
        "session_456",
        19.99,
        "paypal"
      );

      const methodId = paymentProcessor.createPaymentMethod(
        "user_1",
        "paypal"
      );

      const transaction = await paymentProcessor.confirmPayment(
        intent.id,
        methodId
      );

      expect(transaction.status).toBe("completed");
      expect(transaction.provider).toBe("paypal");
    });
  });

  describe("Wallet Payments", () => {
    it("should get wallet balance", () => {
      const balance = paymentProcessor.getWalletBalance("user_1");
      expect(balance).toBe(100); // Demo balance
    });

    it("should add funds to wallet", () => {
      const initialBalance = paymentProcessor.getWalletBalance("user_1");
      const newBalance = paymentProcessor.addWalletFunds("user_1", 50);

      expect(newBalance).toBe(initialBalance + 50);
    });

    it("should process wallet payment with sufficient balance", async () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-crypto-001",
        "session_789",
        50,
        "wallet"
      );

      const methodId = paymentProcessor.createPaymentMethod(
        "user_1",
        "wallet"
      );

      const transaction = await paymentProcessor.confirmPayment(
        intent.id,
        methodId
      );

      expect(transaction.status).toBe("completed");
      expect(transaction.provider).toBe("wallet");
    });

    it("should fail wallet payment with insufficient balance", async () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_2",
        "ai-wellness-001",
        "session_999",
        100, // user_2 only has 50
        "wallet"
      );

      const methodId = paymentProcessor.createPaymentMethod(
        "user_2",
        "wallet"
      );

      const transaction = await paymentProcessor.confirmPayment(
        intent.id,
        methodId
      );

      expect(transaction.status).toBe("failed");
      expect(transaction.failureReason).toContain("Insufficient");
    });
  });

  describe("Booking Payments", () => {
    it("should process complete booking payment", async () => {
      const booking = await paymentProcessor.processBookingPayment(
        "user_1",
        "ai-wellness-001",
        "session_123",
        30, // duration
        2.0, // price per minute
        "stripe_card"
      );

      expect(booking).toBeDefined();
      expect(booking.durationMinutes).toBe(30);
      expect(booking.pricePerMinute).toBe(2.0);
      expect(booking.totalAmount).toBe(60);
      expect(booking.finalAmount).toBeGreaterThan(booking.totalAmount); // With tax
      expect(booking.paymentTransaction.status).toBe("completed");
    });

    it("should apply discount to booking", async () => {
      const booking = await paymentProcessor.processBookingPayment(
        "user_1",
        "ai-fitness-001",
        "session_456",
        60, // duration
        1.5, // price per minute
        "paypal",
        10 // $10 discount
      );

      expect(booking.discount).toBe(10);
      expect(booking.finalAmount).toBeLessThan(booking.totalAmount);
    });

    it("should generate invoice for booking", async () => {
      const booking = await paymentProcessor.processBookingPayment(
        "user_1",
        "ai-crypto-001",
        "session_789",
        15,
        3.0,
        "wallet"
      );

      expect(booking.invoice).toBeDefined();
      expect(booking.invoice?.number).toContain("INV-");
      expect(booking.invoice?.url).toBeDefined();
    });

    it("should get all booking payments for user", async () => {
      paymentProcessor.reset();
      await paymentProcessor.processBookingPayment(
        "user_1",
        "ai-wellness-001",
        "session_1",
        30,
        2.0,
        "stripe_card"
      );

      await paymentProcessor.processBookingPayment(
        "user_1",
        "ai-fitness-001",
        "session_2",
        60,
        1.5,
        "paypal"
      );

      const bookings = paymentProcessor.getUserBookingPayments("user_1");
      expect(bookings).toHaveLength(2);
    });
  });

  describe("Refunds", () => {
    it("should refund a transaction", async () => {
      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-wellness-001",
        "session_123",
        29.99,
        "stripe_card"
      );

      const methodId = paymentProcessor.createPaymentMethod(
        "user_1",
        "stripe_card"
      );

      const transaction = await paymentProcessor.confirmPayment(
        intent.id,
        methodId
      );

      const refunded = await paymentProcessor.refundTransaction(
        transaction.id
      );

      expect(refunded.status).toBe("refunded");
      expect(refunded.refundedAmount).toBe(transaction.amount);
      expect(refunded.refundedAt).toBeDefined();
    });

    it("should refund wallet payment back to wallet", async () => {
      const initialBalance = paymentProcessor.getWalletBalance("user_1");

      const intent = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-wellness-001",
        "session_123",
        30,
        "wallet"
      );

      const methodId = paymentProcessor.createPaymentMethod(
        "user_1",
        "wallet"
      );

      const transaction = await paymentProcessor.confirmPayment(
        intent.id,
        methodId
      );

      const balanceAfterPayment =
        paymentProcessor.getWalletBalance("user_1");
      expect(balanceAfterPayment).toBe(initialBalance - 30);

      await paymentProcessor.refundTransaction(transaction.id);

      const balanceAfterRefund = paymentProcessor.getWalletBalance("user_1");
      expect(balanceAfterRefund).toBe(initialBalance);
    });
  });

  describe("Transaction History", () => {
    it("should get all transactions for user", async () => {
      const intent1 = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-wellness-001",
        "session_1",
        29.99,
        "stripe_card"
      );

      const intent2 = paymentProcessor.createPaymentIntent(
        "user_1",
        "ai-fitness-001",
        "session_2",
        19.99,
        "paypal"
      );

      const methodId1 = paymentProcessor.createPaymentMethod(
        "user_1",
        "stripe_card"
      );
      const methodId2 = paymentProcessor.createPaymentMethod(
        "user_1",
        "paypal"
      );

      await paymentProcessor.confirmPayment(intent1.id, methodId1);
      await paymentProcessor.confirmPayment(intent2.id, methodId2);

      const transactions = paymentProcessor.getUserTransactions("user_1");

      expect(transactions).toHaveLength(2);
      expect(transactions.every((t) => t.userId === "user_1")).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration: Voice Chat + Payment", () => {
  let voiceService: ReturnType<typeof getEnhancedVoiceChatService>;
  let paymentProcessor: ReturnType<typeof getEnhancedPaymentProcessor>;

  beforeEach(() => {
    voiceService = getEnhancedVoiceChatService();
    paymentProcessor = getEnhancedPaymentProcessor();
  });

  it("should complete full booking flow: payment -> session -> metrics", async () => {
    // 1. Process payment
    const booking = await paymentProcessor.processBookingPayment(
      "user_1",
      "ai-wellness-001",
      "session_123",
      30,
      2.0,
      "stripe_card"
    );

    expect(booking.paymentTransaction.status).toBe("completed");

    // 2. Create voice session
    const session = voiceService.createSession(
      "user_1",
      "ai-wellness-001",
      30
    );

    expect(session.status).toBe("active");

    // 3. Add audio and transcribe
    voiceService.addAudioChunk(session.id, {
      timestamp: Date.now(),
      duration: 2.5,
      sampleRate: 16000,
      channels: 1,
      data: "base64encodedaudiodata",
      format: "opus",
    });

    const transcripts = await voiceService.transcribeAudio(session.id);
    expect(transcripts.length).toBeGreaterThan(0);

    // 4. Generate AI response
    const response = await voiceService.generateAIResponse(
      session.id,
      transcripts[0].text,
      "ai-wellness-001"
    );

    expect(response).toBeDefined();

    // 5. End session and verify metrics
    const ended = voiceService.endSession(session.id);

    expect(ended.status).toBe("completed");
    expect(ended.metrics.totalAudioDuration).toBeGreaterThan(0);
    expect(ended.metrics.responseLatency).toBeGreaterThan(0);
  });

  it("should handle multiple concurrent sessions", () => {
    const sessions = [];

    for (let i = 0; i < 5; i++) {
      const session = voiceService.createSession(
        `user_${i}`,
        `ai-specialist-${i}`,
        30
      );
      sessions.push(session);
    }

    expect(sessions).toHaveLength(5);
    expect(sessions.every((s) => s.status === "active")).toBe(true);

    const userSessions = voiceService.getUserSessions("user_0");
    expect(userSessions).toHaveLength(1);
  });
});
