/**
 * PHASE 58: MOCK DATABASE IMPLEMENTATIONS
 * 
 * In-memory mock implementations for all database interfaces to enable testing.
 */

import {
  Wallet,
  WalletDB,
  Transaction,
  TransactionDB,
  TransactionFilters,
  BatchTransactionRequest,
  Budget,
  BudgetDB,
  Invoice,
  InvoiceDB,
  InvoiceStatus,
  PaymentMethod,
  PaymentMethodDB,
  WalletAuditLog,
  AuditLogDB,
  AuditAction,
} from './types';

/**
 * Mock Wallet Database
 */
export class MockWalletDB implements WalletDB {
  private wallets = new Map<string, Wallet>();

  async getWallet(workspaceId: string): Promise<Wallet | null> {
    return this.wallets.get(workspaceId) || null;
  }

  async createWallet(wallet: Omit<Wallet, 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    const created: Wallet = {
      ...wallet,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.wallets.set(wallet.workspaceId, created);
    return created;
  }

  async updateWallet(workspaceId: string, updates: Partial<Wallet>): Promise<Wallet> {
    const existing = this.wallets.get(workspaceId);
    if (!existing) {
      throw new Error('Wallet not found');
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.wallets.set(workspaceId, updated);
    return updated;
  }

  async deleteWallet(workspaceId: string): Promise<void> {
    this.wallets.delete(workspaceId);
  }

  async updateBalance(workspaceId: string, deltaCents: number): Promise<Wallet> {
    const wallet = this.wallets.get(workspaceId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    wallet.balanceCents += deltaCents;
    wallet.updatedAt = new Date();
    this.wallets.set(workspaceId, wallet);
    return wallet;
  }

  async reserveFunds(workspaceId: string, amountCents: number): Promise<Wallet> {
    const wallet = this.wallets.get(workspaceId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    wallet.reservedCents += amountCents;
    wallet.updatedAt = new Date();
    this.wallets.set(workspaceId, wallet);
    return wallet;
  }

  async releaseFunds(workspaceId: string, amountCents: number): Promise<Wallet> {
    const wallet = this.wallets.get(workspaceId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    wallet.reservedCents -= amountCents;
    wallet.updatedAt = new Date();
    this.wallets.set(workspaceId, wallet);
    return wallet;
  }

  clear(): void {
    this.wallets.clear();
  }
}

/**
 * Mock Transaction Database
 */
export class MockTransactionDB implements TransactionDB {
  private transactions = new Map<string, Transaction>();
  private idCounter = 1;

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const id = `txn_${this.idCounter++}`;
    const created: Transaction = {
      ...transaction,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(id, created);
    return created;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) || null;
  }

  async listTransactions(
    filters: TransactionFilters,
    limit: number = 100,
    offset: number = 0
  ): Promise<Transaction[]> {
    let results = Array.from(this.transactions.values());

    if (filters.workspaceId) {
      results = results.filter((tx) => tx.workspaceId === filters.workspaceId);
    }
    if (filters.type) {
      results = results.filter((tx) => tx.type === filters.type);
    }
    if (filters.category) {
      results = results.filter((tx) => tx.category === filters.category);
    }
    if (filters.direction) {
      results = results.filter((tx) => tx.direction === filters.direction);
    }
    if (filters.status) {
      results = results.filter((tx) => tx.status === filters.status);
    }
    if (filters.startDate) {
      results = results.filter((tx) => tx.createdAt >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((tx) => tx.createdAt <= filters.endDate!);
    }
    if (filters.minAmount) {
      results = results.filter((tx) => tx.amountCents >= filters.minAmount!);
    }
    if (filters.maxAmount) {
      results = results.filter((tx) => tx.amountCents <= filters.maxAmount!);
    }

    return results.slice(offset, offset + limit);
  }

  async updateTransactionStatus(id: string, status: any): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    transaction.status = status;
    if (status === 'settled') {
      transaction.settledAt = new Date();
    }
    this.transactions.set(id, transaction);
    return transaction;
  }

  async createBatch(request: BatchTransactionRequest): Promise<Transaction[]> {
    const created: Transaction[] = [];
    for (const tx of request.transactions) {
      const fullTx: Omit<Transaction, 'id' | 'createdAt'> = {
        ...tx,
        status: 'pending' as any,
        balanceBeforeCents: 0,
        balanceAfterCents: 0,
      };
      const transaction = await this.createTransaction(fullTx);
      created.push(transaction);
    }
    return created;
  }

  async searchTransactions(query: string, filters?: TransactionFilters): Promise<Transaction[]> {
    let results = Array.from(this.transactions.values());
    
    if (filters) {
      results = await this.listTransactions(filters, 1000, 0);
    }

    return results.filter((tx) =>
      tx.description.toLowerCase().includes(query.toLowerCase()) ||
      tx.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  clear(): void {
    this.transactions.clear();
    this.idCounter = 1;
  }
}

/**
 * Mock Budget Database
 */
export class MockBudgetDB implements BudgetDB {
  private budgets = new Map<string, Budget>();
  private idCounter = 1;

  async getBudget(id: string): Promise<Budget | null> {
    return this.budgets.get(id) || null;
  }

  async listBudgets(workspaceId: string): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter((b) => b.workspaceId === workspaceId);
  }

  async createBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const id = `budget_${this.idCounter++}`;
    const created: Budget = {
      ...budget,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.budgets.set(id, created);
    return created;
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget> {
    const existing = this.budgets.get(id);
    if (!existing) {
      throw new Error('Budget not found');
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.budgets.set(id, updated);
    return updated;
  }

  async deleteBudget(id: string): Promise<void> {
    this.budgets.delete(id);
  }

  async incrementSpent(id: string, amountCents: number): Promise<Budget> {
    const budget = this.budgets.get(id);
    if (!budget) {
      throw new Error('Budget not found');
    }
    budget.spentCents += amountCents;
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);
    return budget;
  }

  clear(): void {
    this.budgets.clear();
    this.idCounter = 1;
  }
}

/**
 * Mock Invoice Database
 */
export class MockInvoiceDB implements InvoiceDB {
  private invoices = new Map<string, Invoice>();
  private idCounter = 1;
  private invoiceNumberCounter = 10000;

  async getInvoice(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) || null;
  }

  async listInvoices(workspaceId: string, status?: InvoiceStatus): Promise<Invoice[]> {
    let results = Array.from(this.invoices.values()).filter((inv) => inv.workspaceId === workspaceId);
    if (status) {
      results = results.filter((inv) => inv.status === status);
    }
    return results;
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const id = `inv_${this.idCounter++}`;
    const created: Invoice = {
      ...invoice,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(id, created);
    return created;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const existing = this.invoices.get(id);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.invoices.set(id, updated);
    return updated;
  }

  async markPaid(id: string, paidAt: Date): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = paidAt;
    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);
    return invoice;
  }

  async generateInvoiceNumber(): Promise<string> {
    return `INV-${this.invoiceNumberCounter++}`;
  }

  clear(): void {
    this.invoices.clear();
    this.idCounter = 1;
    this.invoiceNumberCounter = 10000;
  }
}

/**
 * Mock Payment Method Database
 */
export class MockPaymentMethodDB implements PaymentMethodDB {
  private paymentMethods = new Map<string, PaymentMethod>();
  private idCounter = 1;

  async getPaymentMethod(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethods.get(id) || null;
  }

  async listPaymentMethods(workspaceId: string): Promise<PaymentMethod[]> {
    return Array.from(this.paymentMethods.values()).filter((pm) => pm.workspaceId === workspaceId);
  }

  async createPaymentMethod(method: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentMethod> {
    const id = `pm_${this.idCounter++}`;
    const created: PaymentMethod = {
      ...method,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.paymentMethods.set(id, created);
    return created;
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const existing = this.paymentMethods.get(id);
    if (!existing) {
      throw new Error('Payment method not found');
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.paymentMethods.set(id, updated);
    return updated;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    this.paymentMethods.delete(id);
  }

  async setDefault(id: string): Promise<PaymentMethod> {
    const method = this.paymentMethods.get(id);
    if (!method) {
      throw new Error('Payment method not found');
    }

    // Unset other defaults for this workspace
    for (const pm of this.paymentMethods.values()) {
      if (pm.workspaceId === method.workspaceId && pm.id !== id) {
        pm.isDefault = false;
        this.paymentMethods.set(pm.id, pm);
      }
    }

    method.isDefault = true;
    this.paymentMethods.set(id, method);
    return method;
  }

  async getDefault(workspaceId: string): Promise<PaymentMethod | null> {
    const methods = await this.listPaymentMethods(workspaceId);
    return methods.find((pm) => pm.isDefault) || null;
  }

  async getFallbackChain(workspaceId: string): Promise<PaymentMethod[]> {
    const methods = await this.listPaymentMethods(workspaceId);
    return methods.sort((a, b) => a.priority - b.priority);
  }

  clear(): void {
    this.paymentMethods.clear();
    this.idCounter = 1;
  }
}

/**
 * Mock Audit Log Database
 */
export class MockAuditLogDB implements AuditLogDB {
  private logs: WalletAuditLog[] = [];
  private idCounter = 1;

  async createLog(log: Omit<WalletAuditLog, 'id'>): Promise<WalletAuditLog> {
    const created: WalletAuditLog = {
      ...log,
      id: `audit_${this.idCounter++}`,
    };
    this.logs.push(created);
    return created;
  }

  async getLogs(
    workspaceId: string,
    filters?: { startDate?: Date; endDate?: Date; action?: AuditAction }
  ): Promise<WalletAuditLog[]> {
    let results = this.logs.filter((log) => log.workspaceId === workspaceId);

    if (filters?.startDate) {
      results = results.filter((log) => log.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter((log) => log.timestamp <= filters.endDate!);
    }
    if (filters?.action) {
      results = results.filter((log) => log.action === filters.action);
    }

    return results;
  }

  clear(): void {
    this.logs = [];
    this.idCounter = 1;
  }
}
