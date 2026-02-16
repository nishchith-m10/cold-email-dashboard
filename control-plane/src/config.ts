/**
 * PHASE 73: CONTROL PLANE — CONFIGURATION MODULE
 *
 * Centralizes ALL environment variable access.
 * Follows 12-Factor App Principle 1: Environment Externalization.
 * Platform-agnostic — works on Railway, AWS ECS, K8s.
 *
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md — Section 69.9.2
 */

import pino from 'pino';

// ============================================
// ENVIRONMENT VALIDATION
// ============================================

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function optionalEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return fallback;
  return parsed;
}

// ============================================
// CONFIGURATION OBJECT
// ============================================

export interface ControlPlaneConfig {
  // Database
  databaseUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;

  // Redis (for BullMQ)
  redisUrl: string;

  // DigitalOcean
  digitalOceanApiToken: string;

  // Server
  port: number;
  host: string;
  nodeEnv: string;

  // Logging
  logLevel: string;

  // Worker concurrency
  workflowUpdateConcurrency: number;
  wakeDropletConcurrency: number;
  sidecarUpdateConcurrency: number;
  credentialInjectConcurrency: number;

  // Watchdog
  watchdogIntervalSeconds: number;
  watchdogHeartbeatTimeoutMinutes: number;

  // Scale alerts
  scaleAlertsIntervalMinutes: number;

  // Heartbeat processor
  heartbeatProcessIntervalSeconds: number;

  // Graceful shutdown
  gracefulShutdownTimeoutMs: number;

  // Computed millisecond values (convenience)
  readonly watchdogIntervalMs: number;
  readonly scaleAlertsIntervalMs: number;
  readonly heartbeatFlushIntervalMs: number;
}

/**
 * Load and validate all configuration from environment variables.
 * Fails fast on missing required vars (12-Factor Principle).
 */
export function loadConfig(): ControlPlaneConfig {
  return {
    // Database
    databaseUrl: requireEnv('DATABASE_URL'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

    // Redis
    redisUrl: requireEnv('REDIS_URL'),

    // DigitalOcean
    digitalOceanApiToken: optionalEnv('DIGITALOCEAN_API_TOKEN', ''),

    // Server
    port: optionalEnvNumber('PORT', 3000),
    host: optionalEnv('HOST', '0.0.0.0'),
    nodeEnv: optionalEnv('NODE_ENV', 'production'),

    // Logging
    logLevel: optionalEnv('LOG_LEVEL', 'info'),

    // Worker concurrency (spec 69.5 — 100 default)
    workflowUpdateConcurrency: optionalEnvNumber('WORKFLOW_UPDATE_CONCURRENCY', 100),
    wakeDropletConcurrency: optionalEnvNumber('WAKE_DROPLET_CONCURRENCY', 50),
    sidecarUpdateConcurrency: optionalEnvNumber('SIDECAR_UPDATE_CONCURRENCY', 50),
    credentialInjectConcurrency: optionalEnvNumber('CREDENTIAL_INJECT_CONCURRENCY', 50),

    // Watchdog (spec 69.5 — polls every 60s)
    watchdogIntervalSeconds: optionalEnvNumber('WATCHDOG_INTERVAL_SECONDS', 60),
    watchdogHeartbeatTimeoutMinutes: optionalEnvNumber('WATCHDOG_HEARTBEAT_TIMEOUT_MINUTES', 5),

    // Scale alerts (spec 69.5 — every 15 minutes)
    scaleAlertsIntervalMinutes: optionalEnvNumber('SCALE_ALERTS_INTERVAL_MINUTES', 15),

    // Heartbeat processor
    heartbeatProcessIntervalSeconds: optionalEnvNumber('HEARTBEAT_PROCESS_INTERVAL_SECONDS', 10),

    // Graceful shutdown
    gracefulShutdownTimeoutMs: optionalEnvNumber('GRACEFUL_SHUTDOWN_TIMEOUT_MS', 30000),

    // Computed millisecond values
    get watchdogIntervalMs() { return this.watchdogIntervalSeconds * 1000; },
    get scaleAlertsIntervalMs() { return this.scaleAlertsIntervalMinutes * 60 * 1000; },
    get heartbeatFlushIntervalMs() { return this.heartbeatProcessIntervalSeconds * 1000; },
  };
}

// ============================================
// LOGGER (Platform-Agnostic Structured JSON)
// ============================================

/**
 * Create a structured JSON logger.
 * Follows Principle 2: Platform-Agnostic Logging.
 * Works with Railway, AWS CloudWatch, Prometheus/Loki.
 */
export function createLogger(config: ControlPlaneConfig) {
  return pino({
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    base: {
      service: 'genesis-control-plane',
      env: config.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = pino.Logger;
