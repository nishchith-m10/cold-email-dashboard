/**
 * GENESIS PHASE 46: SHADOW MIGRATION & PARITY TESTING
 *
 * Type definitions for zero-downtime data migration from legacy (public)
 * schema to genesis partitioned schema.
 *
 * Flow: idle → dual_write → backfilling → verifying → cutover_ready → cutover_complete
 */

// ============================================
// MIGRATION STATUS
// ============================================

export type MigrationStatus =
  | 'idle'
  | 'dual_write'
  | 'backfilling'
  | 'verifying'
  | 'cutover_ready'
  | 'cutover_complete'
  | 'failed'
  | 'rolled_back';

/** Valid state transitions for the migration state machine */
export const VALID_TRANSITIONS: Record<MigrationStatus, MigrationStatus[]> = {
  idle: ['dual_write'],
  dual_write: ['backfilling', 'idle'], // can revert to idle
  backfilling: ['verifying', 'dual_write', 'failed'], // can retry from dual_write
  verifying: ['cutover_ready', 'backfilling', 'failed'], // can re-backfill if parity fails
  cutover_ready: ['cutover_complete', 'verifying'], // can re-verify
  cutover_complete: ['rolled_back'], // only rollback from complete
  failed: ['idle', 'dual_write'], // reset or retry
  rolled_back: ['idle'], // start over
};

// ============================================
// MIGRATION STATE
// ============================================

