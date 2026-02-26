/**
 * HTTP SIDECAR CLIENT
 *
 * Production implementation of SidecarClient that sends JWT-signed HTTP
 * commands to Sidecar agents running on tenant droplets.
 *
 * Uses the existing SidecarCommandBuilder (lib/genesis/sidecar-commands.ts)
 * for JWT signing with RS256.
 *
 * Security model:
 *   - Each command is signed with a short-lived (5 min) JWT
 *   - JWT includes workspace_id, droplet_id, and action
 *   - Sidecar verifies JWT signature, audience, issuer, and JTI replay
 *
 * @see ignition-orchestrator.ts — SidecarClient interface
 * @see sidecar-commands.ts — SidecarCommandBuilder, JWTSigner
 * @see sidecar/sidecar-agent.ts — Sidecar /command endpoint
 * @see POST_GENESIS_EXECUTION_PLAN.md — Task 1.3.3 / D1-004
 */

import { SidecarClient } from './ignition-orchestrator';
import {
  SidecarCommandBuilder,
  SidecarCommand,
  SidecarCommandResponse,
} from './sidecar-commands';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_SIDECAR_PORT = 3001;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ============================================
// HTTP SIDECAR CLIENT
// ============================================

export class HttpSidecarClient implements SidecarClient {
  private commandBuilder: SidecarCommandBuilder;
  private workspaceId: string;
  private dropletId: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options: {
    workspaceId: string;
    dropletId: string;
    privateKey?: string;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    const privateKey =
      options.privateKey || process.env.GENESIS_JWT_PRIVATE_KEY || '';

    if (!privateKey) {
      throw new Error(
        'HttpSidecarClient: No private key provided. Set GENESIS_JWT_PRIVATE_KEY env var or pass privateKey option.'
      );
    }

    this.workspaceId = options.workspaceId;
    this.dropletId = options.dropletId;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.commandBuilder = new SidecarCommandBuilder(privateKey);
  }

  /**
   * Send a command to the Sidecar.
   *
   * Matches the SidecarClient interface:
   *   sendCommand(dropletIp, { action, payload }) → { success, result?, error? }
   *
   * @param dropletIp - IP address or hostname of the droplet running the Sidecar
   * @param command   - Action and payload to execute
   */
  async sendCommand(
    dropletIp: string,
    command: { action: string; payload: unknown }
  ): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    const action = command.action as SidecarCommand;
    const sidecarUrl = this.buildSidecarUrl(dropletIp);

    // Build JWT-signed command
    const { jwt, request } = this.commandBuilder.buildCommand(
      this.workspaceId,
      this.dropletId,
      action,
      command.payload as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    // Execute with retry
    return this.executeWithRetry(sidecarUrl, jwt, request);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Build the Sidecar URL from the droplet IP.
   * Uses port 3001 (default Sidecar port).
   */
  private buildSidecarUrl(dropletIp: string): string {
    // If IP already includes protocol or port, use as-is
    if (dropletIp.startsWith('http://') || dropletIp.startsWith('https://')) {
      return dropletIp;
    }
    return `http://${dropletIp}:${DEFAULT_SIDECAR_PORT}`;
  }

  /**
   * Execute a command with exponential backoff retry.
   *
   * Retry strategy:
   *   - 3 attempts (1 initial + 2 retries)
   *   - Backoff: 1s, 2s, 4s
   *   - Retries on: network errors, timeouts, 5xx
   *   - No retry on: 4xx (client errors — bad request, auth failure, etc.)
   */
  private async executeWithRetry(
    sidecarUrl: string,
    jwt: string,
    request: { action: SidecarCommand; payload?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    let lastError: string = 'Unknown error';

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.doFetch(sidecarUrl, jwt, request);

        // 4xx — don't retry client errors
        if (response.status >= 400 && response.status < 500) {
          const body = await this.safeParseJson(response);
          return {
            success: false,
            error: body?.error || `Sidecar returned ${response.status}`,
          };
        }

        // 5xx — retry
        if (response.status >= 500) {
          lastError = `Sidecar returned ${response.status}`;
          if (attempt < this.maxRetries - 1) {
            await this.sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
            continue;
          }
          return { success: false, error: lastError };
        }

        // 2xx — parse and return
        const body: SidecarCommandResponse = await response.json();
        return {
          success: body.success,
          result: body.result,
          error: body.error,
        };
      } catch (err) {
        // Network error or timeout — retry
        lastError =
          err instanceof Error ? err.message : String(err);

        if (attempt < this.maxRetries - 1) {
          await this.sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
          continue;
        }
      }
    }

    return {
      success: false,
      error: `All ${this.maxRetries} attempts failed. Last error: ${lastError}`,
    };
  }

  /**
   * Perform the actual HTTP fetch to the Sidecar /command endpoint.
   */
  private async doFetch(
    sidecarUrl: string,
    jwt: string,
    request: { action: SidecarCommand; payload?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(`${sidecarUrl}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Genesis-JWT': jwt,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Safely parse JSON from a response, returning null on failure.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async safeParseJson(response: Response): Promise<any | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Sleep for the given number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
