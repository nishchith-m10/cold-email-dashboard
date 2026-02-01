/**
 * PHASE 52: REDIS CONNECTION MANAGEMENT
 * 
 * Provides connection pooling, health checks, and graceful shutdown
 * for the BullMQ event bus Redis backend.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 52
 */

import type { RedisOptions } from 'ioredis';

// ============================================
// CONNECTION CONFIGURATION
// ============================================

/**
 * Redis connection configuration.
 * Supports both single instance and cluster modes.
 */
export interface RedisConnectionConfig {
  url?: string;                    // Redis URL (takes precedence)
  host?: string;                   // Redis host
  port?: number;                   // Redis port (default 6379)
  password?: string;               // Redis password
  db?: number;                     // Redis database number
  tls?: boolean;                   // Enable TLS
  maxRetriesPerRequest?: number;   // Max retries before failing
  retryDelayMs?: number;           // Delay between retries
  connectionTimeoutMs?: number;    // Connection timeout
  lazyConnect?: boolean;           // Connect on first command
  keyPrefix?: string;              // Prefix for all keys
}

/**
 * Default Redis configuration for Genesis Event Bus.
 */
export const DEFAULT_REDIS_CONFIG: RedisConnectionConfig = {
  host: 'localhost',
  port: 6379,
  db: 0,
  maxRetriesPerRequest: 3,
  retryDelayMs: 100,
  connectionTimeoutMs: 5000,
  lazyConnect: false,
  keyPrefix: 'genesis:',
};

// ============================================
// CONNECTION POOL
// ============================================

/**
 * Connection pool state.
 */
interface ConnectionPoolState {
  connections: Map<string, ConnectionWrapper>;
  healthCheckInterval: ReturnType<typeof setInterval> | null;
  isShuttingDown: boolean;
}

/**
 * Wrapper for a single Redis connection with metadata.
 */
interface ConnectionWrapper {
  id: string;
  client: RedisClient;
  createdAt: Date;
  lastUsedAt: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  failureCount: number;
}

/**
 * Redis client interface (matches ioredis).
 * This allows for mocking in tests.
 */
export interface RedisClient {
  status: string;
  options: RedisOptions;
  ping(): Promise<string>;
  quit(): Promise<void>;
  disconnect(): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: string[]): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown>;
}

/**
 * Factory function type for creating Redis clients.
 * Allows dependency injection for testing.
 */
export type RedisClientFactory = (config: RedisConnectionConfig) => RedisClient;

// ============================================
// CONNECTION MANAGER
// ============================================

/**
 * Manages Redis connections for the BullMQ event bus.
 * Provides connection pooling, health monitoring, and graceful shutdown.
 */
export class RedisConnectionManager {
  private config: RedisConnectionConfig;
  private clientFactory: RedisClientFactory;
  private state: ConnectionPoolState;
  private healthCheckIntervalMs: number;

  constructor(
    config: Partial<RedisConnectionConfig> = {},
    clientFactory?: RedisClientFactory
  ) {
    this.config = { ...DEFAULT_REDIS_CONFIG, ...config };
    this.healthCheckIntervalMs = 30000; // 30 seconds
    
    // Default factory creates mock client (real impl uses ioredis)
    this.clientFactory = clientFactory || this.createMockClient.bind(this);
    
    this.state = {
      connections: new Map(),
      healthCheckInterval: null,
      isShuttingDown: false,
    };
  }

  /**
   * Initialize the connection manager.
   * Creates the primary connection and starts health monitoring.
   */
  async initialize(): Promise<void> {
    if (this.state.isShuttingDown) {
      throw new Error('Connection manager is shutting down');
    }

    // Create primary connection
    await this.getConnection('primary');

    // Start health check loop
    this.state.healthCheckInterval = setInterval(
      () => this.runHealthChecks(),
      this.healthCheckIntervalMs
    );
  }

  /**
   * Get or create a Redis connection.
   * @param purpose - Identifier for this connection (e.g., 'primary', 'worker-1')
   */
  async getConnection(purpose: string): Promise<RedisClient> {
    if (this.state.isShuttingDown) {
      throw new Error('Connection manager is shutting down');
    }

    // Check for existing healthy connection
    const existing = this.state.connections.get(purpose);
    if (existing && existing.healthStatus !== 'unhealthy') {
      existing.lastUsedAt = new Date();
      return existing.client;
    }

    // Create new connection
    const client = this.clientFactory(this.config);
    
    const wrapper: ConnectionWrapper = {
      id: purpose,
      client,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      healthStatus: 'healthy',
      failureCount: 0,
    };

    // Set up event handlers
    client.on('error', (error) => {
      console.error(`[Redis:${purpose}] Connection error:`, error);
      wrapper.failureCount++;
      if (wrapper.failureCount >= 3) {
        wrapper.healthStatus = 'unhealthy';
      } else {
        wrapper.healthStatus = 'degraded';
      }
    });

    client.on('ready', () => {
      wrapper.healthStatus = 'healthy';
      wrapper.failureCount = 0;
    });

    client.on('reconnecting', () => {
      wrapper.healthStatus = 'degraded';
    });

    this.state.connections.set(purpose, wrapper);
    
    return client;
  }

  /**
   * Get the primary connection for BullMQ.
   */
  async getPrimaryConnection(): Promise<RedisClient> {
    return this.getConnection('primary');
  }

