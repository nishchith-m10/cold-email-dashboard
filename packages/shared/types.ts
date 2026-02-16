/**
 * PHASE 73: SHARED TYPES
 *
 * Types and constants shared between Vercel layer and Control Plane.
 * Follows spec 69.6 monorepo structure.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.6
 */

// ============================================
// WORKER JOB TYPES
// ============================================

/** BullMQ queue names for the Control Plane workers */
export const QUEUE_NAMES = {
  WORKFLOW_UPDATE: 'workflow-update',
  SIDECAR_UPDATE: 'sidecar-update',
  WAKE_DROPLET: 'wake-droplet',
  CREDENTIAL_INJECT: 'credential-inject',
  HARD_REBOOT: 'hard-reboot-droplet',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Payload for workflow-update jobs */
export interface WorkflowUpdateJob {
  workspace_id: string;
  workflow_name: string;
  workflow_json: Record<string, unknown>;
  version: string;
  rollout_id?: string;
  wave_number?: number;
}

/** Payload for sidecar-update jobs */
export interface SidecarUpdateJob {
  workspace_id: string;
  droplet_id: number;
  from_version: string;
  to_version: string;
  rollout_id?: string;
  wave_number?: number;
}

/** Payload for wake-droplet jobs */
export interface WakeDropletJob {
  workspace_id: string;
  droplet_id: number;
  reason: 'user_login' | 'scheduled_campaign' | 'admin_request' | 'watchdog_recovery';
}

/** Payload for credential-inject jobs */
export interface CredentialInjectJob {
  workspace_id: string;
  droplet_id: number;
  credentials: {
    type: string;
    encrypted_data: string;
  }[];
}

/** Payload for hard-reboot jobs */
export interface HardRebootJob {
  droplet_id: number;
  workspace_id: string;
  reason: 'watchdog_heartbeat_timeout' | 'admin_request' | 'zombie_detected';
}

// ============================================
// HEALTH CHECK TYPES
// ============================================

export interface ControlPlaneHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  started_at: string;
  workers: Record<string, WorkerHealth>;
  services: Record<string, ServiceHealth>;
  version: string;
}

export interface WorkerHealth {
  name: string;
  running: boolean;
  concurrency: number;
  completed_jobs: number;
  failed_jobs: number;
  active_jobs: number;
}

export interface ServiceHealth {
  name: string;
  running: boolean;
  last_run_at: string | null;
  error_count: number;
  last_error: string | null;
}

// ============================================
// WATCHDOG TYPES
// ============================================

export interface DropletHealthRecord {
  workspace_id: string;
  droplet_id: number;
  state: 'ACTIVE_HEALTHY' | 'ACTIVE_DEGRADED' | 'HIBERNATED' | 'PROVISIONING' | 'ZOMBIE';
  last_heartbeat_at: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  disk_percent: number | null;
}

export interface WatchdogAction {
  workspace_id: string;
  droplet_id: number;
  action: 'reboot' | 'alert' | 'mark_zombie';
  reason: string;
  timestamp: string;
}

// ============================================
// STAGE DEPLOYMENT CONSTANTS
// ============================================

export const DEPLOYMENT_STAGES = {
  MVP: { label: 'Stage 1: MVP', maxTenants: 100, platform: 'Vercel-only' },
  GROWTH: { label: 'Stage 2: Growth', maxTenants: 1000, platform: 'Vercel + Railway' },
  SCALE: { label: 'Stage 3: Scale', maxTenants: 5000, platform: 'Vercel + AWS ECS' },
  HYPER_SCALE: { label: 'Stage 4: Hyper-Scale', maxTenants: 15000, platform: 'Full AWS/K8s' },
} as const;

export const CONTROL_PLANE_VERSION = '1.0.0';
