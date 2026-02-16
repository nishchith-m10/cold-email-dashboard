/**
 * Shared constants between Vercel layer and Control Plane.
 */

/** Default BullMQ job options */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

/** Concurrency governor defaults (spec 69.5) */
export const CONCURRENCY_DEFAULTS = {
  WORKFLOW_UPDATE: 100,
  WAKE_DROPLET: 50,
  SIDECAR_UPDATE: 50,
  CREDENTIAL_INJECT: 50,
  HARD_REBOOT: 10,
};

/** Watchdog thresholds */
export const WATCHDOG_THRESHOLDS = {
  HEARTBEAT_TIMEOUT_MINUTES: 5,
  MAX_CPU_PERCENT: 90,
  MAX_MEMORY_PERCENT: 85,
  MAX_DISK_PERCENT: 90,
  ZOMBIE_RECHECK_MINUTES: 2,
};

/** Scale alert thresholds (spec 69.5) */
export const SCALE_ALERT_THRESHOLDS = {
  CRITICAL_PARTITION_COUNT: 14000,
  WARNING_PARTITION_COUNT: 12000,
  MAX_PARTITIONS: 15000,
};