  /**
   * Get connection health status.
   */
  getHealthStatus(): Record<string, ConnectionWrapper['healthStatus']> {
    const status: Record<string, ConnectionWrapper['healthStatus']> = {};
    
    for (const [id, wrapper] of this.state.connections) {
      status[id] = wrapper.healthStatus;
    }
    
    return status;
  }

  /**
   * Check if the connection manager is healthy.
   */
  isHealthy(): boolean {
    const primary = this.state.connections.get('primary');
    return primary?.healthStatus === 'healthy';
  }

  /**
   * Run health checks on all connections.
   */
  private async runHealthChecks(): Promise<void> {
    if (this.state.isShuttingDown) return;

    for (const [id, wrapper] of this.state.connections) {
      try {
        const start = Date.now();
        await wrapper.client.ping();
        const latency = Date.now() - start;

        // Reset failure count on successful ping
        wrapper.failureCount = 0;
        wrapper.healthStatus = latency > 100 ? 'degraded' : 'healthy';
      } catch (error) {
        wrapper.failureCount++;
        wrapper.healthStatus = wrapper.failureCount >= 3 ? 'unhealthy' : 'degraded';
        console.error(`[Redis:${id}] Health check failed:`, error);
      }
    }
  }

  /**
   * Gracefully shutdown all connections.
   */
  async shutdown(): Promise<void> {
    this.state.isShuttingDown = true;

    // Stop health checks
    if (this.state.healthCheckInterval) {
      clearInterval(this.state.healthCheckInterval);
      this.state.healthCheckInterval = null;
    }

    // Close all connections gracefully
    const closePromises: Promise<void>[] = [];
    
    for (const [id, wrapper] of this.state.connections) {
      console.log(`[Redis:${id}] Closing connection...`);
      closePromises.push(
        wrapper.client.quit().catch((error) => {
          console.error(`[Redis:${id}] Error closing connection:`, error);
          wrapper.client.disconnect();
        })
      );
    }

    await Promise.all(closePromises);
    this.state.connections.clear();
    
    console.log('[Redis] All connections closed');
  }

  /**
   * Create a mock Redis client for testing.
   * In production, this is replaced with real ioredis client.
   */
  private createMockClient(_config: RedisConnectionConfig): RedisClient {
    const storage = new Map<string, string>();
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>();

    const emit = (event: string, ...args: unknown[]) => {
      const handlers = listeners.get(event) || [];
      handlers.forEach((handler) => handler(...args));
    };

    // Emit ready event on next tick
    setTimeout(() => emit('ready'), 0);

    return {
      status: 'ready',
      options: {} as RedisOptions,
      
      async ping(): Promise<string> {
        return 'PONG';
      },
      
      async quit(): Promise<void> {
        // No-op for mock
      },
      
      disconnect(): void {
        // No-op for mock
      },
      
      on(event: string, listener: (...args: unknown[]) => void): RedisClient {
        const handlers = listeners.get(event) || [];
        handlers.push(listener);
        listeners.set(event, handlers);
        return this;
      },
      
      async get(key: string): Promise<string | null> {
        return storage.get(key) || null;
      },
      
      async set(key: string, value: string): Promise<string | null> {
        storage.set(key, value);
        return 'OK';
      },
      
      async del(...keys: string[]): Promise<number> {
        let deleted = 0;
        for (const key of keys) {
          if (storage.delete(key)) deleted++;
        }
        return deleted;
      },
      
      async incr(key: string): Promise<number> {
        const current = parseInt(storage.get(key) || '0', 10);
        const next = current + 1;
        storage.set(key, next.toString());
        return next;
      },
      
      async expire(_key: string, _seconds: number): Promise<number> {
        // No-op for mock
        return 1;
      },
      
      async eval(_script: string, _numkeys: number, ..._args: (string | number)[]): Promise<unknown> {
        // No-op for mock
        return null;
      },
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let connectionManager: RedisConnectionManager | null = null;

/**
 * Get the singleton connection manager instance.
 */
export function getConnectionManager(
  config?: Partial<RedisConnectionConfig>,
  factory?: RedisClientFactory
): RedisConnectionManager {
  if (!connectionManager) {
    connectionManager = new RedisConnectionManager(config, factory);
  }
  return connectionManager;
}

/**
 * Reset the singleton (for testing).
 */
export function resetConnectionManager(): void {
  if (connectionManager) {
    connectionManager.shutdown().catch(console.error);
    connectionManager = null;
  }
}

// ============================================
// BUILD IOREDIS OPTIONS
// ============================================

/**
 * Convert our config to ioredis-compatible options.
 * Used when creating real Redis connections in production.
 */
export function buildRedisOptions(config: RedisConnectionConfig): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    enableReadyCheck: true,
    lazyConnect: config.lazyConnect ?? false,
    keyPrefix: config.keyPrefix,
  };

  if (config.url) {
    // Parse URL into components
    const url = new URL(config.url);
    options.host = url.hostname;
    options.port = parseInt(url.port, 10) || 6379;
    if (url.password) options.password = url.password;
    if (url.pathname && url.pathname.length > 1) {
      options.db = parseInt(url.pathname.slice(1), 10);
    }
    if (url.protocol === 'rediss:') {
      options.tls = {};
    }
  } else {
    options.host = config.host;
    options.port = config.port ?? 6379;
    options.password = config.password;
    options.db = config.db ?? 0;
    if (config.tls) {
      options.tls = {};
    }
  }

  if (config.connectionTimeoutMs) {
    options.connectTimeout = config.connectionTimeoutMs;
  }

  return options;
}
