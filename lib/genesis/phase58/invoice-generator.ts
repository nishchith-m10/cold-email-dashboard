/**
 * PHASE 58: INVOICE GENERATOR
 * 
 * Simplified invoice generation and management.
 */

import {
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  InvoiceDB,
  TaxConfiguration,
} from './types';

export class InvoiceGenerator {
  constructor(private invoiceDB: InvoiceDB) {}

  async generateInvoice(params: {
    workspaceId: string;
    billingPeriod: { start: Date; end: Date };
    lineItems: InvoiceLineItem[];
    taxConfig?: TaxConfiguration;
    dueInDays?: number;
  }): Promise<Invoice> {
    const subtotalCents = params.lineItems.reduce((sum, item) => sum + item.totalCents, 0);
    const taxRate = params.taxConfig?.taxRate || 0;
    const taxCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxCents;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (params.dueInDays || 15));

    const invoiceNumber = await this.invoiceDB.generateInvoiceNumber();

    return this.invoiceDB.createInvoice({
      workspaceId: params.workspaceId,
      invoiceNumber,
      status: InvoiceStatus.DRAFT,
      billingPeriod: params.billingPeriod,
      lineItems: params.lineItems,
      subtotalCents,
      taxCents,
      totalCents,
      currency: 'USD',
      dueDate,
    });
  }

  async markInvoicePaid(invoiceId: string): Promise<Invoice> {
    return this.invoiceDB.markPaid(invoiceId, new Date());
  }
}
