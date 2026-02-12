/**
 * GENESIS PHASE 46: PARITY CHECKER
 *
 * Validates data consistency between source (legacy) and target (genesis)
 * tables. Used after backfill to verify data integrity before cutover.
 *
 * Checks:
 * 1. Row counts match
 * 2. Sample-based field-level comparison
 * 3. Identifies missing rows in both directions
 * 4. Calculates parity score (0-100)
 */

import {
  ParityCheckConfig,
  ParityCheckResult,
  ParityMismatch,
  MigrationDB,
  PARITY_THRESHOLDS,
  DEFAULT_COMPARE_FIELDS,
} from './types';
import { MigrationStateManager, MigrationStateError } from './migration-state-manager';

export class ParityCheckerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly workspaceId?: string,
  ) {
    super(message);
    this.name = 'ParityCheckerError';
  }
}

export class ParityChecker {
  private readonly stateManager: MigrationStateManager;

  constructor(private readonly db: MigrationDB) {
    this.stateManager = new MigrationStateManager(db);
  }

  /**
   * Run a parity check between source and target tables.
   */
  async check(config: ParityCheckConfig): Promise<ParityCheckResult> {
    const startTime = Date.now();

    await this.db.logMigrationEvent({
      workspaceId: config.workspaceId,
      eventType: 'parity_check_started',
      details: {
        sampleSize: config.sampleSize,
        fullScan: config.fullScan,
        compareFields: config.compareFields,
      },
    });

    try {
      // Step 1: Compare row counts
      const sourceCount = await this.db.getSourceRowCount(
        config.sourceTable,
        config.workspaceId,
      );
      const targetCount = await this.db.getTargetRowCount(
        config.targetTable,
        config.workspaceId,
      );

      // Step 2: Sample-based comparison
      const sampleSize = config.fullScan
        ? Math.max(sourceCount, targetCount)
        : Math.min(config.sampleSize, Math.max(sourceCount, targetCount));

      const sourceRows = await this.db.getSourceBatch(
        config.sourceTable,
        config.workspaceId,
        null,
        sampleSize,
      );

      const targetRows = await this.db.getTargetBatch(
        config.targetTable,
        config.workspaceId,
        null,
        sampleSize,
      );

      // Step 3: Build lookup maps
      const targetMap = new Map<string, Record<string, unknown>>();
      for (const row of targetRows) {
        const id = String(row.id);
        targetMap.set(id, row);
      }

      const sourceMap = new Map<string, Record<string, unknown>>();
      for (const row of sourceRows) {
        const id = String(row.id);
        sourceMap.set(id, row);
      }

      // Step 4: Compare fields
      const mismatches: ParityMismatch[] = [];
      const missingInTarget: string[] = [];
      const missingInSource: string[] = [];

      for (const sourceRow of sourceRows) {
        const id = String(sourceRow.id);
        const targetRow = targetMap.get(id);

        if (!targetRow) {
          missingInTarget.push(id);
          continue;
        }

        for (const field of config.compareFields) {
          const sourceVal = sourceRow[field];
          const targetVal = targetRow[field];

          if (!this.valuesEqual(sourceVal, targetVal)) {
            mismatches.push({
              id,
              field,
              sourceValue: sourceVal,
              targetValue: targetVal,
            });
          }
        }
      }

      // Step 5: Check for extra rows in target
      for (const targetRow of targetRows) {
        const id = String(targetRow.id);
        if (!sourceMap.has(id)) {
          missingInSource.push(id);
        }
      }

      // Step 6: Calculate parity score
      const parityScore = this.calculateParityScore(
        sourceCount,
        targetCount,
        sourceRows.length,
        mismatches.length,
        missingInTarget.length,
        missingInSource.length,
        config.compareFields.length,
      );

      const result: ParityCheckResult = {
        match:
          sourceCount === targetCount &&
          mismatches.length === 0 &&
          missingInTarget.length === 0 &&
          missingInSource.length === 0,
        sourceCount,
        targetCount,
        parityScore,
        sampledRows: sourceRows.length,
        mismatches: mismatches.slice(0, 100), // cap at 100 for response size
        missingInTarget: missingInTarget.slice(0, 100),
        missingInSource: missingInSource.slice(0, 100),
        durationMs: Date.now() - startTime,
        checkedAt: new Date().toISOString(),
      };

      // Update migration state with parity score
      await this.stateManager.updateParityScore(
        config.workspaceId,
        parityScore,
      );

      await this.db.logMigrationEvent({
        workspaceId: config.workspaceId,
        eventType: 'parity_check_completed',
        details: {
          match: result.match,
          sourceCount,
          targetCount,
          parityScore,
          mismatchCount: mismatches.length,
          missingInTarget: missingInTarget.length,
          missingInSource: missingInSource.length,
          durationMs: result.durationMs,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof ParityCheckerError || error instanceof MigrationStateError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ParityCheckerError(
        `Parity check failed: ${errorMessage}`,
        'PARITY_CHECK_FAILED',
        config.workspaceId,
      );
    }
  }

  /**
   * Run a quick parity check using defaults from migration state.
   */
  async quickCheck(workspaceId: string): Promise<ParityCheckResult> {
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    return this.check({
      workspaceId,
      sourceTable: state.sourceTable,
      targetTable: state.targetTable,
      sampleSize: PARITY_THRESHOLDS.SAMPLE_SIZE_DEFAULT,
      compareFields: DEFAULT_COMPARE_FIELDS,
      fullScan: false,
      tolerancePercent: 0.1,
    });
  }

  /**
   * Run a full parity check (all rows).
   */
  async fullCheck(workspaceId: string): Promise<ParityCheckResult> {
    const state = await this.stateManager.getStateOrThrow(workspaceId);

    return this.check({
      workspaceId,
      sourceTable: state.sourceTable,
      targetTable: state.targetTable,
      sampleSize: PARITY_THRESHOLDS.SAMPLE_SIZE_DEFAULT,
      compareFields: DEFAULT_COMPARE_FIELDS,
      fullScan: true,
      tolerancePercent: 0.01,
    });
  }

  /**
   * Check if parity score meets cutover threshold.
   */
  isCutoverReady(parityScore: number): boolean {
    return parityScore >= PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER;
  }

  /**
   * Get parity status category.
   */
  getParityCategory(parityScore: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (parityScore >= PARITY_THRESHOLDS.MINIMUM_FOR_CUTOVER) return 'excellent';
    if (parityScore >= PARITY_THRESHOLDS.WARNING_THRESHOLD) return 'good';
    if (parityScore >= PARITY_THRESHOLDS.CRITICAL_THRESHOLD) return 'warning';
    return 'critical';
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Compare two values for equality, handling edge cases.
   *
   * IMPORTANT: Date tolerance is STRICT by default. We only apply
   * sub-second tolerance for ISO-8601 date strings (containing 'T')
   * to handle minor timestamp precision differences across systems.
   * Non-date strings are always compared exactly.
   */
  private valuesEqual(a: unknown, b: unknown): boolean {
    // Both null/undefined
    if (a == null && b == null) return true;
    // One is null/undefined
    if (a == null || b == null) return false;

    // Date comparison
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // String comparison
    if (typeof a === 'string' && typeof b === 'string') {
      // Only apply date tolerance for ISO-8601 strings (must contain 'T' separator)
      // This prevents treating arbitrary strings like "active" or "2026-01-01" as dates
      if (this.isIsoDateString(a) && this.isIsoDateString(b)) {
        const dateA = Date.parse(a);
        const dateB = Date.parse(b);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          // Sub-second tolerance only (999ms) for precision differences
          return Math.abs(dateA - dateB) < 1000;
        }
      }
      // Exact string comparison for non-date strings
      return a === b;
    }

    // JSON comparison for objects (stable key order)
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(this.sortKeys(a)) === JSON.stringify(this.sortKeys(b));
    }

    // Primitive comparison
    return a === b;
  }

  /**
   * Check if a string looks like an ISO-8601 datetime (contains 'T' separator).
   */
  private isIsoDateString(s: string): boolean {
    // Must contain 'T' and look like a datetime, not just any parseable date string
    return /^\d{4}-\d{2}-\d{2}T/.test(s);
  }

  /**
   * Sort object keys for stable JSON comparison.
   */
  private sortKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortKeys(item));
    if (typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
        sorted[key] = this.sortKeys((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return obj;
  }

  /**
   * Calculate the parity score (0-100).
   */
  private calculateParityScore(
    sourceCount: number,
    targetCount: number,
    sampledRows: number,
    mismatchCount: number,
    missingInTargetCount: number,
    missingInSourceCount: number,
    fieldsPerRow: number,
  ): number {
    if (sourceCount === 0 && targetCount === 0) return 100;
    if (sampledRows === 0) return sourceCount === targetCount ? 100 : 0;

    // Count check weight: 30%
    const countScore = sourceCount === targetCount
      ? 100
      : Math.max(0, 100 - Math.abs(sourceCount - targetCount) / Math.max(sourceCount, targetCount) * 100);

    // Presence check weight: 35%
    const totalPresenceChecks = sampledRows;
    const presenceIssues = missingInTargetCount + missingInSourceCount;
    const presenceScore = totalPresenceChecks > 0
      ? Math.max(0, 100 - (presenceIssues / totalPresenceChecks) * 100)
      : 100;

    // Field check weight: 35%
    const totalFieldChecks = sampledRows * fieldsPerRow;
    const fieldScore = totalFieldChecks > 0
      ? Math.max(0, 100 - (mismatchCount / totalFieldChecks) * 100)
      : 100;

    // Weighted average
    const score = countScore * 0.3 + presenceScore * 0.35 + fieldScore * 0.35;
    return Math.round(score * 100) / 100;
  }
}
