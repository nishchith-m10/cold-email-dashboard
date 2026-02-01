/**
 * PHASE 43: STATE RECONCILIATION WATCHDOG - TYPE DEFINITIONS
 * 
 * Defines drift detection types, severity levels, and healing strategies.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 43
 */

// ============================================
// DRIFT TYPES
// ============================================

export type DriftType =
  | 'orphan_workflow'      // Workflow exists in n8n but not in DB
  | 'orphan_db_record'     // DB record exists but workflow missing in n8n
  | 'state_mismatch'       // DB and n8n have different active/inactive states
  | 'missing_partition'    // Workspace has no partition
  | 'credential_invalid'   // Credentials in n8n are expired or invalid
  | 'webhook_mismatch'     // Webhook URLs don't match expected values
  | 'version_mismatch';    // Workflow version differs from expected

export type DriftSeverity =
  | 'low'       // Informational, no immediate action required
  | 'medium'    // Should be fixed, but not urgent
  | 'high'      // Requires prompt attention
  | 'critical'; // Must be fixed immediately

// ============================================
// DRIFT DETECTION
// ============================================

export interface DriftResult {
  workspaceId: string;
  driftType: DriftType;
  details: Record<string, unknown>;
  severity: DriftSeverity;
  autoHealable: boolean;
  detectedAt?: Date;
  healedAt?: Date;
  healingAttempts?: number;
  lastError?: string;
}

export interface DriftDetectionResult {
  workspaceId: string;
  totalDrifts: number;
  drifts: DriftResult[];
  scannedAt: Date;
  scanDurationMs: number;
}

export interface OrphanWorkflow {
  workflowId: string;
  workflowName: string;
  createdAt?: string;
  active: boolean;
}

export interface OrphanDbRecord {
  campaignId: string;
  workflowId: string;
  expectedWorkflowName?: string;
}

export interface StateMismatch {
  campaignId: string;
  workflowId: string;
  dbStatus: 'active' | 'inactive';
  n8nStatus: 'active' | 'inactive';
}

export interface CredentialIssue {
  credentialId: string;
  credentialName: string;
  credentialType: string;
  issue: 'expired' | 'invalid' | 'missing';
}

// ============================================
// HEALING
// ============================================

export interface HealingResult {
  success: boolean;
  action: string;
  details: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface HealingStrategy {
  driftType: DriftType;
  autoHealable: boolean;
  action: string;
  description: string;
}

// ============================================
// WATCHDOG RUN
// ============================================

export interface WatchdogRunConfig {
  autoHeal: boolean;
  dryRun: boolean;
  workspaceIds?: string[]; // If specified, only check these workspaces
  driftTypes?: DriftType[]; // If specified, only check these drift types
  timeout?: number; // Max duration in milliseconds
}

export interface WatchdogRunResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  workspacesScanned: number;
  totalDrifts: number;
  driftsByType: Record<DriftType, number>;
  driftsBySeverity: Record<DriftSeverity, number>;
  driftsDetected: number;
  driftsHealed: number;
  driftsFailed: number;
  drifts: DriftResult[];
  errors: string[];
}

// ============================================
// TRIGGERS
// ============================================

export type WatchdogTrigger =
  | 'scheduled'         // Cron (every 15 minutes)
  | 'heartbeat'         // Triggered by Heartbeat State Machine
  | 'manual'            // User-initiated from God Mode
  | 'post_deployment'   // After template reconciliation
  | 'post_rotation';    // After credential rotation

export interface WatchdogEvent {
  trigger: WatchdogTrigger;
  workspaceId?: string;
  initiatedBy?: string; // User ID for manual triggers
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// DATABASE INTERFACES
// ============================================

export interface WatchdogDB {
  // Drift detection
  detectOrphanWorkflows(workspaceId: string): Promise<OrphanWorkflow[]>;
  detectOrphanDbRecords(workspaceId: string): Promise<OrphanDbRecord[]>;
  detectStateMismatches(workspaceId: string): Promise<StateMismatch[]>;
  detectCredentialIssues(workspaceId: string): Promise<CredentialIssue[]>;
  
  // Drift storage
  storeDrift(drift: DriftResult): Promise<void>;
  updateDrift(driftId: string, updates: Partial<DriftResult>): Promise<void>;
  
