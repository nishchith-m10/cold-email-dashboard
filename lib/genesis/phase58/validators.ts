/**
 * Phase 58: Input Validation Utilities
 * 
 * Centralized validation functions for business logic input sanitization
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate workspace ID is a non-empty string
 */
export function validateWorkspaceId(id: any, fieldName = 'Workspace ID'): void {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Validate amount is a non-negative integer (cents)
 */
export function validateAmountCents(amount: any, fieldName = 'Amount'): void {
  if (typeof amount !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (!Number.isInteger(amount)) {
    throw new ValidationError(`${fieldName} must be an integer (cents, not dollars)`);
  }
  if (amount < 0) {
    throw new ValidationError(`${fieldName} cannot be negative`);
  }
}

/**
 * Validate amount is a positive integer (cents)
 */
export function validatePositiveAmount(amount: any, fieldName = 'Amount'): void {
  validateAmountCents(amount, fieldName);
  if (amount === 0) {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }
}

/**
 * Validate transaction ID is non-empty string
 */
export function validateTransactionId(id: any, fieldName = 'Transaction ID'): void {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Validate date is a valid Date object
 */
export function validateDate(date: any, fieldName = 'Date'): void {
  if (!(date instanceof Date)) {
    throw new ValidationError(`${fieldName} must be a Date object`);
  }
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} is an invalid date`);
  }
}

/**
 * Validate budget period enum
 */
export function validateBudgetPeriod(period: any): void {
  const validPeriods = ['daily', 'weekly', 'monthly'];
  if (!validPeriods.includes(period)) {
    throw new ValidationError(`Period must be one of: ${validPeriods.join(', ')}`);
  }
}

/**
 * Validate boolean value
 */
export function validateBoolean(value: any, fieldName = 'Value'): void {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} must be a boolean`);
  }
}

/**
 * Validate refund amount doesn't exceed original
 */
export function validateRefundAmount(refundAmount: number, originalAmount: number): void {
  validatePositiveAmount(refundAmount, 'Refund amount');
  if (refundAmount > originalAmount) {
    throw new ValidationError(`Refund amount (${refundAmount}) cannot exceed original amount (${originalAmount})`);
  }
}

/**
 * Validate object is not null/undefined
 */
export function validateRequired(value: any, fieldName = 'Value'): void {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
}

/**
 * Validate string is non-empty
 */
export function validateNonEmptyString(value: any, fieldName = 'String'): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
}
