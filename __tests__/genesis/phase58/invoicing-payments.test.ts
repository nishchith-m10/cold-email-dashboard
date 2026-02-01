/**
 * PHASE 58 TESTS: INVOICING & PAYMENT METHODS
 */

import { InvoiceGenerator } from '@/lib/genesis/phase58/invoice-generator';
import { PaymentMethodManager } from '@/lib/genesis/phase58/payment-manager';
import { MockInvoiceDB, MockPaymentMethodDB } from '@/lib/genesis/phase58/mocks';
import { InvoiceStatus, PaymentMethodType, PaymentMethodStatus } from '@/lib/genesis/phase58/types';

describe('Phase 58: Invoicing & Payment Methods', () => {
  describe('InvoiceGenerator', () => {
    let invoiceDB: MockInvoiceDB;
    let generator: InvoiceGenerator;

    beforeEach(() => {
      invoiceDB = new MockInvoiceDB();
      generator = new InvoiceGenerator(invoiceDB);
    });

    test('should generate invoice with line items', async () => {
      const invoice = await generator.generateInvoice({
        workspaceId: 'ws_1',
        billingPeriod: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
        lineItems: [
          {
            id: 'line_1',
            description: 'Apify Scrapes',
            quantity: 100,
            unitPriceCents: 2,
            totalCents: 200,
          },
          {
            id: 'line_2',
            description: 'Google CSE Searches',
            quantity: 1000,
            unitPriceCents: 0.5,
            totalCents: 500,
          },
        ],
      });

      expect(invoice.lineItems.length).toBe(2);
      expect(invoice.subtotalCents).toBe(700);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    });

    test('should calculate tax', async () => {
      const invoice = await generator.generateInvoice({
        workspaceId: 'ws_1',
        billingPeriod: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
        lineItems: [
          {
            id: 'line_1',
            description: 'Test Item',
            quantity: 1,
            unitPriceCents: 10000,
            totalCents: 10000,
          },
        ],
        taxConfig: {
          workspaceId: 'ws_1',
          region: 'CA',
          taxRate: 0.0825, // 8.25% CA sales tax
          taxType: 'sales_tax',
        },
      });

      expect(invoice.subtotalCents).toBe(10000);
      expect(invoice.taxCents).toBe(825); // 8.25%
      expect(invoice.totalCents).toBe(10825);
    });

    test('should mark invoice as paid', async () => {
      const invoice = await generator.generateInvoice({
        workspaceId: 'ws_1',
        billingPeriod: { start: new Date(), end: new Date() },
        lineItems: [
          {
            id: 'line_1',
            description: 'Test',
            quantity: 1,
            unitPriceCents: 100,
            totalCents: 100,
          },
        ],
      });

      const paid = await generator.markInvoicePaid(invoice.id);

      expect(paid.status).toBe(InvoiceStatus.PAID);
      expect(paid.paidAt).toBeDefined();
    });
  });

  describe('PaymentMethodManager', () => {
    let paymentMethodDB: MockPaymentMethodDB;
    let manager: PaymentMethodManager;

    beforeEach(() => {
      paymentMethodDB = new MockPaymentMethodDB();
      manager = new PaymentMethodManager(paymentMethodDB);
    });

    test('should add payment method', async () => {
      const method = await manager.addPaymentMethod({
        workspaceId: 'ws_1',
        type: PaymentMethodType.CREDIT_CARD,
        status: PaymentMethodStatus.ACTIVE,
        isDefault: true,
        priority: 1,
        metadata: {
          type: PaymentMethodType.CREDIT_CARD,
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2028,
          fingerprint: 'abc123',
          stripePaymentMethodId: 'pm_123',
        },
      });

      expect(method.type).toBe(PaymentMethodType.CREDIT_CARD);
      expect(method.isDefault).toBe(true);
    });

    test('should set default payment method', async () => {
      const method1 = await manager.addPaymentMethod({
        workspaceId: 'ws_1',
        type: PaymentMethodType.CREDIT_CARD,
        status: PaymentMethodStatus.ACTIVE,
        isDefault: true,
        priority: 1,
        metadata: {
          type: PaymentMethodType.CREDIT_CARD,
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2028,
          fingerprint: 'abc1',
          stripePaymentMethodId: 'pm_1',
        },
      });

      const method2 = await manager.addPaymentMethod({
        workspaceId: 'ws_1',
        type: PaymentMethodType.CREDIT_CARD,
        status: PaymentMethodStatus.ACTIVE,
        isDefault: false,
        priority: 2,
        metadata: {
          type: PaymentMethodType.CREDIT_CARD,
          last4: '5555',
          brand: 'mastercard',
          expiryMonth: 6,
          expiryYear: 2027,
          fingerprint: 'abc2',
          stripePaymentMethodId: 'pm_2',
        },
      });

      await manager.setDefaultPaymentMethod(method2.id);

      const updatedMethod1 = await paymentMethodDB.getPaymentMethod(method1.id);
      const updatedMethod2 = await paymentMethodDB.getPaymentMethod(method2.id);

      expect(updatedMethod1?.isDefault).toBe(false);
      expect(updatedMethod2?.isDefault).toBe(true);
    });

    test('should process payment with primary method', async () => {
      await manager.addPaymentMethod({
        workspaceId: 'ws_1',
        type: PaymentMethodType.CREDIT_CARD,
        status: PaymentMethodStatus.ACTIVE,
        isDefault: true,
        priority: 1,
        metadata: {
          type: PaymentMethodType.CREDIT_CARD,
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2028,
          fingerprint: 'abc',
          stripePaymentMethodId: 'pm_1',
        },
      });

      const result = await manager.processPayment({
        workspaceId: 'ws_1',
        amountCents: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.amountCents).toBe(5000);
    });

    test('should return error when no payment methods', async () => {
      const result = await manager.processPayment({
        workspaceId: 'ws_empty',
        amountCents: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No payment methods available');
    });
  });
});