  // Run tracking
  createRun(config: WatchdogRunConfig, event: WatchdogEvent): Promise<string>;
  updateRun(runId: string, result: Partial<WatchdogRunResult>): Promise<void>;
  getRecentRuns(limit?: number): Promise<WatchdogRunResult[]>;
}

export interface N8nClient {
  // Workflow operations
  listWorkflows(workspaceId: string): Promise<Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }>>;
  
  getWorkflow(workflowId: string): Promise<{
    id: string;
    name: string;
    active: boolean;
    nodes: Array<{ type: string; credentials?: Record<string, string> }>;
  }>;
  
  deleteWorkflow(workflowId: string): Promise<void>;
  
  activateWorkflow(workflowId: string): Promise<void>;
  deactivateWorkflow(workflowId: string): Promise<void>;
  
  // Credential operations
  listCredentials(workspaceId: string): Promise<Array<{
    id: string;
    name: string;
    type: string;
  }>>;
  
  testCredential(credentialId: string): Promise<{ success: boolean; error?: string }>;
}

// ============================================
// WATCHDOG SERVICE
// ============================================

export interface WatchdogService {
  // Detection
  detectDrifts(workspaceId: string): Promise<DriftDetectionResult>;
  detectDriftsForAll(workspaceIds: string[]): Promise<Map<string, DriftDetectionResult>>;
  
  // Healing
  healDrift(drift: DriftResult): Promise<HealingResult>;
  healAllDrifts(drifts: DriftResult[]): Promise<HealingResult[]>;
  
  // Run
  run(config: WatchdogRunConfig, event: WatchdogEvent): Promise<WatchdogRunResult>;
  
  // Utilities
  getHealingStrategy(driftType: DriftType): HealingStrategy | null;
  isAutoHealable(drift: DriftResult): boolean;
}

// ============================================
// CONSTANTS
// ============================================

export const DRIFT_SEVERITIES: Record<DriftType, DriftSeverity> = {
  orphan_workflow: 'medium',
  orphan_db_record: 'medium',
  state_mismatch: 'high',
  missing_partition: 'critical',
  credential_invalid: 'high',
  webhook_mismatch: 'medium',
  version_mismatch: 'medium',
};

export const AUTO_HEALABLE: Record<DriftType, boolean> = {
  orphan_workflow: true,
  orphan_db_record: true,
  state_mismatch: true,
  missing_partition: false, // Requires manual intervention
  credential_invalid: false, // Requires credential refresh
  webhook_mismatch: true,
  version_mismatch: false, // Requires template update
};

export const HEALING_STRATEGIES: Record<DriftType, HealingStrategy> = {
  orphan_workflow: {
    driftType: 'orphan_workflow',
    autoHealable: true,
    action: 'delete_workflow',
    description: 'Delete orphan workflow from n8n',
  },
  orphan_db_record: {
    driftType: 'orphan_db_record',
    autoHealable: true,
    action: 'delete_db_record',
    description: 'Remove orphan campaign record from DB',
  },
  state_mismatch: {
    driftType: 'state_mismatch',
    autoHealable: true,
    action: 'sync_state',
    description: 'Update DB status to match n8n state',
  },
  missing_partition: {
    driftType: 'missing_partition',
    autoHealable: false,
    action: 'manual_partition_creation',
    description: 'Partition must be created manually via Ignition',
  },
  credential_invalid: {
    driftType: 'credential_invalid',
    autoHealable: false,
    action: 'credential_rotation',
    description: 'Credential must be refreshed/rotated manually',
  },
  webhook_mismatch: {
    driftType: 'webhook_mismatch',
    autoHealable: true,
    action: 'update_webhook',
    description: 'Update webhook URL in n8n workflow',
  },
  version_mismatch: {
    driftType: 'version_mismatch',
    autoHealable: false,
    action: 'template_update',
    description: 'Workflow must be updated via Template Reconciliation',
  },
};

export const DEFAULT_WATCHDOG_CONFIG: WatchdogRunConfig = {
  autoHeal: true,
  dryRun: false,
  timeout: 300000, // 5 minutes
};

export const WATCHDOG_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_HEALING_ATTEMPTS = 3;
export const HEALING_BACKOFF_MS = [1000, 5000, 15000]; // 1s, 5s, 15s
