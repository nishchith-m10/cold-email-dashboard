/**
 * PHASE 58: PAYMENT METHOD MANAGER
 * 
 * Simplified payment method management with fallback chains.
 */

import {
  PaymentMethod,
  PaymentResult,
  PaymentMethodDB,
} from './types';

export class PaymentMethodManager {
  constructor(private paymentMethodDB: PaymentMethodDB) {}

  async addPaymentMethod(params: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentMethod> {
    return this.paymentMethodDB.createPaymentMethod(params);
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    return this.paymentMethodDB.setDefault(paymentMethodId);
  }

  async processPayment(params: {
    workspaceId: string;
    amountCents: number;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult> {
    const paymentMethods = await this.paymentMethodDB.getFallbackChain(params.workspaceId);
    
    if (paymentMethods.length === 0) {
      return {
        success: false,
        amountCents: params.amountCents,
        paymentMethodId: '',
        error: 'No payment methods available',
      };
    }

    // Try primary payment method
    const primary = paymentMethods[0];
    
    // Simplified payment processing (would integrate with Stripe)
    return {
      success: true,
      amountCents: params.amountCents,
      paymentMethodId: primary.id,
      transactionId: `txn_${Date.now()}`,
      metadata: params.metadata,
    };
  }
}
