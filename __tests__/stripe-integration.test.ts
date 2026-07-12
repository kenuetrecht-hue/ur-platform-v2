import { describe, it, expect, beforeEach } from "vitest";
import { getStripeIntegration, resetStripeIntegration } from "../server/stripe-integration";

describe("Stripe Integration Service", () => {
  let stripe: ReturnType<typeof getStripeIntegration>;

  beforeEach(() => {
    resetStripeIntegration();
    stripe = getStripeIntegration();
  });

  describe("Customer Management", () => {
    it("should create a Stripe customer", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      expect(customer).toBeDefined();
      expect(customer.email).toBe("creator@example.com");
      expect(customer.name).toBe("John Creator");
      expect(customer.metadata.userId).toBe("user_1");
    });

    it("should get or create a customer", async () => {
      const customer1 = await stripe.getOrCreateCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const customer2 = await stripe.getOrCreateCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      expect(customer1.id).toBe(customer2.id);
    });

    it("should retrieve customer details", async () => {
      const created = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const retrieved = stripe.getCustomer(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.email).toBe("creator@example.com");
    });
  });

  describe("Payment Methods", () => {
    it("should add a payment method to a customer", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      expect(method).toBeDefined();
      expect(method.last4).toBe("4242");
      expect(method.isDefault).toBe(true);
    });

    it("should get payment methods for a customer", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      await stripe.addPaymentMethod(customer.id, "card", "4242", "visa", 12, 2025, true);
      await stripe.addPaymentMethod(customer.id, "card", "5555", "mastercard", 6, 2026, false);

      const methods = stripe.getPaymentMethods(customer.id);

      expect(methods).toHaveLength(2);
    });

    it("should get default payment method", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      await stripe.addPaymentMethod(customer.id, "card", "4242", "visa", 12, 2025, true);

      const defaultMethod = stripe.getDefaultPaymentMethod(customer.id);

      expect(defaultMethod).toBeDefined();
      expect(defaultMethod?.isDefault).toBe(true);
    });

    it("should unset previous default when adding new default", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method1 = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const method2 = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "5555",
        "mastercard",
        6,
        2026,
        true
      );

      const methods = stripe.getPaymentMethods(customer.id);
      const defaultMethods = methods.filter((m) => m.isDefault);

      expect(defaultMethods).toHaveLength(1);
      expect(defaultMethods[0].id).toBe(method2.id);
    });
  });

  describe("Payment Intents", () => {
    it("should create a payment intent", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const intent = await stripe.createPaymentIntent(customer.id, 29.99, "USD", {
        sessionId: "session_123",
      });

      expect(intent).toBeDefined();
      expect(intent.amount).toBe(29.99);
      expect(intent.currency).toBe("USD");
      expect(intent.status).toBe("requires_payment_method");
      expect(intent.metadata.sessionId).toBe("session_123");
    });

    it("should have unique client secrets", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const intent1 = await stripe.createPaymentIntent(customer.id, 29.99);
      const intent2 = await stripe.createPaymentIntent(customer.id, 49.99);

      expect(intent1.clientSecret).not.toBe(intent2.clientSecret);
    });
  });

  describe("Charges", () => {
    it("should confirm a payment intent and create a charge", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const intent = await stripe.createPaymentIntent(customer.id, 29.99);

      const charge = await stripe.confirmPaymentIntent(intent.id, method.id);

      expect(charge).toBeDefined();
      expect(charge.amount).toBe(29.99);
      expect(charge.status).toBe("succeeded");
      expect(charge.receiptUrl).toBeDefined();
    });

    it("should get charges for a customer", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const intent1 = await stripe.createPaymentIntent(customer.id, 29.99);
      const intent2 = await stripe.createPaymentIntent(customer.id, 49.99);

      await stripe.confirmPaymentIntent(intent1.id, method.id);
      await stripe.confirmPaymentIntent(intent2.id, method.id);

      const charges = stripe.getCharges(customer.id);

      expect(charges).toHaveLength(2);
      expect(charges[0].amount + charges[1].amount).toBe(79.98);
    });

    it("should retrieve charge details", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const intent = await stripe.createPaymentIntent(customer.id, 29.99);
      const charge = await stripe.confirmPaymentIntent(intent.id, method.id);

      const retrieved = stripe.getCharge(charge.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.amount).toBe(29.99);
      expect(retrieved?.status).toBe("succeeded");
    });
  });

  describe("Refunds", () => {
    it("should refund a charge", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const intent = await stripe.createPaymentIntent(customer.id, 29.99);
      const charge = await stripe.confirmPaymentIntent(intent.id, method.id);

      const refund = await stripe.refundCharge(charge.id, undefined, "customer_request");

      expect(refund).toBeDefined();
      expect(refund.amount).toBe(29.99);
      expect(refund.status).toBe("succeeded");
      expect(refund.reason).toBe("customer_request");
    });

    it("should get refunds for a charge", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const intent = await stripe.createPaymentIntent(customer.id, 29.99);
      const charge = await stripe.confirmPaymentIntent(intent.id, method.id);

      await stripe.refundCharge(charge.id);

      const refunds = stripe.getRefunds(charge.id);

      expect(refunds).toHaveLength(1);
      expect(refunds[0].amount).toBe(29.99);
    });

    it("should support partial refunds", async () => {
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const intent = await stripe.createPaymentIntent(customer.id, 100);
      const charge = await stripe.confirmPaymentIntent(intent.id, method.id);

      const refund = await stripe.refundCharge(charge.id, 50, "partial_refund");

      expect(refund.amount).toBe(50);
    });
  });

  describe("Integration Tests", () => {
    it("should complete full payment flow", async () => {
      // Create customer
      const customer = await stripe.createCustomer(
        "user_1",
        "creator@example.com",
        "John Creator"
      );

      // Add payment method
      const method = await stripe.addPaymentMethod(
        customer.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      // Create payment intent
      const intent = await stripe.createPaymentIntent(customer.id, 29.99, "USD", {
        sessionId: "session_123",
        description: "AI Specialist Session",
      });

      // Confirm payment
      const charge = await stripe.confirmPaymentIntent(intent.id, method.id);

      expect(charge.status).toBe("succeeded");
      expect(charge.receiptUrl).toBeDefined();

      // Refund
      const refund = await stripe.refundCharge(charge.id);

      expect(refund.status).toBe("succeeded");
      expect(refund.amount).toBe(29.99);
    });

    it("should handle multiple customers independently", async () => {
      const customer1 = await stripe.createCustomer(
        "user_1",
        "creator1@example.com",
        "Creator 1"
      );

      const customer2 = await stripe.createCustomer(
        "user_2",
        "creator2@example.com",
        "Creator 2"
      );

      const method1 = await stripe.addPaymentMethod(
        customer1.id,
        "card",
        "4242",
        "visa",
        12,
        2025,
        true
      );

      const method2 = await stripe.addPaymentMethod(
        customer2.id,
        "card",
        "5555",
        "mastercard",
        6,
        2026,
        true
      );

      const intent1 = await stripe.createPaymentIntent(customer1.id, 29.99);
      const intent2 = await stripe.createPaymentIntent(customer2.id, 49.99);

      const charge1 = await stripe.confirmPaymentIntent(intent1.id, method1.id);
      const charge2 = await stripe.confirmPaymentIntent(intent2.id, method2.id);

      const charges1 = stripe.getCharges(customer1.id);
      const charges2 = stripe.getCharges(customer2.id);

      expect(charges1).toHaveLength(1);
      expect(charges2).toHaveLength(1);
      expect(charges1[0].amount).toBe(29.99);
      expect(charges2[0].amount).toBe(49.99);
    });
  });
});
