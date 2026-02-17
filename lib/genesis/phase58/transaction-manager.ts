/**
 * PHASE 58: TRANSACTION MANAGER
 * 
 * Advanced transaction handling with rich metadata, batch operations,
 * dispute management, and comprehensive search capabilities.
 */

import {
  Transaction,
  TransactionType,
  TransactionCategory,
  TransactionDirection,
  TransactionStatus,
  TransactionMetadata,
  TransactionFilters,
  BatchTransactionRequest,
  TransactionDB,
  WalletDB,
  AuditLogDB,
  AuditAction,
} from './types';
import {
  validateWorkspaceId,
  validatePositiveAmount,
  validateTransactionId,
  validateRefundAmount,
} from './validators';

/**
 * Transaction Manager
 * Handles all transaction operations with proper validation and state management
 */
export class TransactionManager {
  constructor(
    private transactionDB: TransactionDB,
    private walletDB: WalletDB,
    private auditDB?: AuditLogDB
  ) {}

  /**
   * Create a new transaction
   */
  async createTransaction(params: {
    workspaceId: string;
    type: TransactionType;
    amountCents: number;
    description: string;
    tags?: string[];
    metadata?: Partial<TransactionMetadata>;
  }): Promise<Transaction> {
    // Validate inputs
    validateWorkspaceId(params.workspaceId);
    validatePositiveAmount(params.amountCents, 'Transaction amount');

    // Get current wallet state
    const wallet = await this.walletDB.getWallet(params.workspaceId);
    if (!wallet) {
      throw new Error(`Wallet not found for workspace: ${params.workspaceId}`);
    }

    // Determine category and direction
    const category = this.getTransactionCategory(params.type);
    const direction = this.getTransactionDirection(params.type);

    // Validate balance for debit transactions
    if (direction === TransactionDirection.DEBIT) {
      const availableBalance = wallet.balanceCents - wallet.reservedCents;
      if (availableBalance < params.amountCents) {
        throw new Error(`Insufficient balance. Available: ${availableBalance}, Required: ${params.amountCents}`);
      }
    }

    const balanceBefore = wallet.balanceCents;
    let balanceAfter = balanceBefore;

    // Calculate balance after
    switch (direction) {
      case TransactionDirection.CREDIT:
        balanceAfter = balanceBefore + params.amountCents;
        break;
      case TransactionDirection.DEBIT:
        balanceAfter = balanceBefore - params.amountCents;
        break;
      case TransactionDirection.HOLD:
        // Balance stays same, but reserved increases
        balanceAfter = balanceBefore;
        break;
      case TransactionDirection.RELEASE:
        // Balance stays same, but reserved decreases
        balanceAfter = balanceBefore;
        break;
    }

    const transaction: Omit<Transaction, 'id' | 'createdAt'> = {
      workspaceId: params.workspaceId,
      type: params.type,
      category,
      direction,
      amountCents: params.amountCents,
      status: TransactionStatus.PENDING,
      balanceBeforeCents: balanceBefore,
      balanceAfterCents: balanceAfter,
      description: params.description,
      tags: params.tags || [],
      metadata: this.buildMetadata(params.metadata),
      relatedTransactions: [],
    };

    const created = await this.transactionDB.createTransaction(transaction);

    // Update wallet balance
    if (direction === TransactionDirection.CREDIT) {
      await this.walletDB.updateBalance(params.workspaceId, params.amountCents);
    } else if (direction === TransactionDirection.DEBIT) {
      await this.walletDB.updateBalance(params.workspaceId, -params.amountCents);
    } else if (direction === TransactionDirection.HOLD) {
      await this.walletDB.reserveFunds(params.workspaceId, params.amountCents);
    } else if (direction === TransactionDirection.RELEASE) {
      await this.walletDB.releaseFunds(params.workspaceId, params.amountCents);
    }

    // Mark as settled
    const settled = await this.settleTransaction(created.id);

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: params.workspaceId,
        action: direction === TransactionDirection.CREDIT ? AuditAction.TOPUP : AuditAction.CHARGE,
        actor: { type: 'system', source: 'transaction_manager' },
        before: { balanceCents: balanceBefore, reservedCents: wallet.reservedCents, status: wallet.status, timestamp: new Date() },
        after: { balanceCents: balanceAfter, reservedCents: wallet.reservedCents, status: wallet.status, timestamp: new Date() },
        transactionId: created.id,
        metadata: params.metadata,
      });
    }

    return settled;
  }

  /**
   * Batch create transactions
   */
  async createBatch(request: BatchTransactionRequest): Promise<Transaction[]> {
    const wallet = await this.walletDB.getWallet(request.workspaceId);
    if (!wallet) {
      throw new Error(`Wallet not found for workspace: ${request.workspaceId}`);
    }

    let currentBalance = wallet.balanceCents;
    const transactions: Transaction[] = [];

    for (const tx of request.transactions) {
      const category = this.getTransactionCategory(tx.type);
      const direction = this.getTransactionDirection(tx.type);

      const balanceBefore = currentBalance;
      let balanceAfter = currentBalance;

      switch (direction) {
        case TransactionDirection.CREDIT:
          balanceAfter = currentBalance + tx.amountCents;
          break;
        case TransactionDirection.DEBIT:
          if (currentBalance < tx.amountCents) {
            throw new Error(`Insufficient balance in batch. Transaction: ${tx.description}`);
          }
          balanceAfter = currentBalance - tx.amountCents;
          break;
      }

      const transaction: Omit<Transaction, 'id' | 'createdAt'> = {
        workspaceId: request.workspaceId,
        type: tx.type,
        category,
        direction,
        amountCents: tx.amountCents,
        status: TransactionStatus.PENDING,
        balanceBeforeCents: balanceBefore,
        balanceAfterCents: balanceAfter,
        description: tx.description,
        tags: tx.tags,
        metadata: tx.metadata,
        relatedTransactions: tx.relatedTransactions,
      };

      currentBalance = balanceAfter;
      transactions.push(transaction as Transaction);
    }

    const created = await this.transactionDB.createBatch(request);

    // Update wallet balance with final balance
    const totalDelta = currentBalance - wallet.balanceCents;
    if (totalDelta !== 0) {
      await this.walletDB.updateBalance(request.workspaceId, totalDelta);
    }

    // Mark all as settled
    for (const tx of created) {
      await this.transactionDB.updateTransactionStatus(tx.id, TransactionStatus.SETTLED);
    }

    return created;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionDB.getTransaction(id);
  }

  /**
   * List transactions with filters
   */
  async listTransactions(
    filters: TransactionFilters,
    limit: number = 100,
    offset: number = 0
  ): Promise<Transaction[]> {
    return this.transactionDB.listTransactions(filters, limit, offset);
  }

  /**
   * Search transactions
   */
  async searchTransactions(
    query: string,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    return this.transactionDB.searchTransactions(query, filters);
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(params: {
    transactionId: string;
    reason: string;
    amountCents?: number; // Partial refund
  }): Promise<Transaction> {
    // Validate inputs
    validateTransactionId(params.transactionId);
    
    const original = await this.getTransaction(params.transactionId);
    if (!original) {
      throw new Error(`Transaction not found: ${params.transactionId}`);
    }

    if (params.amountCents !== undefined) {
      validateRefundAmount(params.amountCents, original.amountCents);
    }

    if (original.status === TransactionStatus.REFUNDED) {
      throw new Error('Transaction already refunded');
    }

    if (original.direction !== TransactionDirection.DEBIT) {
      throw new Error('Can only refund debit transactions');
    }

    const refundAmount = params.amountCents || original.amountCents;
    if (refundAmount > original.amountCents) {
      throw new Error('Refund amount cannot exceed original transaction amount');
    }

    // Create refund transaction
    const refund = await this.createTransaction({
      workspaceId: original.workspaceId,
      type: TransactionType.REFUND,
      amountCents: refundAmount,
      description: `Refund: ${params.reason}`,
      tags: [...original.tags, 'refund'],
      metadata: {
        ...original.metadata,
        originalTransactionId: original.id,
        refundReason: params.reason,
      },
    });

    // Update original transaction status
    await this.transactionDB.updateTransactionStatus(original.id, TransactionStatus.REFUNDED);

    // Link transactions
    refund.relatedTransactions = [original.id];
    await this.transactionDB.updateTransactionStatus(refund.id, refund.status);

    return refund;
  }

  /**
   * Dispute a transaction
   */
  async disputeTransaction(params: {
    transactionId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<Transaction> {
    const transaction = await this.getTransaction(params.transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${params.transactionId}`);
    }

    if (transaction.status === TransactionStatus.DISPUTED) {
      throw new Error('Transaction already disputed');
    }

    // Update status to disputed
    const updated = await this.transactionDB.updateTransactionStatus(
      params.transactionId,
      TransactionStatus.DISPUTED
    );

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: transaction.workspaceId,
        action: AuditAction.REFUND,
        actor: { type: 'user', source: 'dispute' },
        before: { balanceCents: transaction.balanceBeforeCents, reservedCents: 0, status: transaction.status as any, timestamp: new Date() },
        after: { balanceCents: transaction.balanceAfterCents, reservedCents: 0, status: TransactionStatus.DISPUTED as any, timestamp: new Date() },
        transactionId: transaction.id,
        reason: params.reason,
        metadata: params.metadata,
      });
    }

    return updated;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(params: {
    transactionId: string;
    approved: boolean;
    resolution: string;
  }): Promise<Transaction> {
    const transaction = await this.getTransaction(params.transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${params.transactionId}`);
    }

    if (transaction.status !== TransactionStatus.DISPUTED) {
      throw new Error('Transaction is not in disputed status');
    }

    if (params.approved) {
      // Dispute approved - refund the transaction
      return this.refundTransaction({
        transactionId: params.transactionId,
        reason: `Dispute resolved: ${params.resolution}`,
      });
    } else {
      // Dispute denied - return to settled
      return this.transactionDB.updateTransactionStatus(
        params.transactionId,
        TransactionStatus.SETTLED
      );
    }
  }

  /**
   * Settle a pending transaction
   */
  private async settleTransaction(transactionId: string): Promise<Transaction> {
    const updated = await this.transactionDB.updateTransactionStatus(
      transactionId,
      TransactionStatus.SETTLED
    );
    return updated;
  }

  /**
   * Get transaction category from type
   */
  private getTransactionCategory(type: TransactionType): TransactionCategory {
    const categoryMap: Record<TransactionType, TransactionCategory> = {
      [TransactionType.DEPOSIT]: TransactionCategory.FUNDING,
      [TransactionType.AUTO_TOPUP_FIXED]: TransactionCategory.FUNDING,
      [TransactionType.AUTO_TOPUP_PREDICTIVE]: TransactionCategory.FUNDING,
      [TransactionType.AUTO_TOPUP_SCHEDULED]: TransactionCategory.FUNDING,
      [TransactionType.AUTO_TOPUP_USAGE_BASED]: TransactionCategory.FUNDING,
      [TransactionType.RESERVE]: TransactionCategory.OPERATIONS,
      [TransactionType.RELEASE_RESERVE]: TransactionCategory.OPERATIONS,
      [TransactionType.APIFY_SCRAPE]: TransactionCategory.SERVICE_USAGE,
      [TransactionType.CSE_SEARCH]: TransactionCategory.SERVICE_USAGE,
      [TransactionType.PROXY_REQUEST]: TransactionCategory.SERVICE_USAGE,
      [TransactionType.EMAIL_VERIFY]: TransactionCategory.SERVICE_USAGE,
      [TransactionType.REFUND]: TransactionCategory.ADJUSTMENT,
      [TransactionType.DISPUTE_CREDIT]: TransactionCategory.ADJUSTMENT,
      [TransactionType.ADMIN_ADJUSTMENT]: TransactionCategory.ADJUSTMENT,
      [TransactionType.TRANSFER_IN]: TransactionCategory.TRANSFER,
      [TransactionType.TRANSFER_OUT]: TransactionCategory.TRANSFER,
      [TransactionType.INVOICE_PAYMENT]: TransactionCategory.BILLING,
    };

    return categoryMap[type];
  }

  /**
   * Get transaction direction from type
   */
  private getTransactionDirection(type: TransactionType): TransactionDirection {
    const directionMap: Record<TransactionType, TransactionDirection> = {
      [TransactionType.DEPOSIT]: TransactionDirection.CREDIT,
      [TransactionType.AUTO_TOPUP_FIXED]: TransactionDirection.CREDIT,
      [TransactionType.AUTO_TOPUP_PREDICTIVE]: TransactionDirection.CREDIT,
      [TransactionType.AUTO_TOPUP_SCHEDULED]: TransactionDirection.CREDIT,
      [TransactionType.AUTO_TOPUP_USAGE_BASED]: TransactionDirection.CREDIT,
      [TransactionType.RESERVE]: TransactionDirection.HOLD,
      [TransactionType.RELEASE_RESERVE]: TransactionDirection.RELEASE,
      [TransactionType.APIFY_SCRAPE]: TransactionDirection.DEBIT,
      [TransactionType.CSE_SEARCH]: TransactionDirection.DEBIT,
      [TransactionType.PROXY_REQUEST]: TransactionDirection.DEBIT,
      [TransactionType.EMAIL_VERIFY]: TransactionDirection.DEBIT,
      [TransactionType.REFUND]: TransactionDirection.CREDIT,
      [TransactionType.DISPUTE_CREDIT]: TransactionDirection.CREDIT,
      [TransactionType.ADMIN_ADJUSTMENT]: TransactionDirection.CREDIT, // Can be either, default credit
      [TransactionType.TRANSFER_IN]: TransactionDirection.CREDIT,
      [TransactionType.TRANSFER_OUT]: TransactionDirection.DEBIT,
      [TransactionType.INVOICE_PAYMENT]: TransactionDirection.DEBIT,
    };

    return directionMap[type];
  }

  /**
   * Build complete metadata object
   */
  private buildMetadata(partial?: Partial<TransactionMetadata>): TransactionMetadata {
    return {
      serviceId: partial?.serviceId,
      campaignId: partial?.campaignId,
      userId: partial?.userId,
      ipAddress: partial?.ipAddress,
      userAgent: partial?.userAgent,
      paymentMethodId: partial?.paymentMethodId,
      invoiceId: partial?.invoiceId,
      unitsConsumed: partial?.unitsConsumed,
      serviceData: partial?.serviceData,
      ...partial,
    };
  }
}

/**
 * Transaction Analytics
 * Analyze transaction patterns and generate insights
 */
export class TransactionAnalytics {
  constructor(private transactionDB: TransactionDB) {}

  /**
   * Calculate total spent in period
   */
  async getTotalSpent(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      direction: TransactionDirection.DEBIT as any,
      status: TransactionStatus.SETTLED,
      startDate,
      endDate,
    });

    return transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
  }

  /**
   * Get spending by service
   */
  async getSpendingByService(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      category: TransactionCategory.SERVICE_USAGE,
      status: TransactionStatus.SETTLED,
      startDate,
      endDate,
    });

    const byService: Record<string, number> = {};

    for (const tx of transactions) {
      const serviceId = tx.metadata.serviceId || 'unknown';
      byService[serviceId] = (byService[serviceId] || 0) + tx.amountCents;
    }

    return byService;
  }

  /**
   * Get spending by campaign
   */
  async getSpendingByCampaign(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      category: TransactionCategory.SERVICE_USAGE,
      status: TransactionStatus.SETTLED,
      startDate,
      endDate,
    });

    const byCampaign: Record<string, number> = {};

    for (const tx of transactions) {
      const campaignId = tx.metadata.campaignId || 'unknown';
      byCampaign[campaignId] = (byCampaign[campaignId] || 0) + tx.amountCents;
    }

    return byCampaign;
  }

  /**
   * Get transaction count by type
   */
  async getCountByType(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<TransactionType, number>> {
    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate,
      endDate,
    });

    const byType: Record<string, number> = {};

    for (const tx of transactions) {
      byType[tx.type] = (byType[tx.type] || 0) + 1;
    }

    return byType as Record<TransactionType, number>;
  }
}