export interface MigrationState {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  status: MigrationStatus;
  dualWriteEnabled: boolean;
  backfillProgress: number; // 0-100
  backfillLastId: string | null;
  backfillBatchSize: number;
  backfillTotalRows: number;
  backfillProcessedRows: number;
  parityScore: number; // 0-100
  lastVerifiedAt: string | null;
  errorMessage: string | null;
  errorCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MigrationStateRow {
  workspace_id: string;
  source_table: string;
  target_table: string;
  status: string;
  dual_write_enabled: boolean;
  backfill_progress: number;
  backfill_last_id: string | null;
  backfill_batch_size: number;
  backfill_total_rows: number;
  backfill_processed_rows: number;
  parity_score: number;
  last_verified_at: string | null;
  error_message: string | null;
  error_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateMigrationInput {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  batchSize?: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// DUAL-WRITE
// ============================================

export interface DualWriteConfig {
  workspaceId: string;
  sourceTable: string;
  targetPartition: string;
  triggerName?: string;
}

export interface DualWriteResult {
  success: boolean;
  triggerName: string;
  error?: string;
}

export type DualWriteOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface DualWriteEvent {
  workspaceId: string;
  operation: DualWriteOperation;
  sourceTable: string;
  targetPartition: string;
  recordId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// ============================================
// BACKFILL
// ============================================

export interface BackfillConfig {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  batchSize: number;
  resumeFromId: string | null;
  maxRetries: number;
  retryDelayMs: number;
  onProgress?: (progress: BackfillProgress) => void;
  abortSignal?: { aborted: boolean };
}

export interface BackfillProgress {
  workspaceId: string;
  processedRows: number;
  totalRows: number;
  percentComplete: number;
  lastProcessedId: string | null;
  batchesCompleted: number;
  errorsEncountered: number;
  estimatedTimeRemainingMs: number | null;
  startedAt: string;
  currentBatchStartedAt: string;
}

export interface BackfillResult {
  success: boolean;
  processedRows: number;
  totalRows: number;
  batchesCompleted: number;
  errorsEncountered: number;
  skippedRows: number;
  durationMs: number;
  resumeFromId: string | null;
  error?: string;
}

export interface BackfillBatchResult {
  success: boolean;
  rowsProcessed: number;
  lastId: string | null;
  errors: BackfillError[];
}

export interface BackfillError {
  recordId: string;
  error: string;
  retryable: boolean;
}

// ============================================
// PARITY CHECK
// ============================================

export interface ParityCheckConfig {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  sampleSize: number;
  compareFields: string[];
  fullScan: boolean;
  tolerancePercent: number; // e.g., 0.01 = 99.99% parity required
}

export interface ParityCheckResult {
  match: boolean;
  sourceCount: number;
  targetCount: number;
  parityScore: number; // 0-100
  sampledRows: number;
  mismatches: ParityMismatch[];
  missingInTarget: string[];
  missingInSource: string[];
  durationMs: number;
  checkedAt: string;
}

export interface ParityMismatch {
  id: string;
  field: string;
  sourceValue: unknown;
  targetValue: unknown;
}

export const DEFAULT_COMPARE_FIELDS = [
  'email_address',
  'status',
  'campaign_name',
  'email_1_sent',
  'email_2_sent',
  'email_3_sent',
];

export const PARITY_THRESHOLDS = {
  MINIMUM_FOR_CUTOVER: 99.9,
  WARNING_THRESHOLD: 99.0,
  CRITICAL_THRESHOLD: 95.0,
  SAMPLE_SIZE_DEFAULT: 1000,
  SAMPLE_SIZE_FULL: -1, // -1 = all rows
} as const;

// ============================================
// CUTOVER
// ============================================

export type CutoverPhase =
  | 'pre_check'
  | 'freeze_writes'
  | 'final_backfill'
  | 'final_parity'
  | 'swap_active'
  | 'verify_swap'
  | 'cleanup'
  | 'complete'
  | 'aborted';

export interface CutoverState {
  workspaceId: string;
  phase: CutoverPhase;
  startedAt: string;
  completedAt: string | null;
  rollbackAvailable: boolean;
  preChecksPassed: boolean;
  finalParityScore: number;
  error: string | null;
  steps: CutoverStep[];
}

export interface CutoverStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
}

export interface CutoverPreCheck {
  id: string;
  name: string;
  severity: 'blocker' | 'critical' | 'warning';
  passed: boolean;
  message: string;
}

export interface CutoverResult {
  success: boolean;
  phase: CutoverPhase;
  steps: CutoverStep[];
  totalDurationMs: number;
  finalParityScore: number;
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  fromPhase: CutoverPhase;
  durationMs: number;
  error?: string;
}

// ============================================
// MIGRATION EVENTS (AUDIT LOG)
// ============================================

export type MigrationEventType =
  | 'migration_created'
  | 'dual_write_enabled'
  | 'dual_write_disabled'
  | 'backfill_started'
  | 'backfill_progress'
  | 'backfill_completed'
  | 'backfill_failed'
  | 'parity_check_started'
  | 'parity_check_completed'
  | 'cutover_started'
  | 'cutover_step_completed'
  | 'cutover_completed'
  | 'cutover_aborted'
  | 'rollback_started'
  | 'rollback_completed'
  | 'error';

export interface MigrationEvent {
  id: string;
  workspaceId: string;
  eventType: MigrationEventType;
  details: Record<string, unknown>;
  timestamp: string;
}

// ============================================
// DATABASE INTERFACE (for dependency injection / testing)
// ============================================

export interface MigrationDB {
  // Migration State CRUD
  getMigrationState(workspaceId: string): Promise<MigrationStateRow | null>;
  createMigrationState(input: CreateMigrationInput): Promise<MigrationStateRow>;
  updateMigrationState(workspaceId: string, updates: Partial<MigrationStateRow>): Promise<MigrationStateRow | null>;
  deleteMigrationState(workspaceId: string): Promise<boolean>;
  listMigrationStates(filter?: { status?: MigrationStatus }): Promise<MigrationStateRow[]>;

  // Dual-Write Triggers
  enableDualWriteTrigger(workspaceId: string, sourceTable: string): Promise<boolean>;
  disableDualWriteTrigger(workspaceId: string, sourceTable: string): Promise<boolean>;

  // Data Operations (for backfill + parity)
  getSourceRowCount(sourceTable: string, workspaceId: string): Promise<number>;
  getTargetRowCount(targetTable: string, workspaceId: string): Promise<number>;
  getSourceBatch(
    sourceTable: string,
    workspaceId: string,
    afterId: string | null,
    limit: number
  ): Promise<Array<Record<string, unknown>>>;
  getTargetBatch(
    targetTable: string,
    workspaceId: string,
    afterId: string | null,
    limit: number
  ): Promise<Array<Record<string, unknown>>>;
  insertTargetBatch(
    targetTable: string,
    rows: Array<Record<string, unknown>>
  ): Promise<{ inserted: number; errors: BackfillError[] }>;

  // Migration Events
  logMigrationEvent(event: Omit<MigrationEvent, 'id' | 'timestamp'>): Promise<void>;
  getMigrationEvents(workspaceId: string, limit?: number): Promise<MigrationEvent[]>;
}

// ============================================
// CONSTANTS
// ============================================

export const MIGRATION_DEFAULTS = {
  BATCH_SIZE: 500,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  PARITY_SAMPLE_SIZE: 1000,
  CUTOVER_TIMEOUT_MS: 300_000, // 5 minutes
  BACKFILL_PROGRESS_INTERVAL_MS: 5_000,
  MAX_ERROR_COUNT_BEFORE_ABORT: 10,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isValidTransition(from: MigrationStatus, to: MigrationStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function migrationStateRowToModel(row: MigrationStateRow): MigrationState {
  return {
    workspaceId: row.workspace_id,
    sourceTable: row.source_table,
    targetTable: row.target_table,
    status: row.status as MigrationStatus,
    dualWriteEnabled: row.dual_write_enabled,
    backfillProgress: row.backfill_progress,
    backfillLastId: row.backfill_last_id,
    backfillBatchSize: row.backfill_batch_size,
    backfillTotalRows: row.backfill_total_rows,
    backfillProcessedRows: row.backfill_processed_rows,
    parityScore: row.parity_score,
    lastVerifiedAt: row.last_verified_at,
    errorMessage: row.error_message,
    errorCount: row.error_count,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function modelToMigrationStateRow(state: Partial<MigrationState>): Partial<MigrationStateRow> {
  const row: Partial<MigrationStateRow> = {};
  if (state.workspaceId !== undefined) row.workspace_id = state.workspaceId;
  if (state.sourceTable !== undefined) row.source_table = state.sourceTable;
  if (state.targetTable !== undefined) row.target_table = state.targetTable;
  if (state.status !== undefined) row.status = state.status;
  if (state.dualWriteEnabled !== undefined) row.dual_write_enabled = state.dualWriteEnabled;
  if (state.backfillProgress !== undefined) row.backfill_progress = state.backfillProgress;
  if (state.backfillLastId !== undefined) row.backfill_last_id = state.backfillLastId;
  if (state.backfillBatchSize !== undefined) row.backfill_batch_size = state.backfillBatchSize;
  if (state.backfillTotalRows !== undefined) row.backfill_total_rows = state.backfillTotalRows;
  if (state.backfillProcessedRows !== undefined) row.backfill_processed_rows = state.backfillProcessedRows;
  if (state.parityScore !== undefined) row.parity_score = state.parityScore;
  if (state.lastVerifiedAt !== undefined) row.last_verified_at = state.lastVerifiedAt;
  if (state.errorMessage !== undefined) row.error_message = state.errorMessage;
  if (state.errorCount !== undefined) row.error_count = state.errorCount;
  if (state.metadata !== undefined) row.metadata = state.metadata;
  return row;
}
