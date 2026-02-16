/**
 * PHASE 73: Control Plane Types (Next.js Layer)
 *
 * Re-exports the shared Control Plane types for use in the Vercel layer.
 * This avoids direct cross-package imports in Next.js components.
 *
 * @see packages/shared/types.ts
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.6
 */

// ============================================
// CONTROL PLANE HEALTH TYPES
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
// DEPLOYMENT STAGE TYPES
// ============================================

export type DeploymentStage = 'MVP' | 'GROWTH' | 'SCALE' | 'HYPER_SCALE';

export interface StageConfig {
  label: string;
  maxTenants: number;
  platform: string;
}

export const DEPLOYMENT_STAGES: Record<DeploymentStage, StageConfig> = {
  MVP: { label: 'Stage 1: MVP', maxTenants: 100, platform: 'Vercel-only' },
  GROWTH: { label: 'Stage 2: Growth', maxTenants: 1000, platform: 'Vercel + Railway' },
  SCALE: { label: 'Stage 3: Scale', maxTenants: 5000, platform: 'Vercel + AWS ECS' },
  HYPER_SCALE: { label: 'Stage 4: Hyper-Scale', maxTenants: 15000, platform: 'Full AWS/K8s' },
};
